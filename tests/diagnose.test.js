import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../lib/diagnose.js';
import { redact } from '../lib/redact.js';
import { samples } from '../lib/samples.js';

const expectations = { registry: ['access', 'direct-evidence'], syntax: ['configuration', 'direct-evidence'], runtime: ['environment', 'direct-evidence'], tls: ['network', 'direct-evidence'], oidc: ['access', 'likely-cause'], timeout: ['network', 'needs-context'] };
for (const sample of samples) test(`known case: ${sample.id} returns grounded evidence`, async () => {
  const result = await diagnose({ ...sample, provider: 'rules' });
  assert.equal(result.category, expectations[sample.id][0]);
  assert.equal(result.certainty, expectations[sample.id][1]);
  assert.ok(result.causes.length);
  for (const cause of result.causes) for (const evidence of cause.evidence) assert.equal(evidence.text, result.sanitizedLog.split('\n')[evidence.line - 1]);
  assert.ok(result.verificationSteps.length);
  assert.match(result.notice, /not AI/);
});

test('unknown failures and exit code alone request evidence rather than fabricate OOM', async () => {
  const result = await diagnose({ logText: 'Job exited with code 137' });
  assert.equal(result.certainty, 'needs-context');
  assert.equal(result.causes.length, 0);
  assert.ok(result.missingInformation.length);
});

test('earliest recognized failure wins over downstream network error', async () => {
  const result = await diagnose({ logText: 'npm: not found\nUpload artifact failed: connection timed out' });
  assert.equal(result.category, 'environment');
});
test('leading blank lines are preserved so evidence matches the preview', async () => {
  const result = await diagnose({ logText: '\n\n  npm: not found\n' });
  assert.equal(result.causes[0].evidence[0].line, 3);
  assert.equal(result.sanitizedLog.split('\n')[2], '  npm: not found');
});

test('redaction preserves line numbering and removes credential values', () => {
  const raw = 'TOKEN=abcdef123456\nAuthorization: Bearer abcDEF123\nhttps://user:pass@example.com\n-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----\nnpm: not found';
  const result = redact(raw);
  assert.equal(result.text.split('\n').length, raw.split('\n').length);
  for (const secret of ['abcdef123456', 'abcDEF123', 'user:pass', 'private-material']) assert.ok(!result.text.includes(secret));
  assert.ok(result.count >= 4);
  assert.equal(redact('TOKEN=$CI_JOB_TOKEN').text, 'TOKEN=$CI_JOB_TOKEN');
});

test('empty, excessive and unsupported requests fail before provider invocation', async () => {
  for (const input of [{ logText: ' ' }, { logText: 'a'.repeat(100001) }, { logText: 'x', provider: 'arbitrary' }, { logText: 'x\n'.repeat(4001) }]) {
    await assert.rejects(diagnose(input), { status: 400 });
  }
});

const modelOutput = {
  summary: 'Registry access rejected', category: 'access', certainty: 'likely-cause',
  causes: [{ title: 'Check access', explanation: 'Registry denied the operation.', evidenceLines: [2] }],
  suggestedFixes: ['Verify repository and credential scope.'], verificationSteps: ['Retry the operation after checking access.'], missingInformation: ['Credential scope.'],
};
const env = { CLOUD_BASE_URL: 'https://model.example/v1', CLOUD_MODEL: 'test-model', CLOUD_API_KEY: 'fixture-provider-key', OLLAMA_MODEL: 'fixture-local-model' };
const aiInput = { logText: 'TOKEN=fixture-private-value\ndenied: requested access to the resource is denied', configText: 'password: fixture-config-secret', provider: 'cloud' };

test('cloud adapter only sends redacted evidence and resolves validated lines', async () => {
  let request;
  const result = await diagnose(aiInput, { env, fetchImpl: async (url, options) => {
    request = JSON.parse(options.body);
    assert.equal(url, 'https://model.example/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer fixture-provider-key');
    assert.ok(!options.body.includes('fixture-private-value'));
    assert.ok(!options.body.includes('fixture-config-secret'));
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelOutput) } }] });
  } });
  assert.equal(request.model, 'test-model');
  assert.equal(result.provider, 'cloud');
  assert.equal(result.redactions, 2);
  assert.equal(result.causes[0].evidence[0].line, 2);
});

test('Ollama uses native non-streaming JSON request without cloud credentials', async () => {
  const result = await diagnose({ ...aiInput, provider: 'ollama' }, { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(JSON.parse(options.body).stream, false);
    return Response.json({ message: { content: JSON.stringify(modelOutput) } });
  } });
  assert.equal(result.model, 'fixture-local-model');
});

test('fabricated evidence references are rejected instead of displayed', async () => {
  const bad = { ...modelOutput, causes: [{ ...modelOutput.causes[0], evidenceLines: [999] }] };
  await assert.rejects(diagnose(aiInput, { env, fetchImpl: async () => Response.json({ choices: [{ message: { content: JSON.stringify(bad) } }] }) }), /log lines that do not exist/);
});

test('invalid schema and provider errors never silently become rules diagnoses', async () => {
  await assert.rejects(diagnose(aiInput, { env: {} }), { status: 503 });
  await assert.rejects(diagnose(aiInput, { env, fetchImpl: async () => Response.json({ choices: [{ message: { content: '{}' } }] }) }), { status: 502 });
  await assert.rejects(diagnose(aiInput, { env, fetchImpl: async () => new Response('private provider error with secret', { status: 401 }) }), /HTTP 401/);
});

test('provider output is bounded and raw error content does not leak', async () => {
  await assert.rejects(diagnose(aiInput, { env, fetchImpl: async () => new Response('x'.repeat(100001)) }), /exceeded/);
  await assert.rejects(diagnose(aiInput, { env, fetchImpl: async () => { throw new Error('private connection detail'); } }), error => !error.message.includes('private connection detail'));
});

test('provider endpoints cannot be supplied by callers and cloud rejects plaintext URLs', async () => {
  await assert.rejects(diagnose(aiInput, { env: { ...env, CLOUD_BASE_URL: 'http://untrusted.example' } }), /HTTPS/);
  const result = await diagnose({ logText: 'npm: not found', provider: 'rules', baseUrl: 'http://untrusted.example' });
  assert.equal(result.provider, 'rules');
});
