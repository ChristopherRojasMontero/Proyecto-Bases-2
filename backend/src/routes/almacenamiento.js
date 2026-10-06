const express = require('express');
const { getPool } = require('../db');
const router = express.Router();

router.get('/filegroups', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT fg.name AS filegroup, df.name AS archivo_logico, df.physical_name,
             df.type_desc,
             CAST(df.size/128.0 AS DECIMAL(10,2)) AS tamano_mb,
             CAST(FILEPROPERTY(df.name, 'SpaceUsed')/128.0 AS DECIMAL(10,2)) AS usado_mb,
             CAST((df.size - FILEPROPERTY(df.name, 'SpaceUsed'))/128.0 AS DECIMAL(10,2)) AS libre_mb
      FROM sys.database_files df
      LEFT JOIN sys.filegroups fg ON df.data_space_id = fg.data_space_id
      ORDER BY df.type_desc
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

router.get('/tamano', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT type_desc, CAST(SUM(size)/128.0 AS DECIMAL(10,2)) AS tamano_mb
      FROM sys.database_files
      GROUP BY type_desc
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

router.get('/objetos-grandes', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 10 t.name AS tabla,
             SUM(a.total_pages) * 8 / 1024.0 AS tamano_total_mb,
             SUM(a.used_pages) * 8 / 1024.0 AS tamano_usado_mb,
             SUM(p.rows) AS filas
      FROM sys.tables t
      JOIN sys.indexes i ON t.object_id = i.object_id
      JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0
      GROUP BY t.name
      ORDER BY tamano_total_mb DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

router.get('/crecimiento', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT name AS archivo_logico, type_desc,
             CAST(size/128.0 AS DECIMAL(10,2)) AS tamano_actual_mb,
             CASE WHEN is_percent_growth = 1
                  THEN CAST(growth AS VARCHAR) + ' %'
                  ELSE CAST(growth/128.0 AS VARCHAR) + ' MB' END AS incremento_autogrowth,
             CASE WHEN max_size = -1 THEN 'Sin limite'
                  ELSE CAST(max_size/128.0 AS VARCHAR) + ' MB' END AS tamano_maximo
      FROM sys.database_files
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;