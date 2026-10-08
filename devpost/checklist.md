---
doc: checklist
status: implementation-authorized
---

# Build Checklist

Build mode: implementation delegated by repeated user requests to build; provide a working-app feedback checkpoint. No learner testing or separate plan approval is claimed in advance.

## Slices

- [ ] **1. Diagnose a pasted log through the web workspace**
  Becomes usable: Dark responsive app with sample logs, redaction preview, rules diagnostics and cloud/local AI adapters.
  Why now: Proves the evidence-backed input-to-diagnosis loop immediately.
  PRD ref: `prd.md > The Core Journey`
  Spec ref: `spec.md > Workspace`, `spec.md > Diagnosis Service`, `spec.md > Provider Adapters`
  Build: Scaffold Next.js, shared diagnosis service, model adapters, API boundary and UI.
  Verify (mechanical): Known-case tests, redaction and invalid-evidence tests, adapter mock integration, production build, browser core journey.
  Learner check: Load a sample and diagnose it; inspect evidence and verification steps, then try a sanitized log.
  Commit: `Build evidence-backed pipeline diagnosis workspace`

- [ ] **2. Use the same diagnosis from an assistant and a container**
  Becomes usable: MCP tools, documented provider setup, Docker packaging and portable startup.
  Why now: Reuses the working service to prove the requested interfaces.
  PRD ref: `prd.md > MCP Access`, `prd.md > Provider Choice`
  Spec ref: `spec.md > MCP Server`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Stdio MCP tool registration, Dockerfile/Compose, documentation and app map.
  Verify (mechanical): MCP client initializes/lists/calls tool; production HTTP smoke; container build if Docker available.
  Learner check: Try the app, review provider setup and connect an MCP client if desired.
  Commit: `Add MCP tools and container deployment`

## Hands-on Checkpoints
- [ ] Working app explored and feedback received
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map
- [ ] Learning activity complete
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated, checked and shown

Implementation and agent verification are recorded in `verification.md` and `../TEST_CASES.md`: 78 automated cases pass, production build and HTTP smoke pass, and the catalog/dashboard/advisor browser workflow is checked. MCP client integration passes. A local demonstration video was generated and inspected. Container execution, direct provider connectors and live models remain unverified. Slice checkboxes remain open for their learner checkpoints and outstanding runtime checks; no learner approval is inferred.

## Revisions

- 2026-09-25: Product direction expanded into three phases. Phase-one pipeline/configuration catalog implemented with SQLite, revision history and structural validation. Phase-two dashboard and phase-three AI advisor are tracked in `roadmap.md`.
- 2026-09-26: Version 0.3 added normalized run ingestion, operations dashboard, failure inbox, stored-run advisor, run-aware MCP tools and a captioned demo video.
