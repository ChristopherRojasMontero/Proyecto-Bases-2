// Conexión compartida a SQL Server.
// Todos los módulos deben usar getPool() en lugar de crear su propia conexión.
//
// Uso en un módulo:
//   const { sql, getPool } = require('../db');
//   const pool = await getPool();
//   const result = await pool.request().query('SELECT ...');
//   return result.recordset;

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'CineStream',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

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

module.exports = { sql, getPool };