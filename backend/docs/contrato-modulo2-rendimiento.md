# Contrato de API — Módulo 2: Monitoreo de rendimiento

Base: `/api/rendimiento`
Autor: Persona 2
Estado: borrador de contrato (aún sin implementar; los ejemplos son la forma esperada de la respuesta, no datos reales)

Todas las rutas son `GET`, no requieren autenticación propia (la API se conecta
a SQL Server con el usuario `cine_app`, que tiene `VIEW SERVER STATE`) y
devuelven JSON. Si falla la consulta, responde `403` por permisos, `503` por
conexión o `500` para otros errores, con `mensaje` y `detalle` controlados.
El error técnico completo queda en el registro local. Si un parámetro de consulta no es válido, responde
`400` con `{ "mensaje": "..." }`.

Todos los tiempos van en **milisegundos** y las fechas en formato ISO.

---

## GET /api/rendimiento/consultas-top

Consultas SQL con mayor consumo de recursos desde el último arranque de la
instancia (o desde que el plan salió de la caché).

**Parámetros (query string, opcionales):**

| Parámetro | Valores                          | Por defecto | Descripción                          |
|-----------|----------------------------------|-------------|---------------------------------------|
| `orden`   | `cpu`, `duracion`, `lecturas`    | `cpu`       | Criterio de ordenamiento              |
| `limite`  | entero de 1 a 50                 | `10`        | Cantidad de consultas a devolver      |

**Respuesta (200):**
```json
[
  {
    "consulta": "SELECT ... FROM dbo.alquileres ...",
    "base_de_datos": "CineStream",
    "ejecuciones": 120,
    "cpu_total_ms": 5400,
    "cpu_promedio_ms": 45,
    "duracion_total_ms": 7200,
    "duracion_promedio_ms": 60,
    "lecturas_logicas": 98000,
    "ultima_ejecucion": "2026-10-28T15:02:11.000Z"
  }
]
```

| Campo                  | Tipo   | Descripción                                            |
|------------------------|--------|---------------------------------------------------------|
| `consulta`             | string | Texto de la consulta (recortado a 500 caracteres)       |
| `base_de_datos`        | string | Base en la que se ejecutó; `null` si no se puede resolver |
| `ejecuciones`          | number | Veces que se ejecutó                                    |
| `cpu_total_ms`         | number | Tiempo de CPU acumulado                                 |
| `cpu_promedio_ms`      | number | CPU por ejecución                                       |
| `duracion_total_ms`    | number | Tiempo transcurrido acumulado                           |
| `duracion_promedio_ms` | number | Tiempo transcurrido por ejecución                       |
| `lecturas_logicas`     | number | Lecturas lógicas acumuladas                             |
| `ultima_ejecucion`     | string | Fecha/hora (ISO) de la última ejecución                 |

Fuente: `sys.dm_exec_query_stats` + `sys.dm_exec_sql_text`.

---

## GET /api/rendimiento/tiempo-promedio

Resumen del tiempo de ejecución de las consultas en caché.

**Respuesta (200):**
```json
{
  "consultas_distintas": 85,
  "ejecuciones_totales": 4300,
  "duracion_promedio_ms": 12.4,
  "duracion_maxima_ms": 950,
  "cpu_promedio_ms": 8.1
}
```

| Campo                  | Tipo   | Descripción                                                   |
|------------------------|--------|----------------------------------------------------------------|
| `consultas_distintas`  | number | Consultas distintas en caché                                   |
| `ejecuciones_totales`  | number | Suma de ejecuciones                                            |
| `duracion_promedio_ms` | number | Tiempo transcurrido total / ejecuciones totales (ponderado)    |
| `duracion_maxima_ms`   | number | Mayor tiempo de una sola ejecución registrado                  |
| `cpu_promedio_ms`      | number | CPU total / ejecuciones totales (ponderado)                    |

---

## GET /api/rendimiento/sesiones-activas

Sesiones de usuario conectadas a la instancia. No incluye las sesiones del
sistema ni la sesión de la propia API.

**Respuesta (200):**
```json
[
  {
    "sesion_id": 57,
    "login": "cine_app",
    "equipo": "MAKI",
    "programa": "node-mssql",
    "base_de_datos": "CineStream",
    "estado": "running",
    "comando": "SELECT",
    "consulta": "SELECT ...",
    "duracion_ms": 320,
    "inicio_sesion": "2026-10-28T14:00:00.000Z"
  }
]
```

| Campo           | Tipo   | Descripción                                                          |
|-----------------|--------|-----------------------------------------------------------------------|
| `sesion_id`     | number | Identificador de la sesión (`session_id`)                             |
| `login`         | string | Usuario conectado                                                     |
| `equipo`        | string | Equipo de origen; puede ser `null`                                    |
| `programa`      | string | Aplicación cliente; puede ser `null`                                  |
| `base_de_datos` | string | Base de datos actual de la sesión                                     |
| `estado`        | string | `running`, `sleeping`, `suspended`, etc.                              |
| `comando`       | string | Comando en ejecución; `null` si la sesión está inactiva               |
| `consulta`      | string | Consulta en ejecución (recortada a 500 caracteres); `null` si inactiva |
| `duracion_ms`   | number | Tiempo que lleva la petición actual; `0` si está inactiva             |
| `inicio_sesion` | string | Fecha/hora (ISO) en que se conectó                                    |

Fuente: `sys.dm_exec_sessions` + `sys.dm_exec_requests` + `sys.dm_exec_sql_text`.

---

## GET /api/rendimiento/sesiones-bloqueadas

Sesiones que están esperando a otra. Si no hay bloqueos, responde `200` con `[]`.

**Respuesta (200):**
```json
[
  {
    "sesion_bloqueada": 60,
    "sesion_bloqueadora": 57,
    "login_bloqueada": "cine_app",
    "tipo_espera": "LCK_M_S",
    "espera_ms": 8200,
    "base_de_datos": "CineStream",
    "consulta_bloqueada": "SELECT ...",
    "consulta_bloqueadora": "UPDATE ..."
  }
]
```

| Campo                  | Tipo   | Descripción                                                       |
|------------------------|--------|--------------------------------------------------------------------|
| `sesion_bloqueada`     | number | Sesión que espera                                                  |
| `sesion_bloqueadora`   | number | Sesión que mantiene el bloqueo                                     |
| `login_bloqueada`      | string | Usuario de la sesión bloqueada                                     |
| `tipo_espera`          | string | Tipo de espera de SQL Server (`LCK_M_*`)                           |
| `espera_ms`            | number | Tiempo que lleva esperando                                         |
| `base_de_datos`        | string | Base de datos donde ocurre el bloqueo                              |
| `consulta_bloqueada`   | string | Consulta en espera (recortada a 500 caracteres)                    |
| `consulta_bloqueadora` | string | Última consulta de la sesión bloqueadora; puede ser `null`         |

Fuente: `sys.dm_exec_requests` (`blocking_session_id <> 0`).

**Nota para el frontend:** en una instancia de pruebas casi siempre vendrá
vacía. Para la demostración hay que provocar un bloqueo a propósito (dos
sesiones en SSMS, una con una transacción abierta). Mostrar un estado vacío
claro ("Sin bloqueos activos") en lugar de una tabla en blanco.

---

## GET /api/rendimiento/procesos-recursos

Sesiones de usuario ordenadas por consumo de CPU y memoria.

**Parámetros (query string, opcionales):**

| Parámetro | Valores               | Por defecto | Descripción                      |
|-----------|-----------------------|-------------|-----------------------------------|
| `orden`   | `cpu`, `memoria`      | `cpu`       | Criterio de ordenamiento          |
| `limite`  | entero de 1 a 50      | `10`        | Cantidad de sesiones a devolver   |

**Respuesta (200):**
```json
[
  {
    "sesion_id": 57,
    "login": "cine_app",
    "programa": "node-mssql",
    "cpu_ms": 1850,
    "memoria_kb": 640,
    "lecturas_logicas": 54000,
    "estado": "sleeping"
  }
]
```

| Campo              | Tipo   | Descripción                                          |
|--------------------|--------|-------------------------------------------------------|
| `sesion_id`        | number | Identificador de la sesión                            |
| `login`            | string | Usuario conectado                                     |
| `programa`         | string | Aplicación cliente; puede ser `null`                  |
| `cpu_ms`           | number | CPU acumulada por la sesión                           |
| `memoria_kb`       | number | Memoria usada por la sesión (páginas de 8 KB × 8)     |
| `lecturas_logicas` | number | Lecturas lógicas acumuladas                           |
| `estado`           | string | Estado de la sesión                                   |

Fuente: `sys.dm_exec_sessions`.

---

## Notas generales

- **Los datos son reales:** todo sale de DMVs (`sys.dm_exec_*`). No hay datos simulados.
- **Las estadísticas de consultas se reinician** cuando se reinicia la instancia
  o cuando el plan sale de la caché. Justo después de un reinicio, `consultas-top`
  y `tiempo-promedio` pueden venir vacíos o con valores bajos. Conviene generar
  carga (por ejemplo ejecutando consultas pesadas sobre `alquileres`) antes de la demostración.
- **Los parámetros se validan** contra una lista de valores permitidos; el `orden`
  nunca se concatena directamente en el SQL.
- **Permisos:** requiere `VIEW SERVER STATE`, que ya tiene `cine_app`
  (ver `database/06_crear_usuario_app.sql`).

## Pendiente / fuera de alcance de este contrato

- No hay histórico: cada llamada es una foto del momento. Si el frontend quiere
  una gráfica de evolución, debe consultar periódicamente (polling) y guardar los puntos.
- No se incluye la acción de terminar sesiones (`KILL`); `cine_app` es de solo lectura.
