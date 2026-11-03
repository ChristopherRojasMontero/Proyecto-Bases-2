import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSections } from './useModuleData.js';

const config = { initial: { users: [], history: null }, requests: [
  ['users', '/users', (body) => body.datos], ['history', '/history'],
] };

test('fallo parcial conserva la sección exitosa y muestra el error de la fallida', async () => {
  const result = await loadSections(config, undefined, async (url) => ({
    ok: url === '/users', json: async () => url === '/users' ? { datos: ['usuario'] } : { mensaje: 'Sin permisos.' },
  }));
  assert.deepEqual(result.data.users, ['usuario']);
  assert.equal(result.data.history, null);
  assert.equal(result.errors.history, 'Sin permisos.');
  assert.equal(result.successes, 1);
});

test('JSON inválido afecta solo a su sección y no inventa resultados', async () => {
  const result = await loadSections(config, undefined, async (url) => ({ ok: true,
    json: async () => { if (url === '/history') throw new Error('JSON inválido'); return { datos: [] }; },
  }));
  assert.equal(result.successes, 1);
  assert.equal(result.errors.history, 'JSON inválido');
  assert.deepEqual(result.data.users, []);
});

test('se propaga cancelación a todas las solicitudes y se identifica fallo total', async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await loadSections(config, controller.signal, async (url, options) => {
    assert.equal(options.signal, controller.signal);
    options.signal.throwIfAborted();
  });
  assert.equal(result.successes, 0);
  assert.deepEqual(Object.keys(result.errors), ['users', 'history']);
});
