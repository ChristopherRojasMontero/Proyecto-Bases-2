# Contrato de API — Módulo 1: Estado general de la instancia

Base: `/api/instancia`
Autor: Persona 1
Estado: probado y funcionando (ver respuestas de ejemplo abajo)

Todas las rutas son `GET`, no requieren parámetros ni autenticación propia
(la API se conecta a SQL Server con el usuario `cine_app`), y devuelven JSON.
Si falla la consulta, cualquier ruta responde `500` con `{ "mensaje": "..." }`.

---

## GET /api/instancia/version

Versión, edición y nombre del servidor.

**Respuesta (200):**
```json
{
  "servidor": "MAKI\\SQLEXPRESS",
  "version": "16.0.1000.6",
  "nivel_parche": "RTM",
  "edicion": "Express Edition (64-bit)",
  "edicion_motor": 4
}
```

| Campo           | Tipo   | Descripción                                   |
|-----------------|--------|------------------------------------------------|
| `servidor`      | string | Nombre del equipo e instancia                  |
| `version`       | string | Versión del motor (build)                      |
| `nivel_parche`  | string | Nivel de parche (RTM, CU, etc.)                |
| `edicion`       | string | Edición de SQL Server                          |
| `edicion_motor` | number | Código numérico de edición (1=Personal, 2=Standard, 3=Enterprise, 4=Express) |

---

## GET /api/instancia/uptime

Tiempo que lleva activa la instancia desde el último arranque del servicio.

**Respuesta (200):**
```json
{
  "inicio": "2026-10-05T14:36:44.557Z",
  "minutos_activo": 309
}
```

| Campo            | Tipo   | Descripción                                |
|------------------|--------|---------------------------------------------|
| `inicio`         | string | Fecha/hora (ISO) del último arranque        |
| `minutos_activo` | number | Minutos transcurridos desde el arranque     |

---

## GET /api/instancia/bases-datos

Lista de todas las bases de datos de la instancia (no solo CineStream).

**Respuesta (200):**
```json
[
  {
    "base_de_datos": "CineStream",
    "estado": "ONLINE",
    "modelo_recuperacion": "SIMPLE",
    "fecha_creacion": "2026-09-23T14:08:18.080Z",
    "tamano_mb": 144
  }
]
```

| Campo                  | Tipo   | Descripción                                      |
|-------------------------|--------|---------------------------------------------------|
| `base_de_datos`        | string | Nombre de la base                                  |
| `estado`               | string | `ONLINE`, `OFFLINE`, `RESTORING`, etc.             |
| `modelo_recuperacion`  | string | `SIMPLE`, `FULL` o `BULK_LOGGED`                   |
| `fecha_creacion`       | string | Fecha/hora (ISO) de creación de la base            |
| `tamano_mb`            | number | Tamaño total (datos + log), en MB                  |

**Nota para el frontend:** esta lista incluye todas las bases de la instancia
local (puede haber otras de pruebas, como `master`, `msdb`, `model`, `tempdb`
u otros proyectos). El dashboard debe decidir si muestra todas o filtra solo
`CineStream` y las bases del sistema.

---

## GET /api/instancia/configuracion

Parámetros generales de configuración del motor.

**Respuesta (200):**
```json
[
  { "parametro": "max degree of parallelism", "valor_configurado": 0, "valor_actual": 0, "descripcion": "..." },
  { "parametro": "max server memory (MB)", "valor_configurado": 2147483647, "valor_actual": 2147483647, "descripcion": "..." },
  { "parametro": "min server memory (MB)", "valor_configurado": 0, "valor_actual": 16, "descripcion": "..." }
]
```

| Campo                | Tipo   | Descripción                                            |
|-----------------------|--------|----------------------------------------------------------|
| `parametro`           | string | Nombre del parámetro de configuración                   |
| `valor_configurado`   | number | Valor configurado (puede requerir `RECONFIGURE`)         |
| `valor_actual`        | number | Valor que está usando el motor ahora mismo               |
| `descripcion`         | string | Descripción del parámetro, tal como la da SQL Server     |

**Nota:** `2147483647` en memoria máxima significa "sin límite configurado"
(es el valor máximo de un INT), no un tamaño real en MB.

---

## Pendiente / fuera de alcance de este contrato

- No se agregó autenticación de usuarios de la API (login): el proyecto no la
  pide; la seguridad es a nivel de la instancia de SQL Server (usuario `cine_app`).
- `/api/instancia/configuracion` solo expone 3 parámetros. Si el frontend
  necesita otros (por ejemplo `cost threshold for parallelism`), agregar el
  nombre a la lista `IN (...)` de la consulta en `routes/instancia.js`.
