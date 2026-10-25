# Location autocomplete verification

Live check: Dhan AI — Snowflake Engineer, LinkedIn job 4472571523.

AutoApply selected the matching Hyderabad, Telangana, India suggestion and clicked Next. The application advanced from Contact info (1/7) to Resume (2/7). The run was deliberately stopped at that point after capturing location-next-step.png. This check did not submit a new application.

The fix scopes suggestions to the input’s owned listbox, matches the exact displayed label, activates the nested suggestion control without stealing input focus, handles same-value React input tracking, and verifies the committed UI in a separate browser read before advancing. Typing alone and unmatched options cannot be treated as a completed selection.

Regression checks cover delayed suggestions, duplicate matching labels, nested pointer-driven buttons, blur behavior, delayed UI updates and rejection of unrelated suggestions. Regression test, TypeScript and production build passed.
