---
doc: scope
status: draft
---

# PipelineMedic

A centralized CI/CD failure investigation workspace that connects a failed run to its log, configuration, evidence, and safe next steps.

## The Unique Kernel

PipelineMedic turns a CI/CD diagnosis into a traceable investigation: every finding points back to the exact evidence line, and every recommendation remains read-only until a human chooses what to change. The same loop works across on-premises and cloud CI providers.

## Who It's For

Developers and DevOps engineers who operate pipelines across tools such as Jenkins, GitLab CI, and cloud CI services. Today they move between provider dashboards, raw logs, pipeline configuration files, and team knowledge while trying to determine why a run failed.

## The Core Loop

The user opens a normalized health dashboard, selects a failed run, reviews its log and matching configuration, requests a diagnosis through local rules or a configured AI provider, and follows the cited evidence back to the exact failed operation. They leave with verification steps and decide for themselves whether to change the pipeline or infrastructure.

## Inspiration & Identity

The product should feel like an operations tool made for working engineers: dark, simple, information-dense enough to be useful, and friendly rather than intimidating. It should make evidence and system boundaries visible instead of presenting an unexplained AI answer.

## Why This Matters to the Learner

The idea grows from the learner's own work with Jenkins and GitLab CI in on-premises environments, where syntax problems, runner differences, and scattered evidence slow investigations. Building it is also a way to move beyond using coding agents only for debugging and refactoring and practice shaping a full product idea.

## What "Working" Looks Like

A user can start from a failed run on the dashboard, open the complete investigation context, produce a diagnosis, click a citation to highlight the relevant log line, and see concrete verification steps. The compelling moment is moving from a generic failure state to an evidence-linked explanation without switching between several CI/CD tools.

## The POC Boundary

The proof of concept includes a normalized dashboard and pipeline catalog, synthetic runs across several providers, stored configurations and revisions, evidence-linked diagnosis through local rules and optional AI providers, an ad hoc log sandbox, and read-only MCP access. Sample data must be visibly labeled. Pipeline execution and repair remain in the original CI provider and under human control.

## Later

- Authenticated live connectors and webhooks for GitHub, GitLab, Jenkins, Azure, and other providers.
- Team accounts, roles, audit history, notifications, and collaboration.
- Production deployment, PostgreSQL scaling, and managed secret storage.
- Broader evaluation of cloud and self-hosted AI quality, latency, privacy, and cost.
- Approved workflows that can propose or open configuration changes for review.

## Explicitly Cut

- Automatic pipeline repair or infrastructure changes, because the proof must preserve human approval.
- Starting, canceling, or retrying provider jobs, because execution remains with the CI provider.
- Full enterprise RBAC and multi-tenant administration, because they do not prove the investigation loop.
- Real production credentials and logs, because the public demo uses safe synthetic data.
- Building a complete CI/CD orchestration platform, because the hackathon proof focuses on diagnosing failures.
