# PipelineMedic

**Centralized CI/CD control plane and failure advisor.** PipelineMedic catalogs configuration, normalizes run health across CI providers, and moves failed runs into an evidence-linked investigation. Data persists in local SQLite; diagnosis can use local rules, cloud AI, or self-hosted AI.

## Run locally

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The dashboard contains nine clearly marked synthetic runs across three starter pipelines. Investigate one of the failures, manage its configuration in **Pipelines**, or open **Log sandbox** for an ad hoc diagnosis.

Rules mode works without an account, model or outbound request. It is pattern-based analysis, **not AI**. Live AI requires operator configuration below; there is no silent fallback from AI to rules.

## What works

For a guided first visit, download the [illustrated interaction guide](output/pdf/pipelinemedic-interaction-guide.pdf). It covers local setup, failed-run investigation, configuration revisions, the log sandbox, optional AI and MCP.

- Catalog GitLab CI, Jenkins, GitHub Actions, Azure Pipelines, CircleCI and custom pipeline configurations.
- Create, edit, upload, download, enable, pause and remove locally managed pipeline records.
- Keep configuration revision metadata in SQLite and run provider-specific structural checks before saving.
- View normalized run health, seven-day activity, recurring failure signals and a central failure inbox.
- Ingest real run summaries and sanitized failed-stage logs through `POST /api/runs`.
- Investigate a stored failure with its matching log, pipeline configuration, runner context and evidence citations.
- Paste or upload a plain-text job log; optionally include pipeline configuration.
- Specify CI platform, runner location and deployment target independently.
- Preview best-effort secret redaction before model transmission.
- Get evidence citations, suggested fixes, verification steps and missing context.
- Copy/download a sanitized Markdown diagnosis.
- Use six explicitly synthetic cases: registry denial, YAML/configuration error, missing executable, certificate trust, OIDC role rejection and ambiguous timeout.
- Choose built-in rules, a cloud chat-completions-compatible provider, or native Ollama.
- Call `diagnose_pipeline`, `diagnose_run`, `list_pipeline_runs` and `list_sample_cases` through stdio MCP.

The catalog validates recognizable top-level structure; it is not a complete substitute for each provider's native linter. Configurations are stored as plaintext in SQLite. Keep credentials in your CI provider's secret store and reference them through variables rather than saving credential values here.

## Product phases

1. **Configuration control plane — implemented:** vendor-neutral catalog, config editor, structural checks, SQLite persistence and revision history.
2. **Operations dashboard — implemented:** normalized runs, health metrics, trends and a failure inbox. The ingestion API is ready for provider adapters; pipeline execution remains with the provider.
3. **AI advisor — implemented:** run-aware, evidence-linked investigation through rules, cloud or self-hosted models, including MCP access. Cross-run learning and automatic remediation remain outside the current release.

## Ingest run data

Provider adapters and webhooks can write normalized run results without giving PipelineMedic permission to execute a pipeline. Send the relevant failed-stage log rather than an entire production trace; the server applies best-effort redaction before persistence.

```json
{
  "pipelineId": "pipe-gitlab-api",
  "providerRunId": "1048",
  "branch": "main",
  "commitSha": "a81d9cf",
  "status": "failed",
  "triggerSource": "gitlab webhook",
  "startedAt": "2026-09-26T08:00:00.000Z",
  "finishedAt": "2026-09-26T08:02:48.000Z",
  "durationSeconds": 168,
  "jobsTotal": 2,
  "jobsFailed": 1,
  "logText": "sanitized failed-stage output"
}
```

## Configure AI

Copy `.env.example` to `.env` and edit it locally. Never put credentials in chat, logs, `NEXT_PUBLIC_*` variables or committed files. Restart the server after editing.

### Cloud

Set all three:

```dotenv
CLOUD_BASE_URL=https://api.groq.com/openai/v1
CLOUD_API_KEY=your-provider-key
CLOUD_MODEL=your-supported-model-name
```

The adapter calls `<base>/chat/completions` with bearer authentication, messages and `response_format: {"type":"json_object"}`. Use a model that supports JSON output and the submitted context length. Groq is an example, not a requirement; compatible APIs may differ and must be tested. Cloud URLs must use HTTPS. Costs and quotas depend on your provider. See [Groq compatibility documentation](https://console.groq.com/docs/openai).

### Self-hosted Ollama

Install Ollama, download a suitable model separately, and configure its exact installed name:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=your-installed-model
```

The adapter uses `/api/chat`, `stream:false` and JSON format. The model server must be reachable **from the Next.js server**, not just your browser. See [Ollama chat API](https://docs.ollama.com/api/chat). Provider settings show configuration status, not a successful connectivity or quality test.

## Docker

```sh
docker compose up --build
```

The application runs as a non-root user and publishes `127.0.0.1:3000`. Compose persists the SQLite catalog in the `pipelinemedic-data` volume and works in rules mode with no `.env`. It reads provider settings from `.env` when supplied.

For Ollama on your host machine, set `OLLAMA_BASE_URL=http://host.docker.internal:11434` in `.env`; its listener/firewall must allow the container connection. Do not use `127.0.0.1` for the host service from inside the app container. No models or Docker socket are bundled/mounted.

The Dockerfile uses Next.js standalone output. Docker runtime validation was unavailable on the development machine; validate `docker compose up --build` in a Docker-enabled environment before claiming a tested container deployment.

### Access boundary

Local use is the default. Before making the service reachable beyond your trusted workstation, set `PIPELINEMEDIC_ACCESS_TOKEN` and put it behind a TLS reverse proxy with appropriate authentication and rate limiting. The optional shared token is a PoC gate, not a multi-user identity system. Enter it in **Connection settings**; it stays in browser memory only. API clients send `Authorization: Bearer <token>`.

Behind a reverse proxy set `PIPELINEMEDIC_ORIGIN` to the exact public origin, e.g. `https://medic.example.com`, and preserve the incoming Host header. Cross-origin browser requests are rejected. A per-process concurrency cap limits simultaneous analyses; it is not a distributed rate limiter. Public deployment is not performed or configured automatically.

## MCP

Start from this project:

```sh
npm run mcp
```

For clients using a JSON server configuration, replace the paths below with absolute paths:

```json
{
  "mcpServers": {
    "pipelinemedic": {
      "command": "node",
      "args": [
        "--env-file-if-exists=/absolute/path/to/pipelinemedic/.env",
        "/absolute/path/to/pipelinemedic/mcp/server.js"
      ]
    }
  }
}
```

Use forward slashes in Windows JSON paths (e.g. `C:/projects/pipelinemedic/mcp/server.js`). Your client must support stdio MCP; its configuration format may differ. Launch Node directly from a client so npm status text cannot interfere with protocol stdout. Node 24+ supports the optional env-file flag.

Tool input example:

```json
{
  "logText": "npm: not found",
  "pipelineType": "jenkins",
  "runnerLocation": "on-premises",
  "deploymentTarget": "on-premises",
  "provider": "rules"
}
```

`configText` is optional. `provider` accepts `rules`, `cloud`, or `ollama`. Model endpoints/credentials come only from server configuration. MCP never executes suggestions. The HTTP access token is not used for stdio; the client already controls the local process.

Containerized MCP:

```sh
docker build --target mcp -t pipelinemedic-mcp .
docker run --rm -i --env-file .env pipelinemedic-mcp
```

Do not allocate a TTY (`-t`) for the stdio protocol.

## Verification

```sh
npm test
npm run build
npm start
```

Tests cover normalized run ingestion and dashboard summaries, stored-run diagnosis, known failures, inconclusive results, redaction, line-number integrity, provider request/response contracts using mocks, invalid references, bounded input/output, HTTP token/origin checks and real MCP client tool calls. Provider tests do **not** establish real-model accuracy. Live cloud/Ollama end-to-end tests remain pending credentials/an installed model.

The browser walkthrough covers diagnosis, evidence navigation, sample switching, unconfigured provider errors, settings and responsive layout. See [verification](devpost/verification.md) for completed checks and limits, [the test plan](TEST_CASES.md) for all automated/manual/live/deployment cases, and [individual automated results](devpost/automated-test-results.md). Run `npm run test:report` to refresh that report.

## Architecture

```text
CI adapter/webhook → /api/runs → SQLite → dashboard / advisor
                                            │
Log sandbox → /api/diagnose ────────────────┼→ validate → redact → rules / cloud / Ollama
MCP diagnose_pipeline / diagnose_run ───────┘                 → validate evidence → result
```

- `app/dashboard/page.js`: run health, trends and failure inbox.
- `app/advisor/page.js`: stored-run evidence and investigation.
- `app/pipelines/page.js`: configuration catalog and revision workbench.
- `app/doctor/page.js`: ad hoc log sandbox.
- `lib/diagnose.js`: shared service and evidence integrity checks.
- `lib/rules.js`: known signature explanations; not a parser or statistical classifier.
- `lib/providers.js`: outbound model boundary and prompt.
- `lib/redact.js`: shared redacted preview and server-side redaction.
- `mcp/server.js`: tool registration.

Pipeline configurations and normalized run records are stored in SQLite. Ingested logs are redacted before persistence, but redaction is best effort; retain only the failed stage and apply your organization’s retention policy. App code does not print inputs to application logs. Infrastructure or model-provider logging/retention is outside that promise.

## Limits

Logs: 100,000 characters / 4,000 lines. Configuration: 30,000 characters. Provider timeout: 60 seconds. Redaction is pattern-based and can miss secrets or redact useful text; review the preview. It is not a complete data-loss-prevention system.

Model output is schema-checked, and citations must identify existing nonempty lines. This does not prove causal correctness or neutralize every prompt injection; input/model output remain untrusted and are displayed as plain text. No commands are executed. Validate advice against your actual environment. A timeout, exit code, or failed test alone cannot establish a root cause.

## Hackathon

Created for Build With AI: Basics using the official Devpost Learn Skill Pack. Canonical planning files are `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`, with progress in `devpost/checklist.md`. Personal learner notes and credentials are ignored by Git. Standard dependencies and the official skill pack are the pre-existing tooling; sample logs are synthetic.

The skill pack was used for onboarding, scope, product/technical planning and verification structure. The user delegated implementation after shaping scope and appearance. Scope and spec received final learner approval on October 8, 2026, after implementation; pre-build sign-offs and hands-on checks are not fabricated. A captioned demonstration video is in [`demo/pipelinemedic-demo.mp4`](demo/pipelinemedic-demo.mp4). The public repository is published; live AI validation and Devpost upload remain submission work.

License: MIT.
