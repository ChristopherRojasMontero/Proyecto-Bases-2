# Contrato de API — Módulo 6: Mantenimiento preventivo

Base: `/api/mantenimiento`
Autores: Persona 3 y Persona 4
Código: `src/routes/mantenimiento.js`, `src/queries/mantenimiento.js` y los
procedimientos del esquema `cineadmin` (`database/07_objetos_cineadmin.sql`).

## Cómo se ejecutan acciones con un usuario de solo lectura

`cine_app` no tiene permisos para alterar tablas ni objetos. Las acciones de
mantenimiento se hacen a través de procedimientos almacenados creados con
`WITH EXECUTE AS OWNER`: corren con los permisos de `dbo`, pero solo hacen lo
que su código permite y validan sus parámetros. A `cine_app` se le da únicamente
`GRANT EXECUTE ON SCHEMA::cineadmin`.

| Procedimiento                               | Qué hace                                             |
|---------------------------------------------|------------------------------------------------------|
| `cineadmin.sp_actualizar_estadisticas`      | `UPDATE STATISTICS` por tabla (muestreo o FULLSCAN)  |
| `cineadmin.sp_detectar_objetos_invalidos`   | Detecta módulos con errores de compilación           |
| `cineadmin.sp_recompilar_objeto`            | `sp_refreshsqlmodule` + `sp_recompile`               |

Las acciones ejecutadas por los procedimientos de modificación quedan registradas
en `cineadmin.bitacora_mantenimiento`. Un rechazo preventivo de la API por firma
no ejecuta el procedimiento ni inserta una fila de bitácora.

Errores: `400` parámetros inválidos, `403` sin permisos, `503` sin conexión o
falta el script 07, `500` otro error. Los errores técnicos quedan en el registro
local; las respuestas de error no incluyen el mensaje interno de SQL Server.

---

## Requisito 1 — Recálculo de estadísticas (4 pts)

### GET /estadisticas
Estado de cada estadística (`sys.stats` + `sys.dm_db_stats_properties`) y una
recomendación calculada:

- `ACTUALIZAR`: nunca calculada, o ≥ 20 % de filas modificadas desde la última actualización.
- `REVISAR`: tiene modificaciones y lleva ≥ 7 días sin actualizarse.
- `AL_DIA`: en otro caso.

```json
{
  "resumen": { "total": 18, "actualizar": 2, "revisar": 1, "criterio": "..." },
  "datos": [
    { "esquema": "dbo", "tabla": "alquileres", "estadistica": "PK__alquiler__...", "origen": "INDICE",
      "ultima_actualizacion": "2026-09-23T14:10:00.000Z", "dias_sin_actualizar": 33,
      "filas": 50000, "filas_muestreadas": 50000, "porcentaje_muestreo": 100,
      "modificaciones": 12000, "porcentaje_modificado": 24,
      "recomendacion": "ACTUALIZAR", "motivo": "Más del 20% de las filas cambió desde la última actualización." }
  ]
}
```

### POST /estadisticas/actualizar
Cuerpo (todos opcionales):

```json
{ "esquema": "dbo", "tabla": "alquileres", "modo": "COMPLETO" }
```

- Sin `tabla`: actualiza todas las tablas de usuario.
- `modo`: `MUESTREO` (por defecto, rápido) o `COMPLETO` (`WITH FULLSCAN`, exacto).

Respuesta (`resultado`: `OK`, `PARCIAL` o `ERROR`):

```json
{
  "resultado": "OK",
  "mensaje": "Estadísticas actualizadas en 1 tabla(s), modo COMPLETO.",
  "duracion_total_ms": 140,
  "datos": [ { "tabla": "[dbo].[alquileres]", "resultado": "OK",
               "mensaje": "Estadísticas actualizadas (COMPLETO).", "estadisticas": 3, "duracion_ms": 121 } ]
}
```

## Requisito 2 — Detección de objetos inválidos (2 pts)

SQL Server no tiene un estado `INVALID` como Oracle. El GET consulta catálogos y
`sys.dm_sql_referenced_entities`, sin `sp_refreshsqlmodule`, transacciones de
modificación ni ejecución de módulos. Informa `ERROR_COMPILACION` para errores
de enlace conocidos, `DEPENDENCIAS_INCOMPLETAS` cuando no puede resolver todas
las referencias y `NO_EVALUABLE` para definiciones cifradas o limitaciones del
diagnóstico. Los problemas de permisos o conexión no se ocultan como objetos inválidos.

No comprueba SQL dinámico ni referencias externas y no garantiza el éxito de una
ejecución futura. Se conservan las claves `total`, `datos`, `nota` y las columnas
de cada diagnóstico. La API consulta directamente los metadatos para que GET sea
seguro incluso antes de actualizar el procedimiento instalado.

Se revisan procedimientos, vistas, funciones y triggers DML de usuario (no los
del esquema `cineadmin` ni los que tienen `SCHEMABINDING`, que no pueden quedar inválidos).

### GET /objetos-invalidos

```json
{
  "total": 2,
  "datos": [
    { "esquema": "dbo", "objeto": "v_demo_promociones", "tipo": "VIEW",
      "problema": "ERROR_COMPILACION", "detalle": "Invalid column name 'descuento'." }
  ],
  "nota": "SQL Server no tiene un estado INVALID como Oracle: ..."
}
```

## Requisitos 3 y 4 — Recompilación y confirmación (3 + 1 pts)

### POST /objetos/recompilar
Antes de refrescar un objeto, la API comprueba `sys.crypt_properties` y rechaza
los objetos firmados sin ejecutarlos. El script 07 incorpora la misma protección
dentro del procedimiento; debe aplicarse manualmente para proteger llamadas SQL
directas. No se han cambiado permisos ni propietarios.

Un objeto:

```json
{ "esquema": "dbo", "objeto": "v_demo_promociones" }
```

Todos los detectados como inválidos:

```json
{ "todos": true }
```

Respuesta (`resultado`: `OK`, `PARCIAL`, `ERROR` o `SIN_OBJETOS`). Cada objeto
trae el mensaje real de SQL Server cuando falla:

```json
{
  "resultado": "ERROR",
  "mensaje": "0 de 1 objetos recompilados; 1 siguen con errores.",
  "datos": [ { "objeto": "[dbo].[v_demo_promociones]", "resultado": "ERROR",
               "mensaje": "Invalid column name 'descuento'.", "duracion_ms": 4 } ]
}
```

### GET /historial?limite=50
Bitácora de acciones (1–500 registros, más recientes primero).

```json
[ { "id_bitacora": 7, "fecha": "2026-10-27T02:30:00.000Z", "operacion": "RECOMPILAR_OBJETO",
    "objeto": "[dbo].[v_demo_promociones]", "resultado": "OK",
    "mensaje": "Objeto revalidado y marcado para recompilación.", "duracion_ms": 5, "ejecutado_por": "cine_app" } ]
```

---

## Demostración

`database/08_demo_mantenimiento.sql` crea una tabla, una vista y un procedimiento
reales y luego renombra una columna para que queden inválidos. Ver los pasos
dentro del script.

## Relación con el Módulo 5

El Módulo 5 (Auditoría, Persona 5) tiene su propio diagnóstico de objetos
problemáticos (`/api/auditoria/objetos-problematicos`), más detallado y de solo
lectura. Su backend y contratos no se modificaron. El Módulo 6 mantiene su
diagnóstico de lectura con su contrato anterior; solo la acción POST revalida.
