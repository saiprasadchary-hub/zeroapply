# AutoApply production upgrades — 26 October 2026

These changes extend the existing format checks, answer memory and submission receipts. They do not establish universal website compatibility or guarantee factual accuracy from model output.

| Upgrade | Implemented behavior | Main implementation |
|---|---|---|
| Shared answer pipeline | Cognitive single-question and batch APIs delegate to the same grounded resolver. Field formats and available options are checked for profile, memory and model answers. | `localLlm/questionResolver.ts`, `ultraQuestionResolver.ts`, `fieldAnswer.ts` |
| Structured local AI | Requests specify a JSON schema with field identity, answer, selected option, missing-data status and evidence quotes. Returned identities, actual options and quoted applicant evidence are validated. Ollama receives `format`; the bundled runtime receives a JSON-schema grammar. | `structuredAnswer.ts`, `desktop/inference-policy.mjs`, both model services and `model-runtime.cjs` |
| Employment details | Notice status (not serving, serving, relieved), earliest joining date and last working date are distinct saved facts. Invalid dates are rejected, and a future joining date prevents falsely claiming immediate availability. | `EmploymentDetails.tsx`, `screeningFacts.ts`, `availabilityFacts.ts` |
| Recovery checkpoints | Canonical application identity, profile revision, verified answers and workflow phase are acknowledged through secure storage. Resuming rechecks the live form; matching verified answers are not rewritten. | `workflow/automationStore.ts`, `workflow/orchestrator.ts`, `externalFormFiller.ts` |
| Interaction readiness | Controls are re-queried and checked for visibility, stability, enabled/editable state and obstruction. Next/Review/Submit use the same readiness check. Recoverable field failures rescan and retry a bounded number of times. | `controlReadiness.ts`, `fillRecovery.ts`, `wizardStepNavigator.ts` |
| Grouped missing answers | The browser displays all collected unresolved questions with appropriate inputs, validates the answers and offers Save answers & resume. Resuming checks the active tab has not changed. | `AutomationRecoveryPanel.tsx`, `AgentBrowser.tsx` |
| Verified learning | Only explicitly confirmed corrections enter the recovery store. Reuse requires matching profile revision, question, input type and choices. Company-specific answers are scoped to an application. Current saved facts take priority. | `automationStore.ts`, `fieldAnswer.ts` |
| Uncertain submission protection | The submitting state is persisted before the click. After an interruption, receipt/history checks precede any new attempt. An unresolved submission remains blocked across profile edits. Uncertain records are not silently evicted with ordinary draft history. | `orchestrator.ts`, `externalFormFiller.ts`, `automationStore.ts` |
| Local vision fallback | Capability detection determines whether images are accepted. For an ambiguous scanned field, local vision may corroborate a nearby DOM label. It cannot invent controls or execute guessed pixel clicks. | `visualFieldFallback.ts`, `ollama-model-service.mjs`, `webLlmEngine.ts` |
| Regression coverage | Added real-browser tests for grouped recovery, reload durability, actual resume through Review, unchanged-field preservation, intercepted controls, malformed model output, profile isolation and uncertain submissions. Included in the default test chain and existing CI. | `test/production_reliability.test.ts`, `test/field_answer_format.test.ts`, `package.json` |
| Desktop hardening | Existing main-frame IPC trust, webview sandboxing and screenshot ownership checks are retained. New inference payload checks bound images/schema size and reject external schema references. Recovery writes are awaited rather than assumed successful. | `desktop/inference-policy.mjs`, `services/secureStorage.ts`, existing `main.js` policy |
| Quality dashboard | AI activity now exposes verified writes/attempts, recoveries, rejected formats, blocked forms, confirmed/uncertain applications, failed inference and model vision capability. Counts measure observed behavior, not factual accuracy. | `AutomationQuality.tsx`, `qualityMetrics.ts`, `AgentHealthDetails.tsx` |

## Verification

- Real browser fixtures exercise field filling, Review, submission confirmation, recovery after reload and prevention of a second uncertain submission.
- Grouped-answer tests verify that saved corrections remain isolated across applicants, profile revisions and changed control formats.
- A failed durable-storage write prevents submission.
- The installed local `qwen3.5:4b` returned a schema-constrained answer (`Python`) with a verified evidence quote.
- The same local model processed a browser-fixture screenshot and corroborated the visible `Expected salary` label. No pixel clicks were used.
- Text-only backend tests verify that screenshots are withheld and telemetry does not claim image delivery.
- `npm test`, `npm run typecheck`, `npm run build` and `npm run lint` are the release checks. Existing repository lint warnings and the large-bundle build warning are separate from functional test results.

Final checks completed successfully: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint`, desktop JavaScript syntax checks and `git diff --check`. Existing lint warnings and the bundle-size warning remain. Browser fixtures use a separate test browser server with explicit cleanup.

## Practical limits

- The packaged Qwen2.5 1.5B model is text-only. Local vision requires a backend/model that reports vision capability. The packaged C++ grammar path is implemented but was not exercised with a real bundled model binary in this workspace; its service transport is covered by tests.
- Evidence quotes and schemas validate format, provenance and option membership. They cannot prove every generated sentence logically follows from the evidence. Unknown sensitive facts remain unanswered.
- A checkpoint does not authorize jumping to a saved step number, clicking Submit again, or recreating a missing remote draft. Resume inspects the currently open form. Sites without stable application identity need manual review.
- Security challenges, absent personal facts and receipts that cannot be confirmed can still require user action.
- Runtime tests here use synthetic applicant data and browser fixtures. No job submission should be inferred from those fixtures or their UI preview.

## Storage error fixes

- Malformed or unreadable protected storage is an error, rather than an empty profile. Existing encrypted values must decrypt successfully before replacement or removal.
- A renderer storage failure blocks further writes, profile cloud saves, field filling, navigation and local-model startup. The app displays a recovery notice instead of silently continuing with fallback facts.
- Failed legacy migrations retain the original local value. Durable writes must acknowledge success before profile backup import reports completion.
- Profile backup export and restore include the saved resume and support both historical resume encodings (`base64` and `base64Data`). Backups contain private applicant information and should be kept private.
- Added storage regression coverage for wrong-key protection, malformed files, rejected migrations, blocked writes/automation and backup parsing. These safeguards cannot recover a lost encryption key; reopening with the original storage configuration remains necessary.
- The recovered local profile was imported before the user requested code-only verification. Subsequent verification uses source checks and isolated automated fixtures; no further live-app clicks or real application submissions were performed.

## API references

- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [node-llama-cpp grammar support](https://node-llama-cpp.withcat.ai/guide/grammar)
- [Playwright actionability](https://playwright.dev/docs/actionability)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
