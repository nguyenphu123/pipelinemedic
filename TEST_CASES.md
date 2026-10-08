# PipelineMedic test plan

Scope: the pipeline/configuration catalog, normalized run dashboard, stored-run advisor, paste/upload diagnosis lab, HTTP APIs, provider adapters and stdio MCP. This is the release test inventory, not a claim that every listed check has passed. PASS means executed; PENDING means not executed; BLOCKED names a missing dependency. P0 blocks a release of the affected feature; P1 should pass before a public demo.

## Run the tests

Requires Node.js 24+ and `npm ci`.

```sh
npm test
npm run test:report
npm run build
npm start
# In another terminal:
npm run test:smoke
npm run test:live
```

`test:report` writes the individual results to [automated-test-results.md](devpost/automated-test-results.md). Its 78 rows enumerate every executable deterministic case, including expected outcomes. Mock model tests do not establish real model accuracy. The smoke command accepts an optional base URL. Never use private production logs as test fixtures.

## Automated coverage — all 78 PASS

| Area / priority | Test source | Assertions covered |
|---|---|---|
| Diagnosis / P0 | `tests/diagnose.test.js` | Six synthetic CI cases; correct category and certainty; unknown exit code stays uncertain; earliest failure wins; leading blank lines preserve citations; invalid and excessive input; secret removal; provider contracts and failures; invented references rejected |
| Model contract / P0 | `tests/contracts.test.js` | Required fields and bounded arrays; enum and length boundaries; causes require evidence; uncertainty requires missing information; model cannot override service metadata; duplicate references normalized; returned secrets redacted; provider HTTP errors/timeouts/bad JSON and unsafe endpoints |
| Redaction / P0 | `tests/redaction.test.js` | Token formats, credentials in URLs, assignment and CLI secrets including quoted arguments, JWT and authorization, multiline private keys; ANSI/CRLF normalization; stable line counts; harmless variable references; idempotence |
| HTTP boundary / P0 | `tests/http.test.js` | Same-origin policy, configured bearer token, normalized Next host, remote access without token denied, malformed/oversized bodies |
| Routes / P0 | `tests/routes.test.js` | Successful no-store result; malformed JSON and incorrect media type; oversized request; provider metadata authorization; public health contains no secrets; three concurrent requests accepted, fourth rejected, capacity released after error |
| MCP / P0 | `tests/mcp.test.js` | Real SDK client starts stdio process, initializes, lists and calls four tools; ad hoc and stored-run diagnosis; normalized run listing; invalid arguments return a tool error |
| Pipeline catalog / P0 | `tests/pipelines.test.js` | Six provider structural checks; SQLite seed/create/read/update/delete; configuration-only version increments; revision notes; no-store CRUD routes; 400/403/415/422 boundaries |
| Runs and dashboard / P0 | `tests/runs.test.js` | Cross-provider demo seed; health summaries and recurring signals; ingestion validation, numbering and redaction; no-store list/detail APIs; stored-run evidence-linked diagnosis |

## Control-plane browser acceptance

| ID / priority | Steps → expected result | Status |
|---|---|---|
| OPS-01 / P0 | Open `/` → dashboard shows nine explicitly marked demo runs, metrics, trend and three failures | PASS |
| OPS-02 / P0 | Open a failure from the inbox → advisor loads the matching log, config and runtime context | PASS |
| OPS-03 / P0 | Investigate with built-in rules → evidence-linked cause, next steps and verification appear | PASS |
| OPS-04 / P0 | Click a citation → matching stored log line is highlighted | PASS |
| OPS-05 / P1 | Navigate Dashboard → Pipelines → Advisor → Log sandbox through shared navigation | PASS |
| OPS-06 / P0 | Ingest a run containing a common secret assignment → persisted detail is redacted | PASS automated |
| OPS-07 / P1 | Connect real GitLab/Jenkins webhooks or poller adapters and verify run mapping | PENDING credentials/provider environment |

## Phase-one browser acceptance

| ID / priority | Steps → expected result | Status |
|---|---|---|
| CFG-01 / P0 | Open `/pipelines` → load three starter records and first configuration | PASS |
| CFG-02 / P0 | Add an Azure pipeline → it appears selected with provider template and version 1 | PASS |
| CFG-03 / P0 | Edit config and revision note, save → version 2 survives reload and history count increases | PASS |
| CFG-04 / P0 | Save structurally invalid Azure config → 422 message shown and stored revision remains unchanged | PASS |
| CFG-05 / P1 | Search by pipeline name → catalog narrows to the matching record | PASS |
| CFG-06 / P1 | 390px viewport → heading, catalog and workbench visible with no horizontal document overflow | PASS |
| CFG-07 / P1 | Upload and download configuration through the workbench | PENDING browser check; file-size boundary automated at service layer |
| CFG-08 / P0 | Remove confirmation explains local-only effect; cancel retains record; confirmed remove deletes record and revisions | PARTIAL: API deletion PASS; confirmation browser flow not executed |
| CFG-09 / P0 | Restart server → SQLite catalog and revisions remain available | PASS via browser reload; full process restart PENDING |
| CFG-10 / P0 | Put likely plaintext credentials in config → clear warning before persistence | PENDING product safeguard; do not store secrets in phase one |

## Running-server checks

| ID / priority | Steps and expected result | Status |
|---|---|---|
| HTTP-01 / P0 | GET `/` → 200 and PipelineMedic content; GET `/api/health` → 200 and ok | PASS dev and production |
| HTTP-02 / P0 | POST all six synthetic samples to `/api/diagnose` → 200, evidence-backed causes; timeout needs context | PASS dev and production |
| HTTP-03 / P0 | POST empty log → 400; foreign Origin → 403 | PASS dev and production |
| BUILD-01 / P0 | `npm run build` completes; standalone `npm start -- --port 3002` serves smoke checks | PASS |
| BUILD-02 / P1 | Request rendered JS/CSS assets from production; interact with production page after clean install on another machine | PENDING |

## Browser acceptance cases

Use synthetic samples and `node scripts/prepare-upload-fixtures.js`. Generated upload fixtures are ignored by Git. Reset to a sample before each independent case.

| ID / priority | Steps → expected result | Status |
|---|---|---|
| UI-01 / P0 | Analyze registry sample → access diagnosis, fixes and verification steps | PASS |
| UI-02 / P0 | Click an evidence line → sanitized preview opens at highlighted matching line | PASS |
| UI-03 / P0 | Open Samples, select timeout and analyze → missing information, no asserted firewall/root cause | PASS |
| UI-04 / P0 | Select unconfigured cloud provider and analyze → actionable error, input retained | PASS |
| UI-05 / P0 | Paste synthetic TOKEN assignment, open preview → secret replaced | PASS |
| UI-06 / P0 | Clear log with keyboard → Analyze disabled and stale diagnosis removed | PASS |
| UI-07 / P0 | Upload `upload.log` → content loaded; preview hides synthetic secret | PASS |
| UI-08 / P0 | Upload oversized fixture → clear limit error and previous input retained | PASS |
| UI-09 / P0 | Upload binary fixture → clear binary-file error | PASS |
| UI-10 / P1 | Open settings → provider configuration metadata/help, no API keys | PASS |
| UI-11 / P1 | At 390px and desktop widths → usable diagnosis layout without horizontal overflow | PASS |
| UI-12 / P1 | Inspect browser warning/error logs during core workflow → none | PASS |
| UI-13 / P0 | Load sample then replace its log → sample configuration cleared; user-added custom config remains when editing custom log | PENDING regression check |
| UI-14 / P1 | Copy report and download Markdown → same diagnosis, sanitized evidence, readable filename/content | PENDING |
| UI-15 / P0 | Change log/config/context/provider after success → old result removed, next request uses updated input | PARTIAL: log clearing checked; other controls pending |
| UI-16 / P0 | Delayed provider: cancel waiting, then retry → no late old result replaces newer result; usable controls | PENDING |
| UI-17 / P1 | Reload page → no persisted custom log, token or diagnosis | PENDING |
| UI-18 / P1 | Keyboard-only navigation: dialogs open/close, focus visible and restored; screen reader names meaningful | PENDING full audit |
| UI-19 / P1 | 200% zoom, long unbroken text and Unicode log; Chrome, Edge, Firefox and Safari → controls reachable, evidence legible | PENDING cross-browser audit |
| UI-20 / P0 | Upload unreadable file or exceed 4,000 lines → actionable error without crash; whitespace-only log rejected | PENDING browser boundary check; service boundaries automated |
| UI-21 / P1 | Open MCP and privacy guides → accurate commands, readable dialogs and functioning close controls | PENDING |

## Real AI acceptance — 12 cases skipped

`tests/live/providers.test.js` runs the six sample cases against each of cloud and Ollama. All 12 were skipped because live testing is opt-in and no configured live provider was supplied. Configure `.env` from `.env.example`, then opt in:

```powershell
$env:RUN_LIVE_AI = '1'
npm run test:live
Remove-Item Env:RUN_LIVE_AI
```

POSIX: `RUN_LIVE_AI=1 npm run test:live`. A configured cloud run makes billable model requests. Record provider/model, date and results. Repeat after changing model or prompt; human review is necessary even when the assertions pass.

| ID / priority | Expected result | Status |
|---|---|---|
| AI-01–06 / P0 | Cloud: registry, syntax, runtime, TLS, OIDC and timeout produce appropriate categories, valid evidence and uncertainty | SKIPPED |
| AI-07–12 / P0 | Ollama: same six cases under the local model | SKIPPED |
| AI-13 / P0 | Manually review fixes for environmental fit, least privilege, no advice to disable TLS or expose credentials | PENDING |
| AI-14 / P0 | Mixed failures and misleading injected instructions → advice grounded in real evidence, no instruction-following from log text | PENDING live adversarial review |
| AI-15 / P0 | Inspect requests to a controlled mock endpoint → only sanitized log/config sent; no secrets in returned errors | PASS mocked contracts; arbitrary secret formats remain a limitation |
| AI-16 / P1 | Real unreachable Ollama, bad cloud credentials and exhausted quota → bounded wait, helpful error, no silent fallback | PENDING live; mocked error contracts PASS |

## Container and deployment acceptance

Docker is not installed in the current environment. These checks are BLOCKED, not passed.

| ID / priority | Steps and expected result |
|---|---|
| DEP-01 / P0 | `docker compose build` then `docker compose up -d` → healthy app; run HTTP smoke against mapped port |
| DEP-02 / P0 | Inspect runtime user → non-root; image/environment/history do not embed `.env`, uploaded logs or credentials |
| DEP-03 / P0 | Configure cloud and host Ollama separately → successful real diagnosis through each reachable endpoint |
| DEP-04 / P0 | Build MCP target and use SDK/client over stdio → initialize/list/call, stdout contains only protocol output |
| DEP-05 / P1 | Stop/restart app → health recovers and custom log/diagnosis history is absent |
| DEP-06 / P0 | Expose via intended reverse proxy with explicit origin and token → authorized request succeeds, missing/wrong token and foreign origin fail |
| DEP-07 / P1 | Graceful stop, resource-limited container and unavailable provider → recoverable response; no indefinite resource consumption |

## Additional public-release gates

| ID / priority | Required check | Status |
|---|---|---|
| SEC-01 / P0 | Model/log HTML and script payload rendered as text, never executed; exported text does not include known secrets | PENDING browser adversarial check |
| SEC-02 / P0 | HTTP authentication, origin and payload defenses | PASS automated; reverse-proxy configuration pending |
| SEC-03 / P0 | Review redaction preview with representative sanitized organization formats; explicitly document unsupported formats | PENDING organization-specific review |
| SEC-04 / P1 | Dependency audit after lockfile changes | PASS initial install audit; repeat for release |
| PERF-01 / P1 | Largest valid input on target hardware, sustained concurrent calls and provider outage → measured latency/memory, no crash | PENDING; concurrency contract PASS |
| OPS-01 / P0 | For internet deployment: TLS, identity/access policy, infrastructure logging/retention, abuse limits and secret rotation reviewed | PENDING deployment-specific work |

Release decision: the deterministic local prototype is verified. Do not claim live-model accuracy, container readiness, complete accessibility or public-production readiness until their outstanding gates pass. Automatic repairs, CI connectors, multi-user accounts, database history and deployment execution are outside this version's scope.
