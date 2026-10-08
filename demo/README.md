# PipelineMedic demo

`pipelinemedic-demo.mp4` is a 2-minute 52-second silent, caption-led walkthrough recorded from the production build with synthetic pipeline data. Every chapter includes a persistent action caption, while concise callouts identify the provider health view, failure evidence, read-only advice, unsaved configuration drafts, and MCP tools without covering the active controls. It shows the delivery dashboard, two cross-provider failure investigations, configuration evidence and revisions, citation navigation, the ad hoc log sandbox, and MCP access. No voice-over is required for this final cut.

To regenerate it, start the production app, capture the documented browser states into `demo/frames`, then run:

```sh
npm run demo:video
```

The video contains no credentials or private production logs. It makes synthetic data and human-controlled advice visible in the product UI.

The illustrated user guide is available at `output/pdf/pipelinemedic-interaction-guide.pdf`. To regenerate it locally, install Python's `reportlab` package and run `python scripts/make-interaction-guide.py` after capturing the corresponding screenshots into `demo/frames/`. Those intermediate screenshots remain ignored by Git.
