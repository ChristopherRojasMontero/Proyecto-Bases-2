// Módulo 3 — Gestión del almacenamiento (Persona 3).
// Las consultas SQL están en ../queries/almacenamiento.js; aquí solo se validan
// parámetros y se manejan errores. Contrato: backend/docs/contrato-modulo3-almacenamiento.md
const express = require('express');
const consultas = require('../queries/almacenamiento');
const { responderError } = require('../errores');
const router = express.Router();

const MODULO = 'consultar el almacenamiento';

function enteroEnRango(valor, porDefecto, minimo, maximo) {
  if (valor === undefined) return porDefecto;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

function ruta(obtener) {
  return async (req, res) => {
    try { res.json(await obtener(req, res)); }
    catch (err) { responderError(res, err, MODULO); }
  };
}

// GET /api/almacenamiento/filegroups — archivos con espacio asignado, usado y libre
router.get('/filegroups', ruta(() => consultas.obtenerArchivos()));

// GET /api/almacenamiento/filegroups/resumen — espacio total por filegroup
router.get('/filegroups/resumen', ruta(() => consultas.obtenerResumenFilegroups()));

// GET /api/almacenamiento/tamano — tamaño por tipo de archivo (datos / log)
router.get('/tamano', ruta(() => consultas.obtenerTamanoPorTipo()));

// GET /api/almacenamiento/resumen — tamaño actual de la base y nivel de uso
router.get('/resumen', ruta(() => consultas.obtenerResumen()));

// GET /api/almacenamiento/objetos-grandes?top=10 — tablas de mayor tamaño
router.get('/objetos-grandes', async (req, res) => {
  const top = enteroEnRango(req.query.top, 10, 1, 50);
  if (top === null) return res.status(400).json({ mensaje: 'top debe ser un entero entre 1 y 50.' });
  try { res.json(await consultas.obtenerTablasGrandes(top)); }
  catch (err) { responderError(res, err, MODULO); }
});

// GET /api/almacenamiento/indices-grandes?top=10 — índices de mayor tamaño
router.get('/indices-grandes', async (req, res) => {
  const top = enteroEnRango(req.query.top, 10, 1, 50);
  if (top === null) return res.status(400).json({ mensaje: 'top debe ser un entero entre 1 y 50.' });
  try { res.json(await consultas.obtenerIndicesGrandes(top)); }
  catch (err) { responderError(res, err, MODULO); }
});

// GET /api/almacenamiento/crecimiento — configuración de autogrowth y tamaño máximo
router.get('/crecimiento', ruta(() => consultas.obtenerConfiguracionCrecimiento()));

// GET /api/almacenamiento/crecimiento/historial?dias=30 — mediciones guardadas
router.get('/crecimiento/historial', async (req, res) => {
  const dias = enteroEnRango(req.query.dias, 30, 1, 3650);
  if (dias === null) return res.status(400).json({ mensaje: 'dias debe ser un entero entre 1 y 3650.' });
  try { res.json(await consultas.obtenerHistorialCrecimiento(dias)); }
  catch (err) { responderError(res, err, MODULO); }
});

// GET /api/almacenamiento/crecimiento/respaldos?dias=90 — tamaño de respaldos completos (msdb)
router.get('/crecimiento/respaldos', async (req, res) => {
  const dias = enteroEnRango(req.query.dias, 90, 1, 3650);
  if (dias === null) return res.status(400).json({ mensaje: 'dias debe ser un entero entre 1 y 3650.' });
  try { res.json(await consultas.obtenerCrecimientoPorRespaldos(dias)); }
  catch (err) { responderError(res, err, MODULO); }
});

// POST /api/almacenamiento/crecimiento/registrar — guarda una medición ahora
router.post('/crecimiento/registrar', async (req, res) => {
  try {
    const resultado = await consultas.registrarMedicion();
    res.status(201).json({ mensaje: 'Medición registrada correctamente.', ...resultado });
  } catch (err) { responderError(res, err, 'registrar la medición de almacenamiento'); }
});

module.exports = router;
