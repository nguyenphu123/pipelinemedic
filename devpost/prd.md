---
doc: prd
status: approved
---

# PipelineMedic — Product Requirements

Evidence-backed CI/CD failure advice for developers and DevOps engineers. Source: `scope.md > The Unique Kernel` and `Who It's For`.

## The Core Journey
1. Review cross-provider run health and open a failed run from the failure inbox.
2. Inspect its stored log, matching pipeline configuration and runtime context.
3. Request diagnosis using local rules or a configured cloud/local AI provider.
4. Review causes with cited log evidence, uncertainty, suggested repairs and verification steps.
5. Follow a citation to the exact log line or supply additional evidence when the result cannot establish a cause. An ad hoc log sandbox supports failures that have not been ingested.

## Screens and Layout
The dashboard, catalog and run advisor form the central control plane. The ad hoc diagnosis sandbox retains the split evidence/result interaction. MCP is a second interface to the same run and diagnostic services.

## Look and Feel
Learner direction: dark and simple, not plain, friendly to developers and DevOps engineers. Implementation details: charcoal surfaces, restrained teal accents, readable sans-serif labels and monospace logs, subtle borders, accessible focus states, responsive layout.

## Features and Behavior

### Diagnostic Input
Implements `scope.md > The Core Loop`. Accept text logs and optional configuration. Keep platform, runner location and deployment target distinct. Provide labeled synthetic examples covering the approved test cases.

### Evidence-backed Results
Implements `scope.md > The Unique Kernel`. Each proposed cause cites supporting input lines. Separate direct observations from hypotheses. Return verification steps and specific missing evidence. A timeout alone must not identify a particular firewall rule; a single test failure must not establish flakiness.

### Provider Choice
Implements `scope.md > The POC Boundary`. Support a configured cloud provider and a self-hosted model. Identify the provider used. Do not present canned output as live AI analysis. Provider credentials stay on the server.

### MCP Access
Expose ad hoc and stored-run diagnosis through `diagnose_pipeline` and `diagnose_run`, plus read-only run listing through `list_pipeline_runs`. Do not execute generated commands.

## States and Boundaries
- Empty input: explain what is required before submitting.
- Analyzing: show progress and prevent accidental duplicate submissions.
- Provider unavailable or unconfigured: explain the error and preserve input; never silently substitute a fabricated diagnosis.
- Invalid provider output: explain that a valid diagnosis could not be produced.
- Insufficient evidence: show missing information and proposed investigation steps.
- Sensitive input: detect likely secrets before model transmission and explain that automatic redaction is not exhaustive. Detailed review interaction remains a proposed implementation choice.

## Product Decisions
- Confirmed: Next.js/JavaScript; containerized execution; cloud/local AI; MCP; Jenkins/GitLab emphasis; evidence-based results.
- Confirmed conditional preference: SQLite or PostgreSQL if a database is needed.
- Implementation choice: SQLite stores the local pipeline catalog, configuration revisions and normalized runs. Ad hoc input/results and model credentials are not written into browser storage.

## What We're Building
The configuration catalog, normalized run dashboard, failure inbox, stored-run advisor, ad hoc diagnosis loop and MCP equivalents, with error handling and known-case validation.

## Deferred From the POC
Direct CI adapters, historical similarity ranking and PostgreSQL team deployment require provider credentials/data and remain follow-up work. The normalized ingestion API is implemented for those adapters.

## Non-Goals
Executing repairs, managing deployments, proving every cloud failure category, or providing a multi-user hosted service.

## Open Questions
No unresolved product blocker. Provider credentials must be configured by the operator for live AI. A separately labeled rules-only mode allows offline diagnostic use and demonstration without pretending to be AI.

## Authorization Record
Core behavior was approved with "solid, now lets make the app". The learner then supplied the remaining dark/simple/developer-friendly design direction. Layout and implementation details are agent decisions under that build authorization, not additional learner quotations.
