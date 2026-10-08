# Automated test results

Run: 2026-09-26T08:33:26.329Z · PipelineMedic 0.3.0 · v24.19.0 · win32

Command: `npm run test:report`

**tests: 78 · pass: 78 · fail: 0 · cancelled: 0 · skipped: 0**

Local deterministic tests and mock-provider contracts only. Live model and Docker checks are tracked separately in TEST_CASES.md. Raw TAP output is in the ignored .test-artifacts/ directory.

| ID | Test case / asserted outcome | Result |
|---|---|---|
| AUTO-001 | model contract rejects missing summary | PASS |
| AUTO-002 | model contract rejects unsupported category | PASS |
| AUTO-003 | model contract rejects invalid certainty | PASS |
| AUTO-004 | model contract rejects no verification | PASS |
| AUTO-005 | model contract rejects ungrounded direct diagnosis | PASS |
| AUTO-006 | model contract rejects uncertainty without a request for evidence | PASS |
| AUTO-007 | model contract rejects zero line reference | PASS |
| AUTO-008 | model contract rejects fractional line reference | PASS |
| AUTO-009 | model contract rejects blank line citation | PASS |
| AUTO-010 | model contract rejects too many suggestions | PASS |
| AUTO-011 | model contract rejects excessive model text | PASS |
| AUTO-012 | model metadata and extra fields cannot override the trusted result envelope | PASS |
| AUTO-013 | repeated citations produce one evidence row and model-secret output is redacted | PASS |
| AUTO-014 | fully inconclusive model result is accepted when it asks for useful evidence | PASS |
| AUTO-015 | input boundaries accept exact maximum and reject oversized configuration | PASS |
| AUTO-016 | additional supported rule categories are recognized | PASS |
| AUTO-017 | rules do not interpret configuration text or injected prose as executable instructions | PASS |
| AUTO-018 | provider metadata omits keys and endpoint addresses | PASS |
| AUTO-019 | cloud HTTP 401 becomes a safe error | PASS |
| AUTO-020 | cloud HTTP 403 becomes a safe error | PASS |
| AUTO-021 | cloud HTTP 429 becomes a safe error | PASS |
| AUTO-022 | cloud HTTP 500 becomes a safe error | PASS |
| AUTO-023 | cloud HTTP 503 becomes a safe error | PASS |
| AUTO-024 | timeout is classified without disclosing the upstream exception | PASS |
| AUTO-025 | malformed envelopes, missing content and non-JSON model output fail safely | PASS |
| AUTO-026 | endpoint credentials, query strings and unsupported schemes are rejected | PASS |
| AUTO-027 | known case: registry returns grounded evidence | PASS |
| AUTO-028 | known case: syntax returns grounded evidence | PASS |
| AUTO-029 | known case: runtime returns grounded evidence | PASS |
| AUTO-030 | known case: tls returns grounded evidence | PASS |
| AUTO-031 | known case: oidc returns grounded evidence | PASS |
| AUTO-032 | known case: timeout returns grounded evidence | PASS |
| AUTO-033 | unknown failures and exit code alone request evidence rather than fabricate OOM | PASS |
| AUTO-034 | earliest recognized failure wins over downstream network error | PASS |
| AUTO-035 | leading blank lines are preserved so evidence matches the preview | PASS |
| AUTO-036 | redaction preserves line numbering and removes credential values | PASS |
| AUTO-037 | empty, excessive and unsupported requests fail before provider invocation | PASS |
| AUTO-038 | cloud adapter only sends redacted evidence and resolves validated lines | PASS |
| AUTO-039 | Ollama uses native non-streaming JSON request without cloud credentials | PASS |
| AUTO-040 | fabricated evidence references are rejected instead of displayed | PASS |
| AUTO-041 | invalid schema and provider errors never silently become rules diagnoses | PASS |
| AUTO-042 | provider output is bounded and raw error content does not leak | PASS |
| AUTO-043 | provider endpoints cannot be supplied by callers and cloud rejects plaintext URLs | PASS |
| AUTO-044 | cross-origin requests fail before input or credentials are processed | PASS |
| AUTO-045 | configured API access token gates requests | PASS |
| AUTO-046 | browser host works when the framework normalizes its internal URL | PASS |
| AUTO-047 | unconfigured remote host is rejected even with a matching origin | PASS |
| AUTO-048 | JSON boundary rejects malformed and oversized input | PASS |
| AUTO-049 | a real MCP client discovers and calls all control-plane tools over stdio | PASS |
| AUTO-050 | configuration checks cover supported CI providers and reject broken structures | PASS |
| AUTO-051 | SQLite catalog seeds examples and supports create, update, version and delete | PASS |
| AUTO-052 | pipeline API performs authenticated-style CRUD with no-store responses | PASS |
| AUTO-053 | pipeline API rejects malformed input, wrong media type and cross-origin writes | PASS |
| AUTO-054 | redaction: environment assignment | PASS |
| AUTO-055 | redaction: quoted JSON value | PASS |
| AUTO-056 | redaction: YAML value | PASS |
| AUTO-057 | redaction: bearer header | PASS |
| AUTO-058 | redaction: basic header | PASS |
| AUTO-059 | redaction: GitHub token | PASS |
| AUTO-060 | redaction: GitLab token | PASS |
| AUTO-061 | redaction: AWS key ID | PASS |
| AUTO-062 | redaction: JWT | PASS |
| AUTO-063 | redaction: URL credentials | PASS |
| AUTO-064 | redaction: database URL | PASS |
| AUTO-065 | redaction: CLI password flag | PASS |
| AUTO-066 | redaction: quoted CLI token | PASS |
| AUTO-067 | normal commands and variable references remain useful | PASS |
| AUTO-068 | ANSI color and Windows line endings normalize without shifting lines | PASS |
| AUTO-069 | redaction is text-idempotent and sanitizes config as well as logs | PASS |
| AUTO-070 | private keys preserve source-line alignment | PASS |
| AUTO-071 | diagnosis route returns a no-store response and grounded result | PASS |
| AUTO-072 | HTTP malformed, empty, wrong-type and oversized requests have useful status codes | PASS |
| AUTO-073 | provider config API is gated, public health has no configuration | PASS |
| AUTO-074 | concurrency cap rejects the fourth request and releases capacity after provider failure | PASS |
| AUTO-075 | run store seeds a transparent cross-provider operations workspace | PASS |
| AUTO-076 | ingested runs are validated, numbered and redacted before persistence | PASS |
| AUTO-077 | dashboard and run APIs return no-store normalized records | PASS |
| AUTO-078 | run ingestion API and stored-run diagnosis form an evidence-linked flow | PASS |

IDs identify this report snapshot; use the test name as the stable code search anchor.
