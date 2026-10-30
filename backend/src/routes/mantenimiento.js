// Módulo 6 — Mantenimiento preventivo (Persona 3 + Persona 4).
// Contrato: backend/docs/contrato-modulo6-mantenimiento.md
const express = require('express');
const consultas = require('../queries/mantenimiento');
const { responderError } = require('../errores');
const router = express.Router();

const NOMBRE_SQL = /^[\p{L}_#@][\p{L}\p{N}_#@$ ]{0,127}$/u;

function nombreValido(valor) {
  return typeof valor === 'string' && NOMBRE_SQL.test(valor);
}

// GET /api/mantenimiento/estadisticas — estado de las estadísticas y recomendación
router.get('/estadisticas', async (req, res) => {
  try { res.json(await consultas.obtenerEstadisticas()); }
  catch (err) { responderError(res, err, 'consultar las estadísticas'); }
});

// POST /api/mantenimiento/estadisticas/actualizar
// Cuerpo: { "esquema": "dbo", "tabla": "alquileres", "modo": "MUESTREO" | "COMPLETO" }
// Sin "tabla" se actualizan todas las tablas de usuario.
router.post('/estadisticas/actualizar', async (req, res) => {
  const { esquema = null, tabla = null, modo = 'MUESTREO' } = req.body || {};
  if (!['MUESTREO', 'COMPLETO'].includes(modo)) {
    return res.status(400).json({ mensaje: 'modo debe ser MUESTREO o COMPLETO.' });
  }
  if ((tabla !== null && !nombreValido(tabla)) || (esquema !== null && !nombreValido(esquema))) {
    return res.status(400).json({ mensaje: 'esquema y tabla deben ser nombres válidos de SQL Server.' });
  }
  try { res.json(await consultas.actualizarEstadisticas({ esquema, tabla, modo })); }
  catch (err) { responderError(res, err, 'actualizar las estadísticas'); }
});

// GET /api/mantenimiento/objetos-invalidos — objetos que no compilan
router.get('/objetos-invalidos', async (req, res) => {
  try { res.json(await consultas.detectarObjetosInvalidos()); }
  catch (err) { responderError(res, err, 'detectar objetos inválidos'); }
});

// POST /api/mantenimiento/objetos/recompilar
// Cuerpo: { "esquema": "dbo", "objeto": "v_demo" }  -> un objeto
//         { "todos": true }                         -> todos los detectados como inválidos
router.post('/objetos/recompilar', async (req, res) => {
  const { esquema, objeto, todos } = req.body || {};
  let lista = null;
  if (todos !== true) {
    if (!nombreValido(esquema) || !nombreValido(objeto)) {
      return res.status(400).json({ mensaje: 'Indique esquema y objeto válidos, o { "todos": true }.' });
    }
    lista = [{ esquema, objeto }];
  }
  try { res.json(await consultas.recompilarObjetos(lista)); }
  catch (err) { responderError(res, err, 'recompilar objetos'); }
});

// GET /api/mantenimiento/historial?limite=50 — bitácora de acciones ejecutadas
router.get('/historial', async (req, res) => {
  const valor = req.query.limite ?? '50';
  const limite = /^\d+$/.test(valor) ? Number(valor) : NaN;
  if (!(limite >= 1 && limite <= 500)) {
    return res.status(400).json({ mensaje: 'limite debe ser un entero entre 1 y 500.' });
  }
  try { res.json(await consultas.obtenerHistorial(limite)); }
  catch (err) { responderError(res, err, 'consultar la bitácora de mantenimiento'); }
});

module.exports = router;
