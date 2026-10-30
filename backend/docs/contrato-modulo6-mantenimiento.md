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

Cada acción queda registrada en `cineadmin.bitacora_mantenimiento`.

Errores: `400` parámetros inválidos, `403` sin permisos, `503` sin conexión o
falta el script 07, `500` otro error. Siempre `{ "mensaje": "...", "detalle": "..." }`.

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

SQL Server no tiene un estado `INVALID` como Oracle. Se usan dos pruebas:

1. `REFERENCIA_INEXISTENTE`: el módulo menciona un objeto que no existe
   (`sys.sql_expression_dependencies` con `referenced_id` nulo).
2. `ERROR_COMPILACION`: `sp_refreshsqlmodule` falla al revalidar el módulo. Se
   ejecuta dentro de una transacción que siempre se revierte, así que no cambia nada.

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
lectura. El Módulo 6 usa su propia detección porque necesita el mismo criterio
que aplica la recompilación (`sp_refreshsqlmodule`).
