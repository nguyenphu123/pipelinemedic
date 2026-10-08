const rules = [
  { pattern: /AssumeRoleWithWebIdentity|Could not assume role with OIDC/i, category: 'access', title: 'Cloud role assumption was rejected', certainty: 'likely-cause',
    explanation: 'The identity exchange failed before deployment. Trust-policy conditions or identity configuration may not match this workflow; this log does not identify the exact policy mismatch.',
    fixes: ['Compare the role trust policy with the actual issuer, audience and subject claims. A deployment environment can change the subject.', 'Check the role ARN and identity provider configuration. Keep trust restricted to the intended repository and environment.'],
    verify: ['Inspect non-secret OIDC claim metadata and compare it with the role trust conditions.', 'After correcting a confirmed mismatch, rerun authentication and verify the assumed identity before deployment.'],
    missing: ['Role trust policy and non-secret issuer, audience and subject claims.'] },
  { pattern: /self.signed certificate|unable to get local issuer|certificate verify failed|x509: certificate/i, category: 'network', title: 'Certificate trust validation failed', certainty: 'direct-evidence',
    explanation: 'The client cannot validate the certificate chain. The log establishes a trust failure, but not whether the server chain, internal CA installation or interception proxy is responsible.',
    fixes: ['Check the endpoint certificate chain and expiry from the runner network.', 'Install the approved internal CA in the runner or build image trust store when required. Keep TLS verification enabled.'],
    verify: ['Inspect the chain with openssl s_client -connect HOST:443 -servername HOST -showcerts using the actual hostname.', 'Repeat the failing command from the same runner image after correcting trust.'],
    missing: ['Certificate chain and runner CA/proxy configuration.'] },
  { pattern: /yaml invalid|config should be a string|mapping values are not allowed|WorkflowScript:.*(?:expecting|unexpected)|SyntaxError|syntax error/i, category: 'configuration', title: 'Pipeline configuration could not be parsed', certainty: 'direct-evidence',
    explanation: 'The pipeline definition or script was rejected before normal job execution. Inspect the named field and its surrounding configuration; syntax alone does not establish a runner issue.',
    fixes: ['Validate the complete configuration with the platform linter, including referenced templates.', 'If a YAML script contains a colon followed by a space, quote the entire command or use a block scalar so it remains a string.'],
    verify: ['Run the platform configuration validator against the corrected file.', 'Create a new pipeline and confirm the affected job starts.'], missing: [] },
  { pattern: /command not found|(?:npm|node|docker|python|java|yarn|pnpm): (?:not found|No such file)|not recognized as an internal/i, category: 'environment', title: 'A required executable is unavailable', certainty: 'direct-evidence',
    explanation: 'The job shell cannot locate a required command. The tool may be missing from this runner image or absent from the service account PATH.',
    fixes: ['Use a build image or configured toolchain that includes the required runtime.', 'Check PATH under the runner service account, rather than only in an interactive login shell.'],
    verify: ['Run command -v TOOL and TOOL --version in the same job environment, substituting the failing executable.', 'Rerun the failed stage with the pinned toolchain.'], missing: [] },
  { pattern: /denied: requested access|unauthorized: authentication required|pull access denied|no basic auth credentials|insufficient_scope/i, category: 'access', title: 'Container registry access was denied', certainty: 'direct-evidence',
    explanation: 'The registry rejected an image operation. A missing login, insufficient token scope, incorrect repository path or inaccessible repository can produce this response.',
    fixes: ['Verify the registry hostname and image repository path match the intended project.', 'Authenticate in the same job with a credential scoped to the required pull or push operation. Pass passwords using stdin; do not print them.', 'Check whether protected variables are available on this branch or merge-request context.'],
    verify: ['Check credential availability without echoing its value, then authenticate to the exact registry host.', 'Retry the intended image operation on a test tag and confirm the registry accepts it.'],
    missing: ['Credential scope, job protection context, and registry repository permissions (no secret values).'] },
  { pattern: /ERESOLVE|ELOCKVERIFY|npm ci.*(?:lock|sync)|package.json.*package-lock.json.*sync|Cannot find module|Module not found/i, category: 'dependencies', title: 'Dependency resolution or installation failed', certainty: 'likely-cause',
    explanation: 'The package tool reports an inconsistent or unavailable dependency. Runtime versions, lockfile state and registry access may be relevant.',
    fixes: ['Compare the package manifest and lockfile, and use the same runtime/package-manager versions locally and in CI.', 'Resolve the reported conflict in a clean development checkout and commit the resulting lockfile. Avoid suppressing dependency checks as the first fix.'],
    verify: ['Run the frozen/clean install command in the same pinned build image.', 'Confirm the affected build step succeeds without depending on a stale cache.'], missing: ['Relevant package/lockfile excerpt and runtime versions.'] },
  { pattern: /no space left on device|ENOSPC/i, category: 'resources', title: 'The job ran out of writable storage', certainty: 'direct-evidence',
    explanation: 'A write failed because available space or inodes were exhausted. Identify the affected filesystem before removing anything.',
    fixes: ['Inspect disk and inode usage for the workspace, temporary directories and container storage.', 'Apply the runner retention policy or increase capacity after identifying safe cleanup candidates.'],
    verify: ['Check df -h and df -i on the runner.', 'Rerun after confirming adequate free capacity.'], missing: ['Affected mount and runner storage metrics.'] },
  { pattern: /ETIMEDOUT|connection timed out|connect timeout|Could not resolve host|ENOTFOUND|EAI_AGAIN/i, category: 'network', title: 'Network reachability needs investigation', certainty: 'needs-context',
    explanation: 'The request could not resolve or reach its destination. The log alone does not prove a firewall, DNS, route, proxy, or service fault.',
    fixes: ['Collect DNS and connection checks from the actual runner network.', 'Compare the destination with the expected private/public network path before changing any firewall or routing rules.'],
    verify: ['Check name resolution and connectivity to the target host/port from the runner.', 'Inspect route, proxy and target-service health evidence, then rerun the failed request.'],
    missing: ['Runner network location and DNS result.', 'Destination health, routes and any proxy/firewall decision logs.'] },
  { pattern: /ImagePullBackOff|ErrImagePull|ProgressDeadlineExceeded|exceeded its progress deadline/i, category: 'deployment', title: 'The deployment did not become ready', certainty: 'needs-context',
    explanation: 'The rollout stalled or an image could not be pulled. Deployment status is a symptom; workload events and application logs are needed to identify the cause.',
    fixes: ['Inspect workload events, image references and readiness probe results before changing the deployment.'],
    verify: ['Read kubectl describe pod and deployment status for the affected namespace.', 'After addressing the confirmed cause, verify rollout status and application health.'], missing: ['Pod events, container logs and deployment manifest.'] },
];

export function diagnoseWithRules(input) {
  const lines = input.logText.split('\n');
  const matches = rules.flatMap(rule => {
    const evidenceLines = lines.flatMap((text, i) => rule.pattern.test(text) ? [i + 1] : []).slice(0, 8);
    return evidenceLines.length ? [{ rule, evidenceLines }] : [];
  }).sort((a, b) => a.evidenceLines[0] - b.evidenceLines[0]).slice(0, 3);
  if (!matches.length) return {
    summary: 'There is not enough recognized evidence to identify the cause.', category: 'unknown', certainty: 'needs-context', causes: [], suggestedFixes: [],
    verificationSteps: ['Locate the earliest failed command and include the preceding output, not only the final exit code.'],
    missingInformation: ['The failed command and its surrounding log lines.', 'Relevant pipeline configuration and runner tool versions.'],
  };
  const primary = matches[0].rule;
  return {
    summary: primary.title, category: primary.category, certainty: primary.certainty,
    causes: matches.map(({ rule, evidenceLines }) => ({ title: rule.title, explanation: rule.explanation, evidenceLines })),
    suggestedFixes: primary.fixes, verificationSteps: primary.verify, missingInformation: primary.missing,
  };
}
