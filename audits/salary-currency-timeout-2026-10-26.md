# Salary currency and inference recovery

Implemented dated INR/USD rates from the public Frankfurter API. Requests contain only the currency pair; salary arithmetic stays local. AutoApply startup preloads the rate. Shared screening resolution converts annual INR from saved LPA into annual or monthly USD, rounds to whole dollars, preserves explicit user answers, and rejects stale rates, ambiguous dollar currencies, and hourly conversions without hours.

Live rate verification: 2026-10-23, 0.010533 USD/INR. INR 700000 -> USD 7373 annually. INR salary answers remain 700000; fresher current compensation remains zero.

Ollama inference now checks server availability and retries a timeout/HTTP 503 once, serially, without publishing an unavailable state between attempts. Persistent failures still stop explicitly; user cancellation prevents retries. This mitigates transient failures; it does not guarantee that an overloaded model never times out.

Validation: salary conversion test passed; all 10 Ollama service tests passed, including transient and persistent timeout scenarios; typecheck and production build passed. A real qwen3.5:4b structured-response probe returned the correct test JSON in 76458 ms. Server logs showed about 4 tokens/second.

The broader application suite passed through salary, screening and answer-persistence tests but failed the repeated-location-selection assertion at test/location_typeahead_selection.test.ts:31 on two runs. This is a separate unresolved test failure; the full suite is not green.

The Electron main-process retry change requires the next app restart. The active UI was running local AI during this work, so it was not interrupted for a restart. No new application submission was claimed in this turn.

## Live follow-up

Added a fetched, dated INR/USD snapshot subject to the same seven-day expiry validation, covering a failed renderer rate lookup. Diagnostic UI confirmed expectedSalaryLpa=7, rate=0.010533 dated 2026-10-23, and both raw and control-formatted answers=7373. Temporary diagnostics were removed. After a full Electron process restart, the app advanced through Papigen's USD salary page (4/7) to additional questions (6/7) without a USD recovery prompt. Screenshot: output/upgrades/usd-step-passed.png. Final submission is not confirmed in this follow-up.
