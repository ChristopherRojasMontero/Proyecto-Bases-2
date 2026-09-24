# Backend de CineAdmin

API en Node.js + Express que consulta directamente una instancia de SQL Server
(vistas de administración dinámica, catálogos y `msdb`) y expone los resultados
a la aplicación web.

## Requisitos previos

1. **Node.js** 18 o superior (probado con v24).
2. La base de datos y el usuario `cine_app` ya creados en SQL Server.
   Ver [`../database/README.md`](../database/README.md), Partes A, B y C.

## Instalación

Desde esta carpeta (`backend/`):

```
npm install
```

## Configuración

1. Copiar la plantilla:
   ```
   copy .env.example .env
   ```
2. Abrir `.env` y completar `DB_PASSWORD` con la contraseña de `cine_app`
   que se eligió al ejecutar `06_crear_usuario_app.sql`.
3. Guardar. El archivo `.env` **nunca se sube a Git**.

| Variable        | Descripción                                    | Valor típico |
|-----------------|------------------------------------------------|--------------|
| `DB_SERVER`     | Servidor SQL Server                            | `localhost`  |
| `DB_PORT`       | Puerto TCP                                     | `1433`       |
| `DB_NAME`       | Base de datos                                  | `CineStream` |
| `DB_USER`       | Usuario de la aplicación                       | `cine_app`   |
| `DB_PASSWORD`   | Contraseña (solo en tu `.env` local)           |              |
| `DB_TRUST_CERT` | Confiar en el certificado local de SQL Server  | `true`       |
| `PORT`          | Puerto de la API                               | `3000`       |

## Comandos

| Comando            | Qué hace                                                       |
|--------------------|----------------------------------------------------------------|
| `npm run test:db`  | Prueba la conexión y mide el tiempo de tres consultas          |
| `npm run dev`      | Inicia la API y la reinicia al guardar cambios                 |
| `npm start`        | Inicia la API                                                  |

Con la API corriendo, `http://localhost:3000/api/health` debe responder
`{"api":"ok","db":"ok"}`.

## Estructura

```
backend/
  .env.example         plantilla de configuración (sin credenciales)
  package.json
  src/
    db.js              conexión compartida a SQL Server
    server.js          servidor Express; aquí se registran las rutas
    test-connection.js prueba de conexión
```

## Cómo usar la conexión en un módulo

No crear conexiones propias: usar siempre `getPool()` de `db.js`.

```js
const { sql, getPool } = require('../db');

async function obtenerVersion() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT @@VERSION AS version');
  return result.recordset;
}
```

Para consultas con parámetros, usar `.input()` y no concatenar texto:

```js
const result = await pool.request()
  .input('dias', sql.Int, 30)
  .query('SELECT * FROM dbo.alquileres WHERE fecha_alquiler > DATEADD(DAY, -@dias, GETDATE())');
```

## Problemas frecuentes

| Mensaje / síntoma                                   | Causa y solución |
|-----------------------------------------------------|------------------|
| `injected env (0) from .env`                        | El `.env` está vacío o sin guardar. Completarlo y guardar. |
| `self-signed certificate`                           | Falta `DB_TRUST_CERT=true` en el `.env`. |
| `Login failed for user 'cine_app'`                  | Contraseña incorrecta, o falta activar el modo mixto (ver `database/README.md`, A2). |
| `Failed to connect to localhost:1433`               | TCP/IP no habilitado o el servicio no se reinició (ver `database/README.md`, A1 y A3). |
| La conexión tarda ~5 segundos                       | Puede ocurrir por la resolución de `localhost`. Probar `DB_SERVER=127.0.0.1`. Funciona igual. |
| `Failed to cancel request in 5000ms`                | Una consulta superó el tiempo máximo. Revisar si otra sesión bloquea la tabla con `sys.dm_exec_requests`. |