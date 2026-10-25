import type { PersonaData } from '../../src/types';
export interface LinkedInField { id: string; label: string; type: string; required: boolean; value: string; options: string[]; }
export function candidateAnswer(label: string, persona: PersonaData): string | undefined {
  const key = label.toLowerCase();
  if (/password|race|ethnic|religion|gender|disability|veteran|citizenship|nationality|criminal|background|authorized|authorization|sponsorship|visa|date of birth|social security/.test(key)) return undefined;
  if (/first name/.test(key)) return persona.fullName.trim().split(/\s+/)[0] || undefined;
  if (/last name|surname/.test(key)) return persona.fullName.trim().split(/\s+/).slice(1).join(' ') || undefined;
  if (/full name|your name/.test(key)) return persona.fullName.trim() || undefined;
  if (/email/.test(key)) return persona.email.trim() || undefined;
  if (/phone|mobile number/.test(key)) return persona.phone.trim() || undefined;
  if (/linkedin/.test(key)) return persona.linkedIn.trim() || undefined;
  if (/github/.test(key)) return persona.gitHub.trim() || undefined;
  if (/portfolio|website/.test(key)) return persona.portfolio.trim() || undefined;
  if (/city|location/.test(key)) return persona.location.trim() || undefined;
  return undefined;
}
export function sensitiveQuestion(label: string): boolean {
  return /password|race|ethnic|religion|gender|disability|veteran|citizenship|nationality|criminal|background|authorized|authorization|sponsorship|visa|date of birth|social security/i.test(label);
}
export function parseAnswer(text: string, field: LinkedInField): string | undefined {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  let answer: unknown;
  try { const result: unknown = JSON.parse(cleaned); if (result && typeof result === 'object' && 'answer' in result) answer = (result as { answer: unknown }).answer; } catch { return undefined; }
  if (typeof answer !== 'string' || !answer.trim() || /^(unknown|null|not provided|n\/a)$/i.test(answer.trim())) return undefined;
  if (field.options.length > 0) return field.options.find((option: string): boolean => option.toLowerCase() === answer.trim().toLowerCase());
  if (field.type === 'number' && !/^\d+(\.\d+)?$/.test(answer.trim())) return undefined;
  return answer.trim().slice(0,2000);
}
