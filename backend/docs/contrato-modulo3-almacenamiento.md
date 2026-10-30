# Contrato de API — Módulo 3: Gestión del almacenamiento

Base: `/api/almacenamiento`
Autor: Persona 3
Código: `src/routes/almacenamiento.js` (rutas) y `src/queries/almacenamiento.js` (consultas SQL)

Todas las consultas se ejecutan sobre la base indicada en `DB_NAME` (`.env`).
Los tamaños se expresan en **MB**. Errores:

| Código | Cuándo                                                                 |
|--------|------------------------------------------------------------------------|
| 400    | Parámetro inválido (`top`, `dias`)                                     |
| 403    | `cine_app` no tiene permisos                                           |
| 503    | No hay conexión con SQL Server, o falta ejecutar `07_objetos_cineadmin.sql` |
| 500    | Otro error. Siempre `{ "mensaje": "...", "detalle": "..." }`           |

**Compatibilidad:** las rutas `filegroups`, `tamano`, `objetos-grandes` y
`crecimiento` conservan todos los campos que ya usa la vista del frontend;
solo se agregaron campos nuevos.

---

## Requisito 1 — Espacio en filegroups (3 pts)

### GET /filegroups
Un elemento por archivo físico (datos y log).

```json
[
  { "filegroup": "PRIMARY", "archivo_logico": "CineStream", "physical_name": "C:\\...\\CineStream.mdf",
    "type_desc": "ROWS", "estado": "ONLINE", "tamano_mb": 136, "usado_mb": 121.5, "libre_mb": 14.5, "porcentaje_uso": 89.34 },
  { "filegroup": null, "archivo_logico": "CineStream_log", "physical_name": "C:\\...\\CineStream_log.ldf",
    "type_desc": "LOG", "estado": "ONLINE", "tamano_mb": 8, "usado_mb": 1.2, "libre_mb": 6.8, "porcentaje_uso": 15 }
]
```

### GET /filegroups/resumen
Espacio total por filegroup. El log aparece como `(LOG)` porque no pertenece a ninguno.

```json
[
  { "filegroup": "PRIMARY", "tipo": "ROWS_FILEGROUP", "es_predeterminado": true, "archivos": 1,
    "tamano_mb": 136, "usado_mb": 121.5, "libre_mb": 14.5, "porcentaje_uso": 89.34 },
  { "filegroup": "(LOG)", "tipo": "LOG", "es_predeterminado": false, "archivos": 1,
    "tamano_mb": 8, "usado_mb": 1.2, "libre_mb": 6.8, "porcentaje_uso": 15 }
]
```

## Requisito 2 — Tamaño de la base de datos (2 pts)

### GET /resumen
Equivalente a `sp_spaceused`. `nivel` resume el uso de los archivos de datos:
`NORMAL` (< 75 %), `ADVERTENCIA` (75–89 %), `CRITICO` (≥ 90 %).

```json
{
  "base_de_datos": "CineStream", "tamano_total_mb": 144,
  "datos_asignado_mb": 136, "datos_usado_mb": 121.5, "datos_libre_mb": 14.5, "porcentaje_uso_datos": 89.34,
  "log_asignado_mb": 8, "log_usado_mb": 1.2,
  "reservado_objetos_mb": 118.3, "tablas_mb": 95.1, "indices_mb": 20.4,
  "nivel": "ADVERTENCIA"
}
```

### GET /tamano
Tamaño por tipo de archivo (`ROWS` = datos, `LOG` = registro de transacciones).

```json
[ { "type_desc": "ROWS", "tamano_mb": 136, "usado_mb": 121.5, "libre_mb": 14.5 },
  { "type_desc": "LOG",  "tamano_mb": 8,   "usado_mb": 1.2,   "libre_mb": 6.8 } ]
```

## Requisito 3 — Archivos de datos (2 pts)

Se cubre con `GET /filegroups` (nombre lógico, ruta física, tipo, estado, tamaño, uso)
y `GET /crecimiento` (autogrowth y tamaño máximo de cada archivo).

## Requisito 4 — Objetos de mayor tamaño (3 pts)

### GET /objetos-grandes?top=10
Tablas de usuario ordenadas por espacio reservado. `top`: 1–50 (por defecto 10).
`filas` cuenta solo el heap o índice clustered (no se duplica por cada índice).

```json
[ { "esquema": "dbo", "tabla": "alquileres", "tamano_total_mb": 3.2, "tamano_usado_mb": 3.05,
    "datos_mb": 2.4, "indices_mb": 0.65, "filas": 50000 } ]
```

### GET /indices-grandes?top=10
Índices (y heaps) ordenados por espacio reservado.

```json
[ { "esquema": "dbo", "tabla": "alquileres", "indice": "PK__alquiler__...", "tipo": "CLUSTERED",
    "es_llave_primaria": true, "tamano_total_mb": 2.45, "tamano_usado_mb": 2.4, "filas": 50000 } ]
```

## Requisito 5 — Crecimiento de la base de datos (2 pts)

El crecimiento se muestra con **datos históricos reales** que salen de dos fuentes:

1. **Mediciones propias.** El procedimiento `cineadmin.sp_registrar_almacenamiento`
   guarda el tamaño de cada archivo en `cineadmin.historial_almacenamiento`.
   Se ejecuta:
   - al correr el script 07 (primera medición);
   - automáticamente desde la API, cada `REGISTRO_ALMACENAMIENTO_HORAS` (24 por defecto),
     ya que SQL Server Express no tiene SQL Server Agent;
   - manualmente con `POST /crecimiento/registrar`.
2. **Respaldos completos.** `msdb.dbo.backupset` guarda el tamaño de cada respaldo,
   lo que permite ver la evolución de la base en el tiempo.

### GET /crecimiento
Configuración actual de autogrowth.

```json
[ { "archivo_logico": "CineStream", "type_desc": "ROWS", "tamano_actual_mb": 136,
    "incremento_autogrowth": "64.00 MB", "tamano_maximo": "Sin limite",
    "es_porcentaje": false, "crecimiento_valor": 64, "tamano_maximo_mb": null } ]
```

### GET /crecimiento/historial?dias=30
`variacion_mb` es la diferencia de datos usados respecto a la medición anterior.
`resumen` solo trae `crecimiento_*` cuando hay al menos 2 mediciones.

```json
{
  "resumen": { "mediciones": 3, "dias_consultados": 30, "desde": "2026-10-26T20:00:00.000Z",
               "hasta": "2026-10-28T20:00:00.000Z", "crecimiento_datos_mb": 4.25,
               "crecimiento_total_mb": 0, "crecimiento_diario_mb": 2.125 },
  "mediciones": [
    { "fecha_medicion": "2026-10-26T20:00:00.000Z", "tamano_total_mb": 144, "datos_asignado_mb": 136,
      "datos_usado_mb": 117.25, "log_asignado_mb": 8, "log_usado_mb": 1.1, "variacion_mb": 0 }
  ]
}
```

### GET /crecimiento/respaldos?dias=90
Respaldos completos (`type = 'D'`) de la base. Lista vacía si no hay respaldos.

```json
[ { "fecha": "2026-10-27T15:10:02.000Z", "tamano_respaldo_mb": 121.9, "tamano_comprimido_mb": 121.9 } ]
```

### POST /crecimiento/registrar
Toma una medición en este momento. Respuesta `201`:

```json
{ "mensaje": "Medición registrada correctamente.", "registrado": true, "fecha_medicion": "2026-10-27T02:15:00.000Z" }
```

---

## Permisos usados

`cine_app` lee todo con `VIEW DATABASE STATE` (DMV `sys.dm_db_partition_stats`),
`db_datareader` en `CineStream` y `msdb`, y `EXECUTE` sobre el esquema `cineadmin`
(script 07) para registrar mediciones. No puede modificar datos de negocio.
