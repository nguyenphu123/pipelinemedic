# PipelineMedic product roadmap

## Product direction

PipelineMedic is evolving from a standalone failure doctor into a self-hostable CI/CD control plane. It centralizes pipeline configuration and operational context while Jenkins, GitLab CI, GitHub Actions and other providers remain responsible for executing jobs.

## Phase one — configuration control plane

Implemented in version 0.2:

- Vendor-neutral catalog for GitLab CI, Jenkins, GitHub Actions, Azure Pipelines, CircleCI and custom systems.
- Local SQLite persistence for pipeline metadata, configuration text and revision history.
- Create, edit, upload, download, pause and locally remove configurations.
- Lightweight provider-specific structural checks before a save.
- Existing failure-doctor prototype retained as an explicitly separate lab.

The catalog does not synchronize with CI providers or execute pipelines. Configuration is plaintext; secrets should remain in provider secret stores and be referenced by variables.

## Phase two — operations dashboard

Implemented in version 0.3:

- Normalized run storage linked to the provider-neutral pipeline catalog.
- Pipeline health, recent failures, duration, trends and a failure inbox.
- Authenticated run-ingestion API for webhook and poller adapters.
- Clearly labeled synthetic demo runs when real provider data is unavailable.

Direct GitLab/Jenkins adapters and PostgreSQL team deployment remain follow-up work that requires a target provider environment and credentials.

## Phase three — AI advisor

Implemented in version 0.3:

- Evidence-linked advice using a stored job log, matching configuration and runtime context.
- Cloud and self-hosted provider choice, with redaction before remote model calls.
- Honest uncertainty and explicit requests for missing context.
- MCP tools for assistants to list runs and request stored-run diagnoses.
- Advice remains read-only; no commands or repairs are executed.

Historical similarity ranking and any remediation automation remain later, separately reviewed phases.
