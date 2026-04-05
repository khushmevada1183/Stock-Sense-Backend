const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');

const cacheManager = require('../src/utils/cacheManager');

after(() => {
  if (typeof cacheManager.stopCleanup === 'function') {
    cacheManager.stopCleanup();
  }
});

test('cache manager generates deterministic keys', () => {
  const key1 = cacheManager.generateKey('sample-endpoint', { b: 2, a: 1 });
  const key2 = cacheManager.generateKey('sample-endpoint', { a: 1, b: 2 });

  assert.equal(key1, key2);
});

test('cache manager stores and retrieves values', () => {
  const key = cacheManager.generateKey('tests', { scope: 'sanity' });
  const value = { ok: true };

  cacheManager.set(key, value, 5 * 1000, { tags: ['test_sanity'] });

  const cached = cacheManager.get(key);
  assert.deepEqual(cached, value);

  cacheManager.delete(key);
});

test('cache manager async methods work with fallback', async () => {
  const key = cacheManager.generateKey('tests', { scope: 'async-sanity' });
  const value = { ok: true, mode: 'async' };

  await cacheManager.setAsync(key, value, 5 * 1000, { tags: ['test_async_sanity'] });
  const cached = await cacheManager.getAsync(key);

  assert.deepEqual(cached, value);

  await cacheManager.clearByTagsAsync('test_async_sanity');
  const afterClear = await cacheManager.getAsync(key);
  assert.equal(afterClear, null);
});
