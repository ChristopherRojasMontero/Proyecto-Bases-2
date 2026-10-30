// Módulo 3 — Gestión del almacenamiento: consultas administrativas.
// Todas las consultas trabajan sobre la base configurada en DB_NAME (.env).
const { sql, getPool } = require('../db');

async function consultar(texto, parametros = []) {
  const pool = await getPool();
  const request = pool.request();
  for (const [nombre, tipo, valor] of parametros) request.input(nombre, tipo, valor);
  const result = await request.query(texto);
  return result.recordset;
}

// Archivos de la base (datos y log) con el espacio asignado, usado y libre.
function obtenerArchivos() {
  return consultar(`
    SELECT fg.name AS filegroup,
           df.name AS archivo_logico,
           df.physical_name,
           df.type_desc,
           df.state_desc AS estado,
           CAST(df.size / 128.0 AS DECIMAL(12,2)) AS tamano_mb,
           CAST(FILEPROPERTY(df.name, 'SpaceUsed') / 128.0 AS DECIMAL(12,2)) AS usado_mb,
           CAST((df.size - FILEPROPERTY(df.name, 'SpaceUsed')) / 128.0 AS DECIMAL(12,2)) AS libre_mb,
           CAST(100.0 * FILEPROPERTY(df.name, 'SpaceUsed') / NULLIF(df.size, 0) AS DECIMAL(5,2)) AS porcentaje_uso
    FROM sys.database_files df
    LEFT JOIN sys.filegroups fg ON df.data_space_id = fg.data_space_id
    ORDER BY df.type_desc DESC, df.file_id`);
}

// Espacio por filegroup (suma de sus archivos). El log no pertenece a un filegroup.
function obtenerResumenFilegroups() {
  return consultar(`
    SELECT ISNULL(fg.name, '(LOG)') AS filegroup,
           ISNULL(fg.type_desc, 'LOG') AS tipo,
           CAST(ISNULL(fg.is_default, 0) AS BIT) AS es_predeterminado,
           COUNT(*) AS archivos,
           CAST(SUM(df.size) / 128.0 AS DECIMAL(12,2)) AS tamano_mb,
           CAST(SUM(FILEPROPERTY(df.name, 'SpaceUsed')) / 128.0 AS DECIMAL(12,2)) AS usado_mb,
           CAST(SUM(df.size - FILEPROPERTY(df.name, 'SpaceUsed')) / 128.0 AS DECIMAL(12,2)) AS libre_mb,
           CAST(100.0 * SUM(FILEPROPERTY(df.name, 'SpaceUsed')) / NULLIF(SUM(df.size), 0) AS DECIMAL(5,2)) AS porcentaje_uso
    FROM sys.database_files df
    LEFT JOIN sys.filegroups fg ON df.data_space_id = fg.data_space_id
    GROUP BY fg.name, fg.type_desc, fg.is_default
    ORDER BY tipo DESC, filegroup`);
}

// Tamaño por tipo de archivo (ROWS = datos, LOG = registro de transacciones).
function obtenerTamanoPorTipo() {
  return consultar(`
    SELECT type_desc,
           CAST(SUM(size) / 128.0 AS DECIMAL(12,2)) AS tamano_mb,
           CAST(SUM(FILEPROPERTY(name, 'SpaceUsed')) / 128.0 AS DECIMAL(12,2)) AS usado_mb,
           CAST(SUM(size - FILEPROPERTY(name, 'SpaceUsed')) / 128.0 AS DECIMAL(12,2)) AS libre_mb
    FROM sys.database_files
    GROUP BY type_desc`);
}

// Resumen tipo sp_spaceused: tamaño total y cómo se reparte el espacio de datos.
async function obtenerResumen() {
  const filas = await consultar(`
    SELECT DB_NAME() AS base_de_datos,
           CAST(SUM(size) / 128.0 AS DECIMAL(12,2)) AS tamano_total_mb,
           CAST(SUM(CASE WHEN type_desc = 'ROWS' THEN size ELSE 0 END) / 128.0 AS DECIMAL(12,2)) AS datos_asignado_mb,
           CAST(SUM(CASE WHEN type_desc = 'ROWS' THEN FILEPROPERTY(name, 'SpaceUsed') ELSE 0 END) / 128.0 AS DECIMAL(12,2)) AS datos_usado_mb,
           CAST(SUM(CASE WHEN type_desc = 'LOG' THEN size ELSE 0 END) / 128.0 AS DECIMAL(12,2)) AS log_asignado_mb,
           CAST(SUM(CASE WHEN type_desc = 'LOG' THEN FILEPROPERTY(name, 'SpaceUsed') ELSE 0 END) / 128.0 AS DECIMAL(12,2)) AS log_usado_mb
    FROM sys.database_files`);
  const objetos = await consultar(`
    SELECT CAST(SUM(reserved_page_count) * 8 / 1024.0 AS DECIMAL(12,2)) AS reservado_objetos_mb,
           CAST(SUM(CASE WHEN index_id IN (0, 1) THEN used_page_count ELSE 0 END) * 8 / 1024.0 AS DECIMAL(12,2)) AS tablas_mb,
           CAST(SUM(CASE WHEN index_id > 1 THEN used_page_count ELSE 0 END) * 8 / 1024.0 AS DECIMAL(12,2)) AS indices_mb
    FROM sys.dm_db_partition_stats`);
  const resumen = { ...filas[0], ...objetos[0] };
  const asignado = Number(resumen.datos_asignado_mb) || 0;
  const usado = Number(resumen.datos_usado_mb) || 0;
  resumen.datos_libre_mb = Number((asignado - usado).toFixed(2));
  resumen.porcentaje_uso_datos = asignado ? Number((usado * 100 / asignado).toFixed(2)) : 0;
  resumen.nivel = resumen.porcentaje_uso_datos >= 90 ? 'CRITICO'
    : resumen.porcentaje_uso_datos >= 75 ? 'ADVERTENCIA' : 'NORMAL';
  return resumen;
}

// Tablas de usuario con más espacio reservado (datos + índices).
function obtenerTablasGrandes(top) {
  return consultar(`
    SELECT TOP (@top)
           s.name AS esquema,
           t.name AS tabla,
           CAST(SUM(ps.reserved_page_count) * 8 / 1024.0 AS DECIMAL(12,2)) AS tamano_total_mb,
           CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS DECIMAL(12,2)) AS tamano_usado_mb,
           CAST(SUM(CASE WHEN ps.index_id IN (0, 1) THEN ps.used_page_count ELSE 0 END) * 8 / 1024.0 AS DECIMAL(12,2)) AS datos_mb,
           CAST(SUM(CASE WHEN ps.index_id > 1 THEN ps.used_page_count ELSE 0 END) * 8 / 1024.0 AS DECIMAL(12,2)) AS indices_mb,
           SUM(CASE WHEN ps.index_id IN (0, 1) THEN ps.row_count ELSE 0 END) AS filas
    FROM sys.dm_db_partition_stats ps
    JOIN sys.tables t ON t.object_id = ps.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    GROUP BY s.name, t.name
    ORDER BY tamano_total_mb DESC, filas DESC`, [['top', sql.Int, top]]);
}

// Índices (y heaps) con más espacio reservado.
function obtenerIndicesGrandes(top) {
  return consultar(`
    SELECT TOP (@top)
           s.name AS esquema,
           t.name AS tabla,
           ISNULL(i.name, '(HEAP)') AS indice,
           i.type_desc AS tipo,
           i.is_primary_key AS es_llave_primaria,
           CAST(SUM(ps.reserved_page_count) * 8 / 1024.0 AS DECIMAL(12,2)) AS tamano_total_mb,
           CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS DECIMAL(12,2)) AS tamano_usado_mb,
           SUM(ps.row_count) AS filas
    FROM sys.dm_db_partition_stats ps
    JOIN sys.indexes i ON i.object_id = ps.object_id AND i.index_id = ps.index_id
    JOIN sys.tables t ON t.object_id = ps.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    GROUP BY s.name, t.name, i.name, i.type_desc, i.is_primary_key
    ORDER BY tamano_total_mb DESC, filas DESC`, [['top', sql.Int, top]]);
}

// Configuración de autogrowth y tamaño máximo de cada archivo.
function obtenerConfiguracionCrecimiento() {
  return consultar(`
    SELECT name AS archivo_logico,
           type_desc,
           CAST(size / 128.0 AS DECIMAL(12,2)) AS tamano_actual_mb,
           CASE WHEN growth = 0 THEN 'Deshabilitado'
                WHEN is_percent_growth = 1 THEN CAST(growth AS VARCHAR(10)) + ' %'
                ELSE CAST(CAST(growth / 128.0 AS DECIMAL(12,2)) AS VARCHAR(20)) + ' MB' END AS incremento_autogrowth,
           CASE WHEN max_size = -1 THEN 'Sin limite'
                WHEN max_size = 268435456 THEN '2 TB (maximo del log)'
                ELSE CAST(CAST(max_size / 128.0 AS DECIMAL(14,2)) AS VARCHAR(20)) + ' MB' END AS tamano_maximo,
           is_percent_growth AS es_porcentaje,
           CASE WHEN is_percent_growth = 1 THEN CAST(growth AS DECIMAL(12,2))
                ELSE CAST(growth / 128.0 AS DECIMAL(12,2)) END AS crecimiento_valor,
           CASE WHEN max_size = -1 THEN NULL
                ELSE CAST(max_size / 128.0 AS DECIMAL(14,2)) END AS tamano_maximo_mb
    FROM sys.database_files
    ORDER BY type_desc DESC, file_id`);
}

// Historial real de crecimiento: mediciones guardadas por cineadmin.sp_registrar_almacenamiento.
async function obtenerHistorialCrecimiento(dias) {
  const mediciones = await consultar(`
    SELECT fecha_medicion,
           CAST(SUM(tamano_mb) AS DECIMAL(12,2)) AS tamano_total_mb,
           CAST(SUM(CASE WHEN type_desc = 'ROWS' THEN tamano_mb ELSE 0 END) AS DECIMAL(12,2)) AS datos_asignado_mb,
           CAST(SUM(CASE WHEN type_desc = 'ROWS' THEN usado_mb ELSE 0 END) AS DECIMAL(12,2)) AS datos_usado_mb,
           CAST(SUM(CASE WHEN type_desc = 'LOG' THEN tamano_mb ELSE 0 END) AS DECIMAL(12,2)) AS log_asignado_mb,
           CAST(SUM(CASE WHEN type_desc = 'LOG' THEN usado_mb ELSE 0 END) AS DECIMAL(12,2)) AS log_usado_mb
    FROM cineadmin.historial_almacenamiento
    WHERE fecha_medicion >= DATEADD(DAY, -@dias, SYSDATETIME())
    GROUP BY fecha_medicion
    ORDER BY fecha_medicion`, [['dias', sql.Int, dias]]);

  let anterior = null;
  for (const medicion of mediciones) {
    medicion.variacion_mb = anterior
      ? Number((medicion.datos_usado_mb - anterior.datos_usado_mb).toFixed(2)) : 0;
    anterior = medicion;
  }

  const resumen = { mediciones: mediciones.length, dias_consultados: dias };
  if (mediciones.length >= 2) {
    const primera = mediciones[0];
    const ultima = mediciones[mediciones.length - 1];
    const diasTranscurridos = (new Date(ultima.fecha_medicion) - new Date(primera.fecha_medicion)) / 86400000;
    resumen.desde = primera.fecha_medicion;
    resumen.hasta = ultima.fecha_medicion;
    resumen.crecimiento_datos_mb = Number((ultima.datos_usado_mb - primera.datos_usado_mb).toFixed(2));
    resumen.crecimiento_total_mb = Number((ultima.tamano_total_mb - primera.tamano_total_mb).toFixed(2));
    resumen.crecimiento_diario_mb = diasTranscurridos > 0
      ? Number((resumen.crecimiento_datos_mb / diasTranscurridos).toFixed(3)) : null;
  }
  return { resumen, mediciones };
}

// Segunda fuente histórica real: el tamaño de cada respaldo completo guardado en msdb.
function obtenerCrecimientoPorRespaldos(dias) {
  return consultar(`
    SELECT bs.backup_finish_date AS fecha,
           CAST(bs.backup_size / 1048576.0 AS DECIMAL(12,2)) AS tamano_respaldo_mb,
           CAST(bs.compressed_backup_size / 1048576.0 AS DECIMAL(12,2)) AS tamano_comprimido_mb
    FROM msdb.dbo.backupset bs
    WHERE bs.database_name = DB_NAME()
      AND bs.type = 'D'
      AND bs.backup_finish_date >= DATEADD(DAY, -@dias, GETDATE())
    ORDER BY bs.backup_finish_date`, [['dias', sql.Int, dias]]);
}

// Guarda una medición nueva. horasMinimas evita duplicar mediciones muy seguidas.
async function registrarMedicion(horasMinimas = null) {
  const pool = await getPool();
  const result = await pool.request()
    .input('horas_minimas', sql.Int, horasMinimas)
    .execute('cineadmin.sp_registrar_almacenamiento');
  return result.recordset[0];
}

// Registro automático mientras la API está encendida (SQL Server Express no tiene Agent).
// REGISTRO_ALMACENAMIENTO_HORAS en .env: cada cuántas horas medir; 0 lo desactiva.
function programarRegistroAutomatico() {
  const horas = parseInt(process.env.REGISTRO_ALMACENAMIENTO_HORAS ?? '24', 10);
  if (!Number.isInteger(horas) || horas <= 0) return;

  const intentar = async () => {
    try {
      const resultado = await registrarMedicion(horas);
      if (resultado && resultado.registrado) console.log('Módulo 3: medición de almacenamiento registrada.');
    } catch (err) {
      console.warn(`Módulo 3: no se pudo registrar la medición automática (${err.message}). `
        + '¿Se ejecutó database/07_objetos_cineadmin.sql?');
    }
  };

  intentar();
  setInterval(intentar, 60 * 60 * 1000).unref();
}

module.exports = {
  obtenerArchivos,
  obtenerResumenFilegroups,
  obtenerTamanoPorTipo,
  obtenerResumen,
  obtenerTablasGrandes,
  obtenerIndicesGrandes,
  obtenerConfiguracionCrecimiento,
  obtenerHistorialCrecimiento,
  obtenerCrecimientoPorRespaldos,
  registrarMedicion,
  programarRegistroAutomatico,
};
