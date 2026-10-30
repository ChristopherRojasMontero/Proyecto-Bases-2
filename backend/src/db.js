// Conexión compartida a SQL Server.
// Todos los módulos deben usar getPool() en lugar de crear su propia conexión.
//
// Uso en un módulo:
//   const { sql, getPool } = require('../db');
//   const pool = await getPool();
//   const result = await pool.request().query('SELECT ...');
//   return result.recordset;
//
// Toda la configuración sale de backend/.env (ver .env.example); no hace falta
// tocar este archivo para cambiar de servidor, instancia o base de datos.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const sql = require('mssql');

const faltantes = ['DB_USER', 'DB_PASSWORD'].filter((nombre) => !process.env[nombre]);
if (faltantes.length) {
  console.error(`Faltan variables en backend/.env: ${faltantes.join(', ')}. `
    + 'Copie .env.example como .env y complételo.');
}

const instancia = (process.env.DB_INSTANCE || '').trim();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'CineStream',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

// Con DB_INSTANCE (por ejemplo SQLEXPRESS) se usa el servicio SQL Server Browser
// para encontrar el puerto; sin ella se usa DB_PORT.
if (instancia) config.options.instanceName = instancia;
else config.port = parseInt(process.env.DB_PORT || '1433', 10);

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((err) => {
        poolPromise = null; // permite reintentar si falló
        throw err;
      });
  }
  return poolPromise;
}

function describirConexion() {
  return {
    servidor: config.server,
    instancia: instancia || null,
    puerto: config.port || null,
    base_de_datos: config.database,
    usuario: config.user,
  };
}

module.exports = { sql, getPool, describirConexion };
