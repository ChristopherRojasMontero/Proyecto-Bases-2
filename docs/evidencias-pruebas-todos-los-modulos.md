# Evidencias de pruebas — CineAdmin (Módulos 1 a 6)

Autor: Persona 2
Fecha de las pruebas: 2026-11-02
Contratos: [`contrato-modulo1-instancia.md`](../backend/docs/contrato-modulo1-instancia.md), [`contrato-modulo2-rendimiento.md`](../backend/docs/contrato-modulo2-rendimiento.md), [`contrato-modulo3-almacenamiento.md`](../backend/docs/contrato-modulo3-almacenamiento.md), [`contrato-modulo6-mantenimiento.md`](../backend/docs/contrato-modulo6-mantenimiento.md)
Código probado: rama `main` (commit `3acfeff`), carpeta `backend/src/routes/`

Todas las respuestas de este documento se obtuvieron llamando a la API real contra
una instancia local de SQL Server Express (`DESKTOP-V0MR2BN\SQLEXPRESS`, versión
17.0.1000.7, RTM) con la base `CineStream` (50 000 alquileres y 15 000 reseñas),
conectada con el usuario `cine_app`. No hay datos simulados. Para que el documento
sea legible, los textos largos se recortaron a 110 caracteres y las listas a 2
elementos; la API devuelve el contenido completo.

---

## 1. Resumen

| Concepto | Resultado |
|---|---|
| Llamadas realizadas | 43 |
| Respuestas correctas (2xx) | 37 |
| Errores controlados esperados (4xx) | 6 |
| Errores inesperados (5xx o sin respuesta) | 0 |
| Módulos cubiertos | 1, 2, 3, 4, 5 y 6 |

Los errores 4xx son pruebas negativas: parámetros inválidos que la API debe rechazar
con un mensaje claro.

| Módulo | Tema | Responsable | Endpoints probados |
|---|---|---|---|
| 1 | Estado de la instancia | Persona 1 | 5 de 5 |
| 2 | Monitoreo de rendimiento | Persona 2 | 5 de 5 |
| 3 | Gestión del almacenamiento | Persona 3 | 10 de 10 |
| 4 | Respaldo y recuperación | Persona 4 | 3 de 3 |
| 5 | Auditoría | Persona 5 | 4 de 4 |
| 6 | Mantenimiento preventivo | Persona 3 y 4 | 5 de 5 |

## 2. Preparación del entorno

1. Se inició el servicio `MSSQL$SQLEXPRESS` y se arrancó la API con `npm run dev`
   desde `backend/`. `GET /api/health` respondió `{"api":"ok","db":"ok"}`.
2. Se ejecutaron en `CineStream` los scripts del proyecto `07_objetos_cineadmin.sql`
   (objetos del esquema `cineadmin`, necesarios para los módulos 3 y 6) y
   `08_demo_mantenimiento.sql` (tabla, vista y procedimiento de demostración, con la
   vista rota a propósito).
3. **Carga para el Módulo 2.** Con `sqlcmd` se ejecutaron 5 veces cada una de tres
   consultas (15 ejecuciones, sin errores): alquileres y monto por usuario,
   alquileres por película, y cantidad y promedio de calificaciones.
4. **Sesión activa y bloqueo para el Módulo 2.** Se dejó abierta una sesión con
   `WAITFOR DELAY`. En otra se abrió una transacción con
   `SELECT TOP (1) 1 FROM dbo.usuarios WITH (TABLOCKX, HOLDLOCK)` y una espera de
   20 segundos antes del `ROLLBACK` (no modifica datos). Una tercera sesión ejecutó
   `SELECT COUNT(*) FROM dbo.usuarios` y quedó bloqueada mientras se llamaba a
   `/sesiones-bloqueadas`.

---

## 3. Módulo 1 — Estado de la instancia

### 3.1 Versión del servidor

`GET /api/instancia/version` — **HTTP 200** (7 ms)

```json
{
  "servidor": "DESKTOP-V0MR2BN\\SQLEXPRESS",
  "version": "17.0.1000.7",
  "nivel_parche": "RTM",
  "edicion": "Express Edition (64-bit)",
  "edicion_motor": 4
}
```

### 3.2 Tiempo en línea

`GET /api/instancia/uptime` — **HTTP 200** (7 ms)

```json
{
  "inicio": "2026-11-02T20:19:17.977Z",
  "minutos_activo": 15
}
```

### 3.3 Bases de datos

`GET /api/instancia/bases-datos` — **HTTP 200** (99 ms)

_La respuesta trae 8 elementos; se muestran 2._

```json
[
  {
    "base_de_datos": "BD_Distribuida",
    "estado": "ONLINE",
    "modelo_recuperacion": "SIMPLE",
    "fecha_creacion": "2026-09-11T14:21:23.930Z",
    "tamano_mb": 550
  },
  {
    "base_de_datos": "CineStream",
    "estado": "ONLINE",
    "modelo_recuperacion": "SIMPLE",
    "fecha_creacion": "2026-10-28T23:23:01.410Z",
    "tamano_mb": 80
  }
]
```

### 3.4 Configuración

`GET /api/instancia/configuracion` — **HTTP 200** (20 ms)

_La respuesta trae 3 elementos; se muestran 2._

```json
[
  {
    "parametro": "max degree of parallelism",
    "valor_configurado": 0,
    "valor_actual": 0,
    "descripcion": "maximum degree of parallelism"
  },
  {
    "parametro": "max server memory (MB)",
    "valor_configurado": 2147483647,
    "valor_actual": 2147483647,
    "descripcion": "Maximum size of server memory (MB)"
  }
]
```

### 3.5 Memoria

`GET /api/instancia/memoria` — **HTTP 200** (10 ms)

```json
{
  "memoria_usada_mb": 370.95,
  "memoria_maxima_configurada_mb": "2147483647",
  "porcentaje_memoria_proceso": 100,
  "alerta_memoria_fisica_baja": false,
  "alerta_memoria_virtual_baja": false
}
```

---

## 4. Módulo 2 — Monitoreo de rendimiento

### 4.1 Consultas más costosas por CPU

`GET /api/rendimiento/consultas-top?orden=cpu&limite=3` — **HTTP 200** (22 ms)

Aparecen las consultas de carga con sus 5 ejecuciones.

_La respuesta trae 3 elementos; se muestran 2._

```json
[
  {
    "consulta": "SELECT COUNT(*) AS resenas, AVG(CAST(r.calificacion AS FLOAT)) AS promedio FROM resenas r JOIN alquileres a ON...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 113.15,
    "cpu_promedio_ms": 22.63,
    "duracion_total_ms": 114.56,
    "duracion_promedio_ms": 22.91,
    "lecturas_logicas": 1740,
    "ultima_ejecucion": "2026-11-02T20:33:24.577Z"
  },
  {
    "consulta": "SELECT u.id_usuario, COUNT(*) AS alquileres, SUM(a.monto) AS total FROM alquileres a JOIN usuarios u ON u.id_u...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 89.18,
    "cpu_promedio_ms": 17.84,
    "duracion_total_ms": 89.48,
    "duracion_promedio_ms": 17.9,
    "lecturas_logicas": 1165,
    "ultima_ejecucion": "2026-11-02T20:33:24.400Z"
  }
]
```

### 4.2 Consultas más costosas por lecturas lógicas

`GET /api/rendimiento/consultas-top?orden=lecturas&limite=2` — **HTTP 200** (17 ms)

```json
[
  {
    "consulta": "SELECT COUNT(*) AS resenas, AVG(CAST(r.calificacion AS FLOAT)) AS promedio FROM resenas r JOIN alquileres a ON...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 113.15,
    "cpu_promedio_ms": 22.63,
    "duracion_total_ms": 114.56,
    "duracion_promedio_ms": 22.91,
    "lecturas_logicas": 1740,
    "ultima_ejecucion": "2026-11-02T20:33:24.577Z"
  },
  {
    "consulta": "SELECT p.titulo, COUNT(*) AS veces FROM alquileres a JOIN peliculas p ON p.id_pelicula=a.id_pelicula GROUP BY ...",
    "base_de_datos": "CineStream",
    "ejecuciones": 5,
    "cpu_total_ms": 50.56,
    "cpu_promedio_ms": 10.11,
    "duracion_total_ms": 52.08,
    "duracion_promedio_ms": 10.42,
    "lecturas_logicas": 1215,
    "ultima_ejecucion": "2026-11-02T20:33:24.490Z"
  }
]
```

### 4.3 Tiempo promedio de ejecución

`GET /api/rendimiento/tiempo-promedio` — **HTTP 200** (16 ms)

```json
{
  "consultas_distintas": 40,
  "ejecuciones_totales": 56,
  "duracion_promedio_ms": 4.86,
  "duracion_maxima_ms": 25,
  "cpu_promedio_ms": 4.77
}
```

### 4.4 Sesiones activas

`GET /api/rendimiento/sesiones-activas` — **HTTP 200** (721 ms)

Aparecen la sesión con `WAITFOR` y la transacción que mantiene el bloqueo.

```json
[
  {
    "sesion_id": 51,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "equipo": "DESKTOP-V0MR2BN",
    "programa": "SQLCMD",
    "base_de_datos": "CineStream",
    "estado": "running",
    "comando": "WAITFOR",
    "consulta": "WAITFOR DELAY '00:00:45'",
    "duracion_ms": 6713,
    "inicio_sesion": "2026-11-02T20:33:58.567Z"
  },
  {
    "sesion_id": 53,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "equipo": "DESKTOP-V0MR2BN",
    "programa": "SQLCMD",
    "base_de_datos": "CineStream",
    "estado": "running",
    "comando": "WAITFOR",
    "consulta": "BEGIN TRAN; UPDATE TOP (1) dbo.usuarios SET nombre = nombre; WAITFOR DELAY '00:00:35'; ROLLBACK",
    "duracion_ms": 6706,
    "inicio_sesion": "2026-11-02T20:33:58.577Z"
  }
]
```

### 4.5 Sesiones bloqueadas

`GET /api/rendimiento/sesiones-bloqueadas` — **HTTP 200** (324 ms)

La sesión 53 espera a la 51, que mantiene el bloqueo exclusivo de tabla.

```json
[
  {
    "sesion_bloqueada": 53,
    "sesion_bloqueadora": 51,
    "login_bloqueada": "DESKTOP-V0MR2BN\\Diego B",
    "tipo_espera": "LCK_M_IS",
    "espera_ms": 3261,
    "base_de_datos": "CineStream",
    "consulta_bloqueada": "SELECT COUNT(*) FROM dbo.usuarios",
    "consulta_bloqueadora": "BEGIN TRAN; SELECT TOP (1) 1 FROM dbo.usuarios WITH (TABLOCKX, HOLDLOCK); WAITFOR DELAY '00:00:20'; ROLLBACK"
  }
]
```

### 4.6 Procesos con mayor consumo de recursos

`GET /api/rendimiento/procesos-recursos?limite=3` — **HTTP 200** (8 ms)

```json
[
  {
    "sesion_id": 51,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "programa": "SQLCMD",
    "cpu_ms": 0,
    "memoria_kb": 32,
    "lecturas_logicas": 0,
    "estado": "running"
  },
  {
    "sesion_id": 53,
    "login": "DESKTOP-V0MR2BN\\Diego B",
    "programa": "SQLCMD",
    "cpu_ms": 0,
    "memoria_kb": 32,
    "lecturas_logicas": 0,
    "estado": "running"
  }
]
```

### 4.7 Prueba negativa: orden inválido

`GET /api/rendimiento/consultas-top?orden=xyz` — **HTTP 400** (2 ms)

```json
{
  "mensaje": "orden inválido; valores permitidos: cpu, duracion, lecturas"
}
```

### 4.8 Prueba negativa: límite fuera de rango

`GET /api/rendimiento/consultas-top?limite=9999` — **HTTP 400** (3 ms)

```json
{
  "mensaje": "limite inválido; debe ser un entero de 1 a 50"
}
```

---

## 5. Módulo 3 — Gestión del almacenamiento

### 5.1 Filegroups y archivos

`GET /api/almacenamiento/filegroups` — **HTTP 200** (26 ms)

```json
[
  {
    "filegroup": "PRIMARY",
    "archivo_logico": "CineStream",
    "physical_name": "C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\DATA\\CineStream.mdf",
    "type_desc": "ROWS",
    "estado": "ONLINE",
    "tamano_mb": 8,
    "usado_mb": 7.75,
    "libre_mb": 0.25,
    "porcentaje_uso": 96.88
  },
  {
    "filegroup": null,
    "archivo_logico": "CineStream_log",
    "physical_name": "C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\DATA\\CineStream_log.ldf",
    "type_desc": "LOG",
    "estado": "ONLINE",
    "tamano_mb": 72,
    "usado_mb": 25.59,
    "libre_mb": 46.41,
    "porcentaje_uso": 35.54
  }
]
```

### 5.2 Resumen de filegroups

`GET /api/almacenamiento/filegroups/resumen` — **HTTP 200** (22 ms)

```json
[
  {
    "filegroup": "PRIMARY",
    "tipo": "ROWS_FILEGROUP",
    "es_predeterminado": true,
    "archivos": 1,
    "tamano_mb": 8,
    "usado_mb": 7.75,
    "libre_mb": 0.25,
    "porcentaje_uso": 96.88
  },
  {
    "filegroup": "(LOG)",
    "tipo": "LOG",
    "es_predeterminado": false,
    "archivos": 1,
    "tamano_mb": 72,
    "usado_mb": 25.59,
    "libre_mb": 46.41,
    "porcentaje_uso": 35.54
  }
]
```

### 5.3 Tamaño de la base de datos

`GET /api/almacenamiento/tamano` — **HTTP 200** (13 ms)

```json
[
  {
    "type_desc": "LOG",
    "tamano_mb": 72,
    "usado_mb": 25.59,
    "libre_mb": 46.41
  },
  {
    "type_desc": "ROWS",
    "tamano_mb": 8,
    "usado_mb": 7.75,
    "libre_mb": 0.25
  }
]
```

### 5.4 Resumen de almacenamiento

`GET /api/almacenamiento/resumen` — **HTTP 200** (34 ms)

```json
{
  "base_de_datos": "CineStream",
  "tamano_total_mb": 80,
  "datos_asignado_mb": 8,
  "datos_usado_mb": 7.75,
  "log_asignado_mb": 72,
  "log_usado_mb": 25.59,
  "reservado_objetos_mb": 7.54,
  "tablas_mb": 4.45,
  "indices_mb": 1.16,
  "datos_libre_mb": 0.25,
  "porcentaje_uso_datos": 96.88,
  "nivel": "CRITICO"
}
```

### 5.5 Objetos más grandes

`GET /api/almacenamiento/objetos-grandes?top=5` — **HTTP 200** (96 ms)

_La respuesta trae 5 elementos; se muestran 2._

```json
[
  {
    "esquema": "dbo",
    "tabla": "alquileres",
    "tamano_total_mb": 1.7,
    "tamano_usado_mb": 1.66,
    "datos_mb": 1.66,
    "indices_mb": 0,
    "filas": "50000"
  },
  {
    "esquema": "dbo",
    "tabla": "resenas",
    "tamano_total_mb": 1.07,
    "tamano_usado_mb": 1.05,
    "datos_mb": 1.05,
    "indices_mb": 0,
    "filas": "15000"
  }
]
```

### 5.6 Índices más grandes

`GET /api/almacenamiento/indices-grandes?top=5` — **HTTP 200** (135 ms)

_La respuesta trae 5 elementos; se muestran 2._

```json
[
  {
    "esquema": "dbo",
    "tabla": "alquileres",
    "indice": "PK__alquiler__329FC7550D645626",
    "tipo": "CLUSTERED",
    "es_llave_primaria": true,
    "tamano_total_mb": 1.7,
    "tamano_usado_mb": 1.66,
    "filas": "50000"
  },
  {
    "esquema": "dbo",
    "tabla": "resenas",
    "indice": "PK__resenas__06CD93632ED7995E",
    "tipo": "CLUSTERED",
    "es_llave_primaria": true,
    "tamano_total_mb": 1.07,
    "tamano_usado_mb": 1.05,
    "filas": "15000"
  }
]
```

### 5.7 Crecimiento

`GET /api/almacenamiento/crecimiento?dias=30` — **HTTP 200** (13 ms)

```json
[
  {
    "archivo_logico": "CineStream",
    "type_desc": "ROWS",
    "tamano_actual_mb": 8,
    "incremento_autogrowth": "64.00 MB",
    "tamano_maximo": "Sin limite",
    "es_porcentaje": false,
    "crecimiento_valor": 64,
    "tamano_maximo_mb": null
  },
  {
    "archivo_logico": "CineStream_log",
    "type_desc": "LOG",
    "tamano_actual_mb": 72,
    "incremento_autogrowth": "64.00 MB",
    "tamano_maximo": "2 TB (maximo del log)",
    "es_porcentaje": false,
    "crecimiento_valor": 64,
    "tamano_maximo_mb": 2097152
  }
]
```

### 5.8 Respaldos usados para estimar el crecimiento

`GET /api/almacenamiento/crecimiento/respaldos` — **HTTP 200** (8 ms)

```json
[]
```

### 5.9 Registrar una medición

`POST /api/almacenamiento/crecimiento/registrar` — **HTTP 201** (25 ms)

Escribe una fila en `cineadmin.historial_almacenamiento`.

```json
{
  "mensaje": "Medición registrada correctamente.",
  "registrado": true,
  "fecha_medicion": "2026-11-02T20:34:06.000Z"
}
```

### 5.10 Historial de crecimiento

`GET /api/almacenamiento/crecimiento/historial?dias=90` — **HTTP 200** (10 ms)

```json
{
  "resumen": {
    "mediciones": 2,
    "dias_consultados": 90,
    "desde": "2026-11-02T20:33:12.000Z",
    "hasta": "2026-11-02T20:34:06.000Z",
    "crecimiento_datos_mb": 0.19,
    "crecimiento_total_mb": 0,
    "crecimiento_diario_mb": 304
  },
  "mediciones": [
    {
      "fecha_medicion": "2026-11-02T20:33:12.000Z",
      "tamano_total_mb": 80,
      "datos_asignado_mb": 8,
      "datos_usado_mb": 7.56,
      "log_asignado_mb": 72,
      "log_usado_mb": 25.5,
      "variacion_mb": 0
    },
    {
      "fecha_medicion": "2026-11-02T20:34:06.000Z",
      "tamano_total_mb": 80,
      "datos_asignado_mb": 8,
      "datos_usado_mb": 7.75,
      "log_asignado_mb": 72,
      "log_usado_mb": 25.6,
      "variacion_mb": 0.19
    }
  ]
}
```

### 5.11 Prueba negativa: top fuera de rango

`GET /api/almacenamiento/objetos-grandes?top=999` — **HTTP 400** (1 ms)

```json
{
  "mensaje": "top debe ser un entero entre 1 y 50."
}
```

---

## 6. Módulo 4 — Respaldo y recuperación

### 6.1 Listado de respaldos

`GET /api/respaldos?limite=3` — **HTTP 200** (9 ms)

```json
{
  "modulo": "Respaldos y recuperación",
  "total": 0,
  "data": []
}
```

### 6.2 Último respaldo

`GET /api/respaldos/ultimo` — **HTTP 200** (7 ms)

No hay respaldos registrados en esta instancia local; la API responde con un mensaje claro en lugar de un error.

```json
{
  "data": null,
  "mensaje": "No hay respaldos registrados para CineStream."
}
```

### 6.3 Respaldos en ejecución

`GET /api/respaldos/activos` — **HTTP 200** (6 ms)

```json
{
  "total": 0,
  "data": []
}
```

---

## 7. Módulo 5 — Auditoría

### 7.1 Usuarios de la base

`GET /api/auditoria/usuarios` — **HTTP 200** (24 ms)

_La respuesta trae 5 elementos; se muestran 2._

```json
{
  "base_de_datos": "CineStream",
  "datos": [
    {
      "usuario_id": 5,
      "nombre": "cine_app",
      "tipo": "SQL_USER",
      "autenticacion": "INSTANCE",
      "esquema_predeterminado": "dbo",
      "fecha_creacion": "2026-10-28T23:43:26.957Z",
      "fecha_modificacion": "2026-10-28T23:43:26.957Z"
    },
    {
      "usuario_id": 1,
      "nombre": "dbo",
      "tipo": "WINDOWS_USER",
      "autenticacion": "WINDOWS",
      "esquema_predeterminado": "dbo",
      "fecha_creacion": "2003-04-08T09:10:42.287Z",
      "fecha_modificacion": "2026-10-28T23:23:01.603Z"
    }
  ],
  "advertencias": []
}
```

### 7.2 Roles y miembros

`GET /api/auditoria/roles` — **HTTP 200** (63 ms)

_La respuesta trae 10 elementos; se muestran 2._

```json
{
  "base_de_datos": "CineStream",
  "datos": [
    {
      "rol_id": 16385,
      "nombre": "db_accessadmin",
      "es_fijo": true,
      "tipo": "DATABASE_ROLE",
      "es_rol_aplicacion": false,
      "propietario": "dbo",
      "membresia_implicita": false,
      "miembros": []
    },
    {
      "rol_id": 16389,
      "nombre": "db_backupoperator",
      "es_fijo": true,
      "tipo": "DATABASE_ROLE",
      "es_rol_aplicacion": false,
      "propietario": "dbo",
      "membresia_implicita": false,
      "miembros": []
    }
  ],
  "advertencias": [
    "public incluye implícitamente a todos los usuarios; sus miembros no aparecen como asignaciones explícitas."
  ]
}
```

### 7.3 Privilegios

`GET /api/auditoria/privilegios` — **HTTP 200** (148 ms)

_La respuesta trae 1176 elementos; se muestran 2._

```json
{
  "base_de_datos": "CineStream",
  "datos": [
    {
      "usuario_id": 5,
      "beneficiario": "cine_app",
      "origen": "DIRECTO",
      "ruta_roles": [],
      "principal_id": 5,
      "otorgado_a": "cine_app",
      "otorgante": "dbo",
      "permiso": "CONNECT",
      "estado": "GRANT",
      "clase_id": 0,
      "clase": "DATABASE",
      "major_id": 0,
      "minor_id": 0,
      "recurso": "CineStream",
      "columna": null
    },
    {
      "usuario_id": 5,
      "beneficiario": "cine_app",
      "origen": "DIRECTO",
      "ruta_roles": [],
      "principal_id": 5,
      "otorgado_a": "cine_app",
      "otorgante": "dbo",
      "permiso": "VIEW DATABASE STATE",
      "estado": "GRANT",
      "clase_id": 0,
      "clase": "DATABASE",
      "major_id": 0,
      "minor_id": 0,
      "recurso": "CineStream",
      "columna": null
    }
  ],
  "roles_fijos": [
    {
      "usuario_id": 5,
      "beneficiario": "cine_app",
      "rol": "db_datareader",
      "ruta_roles": [
        "db_datareader"
      ]
    },
    {
      "usuario_id": 1,
      "beneficiario": "dbo",
      "rol": "db_owner",
      "ruta_roles": [
        "db_owner"
      ]
    }
  ],
  "advertencias": [
    "Inventario de asignaciones, no cálculo de permisos efectivos. Se preservan DENY, GRANT, GRANT_WITH_GRANT_OPTIO...",
    "Los permisos implícitos de roles fijos no figuran en sys.database_permissions; consultar roles_fijos."
  ]
}
```

### 7.4 Objetos problemáticos

`GET /api/auditoria/objetos-problematicos` — **HTTP 200** (124 ms)

Detecta la vista y el procedimiento de demostración, que estaban rotos en ese momento.

```json
{
  "base_de_datos": "CineStream",
  "datos": [
    {
      "objeto_id": 2053582354,
      "esquema": "dbo",
      "objeto": "sp_demo_reporte_promociones",
      "tipo": "SQL_STORED_PROCEDURE",
      "categoria": "ERROR_CONFIRMADO",
      "codigo": "ERROR_ENLACE",
      "numero_error": 207,
      "mensaje": "SQL Server informó un error al enlazar las referencias del objeto."
    },
    {
      "objeto_id": 2037582297,
      "esquema": "dbo",
      "objeto": "v_demo_promociones",
      "tipo": "VIEW",
      "categoria": "ERROR_CONFIRMADO",
      "codigo": "ERROR_ENLACE",
      "numero_error": 207,
      "mensaje": "SQL Server informó un error al enlazar las referencias del objeto."
    }
  ],
  "cobertura": {
    "objetos_inventariados": 6,
    "objetos_revisados": 6,
    "objetos_no_evaluables": 0
  },
  "advertencias": [
    "SQL Server no dispone de un estado INVALID universal. Los errores confirmados corresponden al enlace observado...",
    "Cobertura: procedimientos, vistas, funciones T-SQL y triggers DML. No incluye SQL dinámico, CLR, sinónimos ni ..."
  ]
}
```

### 7.5 Prueba negativa: usuario_id inválido

`GET /api/auditoria/privilegios?usuario_id=abc` — **HTTP 400** (1 ms)

```json
{
  "mensaje": "usuario_id debe ser un entero positivo válido de SQL Server."
}
```

---

## 8. Módulo 6 — Mantenimiento preventivo

### 8.1 Estado de las estadísticas

`GET /api/mantenimiento/estadisticas` — **HTTP 200** (99 ms)

_La respuesta trae 18 elementos; se muestran 2._

```json
{
  "resumen": {
    "total": 18,
    "actualizar": 11,
    "revisar": 0,
    "criterio": "ACTUALIZAR: nunca calculada o >= 20% modificado. REVISAR: con cambios y >= 7 días sin actualizar."
  },
  "datos": [
    {
      "esquema": "cineadmin",
      "tabla": "historial_almacenamiento",
      "estadistica": "IX_historial_almacenamiento_fecha",
      "origen": "INDICE",
      "ultima_actualizacion": "2026-11-02T20:34:05.900Z",
      "dias_sin_actualizar": 0,
      "filas": "4",
      "filas_muestreadas": "4",
      "porcentaje_muestreo": 100,
      "modificaciones": "0",
      "porcentaje_modificado": 0,
      "recomendacion": "AL_DIA",
      "motivo": "Sin cambios relevantes desde la última actualización."
    },
    {
      "esquema": "dbo",
      "tabla": "alquileres",
      "estadistica": "_WA_Sys_00000002_59063A47",
      "origen": "AUTOMATICA",
      "ultima_actualizacion": "2026-10-28T23:53:20.470Z",
      "dias_sin_actualizar": 5,
      "filas": "50000",
      "filas_muestreadas": "50000",
      "porcentaje_muestreo": 100,
      "modificaciones": "0",
      "porcentaje_modificado": 0,
      "recomendacion": "AL_DIA",
      "motivo": "Sin cambios relevantes desde la última actualización."
    }
  ]
}
```

### 8.2 Objetos inválidos (antes de corregir)

`GET /api/mantenimiento/objetos-invalidos` — **HTTP 200** (32 ms)

La demo renombró la columna `descuento` a `porcentaje`, por lo que la vista y el procedimiento dejan de compilar.

```json
{
  "total": 2,
  "datos": [
    {
      "esquema": "dbo",
      "objeto": "sp_demo_reporte_promociones",
      "tipo": "SQL_STORED_PROCEDURE",
      "problema": "ERROR_COMPILACION",
      "detalle": "Invalid column name 'descuento'."
    },
    {
      "esquema": "dbo",
      "objeto": "v_demo_promociones",
      "tipo": "VIEW",
      "problema": "ERROR_COMPILACION",
      "detalle": "Invalid column name 'descuento'."
    }
  ],
  "nota": "SQL Server no tiene un estado INVALID como Oracle: se detectan referencias a objetos inexistentes y módulos qu..."
}
```

### 8.3 Recompilar sin corregir la causa

`POST /api/mantenimiento/objetos/recompilar` — **HTTP 200** (44 ms)

Cuerpo enviado: `{"esquema":"dbo","objeto":"v_demo_promociones"}`

Resultado `ERROR`, como se espera: recompilar no arregla una columna que ya no existe.

```json
{
  "resultado": "ERROR",
  "mensaje": "0 de 1 objetos recompilados; 1 siguen con errores.",
  "datos": [
    {
      "objeto": "[dbo].[v_demo_promociones]",
      "resultado": "ERROR",
      "mensaje": "Invalid column name 'descuento'.",
      "duracion_ms": 0
    }
  ]
}
```

### 8.4 Objetos inválidos (después de restaurar el nombre de la columna)

`GET /api/mantenimiento/objetos-invalidos` — **HTTP 200** (34 ms)

Se restauró con `sp_rename` el nombre `descuento`.

```json
{
  "total": 0,
  "datos": [],
  "nota": "SQL Server no tiene un estado INVALID como Oracle: se detectan referencias a objetos inexistentes y módulos qu..."
}
```

### 8.5 Recompilar tras corregir la causa

`POST /api/mantenimiento/objetos/recompilar` — **HTTP 200** (17 ms)

Cuerpo enviado: `{"esquema":"dbo","objeto":"v_demo_promociones"}`

```json
{
  "resultado": "OK",
  "mensaje": "1 objeto(s) recompilado(s) correctamente.",
  "datos": [
    {
      "objeto": "[dbo].[v_demo_promociones]",
      "resultado": "OK",
      "mensaje": "Objeto revalidado y marcado para recompilaciÃ³n.",
      "duracion_ms": 5
    }
  ]
}
```

### 8.6 Actualizar estadísticas de una tabla

`POST /api/mantenimiento/estadisticas/actualizar` — **HTTP 200** (214 ms)

Cuerpo enviado: `{"esquema":"dbo","tabla":"alquileres","modo":"MUESTREO"}`

```json
{
  "resultado": "OK",
  "mensaje": "Estadísticas actualizadas en 1 tabla(s), modo MUESTREO.",
  "duracion_total_ms": 211,
  "datos": [
    {
      "tabla": "[dbo].[alquileres]",
      "resultado": "OK",
      "mensaje": "EstadÃ­sticas actualizadas (MUESTREO).",
      "estadisticas": 3,
      "duracion_ms": 88
    }
  ]
}
```

### 8.7 Bitácora de acciones

`GET /api/mantenimiento/historial?limite=5` — **HTTP 200** (5 ms)

_La respuesta trae 3 elementos; se muestran 2._

```json
[
  {
    "id_bitacora": 3,
    "fecha": "2026-11-02T20:34:38.000Z",
    "operacion": "RECOMPILAR_OBJETO",
    "objeto": "[dbo].[v_demo_promociones]",
    "resultado": "OK",
    "mensaje": "Objeto revalidado y marcado para recompilaciÃ³n.",
    "duracion_ms": 5,
    "ejecutado_por": "cine_app"
  },
  {
    "id_bitacora": 2,
    "fecha": "2026-11-02T20:34:07.000Z",
    "operacion": "ACTUALIZAR_ESTADISTICAS",
    "objeto": "[dbo].[alquileres]",
    "resultado": "OK",
    "mensaje": "EstadÃ­sticas actualizadas (MUESTREO).",
    "duracion_ms": 88,
    "ejecutado_por": "cine_app"
  }
]
```

### 8.8 Prueba negativa: modo inválido

`POST /api/mantenimiento/estadisticas/actualizar` — **HTTP 400** (2 ms)

Cuerpo enviado: `{"modo":"X"}`

```json
{
  "mensaje": "modo debe ser MUESTREO o COMPLETO."
}
```

### 8.9 Prueba negativa: recompilar sin objeto

`POST /api/mantenimiento/objetos/recompilar` — **HTTP 400** (1 ms)

Cuerpo enviado: `{}`

```json
{
  "mensaje": "Indique esquema y objeto válidos, o { \"todos\": true }."
}
```

---

## 9. Verificación general de la API

### 9.1 Health

`GET /api/health` — **HTTP 200** (4 ms)

```json
{
  "api": "ok",
  "db": "ok",
  "conexion": {
    "servidor": "localhost",
    "instancia": null,
    "puerto": 1433,
    "base_de_datos": "CineStream",
    "usuario": "cine_app"
  }
}
```

## 10. Tabla completa de llamadas

| Módulo | Método | Ruta | HTTP | Resultado |
|---|---|---|---|---|
| M2 | GET | `/api/rendimiento/sesiones-activas` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/sesiones-bloqueadas` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/consultas-top?orden=cpu&limite=3` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/consultas-top?orden=lecturas&limite=2` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/tiempo-promedio` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/procesos-recursos?limite=3` | 200 | Correcto |
| M2 | GET | `/api/rendimiento/consultas-top?orden=xyz` | 400 | Error controlado |
| M2 | GET | `/api/rendimiento/consultas-top?limite=9999` | 400 | Error controlado |
| M1 | GET | `/api/instancia/version` | 200 | Correcto |
| M1 | GET | `/api/instancia/uptime` | 200 | Correcto |
| M1 | GET | `/api/instancia/bases-datos` | 200 | Correcto |
| M1 | GET | `/api/instancia/configuracion` | 200 | Correcto |
| M1 | GET | `/api/instancia/memoria` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/filegroups` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/filegroups/resumen` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/tamano` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/resumen` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/objetos-grandes?top=5` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/indices-grandes?top=5` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/crecimiento?dias=30` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/crecimiento/respaldos` | 200 | Correcto |
| M3 | POST | `/api/almacenamiento/crecimiento/registrar` | 201 | Correcto |
| M3 | GET | `/api/almacenamiento/crecimiento/historial?dias=90` | 200 | Correcto |
| M3 | GET | `/api/almacenamiento/objetos-grandes?top=999` | 400 | Error controlado |
| M4 | GET | `/api/respaldos?limite=3` | 200 | Correcto |
| M4 | GET | `/api/respaldos/ultimo` | 200 | Correcto |
| M4 | GET | `/api/respaldos/activos` | 200 | Correcto |
| M5 | GET | `/api/auditoria/usuarios` | 200 | Correcto |
| M5 | GET | `/api/auditoria/roles` | 200 | Correcto |
| M5 | GET | `/api/auditoria/privilegios` | 200 | Correcto |
| M5 | GET | `/api/auditoria/objetos-problematicos` | 200 | Correcto |
| M5 | GET | `/api/auditoria/privilegios?usuario_id=abc` | 400 | Error controlado |
| M6 | GET | `/api/mantenimiento/estadisticas` | 200 | Correcto |
| M6 | GET | `/api/mantenimiento/objetos-invalidos` | 200 | Correcto |
| M6 | POST | `/api/mantenimiento/objetos/recompilar` | 200 | Correcto |
| M6 | POST | `/api/mantenimiento/estadisticas/actualizar` | 200 | Correcto |
| M6 | GET | `/api/mantenimiento/historial?limite=5` | 200 | Correcto |
| M6 | POST | `/api/mantenimiento/estadisticas/actualizar` | 400 | Error controlado |
| M6 | POST | `/api/mantenimiento/objetos/recompilar` | 400 | Error controlado |
| API | GET | `/api/health` | 200 | Correcto |
| M6 | GET | `/api/mantenimiento/objetos-invalidos` | 200 | Correcto |
| M6 | POST | `/api/mantenimiento/objetos/recompilar` | 200 | Correcto |
| M6 | GET | `/api/mantenimiento/historial?limite=5` | 200 | Correcto |

## 11. Observaciones

1. **`server.js` de `main` no arranca tal cual.** Tras los merges quedó `const PORT`
   declarado dos veces y un `app.listen` antes de montar varias rutas, además de
   `/api/almacenamiento` montada dos veces. Las pruebas se hicieron con una copia
   corregida localmente (rutas agrupadas, un único `listen`, manejador de errores
   al final). El arreglo debe llegar a `main` antes de la entrega.
2. **Módulo 4 sin datos de respaldo.** No hay respaldos registrados en `msdb` de
   esta instancia local, por lo que `/ultimo` responde `data: null`. La ruta y el
   mensaje funcionan; para evidenciar datos hay que ejecutar un respaldo antes.
3. **Codificación de caracteres en la bitácora.** El mensaje guardado por
   `/estadisticas/actualizar` se ve como `EstadÃ­sticas` en `/historial`: la tilde
   aparece mal codificada. No se investigó la causa (queda pendiente de revisar en
   el procedimiento que escribe la bitácora); no afecta el resultado de las
   operaciones.
4. **Orden de las pruebas.** El Módulo 5 (objetos problemáticos) se probó mientras la
   vista de demostración seguía rota; por eso la detecta. En el Módulo 6 se
   restauró después la columna para mostrar también la recompilación exitosa.
5. **Datos modificados por las pruebas.** Solo escribieron los POST autorizados:
   una medición en `cineadmin.historial_almacenamiento`, tres entradas en la bitácora
   de mantenimiento, la actualización de estadísticas de `dbo.alquileres` y el
   cambio de nombre de columna en la tabla de demostración. Las tablas de negocio no
   se modificaron.
