// Prueba rápida de conexión: npm run test:db
// Ejecuta varias consultas por separado y mide cuánto tarda cada una.
const { getPool } = require('./db');

const pruebas = [
  ['Usuario y base actual', 'SELECT SUSER_SNAME() AS usuario, DB_NAME() AS base_de_datos'],
  ['Conteo de alquileres', 'SELECT COUNT(*) AS alquileres FROM dbo.alquileres'],
  ['Sesiones (DMV)', 'SELECT COUNT(*) AS sesiones FROM sys.dm_exec_sessions'],
];

(async () => {
  try {
    let t0 = Date.now();
    const pool = await getPool();
    console.log(`Conectado en ${Date.now() - t0} ms\n`);

    for (const [nombre, consulta] of pruebas) {
      t0 = Date.now();
      const r = await pool.request().query(consulta);
      console.log(`${nombre} (${Date.now() - t0} ms):`, r.recordset[0]);
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('No se pudo completar la prueba:', err.message);
    process.exit(1);
  }
})();