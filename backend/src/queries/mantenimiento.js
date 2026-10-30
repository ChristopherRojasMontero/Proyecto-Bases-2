// Módulo 6 — Mantenimiento preventivo: consultas y ejecución de acciones.
// Las acciones se hacen mediante procedimientos del esquema cineadmin
// (database/07_objetos_cineadmin.sql); cine_app solo tiene permiso de EXECUTE sobre ellos.
const { sql, getPool } = require('../db');

const UMBRAL_PORCENTAJE = 20;
const UMBRAL_DIAS = 7;

// Estado de las estadísticas de cada tabla de usuario y si conviene actualizarlas.
async function obtenerEstadisticas() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT s.name AS esquema,
           t.name AS tabla,
           st.name AS estadistica,
           CASE WHEN st.auto_created = 1 THEN 'AUTOMATICA'
                WHEN st.user_created = 1 THEN 'USUARIO'
                ELSE 'INDICE' END AS origen,
           sp.last_updated AS ultima_actualizacion,
           DATEDIFF(DAY, sp.last_updated, GETDATE()) AS dias_sin_actualizar,
           sp.rows AS filas,
           sp.rows_sampled AS filas_muestreadas,
           CAST(100.0 * sp.rows_sampled / NULLIF(sp.rows, 0) AS DECIMAL(5,2)) AS porcentaje_muestreo,
           sp.modification_counter AS modificaciones,
           CAST(100.0 * sp.modification_counter / NULLIF(sp.rows, 0) AS DECIMAL(10,2)) AS porcentaje_modificado
    FROM sys.stats st
    JOIN sys.tables t ON t.object_id = st.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    OUTER APPLY sys.dm_db_stats_properties(st.object_id, st.stats_id) sp
    WHERE t.is_ms_shipped = 0
    ORDER BY porcentaje_modificado DESC, s.name, t.name, st.name`);

  const datos = result.recordset.map((fila) => {
    let recomendacion = 'AL_DIA';
    let motivo = 'Sin cambios relevantes desde la última actualización.';
    if (!fila.ultima_actualizacion) {
      recomendacion = 'ACTUALIZAR';
      motivo = 'La estadística nunca se ha calculado.';
    } else if (Number(fila.porcentaje_modificado) >= UMBRAL_PORCENTAJE) {
      recomendacion = 'ACTUALIZAR';
      motivo = `Más del ${UMBRAL_PORCENTAJE}% de las filas cambió desde la última actualización.`;
    } else if (fila.modificaciones > 0 && fila.dias_sin_actualizar >= UMBRAL_DIAS) {
      recomendacion = 'REVISAR';
      motivo = `Tiene cambios y no se actualiza hace ${fila.dias_sin_actualizar} días.`;
    }
    return { ...fila, recomendacion, motivo };
  });

  return {
    resumen: {
      total: datos.length,
      actualizar: datos.filter((d) => d.recomendacion === 'ACTUALIZAR').length,
      revisar: datos.filter((d) => d.recomendacion === 'REVISAR').length,
      criterio: `ACTUALIZAR: nunca calculada o >= ${UMBRAL_PORCENTAJE}% modificado. REVISAR: con cambios y >= ${UMBRAL_DIAS} días sin actualizar.`,
    },
    datos,
  };
}

// Ejecuta UPDATE STATISTICS sobre una tabla o sobre todas (tabla = null).
async function actualizarEstadisticas({ esquema = null, tabla = null, modo = 'MUESTREO' }) {
  const pool = await getPool();
  const inicio = Date.now();
  const result = await pool.request()
    .input('esquema', sql.NVarChar(128), esquema)
    .input('tabla', sql.NVarChar(128), tabla)
    .input('modo', sql.NVarChar(10), modo)
    .execute('cineadmin.sp_actualizar_estadisticas');
  const datos = result.recordset;
  const errores = datos.filter((d) => d.resultado !== 'OK').length;
  return {
    resultado: errores ? (errores === datos.length ? 'ERROR' : 'PARCIAL') : 'OK',
    mensaje: errores
      ? `${datos.length - errores} de ${datos.length} tablas actualizadas; ${errores} con error.`
      : `Estadísticas actualizadas en ${datos.length} tabla(s), modo ${modo}.`,
    duracion_total_ms: Date.now() - inicio,
    datos,
  };
}

// Objetos (procedimientos, vistas, funciones, triggers) que no compilan.
async function detectarObjetosInvalidos() {
  const pool = await getPool();
  const result = await pool.request().execute('cineadmin.sp_detectar_objetos_invalidos');
  const datos = result.recordset;
  return {
    total: new Set(datos.map((d) => `${d.esquema}.${d.objeto}`)).size,
    datos,
    nota: 'SQL Server no tiene un estado INVALID como Oracle: se detectan referencias a objetos inexistentes y módulos que fallan al revalidarse con sp_refreshsqlmodule.',
  };
}

// Recompila un objeto; si lista es null recompila todos los detectados como inválidos.
async function recompilarObjetos(lista) {
  const pool = await getPool();
  let objetos = lista;
  if (!objetos) {
    const detectados = await detectarObjetosInvalidos();
    const unicos = new Map(detectados.datos.map((d) => [`${d.esquema}.${d.objeto}`, d]));
    objetos = [...unicos.values()].map(({ esquema, objeto }) => ({ esquema, objeto }));
  }

  const datos = [];
  for (const { esquema, objeto } of objetos) {
    const result = await pool.request()
      .input('esquema', sql.NVarChar(128), esquema)
      .input('objeto', sql.NVarChar(128), objeto)
      .execute('cineadmin.sp_recompilar_objeto');
    datos.push(result.recordset[0]);
  }

  const errores = datos.filter((d) => d.resultado !== 'OK').length;
  return {
    resultado: !datos.length ? 'SIN_OBJETOS' : errores ? (errores === datos.length ? 'ERROR' : 'PARCIAL') : 'OK',
    mensaje: !datos.length ? 'No había objetos para recompilar.'
      : errores ? `${datos.length - errores} de ${datos.length} objetos recompilados; ${errores} siguen con errores.`
      : `${datos.length} objeto(s) recompilado(s) correctamente.`,
    datos,
  };
}

// Últimas acciones de mantenimiento registradas en la bitácora.
async function obtenerHistorial(limite) {
  const pool = await getPool();
  const result = await pool.request().input('limite', sql.Int, limite).query(`
    SELECT TOP (@limite) id_bitacora, fecha, operacion, objeto, resultado, mensaje, duracion_ms, ejecutado_por
    FROM cineadmin.bitacora_mantenimiento
    ORDER BY fecha DESC, id_bitacora DESC`);
  return result.recordset;
}

module.exports = {
  obtenerEstadisticas,
  actualizarEstadisticas,
  detectarObjetosInvalidos,
  recompilarObjetos,
  obtenerHistorial,
};
