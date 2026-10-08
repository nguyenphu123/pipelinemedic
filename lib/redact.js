// Shared by the browser preview and server. Best effort; never claim complete DLP.
export function redact(text) {
  let count = 0;
  const replace = () => { count += 1; return '[REDACTED]'; };
  let clean = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\r\n?/g, '\n');
  clean = clean.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    (value) => { count += 1; return value.split('\n').map(() => '[REDACTED]').join('\n'); });
  clean = clean.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|glpat-[A-Za-z0-9_-]{10,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{16,})\b/g, replace);
  clean = clean.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replace);
  clean = clean.replace(/(\b(?:authorization)\s*[:=]\s*["']?(?:bearer|basic)\s+)([^\s"']+)/gi, (_, prefix) => prefix + replace());
  clean = clean.replace(/(--(?:password|passwd|token|secret|api-key|access-token)\s+)("[^"\n]*"|'[^'\n]*'|[^\s]+)/gi,
    (_, prefix, value) => /^(?:["']?\$|\[REDACTED\])/.test(value) ? prefix + value : prefix + replace());
  clean = clean.replace(/((?:["']?[\w.-]*(?:password|passwd|token|secret|api[_-]?key|access[_-]?key)[\w.-]*["']?)\s*[:=]\s*)("[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
    (_, prefix, value) => /^(?:\$|\[REDACTED\]|"?\$)/.test(value) ? prefix + value : prefix + replace());
  clean = clean.replace(/(https?:\/\/|postgres(?:ql)?:\/\/|mysql:\/\/)([^\s/@]+):([^\s/@]+)@/gi,
    (_, protocol) => protocol + replace() + '@');
  return { text: clean, count };
}

export function sanitizeInput(input) {
  const log = redact(input.logText);
  const config = redact(input.configText || '');
  return { input: { ...input, logText: log.text, configText: config.text }, redactions: log.count + config.count };
}
