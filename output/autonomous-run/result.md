# Volga Partners application — 25 October 2026

LinkedIn confirmed: **Your application was sent to Volga Partners!**

Role: Software Development Engineer – C++/Python – Full Time. LinkedIn job ID: 4436446517.

The app’s own AutoApply workflow filled, advanced, reviewed and submitted the application. The testing assistant started the app controls and observed; it did not manually fill or advance the website form.

## Submitted screening answers

| Question | Answer | Basis |
|---|---|---|
| Minimum 2–3 years C++/Python industrial experience | No | Fresher persona, zero years |
| Can start in 1–2 weeks | Yes | Immediate availability |
| Pacific-time overlap | No | User specified daytime hours |
| Desired pay in LPA | 0 | User explicitly requested zero for freshers |
| Applied to this company before | Yes | Saved Volga Partners SUBMITTED records dated 24 October |

Resume: KSPChary_Resume_1Page copy.pdf. Contact details and LinkedIn profile work/education entries were included. The full captured review is in submitted-review.txt.

## Fixes and verification

- Answers are processed in visual order, with text read-back and radio-state verification before continuing.
- React replacing radio nodes no longer produces a false failure.
- Missing personal answers display a persistent pause reason.
- Form-audit failures block advancement instead of passing silently.
- Desired/current salary and user daytime preference are grounded in saved profile rules.
- Prior applications are checked against saved company records.
- Submission confirmation wait increased from 4.5 to 45 seconds. Existing receipts can be recovered without repeating Submit.
- Job title/company fallback now uses the page title rather than an unrelated “0 notifications” heading.

Checks passed: screening facts, answer persistence including replaced radio nodes, repeated-click prevention, form scope, top-layer cursor, TypeScript, production build. The build retains existing bundle-size and mixed-import warnings.

Evidence: volga-confirmed.png and success-1.png. The site receipt was visually inspected. The app initially timed out before the receipt appeared; its status was then recovered as successful. The initial dashboard row used generic title/company labels; the metadata fallback fix applies to subsequent runs. No claim of zero possible hallucinations across all forms is made.
