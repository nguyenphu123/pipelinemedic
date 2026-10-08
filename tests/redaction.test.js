import test from 'node:test';
import assert from 'node:assert/strict';
import { redact, sanitizeInput } from '../lib/redact.js';

const cases = [
  ['environment assignment', 'DEPLOY_TOKEN=synthetic-value-123', 'synthetic-value-123'],
  ['quoted JSON value', '{"password":"synthetic password with spaces"}', 'synthetic password with spaces'],
  ['YAML value', 'api_key: synthetic-api-value', 'synthetic-api-value'],
  ['bearer header', 'Authorization: Bearer synthetic-bearer-value', 'synthetic-bearer-value'],
  ['basic header', 'Authorization: Basic c3ludGhldGljOm9ubHk=', 'c3ludGhldGljOm9ubHk='],
  ['GitHub token', 'ghp_1234567890abcdefghijklmnop', 'ghp_1234567890abcdefghijklmnop'],
  ['GitLab token', 'glpat-1234567890abcdefghijkl', 'glpat-1234567890abcdefghijkl'],
  ['AWS key ID', 'AKIAABCDEFGHIJKLMNOP', 'AKIAABCDEFGHIJKLMNOP'],
  ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlIn0.c3ludGhldGlj', 'eyJhbGciOiJIUzI1NiJ9'],
  ['URL credentials', 'https://fixture-user:fixture-password@registry.example/path', 'fixture-password'],
  ['database URL', 'postgresql://fixture:fixture-db-password@db.example/app', 'fixture-db-password'],
  ['CLI password flag', 'docker login --password fixture-cli-password registry.example', 'fixture-cli-password'],
  ['quoted CLI token', 'tool --token "fixture cli token"', 'fixture cli token'],
];
for (const [name, input, sensitive] of cases) test(`redaction: ${name}`, () => {
  const output = redact(input);
  assert.ok(!output.text.includes(sensitive), 'sensitive fixture value must not remain');
  assert.match(output.text, /\[REDACTED\]/);
  assert.ok(output.count > 0);
});

test('normal commands and variable references remain useful', () => {
  const text = 'npm ci\nTOKEN=$CI_JOB_TOKEN\necho building\nnode --version\ntool --token "$CI_JOB_TOKEN"';
  assert.equal(redact(text).text, text);
});

test('ANSI color and Windows line endings normalize without shifting lines', () => {
  assert.equal(redact('\u001b[31mERROR\u001b[0m\r\nnext\rfinal').text, 'ERROR\nnext\nfinal');
});

test('redaction is text-idempotent and sanitizes config as well as logs', () => {
  const result = sanitizeInput({ logText: 'SECRET=fixture-log', configText: 'password: fixture-config', provider: 'rules' });
  assert.equal(result.redactions, 2);
  assert.ok(!JSON.stringify(result).includes('fixture-log'));
  assert.ok(!JSON.stringify(result).includes('fixture-config'));
  assert.equal(redact(result.input.logText).text, result.input.logText);
  assert.equal(result.input.provider, 'rules');
});

test('private keys preserve source-line alignment', () => {
  const text = 'before\n-----BEGIN RSA PRIVATE KEY-----\nfixture-line-a\nfixture-line-b\n-----END RSA PRIVATE KEY-----\nafter';
  const result = redact(text);
  assert.equal(result.text.split('\n').length, 6);
  assert.ok(!result.text.includes('fixture-line'));
  assert.equal(result.text.split('\n')[5], 'after');
});
