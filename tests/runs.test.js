import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

process.env.PIPELINEMEDIC_DB_PATH = join(tmpdir(), `pipelinemedic-runs-${randomUUID()}.db`);

const store = await import('../lib/run-store.js');
const dashboardRoute = await import('../app/api/dashboard/route.js');
const runsRoute = await import('../app/api/runs/route.js');
const runRoute = await import('../app/api/runs/[id]/route.js');
const diagnoseRoute = await import('../app/api/runs/[id]/diagnose/route.js');

const request = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, {
  method,
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});
const context = id => ({ params: Promise.resolve({ id }) });

test('run store seeds a transparent cross-provider operations workspace', () => {
  const runs = store.listRuns();
  assert.equal(runs.length, 9);
  assert.ok(runs.every(run => run.synthetic));
  assert.deepEqual(new Set(runs.map(run => run.platform)), new Set(['gitlab', 'jenkins', 'github']));
  const dashboard = store.getDashboard();
  assert.equal(dashboard.summary.pipelines, 3);
  assert.equal(dashboard.summary.runs, 9);
  assert.equal(dashboard.summary.failed, 3);
  assert.equal(dashboard.summary.successRate, 56);
  assert.equal(dashboard.source.demo, true);
  assert.equal(dashboard.trend.length, 7);
  assert.ok(dashboard.failureGroups.some(group => group.name === 'Network & DNS'));
});

test('ingested runs are validated, numbered and redacted before persistence', () => {
  const pipelineId = store.listRuns()[0].pipelineId;
  const created = store.createRun({
    pipelineId,
    providerRunId: 'external-901',
    branch: 'feature/api',
    commitSha: '1234abcd',
    status: 'failed',
    triggerSource: 'webhook',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSeconds: 18,
    jobsTotal: 2,
    jobsFailed: 1,
    logText: 'TOKEN=super-secret-value\nnpm: command not found',
  });
  assert.equal(created.synthetic, false);
  assert.equal(created.triggerSource, 'webhook');
  assert.doesNotMatch(created.logText, /super-secret-value/);
  assert.match(created.logText, /REDACTED/);
  assert.throws(() => store.createRun({ pipelineId: 'missing', status: 'failed', startedAt: new Date().toISOString() }), /not found/i);
});

test('dashboard and run APIs return no-store normalized records', async () => {
  const dashboardResponse = await dashboardRoute.GET(request('/api/dashboard'));
  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboardResponse.headers.get('cache-control'), 'no-store');
  assert.ok((await dashboardResponse.json()).failures.length >= 3);

  const failedResponse = await runsRoute.GET(request('/api/runs?status=failed&limit=2'));
  assert.equal(failedResponse.status, 200);
  const failed = (await failedResponse.json()).runs;
  assert.equal(failed.length, 2);
  assert.ok(failed.every(run => run.status === 'failed'));
  const detailResponse = await runRoute.GET(request(`/api/runs/${failed[0].id}`), context(failed[0].id));
  const detail = (await detailResponse.json()).run;
  assert.ok(detail.logText);
  assert.ok(detail.configText);
  assert.equal((await runRoute.GET(request('/api/runs/missing'), context('missing'))).status, 404);
  assert.equal((await runsRoute.GET(request('/api/runs?status=unknown'))).status, 400);
});

test('run ingestion API and stored-run diagnosis form an evidence-linked flow', async () => {
  const pipelineId = store.listRuns()[0].pipelineId;
  const response = await runsRoute.POST(request('/api/runs', 'POST', {
    pipelineId,
    status: 'failed',
    startedAt: new Date().toISOString(),
    logText: '/bin/sh: npm: command not found',
  }));
  assert.equal(response.status, 201);
  const run = (await response.json()).run;
  const diagnosed = await diagnoseRoute.POST(request(`/api/runs/${run.id}/diagnose`, 'POST', { provider: 'rules' }), context(run.id));
  assert.equal(diagnosed.status, 200);
  const result = await diagnosed.json();
  assert.equal(result.run.id, run.id);
  assert.equal(result.category, 'environment');
  assert.equal(result.causes[0].evidence[0].line, 1);
  assert.match(result.causes[0].evidence[0].text, /npm/);
  assert.equal((await diagnoseRoute.POST(request(`/api/runs/${run.id}/diagnose`, 'POST', { provider: 'invalid' }), context(run.id))).status, 400);
});
