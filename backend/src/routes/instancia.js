// Módulo 1 — Estado general de la instancia del SGBD
// Expone información básica sobre el servidor SQL Server: versión, tiempo
// activo, bases de datos existentes y configuración general.

const express = require('express');
const { getPool } = require('../db');
const router = express.Router();

// GET /api/instancia/version
// Versión y edición del motor.
router.get('/version', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        @@SERVERNAME                               AS servidor,
        SERVERPROPERTY('ProductVersion')            AS version,
        SERVERPROPERTY('ProductLevel')               AS nivel_parche,
        SERVERPROPERTY('Edition')                    AS edicion,
        SERVERPROPERTY('EngineEdition')               AS edicion_motor
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// GET /api/instancia/uptime
// Hace cuánto está arriba la instancia (desde el último arranque del servicio).
router.get('/uptime', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        sqlserver_start_time                                   AS inicio,
        DATEDIFF(MINUTE, sqlserver_start_time, GETDATE())       AS minutos_activo
      FROM sys.dm_os_sys_info
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// GET /api/instancia/bases-datos
// Lista de bases de datos de la instancia con su estado y tamaño aproximado.
router.get('/bases-datos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        d.name                                           AS base_de_datos,
        d.state_desc                                     AS estado,
        d.recovery_model_desc                             AS modelo_recuperacion,
        d.create_date                                    AS fecha_creacion,
        CAST(SUM(mf.size) / 128.0 AS DECIMAL(10,2))      AS tamano_mb
      FROM sys.databases d
      JOIN sys.master_files mf ON mf.database_id = d.database_id
      GROUP BY d.name, d.state_desc, d.recovery_model_desc, d.create_date
      ORDER BY d.name
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// GET /api/instancia/configuracion
// Parámetros generales de configuración del motor (memoria máxima, CPUs, etc.).
router.get('/configuracion', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT name AS parametro, value AS valor_configurado, value_in_use AS valor_actual, description AS descripcion
      FROM sys.configurations
      WHERE name IN ('max server memory (MB)', 'min server memory (MB)', 'max degree of parallelism')
      ORDER BY name
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;