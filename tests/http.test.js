import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, readJson } from '../lib/http.js';

test('cross-origin requests fail before input or credentials are processed', () => {
  assert.throws(() => authorize(new Request('http://localhost:3000/api/diagnose', { headers: { Origin: 'https://other.example' } })), { status: 403 });
});
test('configured API access token gates requests', () => {
  const previous = process.env.PIPELINEMEDIC_ACCESS_TOKEN;
  process.env.PIPELINEMEDIC_ACCESS_TOKEN = 'fixture-test-token';
  try {
    assert.throws(() => authorize(new Request('http://localhost:3000/api/diagnose')), { status: 401 });
    assert.doesNotThrow(() => authorize(new Request('http://localhost:3000/api/diagnose', { headers: { Authorization: 'Bearer fixture-test-token' } })));
  } finally { if (previous === undefined) delete process.env.PIPELINEMEDIC_ACCESS_TOKEN; else process.env.PIPELINEMEDIC_ACCESS_TOKEN = previous; }
});
test('browser host works when the framework normalizes its internal URL', () => {
  assert.doesNotThrow(() => authorize(new Request('http://localhost:3000/api/diagnose', { headers: { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' } })));
});
test('unconfigured remote host is rejected even with a matching origin', () => {
  assert.throws(() => authorize(new Request('http://localhost:3000/api/diagnose', { headers: { Host: 'untrusted.example:3000', Origin: 'http://untrusted.example:3000' } })), { status: 403 });
});
test('JSON boundary rejects malformed and oversized input', async () => {
  const req = body => new Request('http://localhost:3000/api/diagnose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  await assert.rejects(readJson(req('{broken')), { status: 400 });
  await assert.rejects(readJson(req('x'.repeat(800001))), { status: 413 });
  assert.deepEqual(await readJson(req('{"logText":"example"}')), { logText: 'example' });
});
