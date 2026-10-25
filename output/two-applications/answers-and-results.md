# Two live application tests — 24 October 2026

LinkedIn confirmed both new applications. The prior Redient Security submission is not counted here.

| Company | Role | Job ID | Result |
| --- | --- | --- | --- |
| D2N Solutions | Artificial Intelligence Intern | 4479670892 | Application sent |
| Daice Labs | AI/ML Engineering Intern | 4480759259 | Application sent |

## Answers and selections in both applications

| Field | Submitted value |
| --- | --- |
| Email | kspchary077@gmail.com |
| Phone country code | India (+91) |
| Mobile phone | 8374370572 |
| Résumé | KSPChary_Resume_1Page copy.pdf, displayed date 10/24/2026 |
| Have you completed the following level of education: Bachelor's Degree? | No |
| Mark job as a top choice | Not selected at submission |
| Follow company | Selected in the final recorded review |

LinkedIn also states that the employer receives a copy of the applicant's profile. The degree answer matches ongoing studies rather than claiming a completed degree. There were no additional salary or experience screening answers in these two final reviews.

## Evidence

- success-1.png: D2N Solutions confirmation, captured after the receipt finished rendering.
- success-2.png: Daice Labs confirmation, captured after the receipt finished rendering.
- d2n-review.txt and daice-review.txt: actual final review text.
- form-evidence.json: timestamped observations of fields and reviews.

## Test scope and limitations

These were supervised runs using the app's application orchestrator. I restarted the workflow and restored the visible browser during troubleshooting. This is not proof of an uninterrupted automatic two-job batch. Volga Partners was left unsubmitted because questions required information not established in the saved profile.

The live run exposed a radio scanner exception, duplicate modern radio controls, incorrect question labels, and optional-checkbox retries. Corrections were made, with checks for native/shadow forms, radio groups, stable selectors, optional top-choice navigation, and cursor visibility. A modal-open guard and a submission check before each further step were also added. The final optional-checkbox/recovery changes have regression coverage but were not validated through a third live submission.

The activity overlay still showed stale role/model labels in these screenshots; the LinkedIn confirmation and review text are the evidence of employer, answers, and success. The screening question was resolved from profile/memory; these applications do not independently prove local-model vision quality.
