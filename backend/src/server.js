// Servidor base de la API. Cada módulo agrega sus rutas aquí.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const { getPool } = require('./db');
const { programarRegistroAutomatico } = require('./queries/almacenamiento');

const app = express();
app.use(express.json());

// Comprobación de que la API y la BD responden
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ api: 'ok', db: 'ok' });
  } catch (err) {
    console.error('Health: conexión SQL no disponible.', err);
    res.status(503).json({ api: 'ok', db: 'error', mensaje: 'No hay conexión con la base de datos.' });
  }
});

// Rutas de cada módulo (agregar todas ANTES de app.listen)
app.use('/api/instancia', require('./routes/instancia'));         // Módulo 1 — Persona 1
app.use('/api/rendimiento', require('./routes/rendimiento'));       // Módulo 2 — Persona 2
app.use('/api/almacenamiento', require('./routes/almacenamiento')); // Módulo 3 — Persona 3
app.use('/api/respaldos', require('./routes/respaldos'));           // Módulo 4 — Persona 4
app.use('/api/auditoria', require('./routes/auditoria'));           // Módulo 5 — Persona 5
app.use('/api/mantenimiento', require('./routes/mantenimiento'));   // Módulo 6 — Persona 3 + Persona 4

// Cuerpo JSON mal formado u otros errores no controlados.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es JSON válido.' });
  console.error('Error no controlado en la API.', err);
  if (err.type === 'entity.too.large') return res.status(413).json({ mensaje: 'El cuerpo de la solicitud supera el límite permitido.' });
  res.status(500).json({ mensaje: 'Error interno de la API. Consulte el registro local.' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`API escuchando en http://127.0.0.1:${PORT}`);
    programarRegistroAutomatico();
  });
}

// Importar la aplicación para pruebas no inicia timers ni registra mediciones.
module.exports = app;
