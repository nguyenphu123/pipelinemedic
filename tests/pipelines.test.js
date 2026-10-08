import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

process.env.PIPELINEMEDIC_DB_PATH = join(tmpdir(), `pipelinemedic-${randomUUID()}.db`);

const store = await import('../lib/pipeline-store.js');
const collectionRoute = await import('../app/api/pipelines/route.js');
const itemRoute = await import('../app/api/pipelines/[id]/route.js');

const valid = {
  name: 'Release API', platform: 'gitlab', repositoryUrl: 'https://git.example.test/team/api',
  configPath: '.gitlab-ci.yml', environment: 'production', runnerLocation: 'on-premises',
  description: 'Synthetic pipeline for tests.', configText: 'stages:\n  - test\nunit:\n  stage: test\n  script: npm test',
  enabled: true, changeNote: 'Add unit stage',
};
const request = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, {
  method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});
const context = id => ({ params: Promise.resolve({ id }) });

test('configuration checks cover supported CI providers and reject broken structures', () => {
  const accepted = [
    ['gitlab', 'test:\n  script: npm test'],
    ['jenkins', 'pipeline { stages { } }'],
    ['github', 'on:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest'],
    ['azure', 'trigger:\n- main\nsteps:\n- script: npm test'],
    ['circleci', 'version: 2.1\njobs:\n  test:\n    docker: []'],
    ['other', 'anything: supported'],
  ];
  for (const [platform, config] of accepted) assert.equal(store.validatePipelineConfig(platform, config).valid, true, platform);
  assert.equal(store.validatePipelineConfig('jenkins', 'pipeline {').valid, false);
  assert.equal(store.validatePipelineConfig('github', 'jobs:\n  test: {}').valid, false);
  assert.equal(store.validatePipelineConfig('gitlab', 'test:\n\tscript: npm test').valid, false);
  assert.equal(store.validatePipelineConfig('other', ' ').valid, false);
});

test('SQLite catalog seeds examples and supports create, update, version and delete', () => {
  assert.equal(store.listPipelines().length, 3);
  const created = store.createPipeline(valid);
  assert.equal(created.version, 1);
  assert.equal(created.versions.length, 1);
  assert.equal(created.validation.valid, true);

  const metadataOnly = store.updatePipeline(created.id, { ...valid, description: 'Metadata changed.' });
  assert.equal(metadataOnly.version, 1, 'metadata changes do not create a config revision');
  const changed = store.updatePipeline(created.id, { ...valid, configText: `${valid.configText}\n# revision two`, changeNote: 'Document test stage' });
  assert.equal(changed.version, 2);
  assert.equal(changed.versions[0].note, 'Document test stage');
  assert.match(changed.configText, /revision two/);

  store.deletePipeline(created.id);
  assert.equal(store.listPipelines().length, 3);
  assert.throws(() => store.getPipeline(created.id), /not found/i);
});

test('pipeline API performs authenticated-style CRUD with no-store responses', async () => {
  const listed = await collectionRoute.GET(request('/api/pipelines'));
  assert.equal(listed.status, 200);
  assert.equal(listed.headers.get('cache-control'), 'no-store');
  assert.equal((await listed.json()).pipelines.length, 3);

  const createdResponse = await collectionRoute.POST(request('/api/pipelines', 'POST', valid));
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).pipeline;
  const detail = await itemRoute.GET(request(`/api/pipelines/${created.id}`), context(created.id));
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).pipeline.configText, valid.configText);

  const invalid = await itemRoute.PUT(request(`/api/pipelines/${created.id}`, 'PUT', { ...valid, platform: 'jenkins' }), context(created.id));
  assert.equal(invalid.status, 422);
  const updated = await itemRoute.PUT(request(`/api/pipelines/${created.id}`, 'PUT', { ...valid, enabled: false }), context(created.id));
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).pipeline.enabled, false);
  assert.equal((await itemRoute.DELETE(request(`/api/pipelines/${created.id}`, 'DELETE'), context(created.id))).status, 204);
  assert.equal((await itemRoute.GET(request(`/api/pipelines/${created.id}`), context(created.id))).status, 404);
});

test('pipeline API rejects malformed input, wrong media type and cross-origin writes', async () => {
  const malformed = new Request('http://localhost:3000/api/pipelines', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{broken' });
  assert.equal((await collectionRoute.POST(malformed)).status, 400);
  const wrongType = new Request('http://localhost:3000/api/pipelines', { method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(valid) });
  assert.equal((await collectionRoute.POST(wrongType)).status, 415);
  const crossOrigin = request('/api/pipelines','POST',valid);
  crossOrigin.headers.set('Origin','https://untrusted.example');
  assert.equal((await collectionRoute.POST(crossOrigin)).status, 403);
  assert.equal((await collectionRoute.POST(request('/api/pipelines','POST',{...valid,name:'x'}))).status, 400);
});
