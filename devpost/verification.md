# Verification record

Updated: 2026-09-26. Executed by the coding agent on Windows, Node.js 24.19.0. This is not a record of learner hands-on approval.

- `npm run test:report`: **78 passed, 0 failed, 0 skipped**. Individual cases: [automated-test-results.md](automated-test-results.md).
- `npm run build`: successful optimized Next.js standalone build.
- HTTP smoke: passed against standalone production port 3002, covering root, health, the SQLite catalog, normalized dashboard/runs, stored-run diagnosis, all six synthetic diagnoses, invalid input and cross-origin rejection.
- Control-plane browser: dashboard metrics and demo labels, failure inbox navigation, stored run/config evidence, local rules investigation, citation-to-log highlighting, shared navigation, config drafting and the log sandbox were checked against the production build.
- Demo artifact: generated and inspected a 2-minute 52-second, 1280×720 H.264 MP4 from the verified production interactions. The final cut is intentionally silent and uses synthetic data, 18 visible product-demo chapter captions, contextual callouts and cursor markers.
- Browser: registry diagnosis, evidence navigation, timeout uncertainty, unconfigured cloud error, secret preview, clear-input behavior, settings, valid/oversized/binary uploads and responsive layout checked. No browser warnings/errors during checked core workflow.
- Phase-one browser: loaded the SQLite catalog, created a synthetic Azure pipeline, saved and reloaded configuration revision 2, rejected an invalid configuration, filtered the catalog and checked the 390px layout without horizontal overflow. The synthetic browser record was removed after verification; three starter records remain. No browser warnings/errors were observed.
- `npm run test:live`: **12 skipped**, no live provider configured or opted in. Mock adapter success is not evidence of real-model accuracy.
- Docker unavailable: image/Compose execution remains unverified.

Testing identified and fixed CLI-password redaction and overly permissive JSON media-type acceptance. Earlier integration checks corrected normalized-host origin handling and preservation of leading blank lines for evidence references. Production checking corrected `npm start` to launch the standalone output with its static assets. Replacing a sample log now clears its sample configuration; a browser regression check for that last behavior is still pending.

See [TEST_CASES.md](../TEST_CASES.md) for reproducible commands, full test inventory and remaining manual/live/deployment gates. Direct Jenkins/GitLab connector validation, report export, cancellation races, comprehensive accessibility, additional browsers, live AI and Docker must not be reported as fully tested.
