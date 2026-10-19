const express = require('express');
const consultas = require('../queries/auditoria');
const router = express.Router();

function responderError(res, error) {
  const numeros = consultas.numerosSQL(error);
  if (numeros.some((n) => [229, 230, 297, 300, 916, 15151, 51005].includes(n))) {
    return res.status(403).json({ mensaje: 'La conexión no tiene permisos suficientes para consultar la auditoría.' });
  }
  if (error.status === 404) return res.status(404).json({ mensaje: 'Usuario administrativo inexistente.' });
  return res.status(500).json({ mensaje: 'No se pudo completar la consulta de auditoría.' });
}

router.get('/usuarios', async (req, res) => {
  try { res.json(await consultas.obtenerUsuarios()); }
  catch (error) { responderError(res, error); }
});

router.get('/roles', async (req, res) => {
  try { res.json(await consultas.obtenerRoles()); }
  catch (error) { responderError(res, error); }
});

router.get('/privilegios', async (req, res) => {
  if (Object.keys(req.query).some((nombre) => /^usuario_id(?:\[|\.)/.test(nombre))) {
    return res.status(400).json({ mensaje: 'usuario_id debe ser un entero positivo válido de SQL Server.' });
  }
  const valor = req.query.usuario_id;
  let usuarioId = null;
  if (valor !== undefined) {
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)
        || !Number.isSafeInteger(Number(valor)) || Number(valor) > 2147483647) {
      return res.status(400).json({ mensaje: 'usuario_id debe ser un entero positivo válido de SQL Server.' });
    }
    usuarioId = Number(valor);
  }
  try { res.json(await consultas.obtenerPrivilegios(usuarioId)); }
  catch (error) { responderError(res, error); }
});

router.get('/objetos-problematicos', async (req, res) => {
  try { res.json(await consultas.obtenerObjetosProblematicos()); }
  catch (error) { responderError(res, error); }
});

module.exports = router;
