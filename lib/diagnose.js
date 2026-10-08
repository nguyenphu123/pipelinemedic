import { randomUUID } from 'node:crypto';
import { inputSchema, modelResultSchema, DiagnosisError } from './schema.js';
import { sanitizeInput, redact } from './redact.js';
import { diagnoseWithRules } from './rules.js';
import { callModel } from './providers.js';

export async function diagnose(raw, dependencies = {}) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new DiagnosisError('Provide a nonempty log up to 100,000 characters, configuration up to 30,000 characters, and valid context selections.');
  const { input, redactions } = sanitizeInput(parsed.data);
  if (input.logText.split('\n').length > 4000) throw new DiagnosisError('This log has too many lines. Provide the relevant failed stage (up to 4,000 lines).');
  const started = Date.now();
  const output = input.provider === 'rules'
    ? { result: diagnoseWithRules(input), model: 'Built-in pattern rules' }
    : await callModel(input, dependencies);
  const checked = modelResultSchema.safeParse(output.result);
  if (!checked.success) throw new DiagnosisError('The provider returned an incomplete diagnosis. No unvalidated advice was displayed. Try again or use built-in rules.', 502);
  const lines = input.logText.split('\n');
  const result = checked.data;
  for (const cause of result.causes) {
    if (cause.evidenceLines.some(n => n > lines.length || !lines[n - 1].trim())) {
      throw new DiagnosisError('The provider cited log lines that do not exist or are empty. No unvalidated advice was displayed.', 502);
    }
  }
  // Redact textual model output too; never trust a model to obey the secret policy.
  const clean = value => typeof value === 'string' ? redact(value).text
    : Array.isArray(value) ? value.map(clean)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])) : value;
  const safe = clean(result);
  return {
    ...safe,
    causes: safe.causes.map(cause => ({ ...cause, evidence: [...new Set(cause.evidenceLines)].map(line => ({ line, text: lines[line - 1] })) })),
    id: randomUUID(), createdAt: new Date().toISOString(), durationMs: Date.now() - started,
    provider: input.provider, model: output.model, redactions,
    sanitizedLog: input.logText, sanitizedConfig: input.configText,
    context: { pipelineType: input.pipelineType, runnerLocation: input.runnerLocation, deploymentTarget: input.deploymentTarget },
    notice: input.provider === 'rules' ? 'Pattern-based analysis, not AI. Validate these suggestions in your environment.' : 'AI-generated advice. Evidence references are checked; causal claims still need human verification.',
  };
}
