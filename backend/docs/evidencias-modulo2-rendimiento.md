# Evidencias de pruebas — Módulo 2: Monitoreo de rendimiento

Autor: Persona 2
Fecha de las pruebas: 2026-10-29
Contrato: [`contrato-modulo2-rendimiento.md`](contrato-modulo2-rendimiento.md)
Código: `backend/src/routes/rendimiento.js`

Todas las respuestas de este documento fueron obtenidas llamando a la API real
contra una instancia local de SQL Server Express (`SQLEXPRESS`, SQL Server 17.0)
con la base `CineStream` (50 000 alquileres y 15 000 reseñas), conectada con el
usuario `cine_app`. No hay datos simulados. Los textos de consulta largos se
recortaron a 120 caracteres solo para este documento (la API los devuelve hasta
500).

---

## 1. Preparación de las pruebas

1. La API se inició con `npm start` desde `backend/` y se abrió su conexión a
   `CineStream` con `GET /api/health` (respuesta `{"api":"ok","db":"ok"}`).
2. **Carga de consultas.** Con `sqlcmd` se ejecutaron 5 veces cada una de estas
   tres consultas sobre `CineStream` (15 ejecuciones en total, sin errores):
   - Alquileres y monto total por usuario (`alquileres` ⨝ `usuarios`).
   - Cantidad de alquileres por película (`alquileres` ⨝ `peliculas`).
   - Cantidad y promedio de calificaciones (`resenas` ⨝ `alquileres`).
3. **Sesión activa.** Se dejó abierta una sesión con `WAITFOR DELAY '00:00:25'`
   mientras se llamaba a los endpoints de sesiones.
4. **Bloqueo.** En una sesión se abrió una transacción que tomó un bloqueo
   exclusivo sobre `dbo.usuarios` y esperó 12 segundos antes de hacer
   `ROLLBACK` (no modifica datos). Mientras tanto, otra sesión ejecutó
   `SELECT COUNT(*) FROM dbo.usuarios` y quedó bloqueada.

---

## 2. Resultados por endpoint

### 2.1 `GET /api/rendimiento/consultas-top?orden=cpu&limite=3` — HTTP 200

Devuelve las tres consultas con más CPU acumulada. Aparecen las consultas de
carga con sus 5 ejecuciones.

```json
[
  {
    "consulta": "SELECT COUNT(*) AS resenas, AVG(CAST(r.calificacion AS FLOAT)) AS promedio FROM resenas r JOIN alquileres a ON a.id_usua...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 205.32,
    "cpu_promedio_ms": 41.06,
    "duracion_total_ms": 205.52,
    "duracion_promedio_ms": 41.1,
    "lecturas_logicas": 1740,
    "ultima_ejecucion": "2026-10-29T00:19:19.797Z"
  },
  {
    "consulta": "SELECT u.id_usuario, COUNT(*) AS alquileres, SUM(a.monto) AS total FROM alquileres a JOIN usuarios u ON u.id_usuario=a.i...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 184.21,
    "cpu_promedio_ms": 36.84,
    "duracion_total_ms": 184.61,
    "duracion_promedio_ms": 36.92,
    "lecturas_logicas": 1165,
    "ultima_ejecucion": "2026-10-29T00:19:19.467Z"
  },
  {
    "consulta": "SELECT p.titulo, COUNT(*) AS veces FROM alquileres a JOIN peliculas p ON p.id_pelicula=a.id_pelicula GROUP BY p.titulo O...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 96.49,
    "cpu_promedio_ms": 19.3,
    "duracion_total_ms": 97.94,
    "duracion_promedio_ms": 19.59,
    "lecturas_logicas": 1215,
    "ultima_ejecucion": "2026-10-29T00:19:19.647Z"
  }
]
```

Con `orden=duracion` el resultado fue el mismo orden (reseñas, usuarios,
películas). Con `orden=lecturas` el orden cambió a reseñas (1740), películas
(1215) y usuarios (1165), lo que confirma que cada criterio ordena por su
propia columna. Las tres respuestas fueron HTTP 200.

### 2.2 `GET /api/rendimiento/tiempo-promedio` — HTTP 200

```json
{
  "consultas_distintas": 10,
  "ejecuciones_totales": 22,
  "duracion_promedio_ms": 22.9,
  "duracion_maxima_ms": 47.4,
  "cpu_promedio_ms": 22.78
}
```

### 2.3 `GET /api/rendimiento/sesiones-activas` — HTTP 200

Muestra la sesión de `sqlcmd` que estaba ejecutando `WAITFOR`. No aparece la
sesión de la propia consulta.

```json
[
  {
    "sesion_id": 58,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "equipo": "DESKTOP-V0MR2BN",
    "programa": "SQLCMD",
    "base_de_datos": "CineStream",
    "estado": "running",
    "comando": "WAITFOR",
    "consulta": "WAITFOR DELAY '00:00:25'",
    "duracion_ms": 1628,
    "inicio_sesion": "2026-10-29T00:19:19.963Z"
  }
]
```

### 2.4 `GET /api/rendimiento/procesos-recursos` — HTTP 200

Con `orden=cpu&limite=3` y con `orden=memoria&limite=3` devolvió la única sesión
de usuario existente en ese momento:

```json
[
  {
    "sesion_id": 58,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "programa": "SQLCMD",
    "cpu_ms": 0,
    "memoria_kb": 32,
    "lecturas_logicas": 0,
    "estado": "running"
  }
]
```

Nota: con una sola sesión de usuario no se puede comprobar el orden entre
varias filas; esa parte no está demostrada con esta captura (ver sección 5).

### 2.5 `GET /api/rendimiento/sesiones-bloqueadas`

**Sin bloqueos — HTTP 200:**

```json
[]
```

**Con el bloqueo provocado — HTTP 200:**

```json
[
  {
    "sesion_bloqueada": 59,
    "sesion_bloqueadora": 58,
    "login_bloqueada": "DESKTOP-V0MR2BN\\Diego B",
    "tipo_espera": "LCK_M_IS",
    "espera_ms": 3092,
    "base_de_datos": "CineStream",
    "consulta_bloqueada": "SELECT COUNT(*) FROM dbo.usuarios",
    "consulta_bloqueadora": "BEGIN TRAN; SELECT TOP 1 * FROM dbo.usuarios WITH (TABLOCKX, HOLDLOCK); WAITFOR DELAY '00:00:12'; ROLLBACK"
  }
]
```

La sesión 59 espera a la 58 con una espera de tipo `LCK_M_IS` (bloqueo
compartido de intención), y se identifican ambas consultas.

---

## 3. Validación de parámetros

Cada petición con un parámetro inválido respondió HTTP 400 con un mensaje, sin
ejecutar ninguna consulta SQL.

| Petición                                  | HTTP | Respuesta                                                        |
|-------------------------------------------|------|-------------------------------------------------------------------|
| `consultas-top?orden=xyz`                 | 400  | `orden inválido; valores permitidos: cpu, duracion, lecturas`     |
| `consultas-top?limite=0`                  | 400  | `limite inválido; debe ser un entero de 1 a 50`                   |
| `consultas-top?limite=51`                 | 400  | `limite inválido; debe ser un entero de 1 a 50`                   |
| `consultas-top?limite=abc`                | 400  | `limite inválido; debe ser un entero de 1 a 50`                   |
| `procesos-recursos?orden=duracion`        | 400  | `orden inválido; valores permitidos: cpu, memoria`                |

También se probó `orden=constructor` (nombre heredado de los objetos de
JavaScript) y fue rechazado con HTTP 400. El valor de `orden` nunca se escribe
directamente en el SQL: se elige de una lista fija.

---

## 4. Hallazgos durante las pruebas

1. **Números como texto (corregido).** Los campos `bigint` (`ejecuciones`,
   `lecturas_logicas`, `ejecuciones_totales`) llegaban como texto (`"1"`), y el
   contrato indica `number`. Se corrigió convirtiéndolos con
   `CAST(... AS DECIMAL(20,0))`. Tras el cambio, los campos numéricos llegan
   como número en `consultas-top`, `tiempo-promedio`, `procesos-recursos` y
   `sesiones-activas`.
2. **Estadísticas vacías justo después de arrancar el servicio.** Con el motor
   recién iniciado, `consultas-top?orden=cpu` devolvió `[]` y las consultas
   ejecutadas no aparecían. Es esperado: `sys.dm_exec_query_stats` empieza
   vacía al reiniciar la instancia (ya lo advierte el contrato).
3. **`AUTO_CLOSE` activado en `CineStream`.** La base tiene la opción
   `AUTO_CLOSE` activada (valor por defecto en SQL Server Express). Cuando se
   cierra la última conexión a la base, SQL Server la cierra y descarta de
   memoria los planes de sus consultas, por lo que sus estadísticas
   desaparecen. En las pruebas, las consultas de carga no aparecieron hasta que
   la API mantuvo una conexión abierta a `CineStream`. En una demostración
   conviene tener la API conectada antes de generar carga. La opción puede
   desactivarse con `ALTER DATABASE CineStream SET AUTO_CLOSE OFF;`, pero esa
   decisión corresponde al equipo y no se aplicó.
4. **Consultas internas de herramientas.** Cuando SSMS tiene abierto el
   explorador de objetos, sus consultas internas pueden dominar `consultas-top`
   (aparecían con bases `master`). Es información real de la instancia.

---

## 5. Lo que no queda demostrado

- El orden entre varias filas en `procesos-recursos` (en la captura final solo
  había una sesión de usuario). Se comprobó el orden en `consultas-top`.
- El valor por defecto de `limite` (10) no se verificó con un conteo exacto de
  filas.
- No se midió el comportamiento con una carga alta ni con muchas sesiones.

---

## 6. Cómo reproducir las pruebas

1. Tener SQL Server en el puerto 1433, la base `CineStream` y el usuario
   `cine_app` (ver `database/README.md`) y el `.env` del backend completo.
2. Desde `backend/`: `npm start`, y comprobar `GET /api/health`.
3. Ejecutar varias veces consultas pesadas sobre `alquileres` desde SSMS o
   `sqlcmd`, con la API ya conectada.
4. Llamar a los endpoints del punto 2 (por ejemplo con `curl`).
5. Para el bloqueo: en SSMS, sesión A: `BEGIN TRAN; SELECT TOP 1 * FROM dbo.usuarios WITH (TABLOCKX, HOLDLOCK);`
   (sin cerrar la transacción). Sesión B: `SELECT COUNT(*) FROM dbo.usuarios;`.
   Llamar a `sesiones-bloqueadas` y, al terminar, ejecutar `ROLLBACK` en la sesión A.
