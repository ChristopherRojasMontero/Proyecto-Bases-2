// Servidor base de la API. Cada módulo agrega sus rutas aquí.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const { getPool, describirConexion } = require('./db');
const { programarRegistroAutomatico } = require('./queries/almacenamiento');

const app = express();
app.use(express.json());

// Comprobación de que la API y la BD responden
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ api: 'ok', db: 'ok', conexion: describirConexion() });
  } catch (err) {
    res.status(500).json({ api: 'ok', db: 'error', conexion: describirConexion(), mensaje: err.message });
  }
});

// Rutas de cada módulo (agregar todas ANTES de app.listen)
app.use('/api/instancia', require('./routes/instancia'));         // Módulo 1 — Persona 1
app.use('/api/almacenamiento', require('./routes/almacenamiento')); // Módulo 3 — Persona 3
app.use('/api/mantenimiento', require('./routes/mantenimiento'));   // Módulo 6 — Persona 3 + Persona 4

// Cuerpo JSON mal formado u otros errores no controlados
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es JSON válido.' });
  res.status(500).json({ mensaje: 'Error interno de la API.', detalle: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
  programarRegistroAutomatico();
});
