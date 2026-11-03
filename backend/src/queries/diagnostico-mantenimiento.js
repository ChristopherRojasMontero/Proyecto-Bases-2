// Diagnóstico exclusivamente de lectura. No depende de actualizar el procedimiento
// instalado: una base con el script 07 anterior también conserva GET sin DDL.
const { sql, getPool } = require('../db');
const { numerosSQL } = require('../errores');

async function detectarObjetosInvalidos() {
  const pool = await getPool();
  const objetos = (await pool.request().query(`
    IF COALESCE(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'VIEW DEFINITION'), 0) <> 1
      THROW 51005, 'No hay visibilidad suficiente para el diagnostico de objetos.', 1;
    SELECT o.object_id AS objeto_id, s.name AS esquema, o.name AS objeto, o.type_desc AS tipo,
           QUOTENAME(s.name) + '.' + QUOTENAME(o.name) AS nombre,
           m.definition AS definicion
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    JOIN sys.sql_modules m ON m.object_id = o.object_id
    WHERE o.is_ms_shipped = 0 AND s.name <> N'cineadmin'
      AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR')
      AND m.is_schema_bound = 0
    ORDER BY s.name, o.name`)).recordset;
  const referencias = (await pool.request().query(`
    SELECT DISTINCT d.referencing_id
    FROM sys.sql_expression_dependencies d
    JOIN sys.objects o ON o.object_id = d.referencing_id
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0 AND s.name <> N'cineadmin'
      AND d.referenced_class = 1 AND d.referenced_id IS NULL
      AND d.referenced_server_name IS NULL AND d.referenced_database_name IS NULL
      AND d.is_ambiguous = 0 AND d.is_caller_dependent = 0
      AND d.referenced_entity_name NOT LIKE N'#%'
      AND OBJECT_ID(QUOTENAME(ISNULL(d.referenced_schema_name, s.name)) + '.' + QUOTENAME(d.referenced_entity_name)) IS NULL
      AND OBJECT_ID(QUOTENAME(ISNULL(d.referenced_schema_name, N'dbo')) + '.' + QUOTENAME(d.referenced_entity_name)) IS NULL
      AND TYPE_ID(QUOTENAME(ISNULL(d.referenced_schema_name, N'dbo')) + '.' + QUOTENAME(d.referenced_entity_name)) IS NULL`)).recordset;
  const datos = [];
  for (const objeto of objetos) {
    const identidad = { esquema: objeto.esquema, objeto: objeto.objeto, tipo: objeto.tipo };
    if (referencias.some((r) => r.referencing_id === objeto.objeto_id)) {
      datos.push({ ...identidad, problema: 'REFERENCIA_INEXISTENTE',
        detalle: 'Referencia local no resuelta en los catálogos; requiere revisión.' });
    }
    if (objeto.definicion === null) {
      datos.push({ ...identidad, problema: 'NO_EVALUABLE', detalle: 'Definición cifrada o no visible; requiere revisión.' });
      continue;
    }
    try {
      const result = await pool.request().input('objeto', sql.NVarChar(517), objeto.nombre).query(`
        SELECT is_incomplete, is_all_columns_found
        FROM sys.dm_sql_referenced_entities(@objeto, 'OBJECT')`);
      if (result.recordset.some((fila) => fila.is_incomplete || fila.is_all_columns_found === false || fila.is_all_columns_found === 0)) {
        datos.push({ ...identidad, problema: 'DEPENDENCIAS_INCOMPLETAS', detalle: 'SQL Server no pudo enlazar todas las referencias; requiere revisión.' });
      }
    } catch (error) {
      const numeros = numerosSQL(error);
      const conocidos = [2020, 207, 208, 209, 4104, 4121, 4413, 4512, 4513];
      const noEvaluables = [4502, 4514, 11514, 11526];
      if (error.code !== 'EREQUEST' || !numeros.length
          || numeros.some((n) => !conocidos.includes(n) && !noEvaluables.includes(n))) throw error;
      datos.push({ ...identidad,
        problema: numeros.some((n) => noEvaluables.includes(n)) ? 'NO_EVALUABLE'
          : numeros.some((n) => n !== 2020) ? 'ERROR_COMPILACION' : 'DEPENDENCIAS_INCOMPLETAS',
        detalle: `Diagnóstico de enlace SQL (${numeros.join(', ')}). No se ejecutó ni modificó el objeto.` });
    }
  }
  return { total: new Set(datos.map((d) => `${d.esquema}.${d.objeto}`)).size, datos,
    nota: 'Diagnóstico de enlace de solo lectura. No ejecuta módulos ni comprueba SQL dinámico o referencias externas. Sin hallazgos no garantiza ausencia de errores de ejecución.' };
}

module.exports = { detectarObjetosInvalidos };
