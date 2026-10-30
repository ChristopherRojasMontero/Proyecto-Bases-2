const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

// Módulo 4 — Respaldos y recuperación
// Consulta información administrativa registrada por SQL Server.
// No ejecuta respaldos ni restauraciones.

// GET /api/respaldos
// GET /api/respaldos?limite=20
router.get('/', async (req, res) => {
  try {
    const solicitado = Number(req.query.limite || 50);

    const limite = Number.isInteger(solicitado)
      ? Math.min(Math.max(solicitado, 1), 200)
      : 50;

    const pool = await getPool();

    const result = await pool.request()
      .input('limite', sql.Int, limite)
      .query(`
        SELECT TOP (@limite)
          bs.backup_set_id AS id,
          bs.database_name AS base_de_datos,
          CASE bs.type
            WHEN 'D' THEN 'Completo'
            WHEN 'I' THEN 'Diferencial'
            WHEN 'L' THEN 'Log de transacciones'
            ELSE 'Otro'
          END AS tipo_respaldo,
          bs.backup_start_date AS fecha_inicio,
          bs.backup_finish_date AS fecha_fin,
          CAST(
            bs.backup_size / 1048576.0
            AS DECIMAL(12, 2)
          ) AS tamano_mb,
          CAST(
            bs.compressed_backup_size / 1048576.0
            AS DECIMAL(12, 2)
          ) AS tamano_comprimido_mb,
          DATEDIFF(
            SECOND,
            bs.backup_start_date,
            bs.backup_finish_date
          ) AS duracion_segundos,
          (
            SELECT STRING_AGG(
              CONVERT(NVARCHAR(MAX), mf.physical_device_name),
              '; '
            )
            FROM msdb.dbo.backupmediafamily AS mf
            WHERE mf.media_set_id = bs.media_set_id
          ) AS destino,
          'Completado' AS estado
        FROM msdb.dbo.backupset AS bs
        WHERE bs.database_name = N'CineStream'
          AND bs.backup_finish_date IS NOT NULL
        ORDER BY
          bs.backup_start_date DESC,
          bs.backup_set_id DESC;
      `);

    res.json({
      modulo: 'Respaldos y recuperación',
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (err) {
    console.error('Error al consultar respaldos:', err.message);

    res.status(500).json({
      mensaje: 'No se pudo consultar el historial de respaldos.',
      error: err.message
    });
  }
});

// GET /api/respaldos/ultimo
// Obtiene el respaldo completado más reciente de CineStream.
router.get('/ultimo', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP (1)
        backup_set_id AS id,
        database_name AS base_de_datos,
        CASE type
          WHEN 'D' THEN 'Completo'
          WHEN 'I' THEN 'Diferencial'
          WHEN 'L' THEN 'Log de transacciones'
          ELSE 'Otro'
        END AS tipo_respaldo,
        backup_start_date AS fecha_inicio,
        backup_finish_date AS fecha_fin,
        CAST(
          backup_size / 1048576.0
          AS DECIMAL(12, 2)
        ) AS tamano_mb
      FROM msdb.dbo.backupset
      WHERE database_name = N'CineStream'
        AND backup_finish_date IS NOT NULL
      ORDER BY
        backup_start_date DESC,
        backup_set_id DESC;
    `);

    res.json({
      data: result.recordset[0] || null,
      mensaje: result.recordset.length
        ? 'Último respaldo encontrado.'
        : 'No hay respaldos registrados para CineStream.'
    });
  } catch (err) {
    console.error('Error al consultar el último respaldo:', err.message);

    res.status(500).json({
      mensaje: 'No se pudo consultar el último respaldo.',
      error: err.message
    });
  }
});

// GET /api/respaldos/activos
// Consulta respaldos de CineStream que están ejecutándose.
router.get('/activos', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        r.session_id AS id_sesion,
        DB_NAME(r.database_id) AS base_de_datos,
        r.command AS comando,
        r.start_time AS fecha_inicio,
        r.percent_complete AS porcentaje_completado,
        r.estimated_completion_time AS milisegundos_estimados
      FROM sys.dm_exec_requests AS r
      WHERE r.command LIKE 'BACKUP%'
        AND r.database_id = DB_ID(N'CineStream')
      ORDER BY r.start_time DESC;
    `);

    res.json({
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (err) {
    console.error('Error al consultar respaldos activos:', err.message);

    res.status(500).json({
      mensaje: 'No se pudieron consultar los respaldos activos.',
      error: err.message
    });
  }
});

module.exports = router;
  
