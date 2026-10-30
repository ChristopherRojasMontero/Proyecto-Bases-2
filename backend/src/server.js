// Servidor base de la API. Cada módulo agrega sus rutas aquí.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const { getPool } = require('./db');

const app = express();
app.use(express.json());

// Comprobación de que la API y la BD responden
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ api: 'ok', db: 'ok' });
  } catch (err) {
    res.status(500).json({ api: 'ok', db: 'error', mensaje: err.message });
  }
});

// Rutas de cada módulo (agregar todas ANTES de app.listen)
app.use('/api/instancia', require('./routes/instancia'));         // Módulo 1 — Persona 1
app.use('/api/almacenamiento', require('./routes/almacenamiento')); // Módulo 3 — Persona 3
app.use('/api/auditoria', require('./routes/auditoria'));           // Módulo 5 — Persona 5

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));

app.use('/api/almacenamiento', require('./routes/almacenamiento'));
app.use('/api/rendimiento', require('./routes/rendimiento'));
