import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/diagnose/route.js';
import { GET as providers } from '../app/api/providers/route.js';
import { GET as health } from '../app/api/health/route.js';

function request(body, headers = {}) {
  return new Request('http://localhost:3000/api/diagnose', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

test('diagnosis route returns a no-store response and grounded result', async () => {
  const response = await POST(request({ logText: 'npm: not found' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).causes[0].evidence[0].line, 1);
});

test('HTTP malformed, empty, wrong-type and oversized requests have useful status codes', async () => {
  for (const [req, expected] of [
    [request('{broken'), 400], [request({ logText: '' }), 400],
    [request({ logText: 'x' }, { 'Content-Type': 'text/plain' }), 415],
    [request({ logText: 'x' }, { 'Content-Type': 'text/plain; application/json' }), 415],
    [request('x'.repeat(800001)), 413],
  ]) assert.equal((await POST(req)).status, expected);
});

test('provider config API is gated, public health has no configuration', async () => {
  const previous = process.env.PIPELINEMEDIC_ACCESS_TOKEN;
  process.env.PIPELINEMEDIC_ACCESS_TOKEN = 'synthetic-route-token';
  try {
    assert.equal((await providers(new Request('http://localhost:3000/api/providers'))).status, 401);
    const authorized = await providers(new Request('http://localhost:3000/api/providers', { headers: { Authorization: 'Bearer synthetic-route-token' } }));
    assert.equal(authorized.status, 200);
    const publicHealth = await health();
    assert.deepEqual(await publicHealth.json(), { status: 'ok', service: 'pipelinemedic' });
    assert.equal(publicHealth.headers.get('cache-control'), 'no-store');
  } finally { if (previous === undefined) delete process.env.PIPELINEMEDIC_ACCESS_TOKEN; else process.env.PIPELINEMEDIC_ACCESS_TOKEN = previous; }
});

test('concurrency cap rejects the fourth request and releases capacity after provider failure', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['CLOUD_BASE_URL', 'CLOUD_MODEL', 'CLOUD_API_KEY'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { CLOUD_BASE_URL: 'https://fixture.example/v1', CLOUD_MODEL: 'fixture', CLOUD_API_KEY: 'synthetic-test-key' });
  let release; const gate = new Promise(resolve => { release = resolve; });
  let entered = 0; let ready; const allEntered = new Promise(resolve => { ready = resolve; });
  globalThis.fetch = async () => { entered += 1; if (entered === 3) ready(); await gate; return new Response('synthetic rejection', { status: 503 }); };
  const pending = [];
  try {
    for (let i = 0; i < 3; i++) pending.push(POST(request({ logText: 'npm: not found', provider: 'cloud' })));
    await allEntered;
    assert.equal((await POST(request({ logText: 'npm: not found', provider: 'cloud' }))).status, 429);
    release();
    for (const response of await Promise.all(pending)) assert.equal(response.status, 502);
    assert.equal((await POST(request({ logText: 'npm: not found' }))).status, 200);
  } finally {
    release(); await Promise.allSettled(pending); globalThis.fetch = originalFetch;
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});
