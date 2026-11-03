// Traduce los errores de SQL Server / mssql a respuestas HTTP con mensajes claros.
const PERMISOS = [229, 230, 262, 297, 300, 916, 15151, 51005];
const OBJETOS_FALTANTES = [208, 2812];

function numerosSQL(error) {
  return [error, ...(error.precedingErrors || [])]
    .map((e) => e && (e.number ?? e.originalError?.info?.number))
    .filter(Number.isInteger);
}

function responderError(res, error, modulo = 'la consulta') {
  console.error(`Error al ${modulo}:`, error);
  const numeros = numerosSQL(error);

  if (['ESOCKET', 'ELOGIN', 'ETIMEOUT', 'ECONNCLOSED'].includes(error.code)) {
    return res.status(503).json({
      mensaje: 'No hay conexión con SQL Server. Revise que el servicio esté activo y los datos de backend/.env.',
      detalle: 'Consulte el registro local de la API.',
    });
  }
  if (numeros.some((n) => PERMISOS.includes(n))) {
    return res.status(403).json({
      mensaje: `El usuario de la aplicación no tiene permisos suficientes para ${modulo}.`,
      detalle: 'Consulte el registro local de la API.',
    });
  }
  if (numeros.some((n) => OBJETOS_FALTANTES.includes(n)) && /cineadmin/i.test(error.message)) {
    return res.status(503).json({
      mensaje: 'Faltan los objetos de CineAdmin en la base. Ejecute database/07_objetos_cineadmin.sql.',
      detalle: 'Consulte el registro local de la API.',
    });
  }
  if (numeros.includes(50000)) {
    return res.status(400).json({ mensaje: 'La operación fue rechazada. Revise los parámetros indicados.' });
  }
  return res.status(500).json({ mensaje: `No se pudo completar ${modulo}.`, detalle: 'Consulte el registro local de la API.' });
}

module.exports = { responderError, numerosSQL };
