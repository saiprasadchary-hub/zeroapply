import type { QuestionFieldTarget, ResolvedAnswer } from './questionResolver';

/** Per-run reuse includes unresolved results, so audits do not repeat identical inference. */
export function createQuestionSession(
  resolve: (field: QuestionFieldTarget) => Promise<ResolvedAnswer>,
): (field: QuestionFieldTarget) => Promise<ResolvedAnswer> {
  const answers = new Map<string, Promise<ResolvedAnswer>>();
  return (field: QuestionFieldTarget): Promise<ResolvedAnswer> => {
    const key = JSON.stringify([field.label, field.inputType, field.options, field.jobUrl,
      field.helperText || '', field.contextHint || '', field.validationError || field.errorMessage || '', field.jobContext]);
    const existing = answers.get(key);
    if (existing) return existing;
    const pending = resolve(field).catch((error: unknown) => { answers.delete(key); throw error; });
    answers.set(key, pending);
    return pending;
  };
}
