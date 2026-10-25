# ZeroApply live verification

## Confirmed outcome
LinkedIn displayed: “Your application was sent to Redient Security!” for the Backend Engineering listing, job ID 4473732039. The actual confirmation screenshot is application-confirmed.png. The application workflow returned submitted.

The live test required debugging, restarts, and a direct invocation of the app's application orchestrator to continue the current form. This is evidence of a real submission, not evidence that every future batch will work unattended.

## Fixes
- Correct search navigation and recognition of modern job cards.
- Native and shadow-DOM application dialogs; background job alerts excluded from form scanning.
- Native labels take precedence over broad containers; character counters are not validation errors.
- Native select handling and exact numeric time-unit matching (0 -> 0 year / 0 month).
- Avoid duplicate Easy Apply activation and unsupported affirmative-answer guessing.
- Explicit submission confirmation required.
- Stable injected option matcher source fixes the observed native-code syntax error.
- Actual website screenshot capture and local Ollama image payload support.
- Visible click coordinates and single activation verified in real browser tests.

## Validation
Passed: TypeScript checks, production build, model service tests (8), startup readiness, workflow simulation, cursor browser regression, manual navigation browser regression, LinkedIn form scope (including native and shadow dialogs), and injected matcher parity. The repaired injection also executed in the live Electron guest without the syntax error.

## Remaining limits
The captured activity overlay contains stale job/model labels from the earlier session; LinkedIn's confirmation is the source of truth. Fresh overlay defaults have been corrected, but existing injected overlays are not replaced in this screenshot. LinkedIn resource/network errors and non-blocking build size warnings remain. Vision test status and its actual answer are recorded separately in vision-check.json. No claim of perfect LLM understanding or universal production readiness is made.

## Vision result
The first full-resolution bridge test did not complete promptly and was cancelled. A 1024-pixel-wide JPEG sent to the same local qwen3.5:4b model returned “Redient Security” from the visible website image. Electron capture now applies this size limit and JPEG quality 75. This verifies a basic visual reading task, not every possible form interpretation.
