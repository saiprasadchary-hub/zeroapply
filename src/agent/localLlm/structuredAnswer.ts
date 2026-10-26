import { formatFieldAnswer, type AnswerField } from './fieldAnswer';

export function answerSchema(fieldId: string): Record<string, unknown> {
  return { type: 'object', additionalProperties: false, properties: {
    fieldId: { type: 'string', enum: [fieldId] }, status: { type: 'string', enum: ['answered', 'missing'] },
    answer: { type: 'string' }, selectedOption: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
  }, required: ['fieldId', 'status', 'answer', 'selectedOption', 'evidence'] };
}

/** Schema compliance establishes shape; evidence and field validation remain separate. */
export function validateStructuredAnswer(raw: string, fieldId: string, field: AnswerField, applicantEvidence: string): { answer: string; evidence: string[]; error?: string } {
  const fail = (error: string): { answer: string; evidence: string[]; error: string } => ({ answer: '', evidence: [], error });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fail('Local AI returned invalid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('Invalid answer envelope.');
  const value = parsed as Record<string, unknown>;
  if (value.fieldId !== fieldId || !['answered', 'missing'].includes(String(value.status)) || typeof value.answer !== 'string' || typeof value.selectedOption !== 'string' || !Array.isArray(value.evidence)) return fail('Answer envelope does not match this question.');
  if (value.status === 'missing') return fail('Applicant information is missing.');
  const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();
  const evidence = value.evidence.filter((quote): quote is string => typeof quote === 'string' && quote.trim().length >= 3);
  if (!evidence.length || evidence.length !== value.evidence.length || !evidence.every(quote => normalize(applicantEvidence).includes(normalize(quote)))) return fail('Answer has no verifiable applicant evidence.');
  const options = field.options || [];
  if (options.length && (!options.includes(value.selectedOption) || value.answer !== value.selectedOption)) return fail('Answer is not an exact available option.');
  if (!options.length && value.selectedOption) return fail('Unexpected selected option for an open field.');
  const answer = formatFieldAnswer(value.answer, field);
  return answer ? { answer, evidence } : fail('Answer does not match the field format.');
}
