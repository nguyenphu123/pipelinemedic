import assert from 'node:assert/strict';
import { samples } from '../lib/samples.js';

const base = process.argv[2] || 'http://127.0.0.1:3000';
const get = async path => fetch(new URL(path, base));
const health = await get('/api/health');
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'ok');
const page = await get('/');
assert.equal(page.status, 200);
assert.match(await page.text(), /PipelineMedic/);
const catalog = await get('/api/pipelines');
assert.equal(catalog.status, 200);
assert.ok((await catalog.json()).pipelines.length >= 3);
const dashboard = await get('/api/dashboard');
assert.equal(dashboard.status, 200);
assert.ok((await dashboard.json()).summary.runs >= 9);
const failedRuns = await get('/api/runs?status=failed&limit=1');
assert.equal(failedRuns.status, 200);
const failedRun = (await failedRuns.json()).runs[0];
assert.ok(failedRun?.id);
const headers = { 'Content-Type': 'application/json', Origin: new URL(base).origin };
if (process.env.PIPELINEMEDIC_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.PIPELINEMEDIC_ACCESS_TOKEN}`;
for (const sample of samples) {
  const response = await fetch(new URL('/api/diagnose', base), { method: 'POST', headers, body: JSON.stringify({ ...sample, provider: 'rules' }) });
  assert.equal(response.status, 200, `${sample.id}: expected success`);
  const result = await response.json();
  assert.ok(result.causes.length);
  if (sample.id === 'timeout') assert.equal(result.certainty, 'needs-context');
  console.log(`PASS HTTP diagnosis: ${sample.id}`);
}
const invalid = await fetch(new URL('/api/diagnose', base), { method: 'POST', headers, body: '{"logText":""}' });
assert.equal(invalid.status, 400);
const crossOrigin = await fetch(new URL('/api/diagnose', base), { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.example' }, body: '{"logText":"npm: not found"}' });
assert.equal(crossOrigin.status, 403);
const storedDiagnosis = await fetch(new URL(`/api/runs/${failedRun.id}/diagnose`, base), { method: 'POST', headers, body: '{"provider":"rules"}' });
assert.equal(storedDiagnosis.status, 200);
assert.equal((await storedDiagnosis.json()).run.id, failedRun.id);
console.log('PASS root, health, SQLite catalog, run dashboard, stored diagnosis, invalid input, cross-origin boundary');
