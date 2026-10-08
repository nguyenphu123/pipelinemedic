# PipelineMedic optional narration archive

The submitted demo is designed to work without audio and uses on-screen captions instead. This script is retained only as an optional written presentation reference; it is not part of the final video workflow.

Target: about 2 minutes 35 seconds spoken naturally, leaving room for pauses. Use your own voice rather than text-to-speech. Speak as if you are showing the tool to another DevOps engineer.

## 0:00–0:18 — Problem and audience

Hi, I’m a DevOps and full-stack engineer. I built PipelineMedic because CI failures are usually investigated across too many places: the CI provider, raw logs, pipeline configuration, and team notes. It is especially painful when Jenkins, GitLab, and cloud pipelines all use different interfaces.

## 0:18–0:40 — Central dashboard

PipelineMedic brings that context into one control plane. The dashboard normalizes runs across providers and shows success rate, duration, recent activity, and recurring failure categories. These runs are clearly labeled as synthetic demo data; the ingestion API is ready for provider adapters and webhooks.

## 0:40–1:14 — First investigation

I’ll open this failed GitLab run. The advisor loads the exact branch, commit, runner location, failed-stage log, and saved pipeline configuration. I can diagnose it with local rules, cloud AI, or a self-hosted Ollama model. Here I’m using local rules, and the interface explicitly says that this result is not AI.

The finding says registry access was denied. More importantly, it cites line five. Clicking the citation takes me back to the exact failed operation, so I can check the advice against the evidence instead of trusting an unsupported answer.

## 1:14–1:43 — Cross-provider context

The same workflow works for GitHub Actions. This run failed because npm was unavailable on the runner. I can compare the log with the matching workflow configuration, then trace the finding to line four. PipelineMedic suggests checks and verification steps, but it never runs commands or changes infrastructure.

## 1:43–2:05 — Configuration management

The pipeline catalog keeps GitLab, Jenkins, GitHub Actions, Azure, CircleCI, and custom configurations together. A developer can draft a change, add a meaningful revision note, run a structural check, and inspect prior versions. Pipeline execution still belongs to the original CI provider.

## 2:05–2:28 — Ad hoc logs and MCP

For failures that have not been ingested, the log sandbox supports paste or upload, redaction review, and the same evidence-linked result. PipelineMedic also exposes four read-only MCP tools, so an assistant can list runs, diagnose a stored run, analyze an ad hoc log, or load safe sample cases.

## 2:28–2:42 — Close

PipelineMedic helps developers move from a failed run to a verified next step while keeping every repair under human control. Building it taught me to separate evidence from guesses, keep AI providers optional, and design one workflow that works across on-premises and cloud CI.

## Recording notes

- Record in a quiet room with your normal speaking voice. Small pauses and natural phrasing are better than perfect delivery.
- Keep the microphone about a hand-width from your mouth and disable noisy fans if practical.
- Do not read punctuation or rush to match each cut exactly. The editor can move scene boundaries around your narration.
- Export WAV, M4A, or MP3. Do not add music; the official rules prohibit copyrighted material unless you have permission.
