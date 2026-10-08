// Opt-in: runs real model requests using synthetic data. Cloud calls can incur cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../../lib/diagnose.js';
import { getProviderStatus } from '../../lib/providers.js';
import { samples } from '../../lib/samples.js';

const categories = { registry: 'access', syntax: 'configuration', runtime: 'environment', tls: 'network', oidc: 'access', timeout: 'network' };
for (const provider of ['cloud', 'ollama']) {
  const configured = getProviderStatus().find(p => p.id === provider).configured;
  const enabled = process.env.RUN_LIVE_AI === '1';
  for (const sample of samples) test(`live ${provider}: ${sample.id}`, {
    timeout: 70000,
    skip: !enabled ? 'Set RUN_LIVE_AI=1 to explicitly enable real provider calls.' : !configured ? 'Provider configuration is missing.' : false,
  }, async () => {
    const result = await diagnose({ ...sample, provider });
    assert.equal(result.provider, provider);
    assert.ok(result.verificationSteps.length);
    assert.ok(result.causes.length || result.certainty === 'needs-context');
    if (sample.id === 'timeout') {
      assert.equal(result.certainty, 'needs-context', 'A timeout alone must not be presented as a settled cause.');
      assert.ok(result.missingInformation.length);
    } else {
      assert.equal(result.category, categories[sample.id]);
    }
    for (const cause of result.causes) for (const evidence of cause.evidence) assert.equal(evidence.text, result.sanitizedLog.split('\n')[evidence.line - 1]);
  });
}
