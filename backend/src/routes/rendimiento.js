// Módulo 2: Monitoreo de rendimiento. Contrato: backend/docs/contrato-modulo2-rendimiento.md
const express = require('express');
const { sql, getPool } = require('../db');
const { responderError } = require('../errores');
const router = express.Router();

const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 50;

// El criterio de orden nunca se concatena desde la petición: solo se elige de esta lista.
const ORDEN_CONSULTAS = {
  cpu: 'qs.total_worker_time',
  duracion: 'qs.total_elapsed_time',
  lecturas: 'qs.total_logical_reads'
};
const ORDEN_PROCESOS = {
  cpu: 's.cpu_time',
  memoria: 's.memory_usage'
};

// Devuelve { limite, columna } o { error } si algún parámetro no es válido.
function leerParametros(query, opcionesOrden) {
  const orden = query.orden === undefined ? 'cpu' : query.orden;
  if (!Object.prototype.hasOwnProperty.call(opcionesOrden, orden)) {
    return { error: `orden inválido; valores permitidos: ${Object.keys(opcionesOrden).join(', ')}` };
  }
  let limite = LIMITE_POR_DEFECTO;
  if (query.limite !== undefined) {
    if (!/^\d+$/.test(query.limite)) {
      return { error: `limite inválido; debe ser un entero de 1 a ${LIMITE_MAXIMO}` };
    }
    limite = parseInt(query.limite, 10);
    if (limite < 1 || limite > LIMITE_MAXIMO) {
      return { error: `limite inválido; debe ser un entero de 1 a ${LIMITE_MAXIMO}` };
    }
  }
  return { limite, columna: opcionesOrden[orden] };
}

router.get('/consultas-top', async (req, res) => {
  const p = leerParametros(req.query, ORDEN_CONSULTAS);
  if (p.error) return res.status(400).json({ mensaje: p.error });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('limite', sql.Int, p.limite)
      .query(`
        SELECT TOP (@limite)
               LEFT(SUBSTRING(st.text, (qs.statement_start_offset / 2) + 1,
                    ((CASE qs.statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
                      ELSE qs.statement_end_offset END - qs.statement_start_offset) / 2) + 1), 500) AS consulta,
               DB_NAME(pa.dbid) AS base_de_datos,
               CAST(qs.execution_count AS DECIMAL(20,0)) AS ejecuciones,
               CAST(qs.total_worker_time / 1000.0 AS DECIMAL(18,2)) AS cpu_total_ms,
               CAST(qs.total_worker_time / 1000.0 / qs.execution_count AS DECIMAL(18,2)) AS cpu_promedio_ms,
               CAST(qs.total_elapsed_time / 1000.0 AS DECIMAL(18,2)) AS duracion_total_ms,
               CAST(qs.total_elapsed_time / 1000.0 / qs.execution_count AS DECIMAL(18,2)) AS duracion_promedio_ms,
               CAST(qs.total_logical_reads AS DECIMAL(20,0)) AS lecturas_logicas,
               qs.last_execution_time AS ultima_ejecucion
        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
        OUTER APPLY (SELECT CONVERT(INT, value) AS dbid
                     FROM sys.dm_exec_plan_attributes(qs.plan_handle)
                     WHERE attribute = 'dbid') pa
        ORDER BY ${p.columna} DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    responderError(res, err, 'consultar rendimiento');
  }
});

router.get('/tiempo-promedio', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COUNT(*) AS consultas_distintas,
             CAST(ISNULL(SUM(execution_count), 0) AS DECIMAL(20,0)) AS ejecuciones_totales,
             CAST(SUM(total_elapsed_time) / 1000.0 / NULLIF(SUM(execution_count), 0) AS DECIMAL(18,2)) AS duracion_promedio_ms,
             CAST(MAX(max_elapsed_time) / 1000.0 AS DECIMAL(18,2)) AS duracion_maxima_ms,
             CAST(SUM(total_worker_time) / 1000.0 / NULLIF(SUM(execution_count), 0) AS DECIMAL(18,2)) AS cpu_promedio_ms
      FROM sys.dm_exec_query_stats
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    responderError(res, err, 'consultar rendimiento');
  }
});

router.get('/sesiones-activas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.session_id AS sesion_id,
             s.login_name AS login,
             s.host_name AS equipo,
             s.program_name AS programa,
             DB_NAME(s.database_id) AS base_de_datos,
             s.status AS estado,
             r.command AS comando,
             LEFT(t.text, 500) AS consulta,
             ISNULL(r.total_elapsed_time, 0) AS duracion_ms,
             s.login_time AS inicio_sesion
      FROM sys.dm_exec_sessions s
      LEFT JOIN sys.dm_exec_requests r ON r.session_id = s.session_id
      OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t
      WHERE s.is_user_process = 1 AND s.session_id <> @@SPID
      ORDER BY s.session_id
    `);
    res.json(result.recordset);
  } catch (err) {
    responderError(res, err, 'consultar rendimiento');
  }
});

router.get('/sesiones-bloqueadas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT r.session_id AS sesion_bloqueada,
             r.blocking_session_id AS sesion_bloqueadora,
             s.login_name AS login_bloqueada,
             r.wait_type AS tipo_espera,
             r.wait_time AS espera_ms,
             DB_NAME(r.database_id) AS base_de_datos,
             LEFT(t.text, 500) AS consulta_bloqueada,
             LEFT(bt.text, 500) AS consulta_bloqueadora
      FROM sys.dm_exec_requests r
      JOIN sys.dm_exec_sessions s ON s.session_id = r.session_id
      OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t
      LEFT JOIN sys.dm_exec_connections c ON c.session_id = r.blocking_session_id
      OUTER APPLY sys.dm_exec_sql_text(c.most_recent_sql_handle) bt
      WHERE r.blocking_session_id <> 0
      ORDER BY r.wait_time DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    responderError(res, err, 'consultar rendimiento');
  }
});

router.get('/procesos-recursos', async (req, res) => {
  const p = leerParametros(req.query, ORDEN_PROCESOS);
  if (p.error) return res.status(400).json({ mensaje: p.error });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('limite', sql.Int, p.limite)
      .query(`
        SELECT TOP (@limite)
               s.session_id AS sesion_id,
               s.login_name AS login,
               s.program_name AS programa,
               s.cpu_time AS cpu_ms,
               s.memory_usage * 8 AS memoria_kb,
               CAST(s.logical_reads AS DECIMAL(20,0)) AS lecturas_logicas,
               s.status AS estado
        FROM sys.dm_exec_sessions s
        WHERE s.is_user_process = 1 AND s.session_id <> @@SPID
        ORDER BY ${p.columna} DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    responderError(res, err, 'consultar rendimiento');
  }
});

module.exports = router;
