# Recommended AutoApply upgrades — 25 October 2026

The earlier evidence rules, final validation gate, and fact-preserving recovery remain in place. This update adds the remaining upgrades without submitting live applications.

| Recommendation | Implementation |
| --- | --- |
| Evidence-based personal answers | Existing screening guards retained across single and batch resolvers; removed an older Auto-Fill branch that could replace an unknown radio answer with Yes. |
| Final validation gate | Required answers must pass the audit before navigation. Review-only runs cannot submit. Done alone cannot count as a receipt. |
| Preserve facts during recovery | Existing zero-experience and compensation protections retained. Formatting errors do not authorize changing personal facts. |
| Shared dropdown selection | Both the form filler and generic combobox actions use the same scoped, exact-match selector with delayed-menu handling and separate post-selection verification. Supports input and button triggers. |
| Applicant/context-specific memory | Cache namespaces include a profile revision, company, role, helper text, context and allowed options. Scoped screening lookups require the same wording. Missing company context disables persistent answer reuse. Legacy unscoped answers are not imported into the new namespaces. |
| Structured availability | Persona fields save local time zone, available start/end, night shifts, rotating shifts and regional overlap. Choices remain unspecified unless saved; invalid time zones do not produce answers. |
| Submission proof bundle | Easy Apply and external application flows attempt to save actual persisted field values, job details/ID, applicant, timestamp, visible confirmation text and screenshot in local IndexedDB. Capture occurs before receipt dismissal. Storage/screenshot failure is reported separately from submission success. |
| End-to-end regressions | Default test suite includes profile/context isolation, delayed dropdowns, replaced controls, failed validation, no-op click prevention, delayed receipts, review-only submission, browser reload persistence and proof deletion/export checks. |
| Model and vision health | AI activity displays pending requests, model, elapsed time, failure/timeout, screenshot inclusion and the last resolved question's source. Screenshot inclusion means the image was sent with a request; it does not guarantee perfect understanding. |

## Where to find the new controls

- Persona → Basic info: **Availability & working hours**.
- Header: **AI activity**.
- Notifications: **Saved application proof**, including preview, answers, JSON download and delete.

## Verification

The full default test suite, upgrade-specific browser tests, inference-bridge checks and UI regressions passed. TypeScript and the production build passed. The production build retains the existing large-bundle warning.

Screenshots in `output/upgrades` show test data and UI previews. They are not evidence of new live applications.
