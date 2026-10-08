import { z } from 'zod';

export const MAX_LOG = 100_000;
export const MAX_CONFIG = 30_000;
export const inputSchema = z.object({
  logText: z.string().min(1, 'Paste a job log first.').max(MAX_LOG).refine(value => value.trim().length > 0, 'Paste a job log first.'),
  configText: z.string().max(MAX_CONFIG).default(''),
  pipelineType: z.enum(['gitlab', 'jenkins', 'github', 'other']).default('gitlab'),
  runnerLocation: z.enum(['on-premises', 'cloud-hosted', 'self-hosted-cloud', 'unknown']).default('unknown'),
  deploymentTarget: z.enum(['on-premises', 'cloud', 'kubernetes', 'unknown']).default('unknown'),
  provider: z.enum(['rules', 'cloud', 'ollama']).default('rules'),
});

const shortText = z.string().trim().min(1).max(2000);
export const modelResultSchema = z.object({
  summary: shortText,
  category: z.enum(['configuration', 'environment', 'dependencies', 'access', 'network', 'resources', 'deployment', 'unknown']),
  certainty: z.enum(['direct-evidence', 'likely-cause', 'needs-context']),
  causes: z.array(z.object({
    title: shortText,
    explanation: shortText,
    evidenceLines: z.array(z.number().int().positive()).min(1).max(12),
  })).max(5),
  suggestedFixes: z.array(shortText).max(8),
  verificationSteps: z.array(shortText).min(1).max(8),
  missingInformation: z.array(shortText).max(8),
}).superRefine((value, ctx) => {
  if (value.certainty !== 'needs-context' && value.causes.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'A diagnosis must include supporting evidence.' });
  }
  if (value.certainty === 'needs-context' && value.missingInformation.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'An inconclusive diagnosis must request missing evidence.' });
  }
});

export class DiagnosisError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'DiagnosisError'; this.status = status; }
}
