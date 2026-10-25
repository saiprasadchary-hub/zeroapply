# Autonomous AutoApply test — 24 October 2026

Started through the app's Fill & Apply control. The application engine and local Qwen handled website actions. No manual form advancement or submission was performed by the testing assistant.

Result: Volga Partners application reached Additional Questions (step 5/6), then paused. No application was submitted in this test; two successful submissions were not achieved.

Observed answers on the final live pass:
- Minimum 2–3 years C++/Python industrial experience: No (corrected from the initial incorrect Yes).
- Can start in 1–2 weeks: Yes.
- Pacific-time overlap: unanswered; run paused because this preference was not established.
- Previous application to company: unanswered.
- Desired pay in LPA: the active profile returned 0, which remained in the unsubmitted draft. A subsequent guard now treats a nonpositive desired salary as missing and pauses instead of filling it. This final salary guard passed its regression test; it was not live-rerun.

Fixes verified: job-specific Easy Apply selection, optional-field auditing, repeated-click prevention, direct browser-button AI startup, screening facts overriding stale answers, Stop button no longer receiving a click event as its force-start flag, paused runs no longer labelled completed.

Checks: TypeScript and production build; browser repeat-click regression; screening fact regression. Final screenshot shows corrected experience answer and cursor visible above the application modal. The build retains bundle-size and mixed-import warnings. This is not proof of a successful submission or a claim that all application errors are resolved.
