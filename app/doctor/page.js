'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Boxes, Check, ChevronRight, CircleHelp, Clock3, Code2, Copy, FileCode2, FileText, FlaskConical, GitBranch, HardDrive, Info, LayoutDashboard, LoaderCircle, LockKeyhole, PanelLeftClose, Plug, Search, Server, Settings2, ShieldCheck, Sparkles, Terminal, TriangleAlert, Upload, X, Zap } from 'lucide-react';
import { samples } from '../../lib/samples.js';
import { sanitizeInput } from '../../lib/redact.js';

const platformNames = { gitlab: 'GitLab CI', jenkins: 'Jenkins', github: 'GitHub Actions', other: 'Other' };
const certaintyNames = { 'direct-evidence': 'Direct evidence', 'likely-cause': 'Likely cause', 'needs-context': 'Needs more context' };
const initial = samples[0];
const defaultProviders = [{ id: 'rules', name: 'Built-in rules', configured: true, model: 'Pattern-based · no AI calls' }, { id: 'cloud', name: 'Cloud AI', configured: false, model: 'Not configured' }, { id: 'ollama', name: 'Local AI · Ollama', configured: false, model: 'Not configured' }];

function Brand({ small = false }) { return <span className={`brand-mark ${small ? 'small' : ''}`}><Activity size={small ? 18 : 23} strokeWidth={2.4} /></span>; }
function Modal({ title, children, close }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} onCancel={close} onClick={e => { if (e.target === dialog.current) close(); }} className="modal">
    <div className="modal-heading"><h2>{title}</h2><button onClick={close} className="icon-button" aria-label="Close dialog"><X size={20} /></button></div>{children}
  </dialog>;
}

export default function Workspace() {
  const [logText, setLog] = useState(initial.logText);
  const [configText, setConfig] = useState(initial.configText);
  const [pipelineType, setPlatform] = useState(initial.pipelineType);
  const [runnerLocation, setRunner] = useState(initial.runnerLocation);
  const [deploymentTarget, setTarget] = useState(initial.deploymentTarget);
  const [provider, setProvider] = useState('rules');
  const [providers, setProviders] = useState(defaultProviders);
  const [providerError, setProviderError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [tokenDraft, setTokenDraft] = useState('');
  const [tab, setTab] = useState('log');
  const [sampleId, setSample] = useState(initial.id);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const preview = useMemo(() => sanitizeInput({ logText, configText }), [logText, configText]);
  const lineCount = logText ? logText.split('\n').length : 0;
  const activeProvider = providers.find(p => p.id === provider);
  const headers = () => accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/providers', { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setProviders(data.providers); setProviderError(''); })
      .catch(err => { if (err.name !== 'AbortError') { setProviderError(err.message || 'Could not load provider status.'); setProviders(defaultProviders); } });
    return () => controller.abort();
  }, [accessToken]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (selectedLine && tab === 'preview') document.getElementById(`log-line-${selectedLine}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [selectedLine, tab]);
  useEffect(() => () => abortRef.current?.abort(), []);

  function invalidate() { setResult(null); setError(''); setSelectedLine(null); setCopied(false); }
  function edit(setter, value) {
    // A replacement log must not inherit the starter sample's unrelated configuration.
    if (setter === setLog && sampleId) setConfig('');
    setter(value); setSample(null); invalidate();
  }
  function loadSample(sample) {
    setLog(sample.logText); setConfig(sample.configText); setPlatform(sample.pipelineType); setRunner(sample.runnerLocation); setTarget(sample.deploymentTarget);
    setSample(sample.id); setTab('log'); invalidate(); setModal(null);
  }
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 100_000) { setError('Choose a text log smaller than 100 KB, or paste the relevant failed stage.'); return; }
    try {
      const text = await file.text();
      if (text.includes('\u0000')) { setError('This file appears to be binary. Upload a plain-text .log or .txt file.'); return; }
      edit(setLog, text); setTab('log'); setToast(`Loaded ${file.name}`);
    } catch { setError('Could not read this file. Try another text file or paste the log.'); }
  }
  async function analyze(event) {
    event?.preventDefault();
    if (!logText.trim() || busy) return;
    if (lineCount > 4000) { setError('This log has too many lines. Provide the relevant failed stage (up to 4,000 lines).'); return; }
    setBusy(true); setError(''); setResult(null); setCopied(false); setSelectedLine(null);
    const controller = new AbortController(); abortRef.current = controller;
    const timer = setTimeout(() => controller.abort('timeout'), 75_000);
    try {
      const response = await fetch('/api/diagnose', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ logText, configText, pipelineType, runnerLocation, deploymentTarget, provider }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Diagnosis failed. Please retry.');
      setResult(data);
    } catch (err) { setError(controller.signal.aborted ? 'Analysis stopped. Your input is still here; you can retry.' : err.message); }
    finally { clearTimeout(timer); abortRef.current = null; setBusy(false); }
  }
  function reportText() {
    if (!result) return '';
    return [`# PipelineMedic diagnosis`, '', result.summary, `Mode: ${result.model}`, `Evidence level: ${certaintyNames[result.certainty]}`, '', ...result.causes.flatMap(c => [`## ${c.title}`, c.explanation, ...c.evidence.map(e => `L${e.line}: ${e.text}`), '']), '## Suggested fixes', ...result.suggestedFixes.map(x => `- ${x}`), '', '## Verify', ...result.verificationSteps.map(x => `- ${x}`), '', '## Missing evidence', ...result.missingInformation.map(x => `- ${x}`), '', result.notice].join('\n');
  }
  async function copyReport() {
    try { await navigator.clipboard.writeText(reportText()); setCopied(true); setToast('Sanitized report copied.'); }
    catch { setToast('Clipboard unavailable. Use Download report instead.'); }
  }
  function downloadReport() {
    const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'pipelinemedic-diagnosis.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className={`app-shell ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="PipelineMedic home"><Brand /><span>Pipeline<span className="brand-light">Medic</span><small>CI/CD FAILURE DOCTOR</small></span></a>
      <div className="workspace-label"><span className="workspace-avatar">PM</span><span>Local workspace<small>Personal environment</small></span><span className="status-dot" /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">
        <a aria-label="Dashboard" className="nav-item" href="/dashboard"><LayoutDashboard size={18} /><span>Dashboard</span></a>
        <a aria-label="Manage pipelines" className="nav-item" href="/pipelines"><Boxes size={18} /><span>Pipelines</span></a>
        <a aria-label="Run advisor" className="nav-item" href="/advisor"><Sparkles size={18} /><span>Advisor</span></a>
        <button aria-label="Diagnose pipeline" className="nav-item active" onClick={() => setModal(null)}><Activity size={18} /><span>Diagnose pipeline</span><span className="nav-active-dot" /></button>
        <button aria-label="Sample cases" className="nav-item" onClick={() => setModal('samples')} disabled={busy}><FlaskConical size={18} /><span>Sample cases</span><span className="nav-count">6</span></button>
        <button aria-label="MCP integration" className="nav-item" onClick={() => setModal('mcp')}><Plug size={18} /><span>MCP integration</span></button>
        <button aria-label="Connection settings" className="nav-item" onClick={() => setModal('settings')}><Settings2 size={18} /><span>Connection settings</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-card"><ShieldCheck size={21} /><strong>Your logs, your environment.</strong><p>No saved logs. Choose where your analysis runs.</p><button onClick={() => setModal('privacy')}>How data is handled <ArrowUpRight size={13} /></button></div>
        <button aria-label="Quick guide" className="nav-item" onClick={() => setModal('guide')}><CircleHelp size={18} /><span>Quick guide</span></button>
        <div className="sidebar-footer"><span className="version">v0.3 · LOG SANDBOX</span><button className="icon-button collapse-button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={16} /></button></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Diagnose pipeline</strong></div><div className="topbar-right"><span className="local-label"><span className="status-dot" /> No log persistence</span><button className="icon-button" onClick={() => setModal('guide')} aria-label="Open quick guide"><BookOpen size={18} /></button><span className="avatar">PM</span></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span className="tiny-pulse" /> LESS GUESSWORK. MORE GREEN BUILDS.</div><h1>Let’s get your pipeline moving.</h1><p>A failed job is a starting point. Find the cause, follow the evidence, take the next step.</p></div><button className="secondary-button sample-top" disabled={busy} onClick={() => setModal('samples')}><FlaskConical size={16} /> Try a sample</button></div>

        <div className="workflow-strip"><span><span className="step-circle current">1</span> Add your evidence</span><div /><span><span className={`step-circle ${busy || result ? 'current' : ''}`}>2</span> Diagnose the failure</span><div /><span><span className={`step-circle ${result ? 'current' : ''}`}>3</span> Verify the next step</span><ShieldCheck className="strip-shield" size={17} /></div>

        <div className="diagnostic-grid">
          <section className="panel input-panel" aria-labelledby="input-title">
            <div className="panel-heading"><div className="heading-with-icon"><Terminal size={18} /><h2 id="input-title">Pipeline evidence</h2></div><span className="subtle-label">INPUT</span></div>
            <form onSubmit={analyze}>
              <fieldset disabled={busy} className="context-fields">
                <label>CI platform<select value={pipelineType} onChange={e => edit(setPlatform, e.target.value)}><option value="gitlab">GitLab CI</option><option value="jenkins">Jenkins</option><option value="github">GitHub Actions</option><option value="other">Other platform</option></select></label>
                <label>Runner location<select value={runnerLocation} onChange={e => edit(setRunner, e.target.value)}><option value="on-premises">On-premises</option><option value="cloud-hosted">Cloud-hosted</option><option value="self-hosted-cloud">Self-hosted cloud</option><option value="unknown">Not sure</option></select></label>
                <label>Deploy target<select value={deploymentTarget} onChange={e => edit(setTarget, e.target.value)}><option value="kubernetes">Kubernetes</option><option value="on-premises">On-premises</option><option value="cloud">Cloud</option><option value="unknown">Not specified</option></select></label>
              </fieldset>
              <div className="editor-toolbar"><div className="editor-tabs" role="tablist" aria-label="Evidence input"><button type="button" role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'selected' : ''} onClick={() => setTab('log')}><FileText size={14} /> Job log</button><button type="button" role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'selected' : ''} onClick={() => setTab('config')}><FileCode2 size={14} /> Config <span className="optional">optional</span></button><button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'selected' : ''} onClick={() => setTab('preview')} aria-label="Preview redacted input"><ShieldCheck size={14} /><span className="preview-label">Preview</span></button></div><button type="button" className="icon-button upload-button" aria-label="Upload a log file" disabled={busy} onClick={() => fileRef.current.click()}><Upload size={15} /></button><input ref={fileRef} type="file" accept=".txt,.log,text/plain" hidden onChange={upload} /></div>
              <div className="editor-caption"><span><span className={`file-dot ${sampleId ? 'sample' : ''}`} />{tab === 'config' ? 'pipeline configuration' : tab === 'preview' ? 'redacted input · read only' : 'build.log'}{sampleId && <span className="sample-badge">SYNTHETIC SAMPLE</span>}</span><span>{tab === 'config' ? configText.length.toLocaleString() + ' chars' : lineCount + ' lines'}</span></div>
              {tab === 'preview' ? <div className="log-preview" role="region" aria-label="Redacted input" tabIndex={0}>
                {preview.input.logText.split('\n').slice(0, 4000).map((line, i) => <div key={i} id={`log-line-${i + 1}`} className={`log-line ${selectedLine === i + 1 ? 'highlight-line' : ''}`}><span>{i + 1}</span><code>{line || ' '}</code></div>)}
                {lineCount > 4000 && <p>Preview limited to 4,000 lines. Trim the log before analysis.</p>}
                {configText && <><div className="preview-config-title">REDACTED CONFIGURATION</div><pre>{preview.input.configText}</pre></>}
              </div> : <div className="editor-area"><div className="line-gutter" aria-hidden="true">{Array.from({ length: Math.min(4000, Math.max((tab === 'log' ? logText : configText).split('\n').length, 16)) }, (_, i) => <span key={i}>{i + 1}</span>)}</div><textarea aria-label={tab === 'log' ? 'Job log' : 'Pipeline configuration'} spellCheck={false} value={tab === 'log' ? logText : configText} maxLength={tab === 'log' ? 100000 : 30000} disabled={busy} onChange={e => edit(tab === 'log' ? setLog : setConfig, e.target.value)} placeholder={tab === 'log' ? 'Paste the failed stage and the output leading up to it…' : 'Optional: paste your .gitlab-ci.yml, Jenkinsfile, or workflow configuration…'} onScroll={e => { e.target.previousSibling.scrollTop = e.target.scrollTop; }} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze(e); }} /></div>}
              <div className="editor-footer"><span><LockKeyhole size={12} /> {preview.redactions ? `${preview.redactions} potential secret${preview.redactions === 1 ? '' : 's'} redacted` : 'Common secrets redacted before analysis'}</span><button type="button" onClick={() => setTab('preview')}>Review input <ArrowUpRight size={12} /></button></div>
              <div className="analysis-controls"><div className="provider-control"><label htmlFor="provider"><Sparkles size={14} /> Analyze with</label><select id="provider" value={provider} disabled={busy} onChange={e => { setProvider(e.target.value); invalidate(); }}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}{!p.configured ? ' · setup needed' : ''}</option>)}</select><span>{provider === 'rules' ? 'Runs here. No model or API key needed.' : activeProvider?.configured ? `Configured · ${activeProvider.model}` : 'Add server configuration to enable this provider.'}</span></div><button className="primary-button" disabled={busy || !logText.trim()} type="submit">{busy ? <LoaderCircle className="spin" size={17} /> : <Zap size={17} />}<span>{busy ? 'Analyzing…' : 'Diagnose failure'}</span>{!busy && <ArrowRight size={16} />}</button></div>
              {provider !== 'rules' && <p className="provider-disclosure">Sanitized input will be sent to your configured {provider === 'cloud' ? 'cloud model provider' : 'Ollama server'}. Review it first; redaction is best effort.</p>}
            </form>
            {(error || providerError) && <div className="error-box" role="alert"><TriangleAlert size={17} /><div>{error || providerError}{(providerError || (error && error.includes('configured'))) && <button onClick={() => setModal('settings')}>Open connection settings <ArrowRight size={13} /></button>}</div></div>}
          </section>

          <section className="panel result-panel" aria-labelledby="result-title" aria-busy={busy}>
            <div className="panel-heading"><div className="heading-with-icon"><Activity size={18} /><h2 id="result-title">Diagnosis</h2></div>{result ? <div className="result-actions"><button className="icon-button" onClick={copyReport} aria-label="Copy diagnosis">{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={downloadReport} aria-label="Download report"><ArrowDownToLine size={16} /></button></div> : <span className="subtle-label">{busy ? 'IN PROGRESS' : 'AWAITING ANALYSIS'}</span>}</div>
            <div aria-live="polite" className="result-content">
              {busy ? <div className="empty-state"><div className="scan-orbit"><LoaderCircle className="spin" size={30} /></div><h3>Following the evidence…</h3><p>{provider === 'rules' ? 'Checking known failure patterns.' : 'Your selected model is reviewing the sanitized log.'}</p><button className="secondary-button" onClick={() => abortRef.current?.abort()}>Stop waiting</button></div> : result ? <>
                <div className="result-summary"><div className="result-meta"><span className={`certainty-badge ${result.certainty === 'needs-context' ? 'uncertain' : ''}`}><span />{certaintyNames[result.certainty]}</span><span className="mode-label">{result.provider === 'rules' ? 'RULES ANALYSIS' : 'AI ANALYSIS'}</span></div><h3>{result.summary}</h3><div className="result-context"><span><GitBranch size={12} />{platformNames[result.context.pipelineType]}</span><span><Clock3 size={12} />{result.durationMs < 1000 ? '< 1s' : `${(result.durationMs / 1000).toFixed(1)}s`}</span><span>{result.category}</span></div></div>
                {result.causes.map((cause, i) => <article className="cause-card" key={i}><div className="section-kicker"><Search size={13} />{i === 0 ? 'WHAT THE EVIDENCE SHOWS' : 'ADDITIONAL FINDING'}</div>{result.causes.length > 1 && <h4>{cause.title}</h4>}<p>{cause.explanation}</p><div className="evidence-lines">{cause.evidence.map(e => <button key={e.line} onClick={() => { setTab('preview'); setSelectedLine(e.line); }} title={`Jump to log line ${e.line}`}><span>L{e.line}</span><code>{e.text}</code><ArrowUpRight size={13} /></button>)}</div></article>)}
                {result.suggestedFixes.length > 0 && <div className="result-section"><div className="section-kicker"><Code2 size={14} />SUGGESTED NEXT STEPS</div><ol className="fix-list">{result.suggestedFixes.map((fix, i) => <li key={i}><span>{i + 1}</span><p>{fix}</p></li>)}</ol></div>}
                <div className="verification-box"><div className="section-kicker"><ShieldCheck size={15} />VERIFY THE FIX</div>{result.verificationSteps.map((step, i) => <p key={i}><Check size={14} /><span>{step}</span></p>)}</div>
                {result.missingInformation.length > 0 && <details className="missing-box" open={result.certainty === 'needs-context'}><summary><Info size={14} />{result.certainty === 'needs-context' ? 'More evidence needed' : 'Context worth checking'}<span>{result.missingInformation.length}</span></summary><ul>{result.missingInformation.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
                <p className="result-notice"><Info size={13} />{result.notice}</p>
              </> : <div className="empty-state"><div className="scan-orbit"><Activity size={35} strokeWidth={1.5} /><span className="orbit-dot" /></div><span className="empty-eyebrow">A CLEARER PATH TO GREEN</span><h3>Your next step starts here.</h3><p>Add a failed job log and we’ll help you<br className="desktop-break" /> make sense of what happened.</p><div className="empty-features"><span><Search size={15} /><span>Causes grounded in your logs</span></span><span><Code2 size={15} /><span>Practical fixes, with verification</span></span><span><CircleHelp size={15} /><span>Clear about what’s still unknown</span></span></div><div className="empty-hint"><ArrowRight size={14} /> A sample log is ready on the left.</div></div>}
            </div>
          </section>
        </div>

        <div className="under-grid"><span><ShieldCheck size={14} /> Advice only. You stay in control of every change.</span><button onClick={() => setModal('mcp')}><Plug size={14} /> Also available to your AI assistant via MCP <ArrowUpRight size={13} /></button></div>
        <section className="samples-section"><div className="samples-heading"><h2>Explore a failure, without breaking anything.</h2><span>Sanitized, synthetic examples</span></div><div className="sample-cards">{[samples[0], samples[2], samples[4]].map(sample => <button key={sample.id} disabled={busy} className={`sample-card ${sampleId === sample.id ? 'chosen' : ''}`} onClick={() => loadSample(sample)}><span className="sample-icon">{sample.id === 'registry' ? <LockKeyhole size={19} /> : sample.id === 'runtime' ? <Terminal size={19} /> : <Server size={19} />}</span><span><strong>{sample.title}</strong><small>{sample.platform} <span>·</span> {sample.tag}</small></span><ArrowUpRight size={15} /></button>)}</div></section>
        <footer className="main-footer"><span><Brand small /> Built for the people behind the pipelines.</span><span>PipelineMedic <span className="footer-dot">/</span> Build With AI: Basics</span></footer>
      </main>
    </div>

    {modal === 'samples' && <Modal title="Choose a sample case" close={() => setModal(null)}><p className="modal-intro">Synthetic failures with known symptoms. Load one, then diagnose it using rules or a configured AI provider.</p><div className="modal-samples">{samples.map(s => <button key={s.id} onClick={() => loadSample(s)}><FlaskConical size={19} /><span><strong>{s.title}</strong><small>{s.platform} · {s.tag}</small></span><ArrowRight size={16} /></button>)}</div></Modal>}
    {modal === 'settings' && <Modal title="Connection settings" close={() => setModal(null)}><p className="modal-intro">Model credentials are configured on the server. They never belong in a pipeline log or browser field.</p><div className="provider-status-list">{providers.map(p => <div key={p.id}><span className={`status-dot ${p.configured ? '' : 'inactive'}`} /><span><strong>{p.name}</strong><small>{p.model}</small></span><span className="status-text">{p.configured ? 'Configured' : 'Setup needed'}</span></div>)}</div><p className="small-note">Configured does not mean connection-tested. Run a diagnosis to verify the provider.</p><details className="setup-details" open><summary>Cloud and local provider setup</summary><p>Copy <code>.env.example</code> to <code>.env</code>, set your values, then restart the server.</p><pre>{'CLOUD_BASE_URL=https://api.groq.com/openai/v1\nCLOUD_API_KEY=your-server-side-key\nCLOUD_MODEL=your-model-name\n\nOLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=your-installed-model'}</pre><p>In Docker, use <code>http://host.docker.internal:11434</code> for Ollama on the host. The model must be installed separately.</p></details><div className="access-token"><label htmlFor="access-token">Workspace access token <span>optional</span></label><p>Only needed if the operator configured PIPELINEMEDIC_ACCESS_TOKEN. Kept in memory until reload.</p><input id="access-token" type="password" autoComplete="off" value={tokenDraft} onChange={e => setTokenDraft(e.target.value)} placeholder="Server access token" /><button className="primary-button" onClick={() => { setAccessToken(tokenDraft); invalidate(); setModal(null); setToast('Workspace connection updated.'); }}>Apply connection <ArrowRight size={15} /></button></div></Modal>}
    {modal === 'mcp' && <Modal title="Bring PipelineMedic to your assistant" close={() => setModal(null)}><div className="modal-hero-icon"><Plug size={26} /></div><p className="modal-intro">The MCP server exposes the same diagnosis and control-plane context used by this workspace. Your assistant can inspect runs and receive structured advice.</p><div className="tool-card"><code>list_pipeline_runs</code><p>List normalized pipeline runs, optionally filtered by status.</p></div><div className="tool-card"><code>diagnose_run</code><p>Investigate a stored run with its matching log, configuration and runtime context.</p></div><div className="tool-card"><code>diagnose_pipeline</code><p>Analyze an ad hoc log, optional configuration and pipeline context with rules, cloud or Ollama.</p></div><div className="tool-card"><code>list_sample_cases</code><p>Get six labeled synthetic cases for trying the workflow.</p></div><h3>Start locally over stdio</h3><pre>npm run mcp</pre><p className="small-note">Configure your MCP client to launch Node with an absolute path to mcp/server.js and your project as its working directory. See README.md for a complete client configuration. Model variables are shared with the web app through .env.</p><div className="info-box"><ShieldCheck size={18} /><span>Read-only diagnostic tools. The server does not run repair commands or change your infrastructure.</span></div></Modal>}
    {modal === 'privacy' && <Modal title="How your evidence is handled" close={() => setModal(null)}><div className="privacy-steps"><div><HardDrive /><h3>Transient by default</h3><p>Logs and results stay in this page and the server request. PipelineMedic does not write them to a database or browser storage. Reloading clears the workspace.</p></div><div><ShieldCheck /><h3>Review before you send</h3><p>Common credential patterns are redacted in logs and configuration. The preview shows the sanitized input. This is best effort; review proprietary information and unrecognized secrets yourself.</p></div><div><Sparkles /><h3>You choose the destination</h3><p>Built-in rules make no model calls. Cloud AI sends sanitized input to your configured provider. Ollama sends it to the configured model server. Those services have their own data policies.</p></div></div></Modal>}
    {modal === 'guide' && <Modal title="From red build to a useful next step" close={() => setModal(null)}><ol className="guide-list"><li><strong>Bring the right context.</strong><p>Paste the failed command and surrounding lines. Include the configuration when conditions, syntax or tool setup matter.</p></li><li><strong>Choose where analysis runs.</strong><p>Built-in rules work immediately. Configure cloud AI or Ollama for model-based interpretation.</p></li><li><strong>Read the evidence.</strong><p>Click an evidence line to see it in the redacted log. “Direct evidence” describes the symptom; it is not a guarantee of the underlying cause.</p></li><li><strong>Verify before changing anything.</strong><p>Use the suggested checks. For ambiguous errors, collect the requested evidence and analyze again.</p></li></ol><p className="small-note">Shortcut: Ctrl/⌘ + Enter from the editor starts a diagnosis.</p></Modal>}
    {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
  </div>;
}
