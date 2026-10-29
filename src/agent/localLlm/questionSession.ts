import type { QuestionFieldTarget, ResolvedAnswer } from './questionResolver';

/** Retry transient failures once before moving on; retain the outcome to bound audit retries. */
export function createQuestionSession(
  resolve: (field: QuestionFieldTarget) => Promise<ResolvedAnswer>,
): (field: QuestionFieldTarget) => Promise<ResolvedAnswer> {
  const answers = new Map<string, Promise<ResolvedAnswer>>();
  return (field: QuestionFieldTarget): Promise<ResolvedAnswer> => {
    const key = JSON.stringify([field.label, field.inputType, field.options, field.jobUrl,
      field.helperText || '', field.contextHint || '', field.validationError || field.errorMessage || '', field.jobContext]);
    const existing = answers.get(key);
    if (existing) return existing;
    const pending = resolve(field)
      .then(async (result): Promise<ResolvedAnswer> => {
        if (result.answer || !result.retryable) return result;
        return resolve(field);
      })
      .catch((error: unknown) => { answers.delete(key); throw error; });
    answers.set(key, pending);
    return pending;
  };
}
