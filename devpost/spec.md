---
doc: spec
status: approved
approved_on: 2026-10-08
---

# PipelineMedic — Technical Spec

## How This Works, In Plain Language
A Next.js server stores a provider-neutral pipeline catalog and normalized run summaries in SQLite. Run ingestion redacts common credential patterns before persisting failed-stage logs. Built-in rules or optional cloud/local AI turn a selected run into structured advice, and evidence references are checked against stored lines. The web UI and Node MCP server share these services. No commands are executed.

This blueprint implements the user's repeated build request and established choices. Routine implementation details below are agent decisions. The learner reviewed and approved scope and spec on October 8, 2026, after implementation; this is a final review, not a claim of pre-build approval.

## The Core Journey Through the System
Implements two connected journeys: provider adapter/webhook → run ingestion → dashboard → failure inbox → stored-run advisor; and ad hoc input → local redacted preview → `/api/diagnose` → selected provider → validated evidence and next actions.

## Stack
- JavaScript ESM, Node 24, Next.js 16 App Router and React: requested stack, server routes and Docker standalone output. https://nextjs.org/docs/app
- Zod: shared input/output validation. https://zod.dev/
- MCP JavaScript SDK: stdio tools for a local assistant, avoiding an unauthenticated remote MCP endpoint. https://modelcontextprotocol.io/docs/develop/build-server
- Lucide React: consistent small UI icons. https://lucide.dev/guide/packages/lucide-react
- Node's built-in test runner: service and integration tests.
- Node built-in SQLite: local pipeline configuration, revision history and normalized run persistence without a native package build.

## Where It Runs and How Someone Tries It
`npm install`, `npm run dev`, then http://localhost:3000. Production: `npm run build`, `npm start`. Container: `docker compose up --build`, bound to loopback by default. MCP: `npm run mcp` with optional .env loaded by Node. Public hosting is not performed in this build. Public deployment requires access control in front of paid model calls; local mode is the supported initial deployment.

## Look and Feel
Dark charcoal dashboard with narrow navigation rail, friendly empty state, clean sans-serif text, monospace editor, teal primary action, amber uncertainty labels, coral error highlights. No external font fetch required. Responsive layout; keyboard-accessible controls and clear loading/error states.

## Components
### Workspace
Implements `prd.md > Diagnostic Input` and `Evidence-backed Results`. Paste/upload, sample cases, context selectors, provider choice, redaction preview, evidence viewer, and export of sanitized diagnosis.
### Diagnosis Service
Implements `prd.md > Evidence-backed Results`. Rules-only mode works without credentials and is labeled as such. AI results must match a bounded schema, reference valid input lines, and never be silently replaced with rules output on provider failure.
### Provider Adapters
Implements `prd.md > Provider Choice`. Server-configured cloud chat-completions-compatible endpoint and native Ollama endpoint. Users cannot supply arbitrary URLs in requests. Abort timeouts, bounded responses, no raw provider error disclosure.
### MCP Server
Implements `prd.md > MCP Access`. `diagnose_pipeline` shares service validation and redaction; `list_pipeline_runs` and `diagnose_run` expose stored operations context; `list_sample_cases` provides labeled synthetic examples. Stdio only; logs must never pollute stdout.
### Operations Control Plane
Pipeline catalog, configuration revisions, normalized run ingestion, dashboard metrics, recurring failure signals and a central failure inbox. Provider execution remains external.
### HTTP Boundary
Same-origin browser requests; optional bearer access token for configured deployments, bounded streaming request reads, no-store responses and small per-process concurrency limit. No credential/config values returned to browser.

## Data Model
Persistent records: pipelines, configuration revisions and normalized runs. Run logs are redacted before storage and explicitly labeled when synthetic. Diagnostic input: logText, configText, pipelineType, runnerLocation, deploymentTarget and provider. Result: summary, category, certainty, causes with evidence lines, suggested fixes, verification steps, missing information and trusted provider metadata. Ad hoc sandbox input/results remain browser/request state only.

## File Structure
```
app/                  # layout, workspace, CSS, API routes
lib/                  # schema, redaction, fixtures, rules, providers, service, HTTP helpers
mcp/server.js         # stdio tool registration
tests/                # meaningful diagnosis/provider/MCP tests
scripts/              # local verification helpers
public/               # logo/icon assets
devpost/              # canonical planning and progress
Dockerfile            # non-root standalone runtime and MCP target
compose.yaml          # local container deployment
.env.example          # secret-free configuration
README.md             # setup, model configuration, limitations
```

## External Services and Dependencies
Cloud: configured HTTPS base URL plus `/chat/completions`, bearer key, JSON messages/model/response_format; validate choices[0].message.content. Groq-compatible example: https://console.groq.com/docs/openai. Model, quota, cost and credentials belong to operator configuration; no cloud account or paid calls assumed.
Local: Ollama `/api/chat` with model, messages, stream:false and JSON format; validate message.content. https://docs.ollama.com/api/chat. Endpoint must be reachable from the server/container; localhost in Docker is not the host machine.

## Important Failure Modes
- Missing provider setup → actionable configuration error, original input retained.
- Provider timeout/malformed output → clear failure, no fictional AI response.
- Sparse evidence → explicit uncertainty and requested checks.
- Oversized input → reject before provider call.
- Secrets → sanitize log/config before external transmission; offer user review and describe limits.

## What Was Simplified and Why
The ingestion API avoids broad CI integration permissions while leaving room for GitLab/Jenkins adapters. Single-workspace local use avoids account management. Rules mode exercises known cases without cloud credentials but does not substitute for validating live AI.

## Decisions and Open Issues
Learner choices: JavaScript/Next.js, containers, SQLite/PostgreSQL, selectable cloud/local AI, MCP, dark friendly UI. Derived choices: SQLite local control plane, stdio MCP, bounded schema/input and clearly labeled synthetic runs. Real uncertainty raised by learner: cloud CI failure categories; researched in research-ci-pain-points.md, with OIDC and ambiguous timeout fixtures to test appropriate reasoning boundaries. Docker is unavailable on this host, so container execution may remain unverified. No live model credentials have been provided.
