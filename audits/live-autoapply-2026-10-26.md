# Live AutoApply verification — 26 October 2026

Started the normal Electron development app and used its Fill & Apply control. The application's own automation performed form filling and submission.

## Confirmed result

AI Forward Engineer, Durapid Technologies Private Limited (LinkedIn job 4479361305) was submitted. The job card changed to Applied and automation dismissed the post-submission prompt and continued.

Observed review answers: current CTC INR 0; expected CTC INR 700000; notice period 0 days; professional experience 0 years and 0 additional months; saved contact information and LinkedIn URL.

Proof: `output/upgrades/live-apply-check.png`. The old banner in that screenshot says job 6/25: that was the listing index, not six successful submissions. The status code now reports the actual confirmed-application count.

## Reproduced issues and changes

- Job discovery missed LinkedIn cards inside open shadow roots. Discovery and card selection now traverse those roots.
- Apply targeting now supports the visible Easy Apply button while excluding search filters and job-card controls.
- A one-card result list now follows the batch-selection path.
- Applied status detection uses rendered text so adjacent block text does not hide the status.
- Callback rebinding in AgentBrowser previously stopped engines. Observer cleanup now only unsubscribes; teardown remains on unmount.
- Model failure stops now preserve the local AI error instead of calling every cancellation a user stop.
- Fresher current designation and income-expectations wording resolve from saved profile data. Fresher current compensation is zero even for USD; expected USD salary still requires an explicit answer.

## Remaining live blockers

Keywords Studios AI Engineer reached page 5/6 but did not submit. Logs contained local AI request timeouts. Better cancellation reporting does not establish that the inference timeout is resolved.

The retry moved to Papigen AI Engineer (4482624538), advanced to page 4/7, and paused on USD compensation questions. The profile stores expected compensation in INR/LPA; no USD expectation was supplied. The draft remains open and a question was sent to the user. No invented USD amount was submitted.

## Validation

- `npm run test:apply` passed, including shadow job discovery, salary, control formats, persistence, location suggestions, repeated-click guards and popup cursor tests.
- TypeScript check passed before the final reporting-only change; final check rerun.
- Production build passed with bundle-size warnings.
- `git diff --check` passed.

Only one new successful submission is confirmed in this test. Full six-application completion and universal no-pause behavior are not verified.
