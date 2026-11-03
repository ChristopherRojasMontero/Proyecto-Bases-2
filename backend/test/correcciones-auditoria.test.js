const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Dobles aislados: ninguna prueba de este archivo conecta con SQL Server.
function cargar(archivo, mocks = {}, logs = []) {
  const filename = path.resolve(__dirname, '..', archivo);
  const originalRequire = createRequire(filename);
  const module = { exports: {} };
  const requireMock = (name) => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: requireMock, module, exports: module.exports, __dirname: path.dirname(filename),
    console: { error: (...args) => logs.push(args), log() {}, warn() {} }, process,
  }, { filename });
  return module.exports;
}

function respuesta() {
  return { statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; } };
}

test('errores internos quedan en el registro, no en JSON; conserva categorías HTTP', () => {
  const logs = [];
  const { responderError } = cargar('src/errores.js', {}, logs);
  for (const [fields, expected] of [[{ code: 'ELOGIN' }, 503], [{ number: 229 }, 403],
    [{ number: 2812 }, 503], [{ number: 50000 }, 400], [{}, 500]]) {
    const error = Object.assign(new Error('cineadmin secreto C:\\privado\\datos clave=oculta'), fields);
    const res = respuesta();
    responderError(res, error);
    assert.equal(res.statusCode, expected);
    assert.doesNotMatch(JSON.stringify(res.body), /privado|oculta|secreto/);
  }
  assert.equal(logs.length, 5);
});

test('rutas de instancia y rendimiento usan respuestas controladas ante fallo SQL', async () => {
  const errores = cargar('src/errores.js');
  for (const name of ['instancia', 'rendimiento', 'respaldos']) {
    const router = cargar(`src/routes/${name}.js`, {
      '../db': { getPool: async () => { throw Object.assign(new Error('password=oculta'), { code: 'ELOGIN' }); } },
      '../errores': errores,
    });
    for (const layer of router.stack.filter((l) => l.route?.methods.get)) {
      const res = respuesta();
      await layer.route.stack[0].handle({ query: {} }, res);
      assert.equal(res.statusCode, 503, name + layer.route.path);
      assert.doesNotMatch(JSON.stringify(res.body), /oculta|password/);
    }
  }
});

test('respaldos filtra por base activa sin interpolar nombres de configuración', async () => {
  const queries = [];
  const db = { sql: { Int: 'Int' }, getPool: async () => ({ request: () => ({
    input() { return this; }, async query(text) { queries.push(text); return { recordset: [] }; },
  }) }) };
  const router = cargar('src/routes/respaldos.js', { '../db': db });
  for (const layer of router.stack) await layer.route.stack[0].handle({ query: {} }, respuesta());
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.doesNotMatch(query, /CineStream/);
    assert.match(query, /DB_(?:NAME|ID)\(\)/);
  }
});

test('GET diagnóstico conserva contrato y nunca ejecuta procedimientos', async () => {
  const queries = [];
  const db = { sql: { NVarChar: () => 'nvarchar' }, getPool: async () => ({ request: () => ({
    input() { return this; },
    async query(text) {
      queries.push(text);
      if (text.includes('sys.sql_expression_dependencies')) return { recordset: [] };
      return { recordset: queries.length === 1 ? [{ esquema: 'dbo', objeto: 'vista', tipo: 'VIEW', nombre: '[dbo].[vista]', definicion: 'SELECT columna' }] : [{ is_incomplete: true }] };
    },
    execute() { throw new Error('Prohibido ejecutar procedimientos'); },
  }) }) };
  const { detectarObjetosInvalidos } = cargar('src/queries/diagnostico-mantenimiento.js', { '../db': db });
  const result = await detectarObjetosInvalidos();
  assert.equal(result.total, 1);
  assert.equal(result.datos[0].problema, 'DEPENDENCIAS_INCOMPLETAS');
  assert.equal(typeof result.nota, 'string');
  for (const query of queries) assert.doesNotMatch(query, /\b(?:EXEC|UPDATE|ALTER|INSERT|DELETE|BEGIN TRAN)\b/i);
});

test('diagnóstico no oculta falta de permisos como error de compilación', async () => {
  let calls = 0;
  const db = { sql: { NVarChar: () => 'nvarchar' }, getPool: async () => ({ request: () => ({
    input() { return this; }, async query(text) {
      if (text.includes('sys.sql_expression_dependencies')) return { recordset: [] };
      if (calls++) throw Object.assign(new Error('sin permiso'), { code: 'EREQUEST', number: 229 });
      return { recordset: [{ esquema: 'dbo', objeto: 'vista', tipo: 'VIEW', nombre: '[dbo].[vista]', definicion: 'SELECT x' }] };
    },
  }) }) };
  const { detectarObjetosInvalidos } = cargar('src/queries/diagnostico-mantenimiento.js', { '../db': db });
  await assert.rejects(detectarObjetosInvalidos(), { number: 229 });
});

test('objeto firmado se rechaza antes de ejecutar recompilación', async () => {
  let executions = 0;
  const db = { sql: { NVarChar: () => 'nvarchar' }, getPool: async () => ({ request: () => ({
    input() { return this; }, async query() { return { recordset: [{ firmas: 1 }] }; },
    async execute() { executions++; throw new Error('No debe ejecutarse'); },
  }) }) };
  const { recompilarObjetos } = cargar('src/queries/mantenimiento.js', { '../db': db });
  const result = await recompilarObjetos([{ esquema: 'dbo', objeto: 'firmado' }]);
  assert.equal(executions, 0);
  assert.equal(result.resultado, 'ERROR');
  assert.match(result.datos[0].mensaje, /firmado/);
});

test('objeto compatible conserva la llamada parametrizada y contrato de recompilación', async () => {
  const inputs = [];
  const executions = [];
  const db = { sql: { NVarChar: () => 'nvarchar' }, getPool: async () => ({ request: () => ({
    input(name, type, value) { inputs.push([name, value]); return this; },
    async query() { return { recordset: [{ firmas: 0 }] }; },
    async execute(proc) { executions.push(proc); return { recordset: [{ resultado: 'OK', objeto: '[dbo].[vista]', mensaje: 'Objeto revalidado.', duracion_ms: 1 }] }; },
  }) }) };
  const { recompilarObjetos } = cargar('src/queries/mantenimiento.js', { '../db': db });
  const result = await recompilarObjetos([{ esquema: 'dbo', objeto: 'vista' }]);
  assert.equal(result.resultado, 'OK');
  assert.deepEqual(executions, ['cineadmin.sp_recompilar_objeto']);
  assert.ok(inputs.some(([name, value]) => name === 'objeto' && value === 'vista'));
});

test('importar servidor no inicia registro; health y middleware no filtran detalles', async () => {
  const express = require('../node_modules/express');
  let fallar = false;
  let registros = 0;
  const mocks = { dotenv: { config() {} },
    './db': { getPool: async () => { if (fallar) throw new Error('password=oculta'); return { request: () => ({ query: async () => ({ recordset: [{ ok: 1 }] }) }) }; } },
    './queries/almacenamiento': { programarRegistroAutomatico() { registros++; } },
  };
  for (const name of ['instancia', 'rendimiento', 'almacenamiento', 'respaldos', 'auditoria', 'mantenimiento']) {
    mocks['./routes/' + name] = express.Router();
  }
  const app = cargar('src/server.js', mocks);
  assert.equal(registros, 0);
  assert.equal(app.router.stack.filter((layer) => layer.name === 'router').length, 6);
  const health = app.router.stack.find((layer) => layer.route?.path === '/api/health').route.stack[0].handle;
  let res = respuesta();
  await health({}, res);
  assert.equal(JSON.stringify(res.body), '{"api":"ok","db":"ok"}');
  fallar = true;
  res = respuesta();
  await health({}, res);
  assert.equal(res.statusCode, 503);
  assert.doesNotMatch(JSON.stringify(res.body), /password|oculta|conexion/);
  const errorHandler = app.router.stack.at(-1).handle;
  for (const [type, code] of [['entity.parse.failed', 400], ['entity.too.large', 413], ['otro', 500]]) {
    res = respuesta();
    errorHandler(Object.assign(new Error('password=oculta'), { type }), {}, res, () => {});
    assert.equal(res.statusCode, code);
    assert.doesNotMatch(JSON.stringify(res.body), /password|oculta/);
  }
});
