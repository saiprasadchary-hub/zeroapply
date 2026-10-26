import type { PersonaData } from '../../types';
import { getSecureItem, setSecureItemDurable } from '../../services/secureStorage';

export interface RecoveryQuestion { label: string; inputType: string; options?: string[]; error?: string }
export interface VerifiedWorkflowAnswer { question: string; answer: string; source: string }
export interface WorkflowCheckpoint {
  id: string; applicant: string; jobUrl: string; revision: string; company: string; title: string;
  phase: 'draft' | 'blocked' | 'submitting' | 'uncertain' | 'confirmed';
  step: number; answers: VerifiedWorkflowAnswer[]; pending: RecoveryQuestion[]; updatedAt: number; reason?: string;
}
interface Correction { scope: string; question: string; inputType: string; options: string[]; answer: string; timestamp: number }
interface AutomationData { checkpoints: WorkflowCheckpoint[]; corrections: Correction[] }
const KEY = 'zeroapply_automation_recovery_v1';
const listeners = new Set<() => void>();
let writes: Promise<void> = Promise.resolve();
let transient: AutomationData = { checkpoints: [], corrections: [] };
export function fingerprint(text: string): string {
  let a = 2166136261, b = 3339675911;
  for (const character of text) { a = Math.imul(a ^ character.charCodeAt(0), 16777619) >>> 0; b = Math.imul(b ^ character.charCodeAt(0), 2246822519) >>> 0; }
  return `${text.length}:${a.toString(16)}:${b.toString(16)}`;
}
export function profileRevision(persona: PersonaData): string { return fingerprint(JSON.stringify(persona)); }
export function canonicalJobUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const jobId = /(^|\.)linkedin\.com$/i.test(url.hostname) && (url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || url.searchParams.get('currentJobId'));
    if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(trk|trackingId)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort(); return url.toString();
  } catch { return ''; }
}
function applicantKey(persona: PersonaData): string { return fingerprint((persona.email || persona.fullName).trim().toLowerCase()); }
function isQuestion(value: unknown): value is RecoveryQuestion {
  if (!value || typeof value !== 'object') return false;
  const item = value as RecoveryQuestion;
  return typeof item.label === 'string' && typeof item.inputType === 'string' && (item.options === undefined || (Array.isArray(item.options) && item.options.every(option => typeof option === 'string')));
}
function isAnswer(value: unknown): value is VerifiedWorkflowAnswer {
  if (!value || typeof value !== 'object') return false;
  const item = value as VerifiedWorkflowAnswer;
  return typeof item.question === 'string' && typeof item.answer === 'string' && typeof item.source === 'string';
}
function read(): AutomationData {
  try {
    const raw = getSecureItem(KEY);
    if (!raw) return transient;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return transient;
    const data = value as AutomationData;
    if (Array.isArray(data.checkpoints) && Array.isArray(data.corrections)) {
      return {
        checkpoints: data.checkpoints.filter(item => item && typeof item.id === 'string' && typeof item.applicant === 'string' && typeof item.jobUrl === 'string' && ['draft', 'blocked', 'submitting', 'uncertain', 'confirmed'].includes(item.phase)).map(item => ({ ...item, revision: typeof item.revision === 'string' ? item.revision : '', answers: Array.isArray(item.answers) ? item.answers.filter(isAnswer) : [], pending: Array.isArray(item.pending) ? item.pending.filter(isQuestion) : [] })),
        corrections: data.corrections.filter(item => item && typeof item.answer === 'string' && typeof item.scope === 'string' && typeof item.question === 'string' && typeof item.inputType === 'string' && Array.isArray(item.options) && item.options.every(option => typeof option === 'string')),
      };
    }
  } catch { /* A damaged snapshot cannot authorize filling or submission. */ }
  return transient;
}
function update(change: (data: AutomationData) => AutomationData): Promise<void> {
  const operation = writes.catch(() => {}).then(async () => {
    const data = change(read());
    const serialized = JSON.stringify(data);
    await setSecureItemDurable(KEY, serialized);
    transient = data;
    for (const listener of listeners) { try { listener(); } catch { /* A view cannot invalidate an acknowledged write. */ } }
  });
  writes = operation;
  return operation;
}
export function subscribeAutomationStore(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function checkpointFor(persona: PersonaData, jobUrl: string): WorkflowCheckpoint | undefined {
  const url = canonicalJobUrl(jobUrl), applicant = applicantKey(persona);
  if (!url) return undefined;
  return read().checkpoints.find(item => item.applicant === applicant && item.jobUrl === url);
}
export function newCheckpoint(persona: PersonaData, jobUrl: string, company = '', title = ''): WorkflowCheckpoint {
  const url = canonicalJobUrl(jobUrl);
  return { id: fingerprint(`${applicantKey(persona)}:${url}`), applicant: applicantKey(persona), jobUrl: url, revision: profileRevision(persona), company, title, phase: 'draft', step: 0, answers: [], pending: [], updatedAt: Date.now() };
}
export async function saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
  if (!checkpoint.jobUrl) return;
  await update(data => {
    const all = [{ ...checkpoint, updatedAt: Date.now() }, ...data.checkpoints.filter(item => item.id !== checkpoint.id)];
    const uncertain = all.filter(item => item.phase === 'submitting' || item.phase === 'uncertain');
    if (uncertain.length > 100) throw new Error('Resolve existing uncertain submissions before starting more applications.');
    return { ...data, checkpoints: [...uncertain, ...all.filter(item => item.phase !== 'submitting' && item.phase !== 'uncertain').slice(0, 100)] };
  });
}
function correctionScope(persona: PersonaData, label: string, jobUrl: string): string {
  return `${profileRevision(persona)}:${/\b(?:company|employer|this role|this position|our|us)\b|applied.*before|previously.*applied|worked.*here/i.test(label) ? canonicalJobUrl(jobUrl) : 'profile'}`;
}
const normalizeQuestion = (label: string): string => label.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−]/g, '-').replace(/[?*]+$/g, '').replace(/\s+/g, ' ').trim();
export function learnedAnswer(field: RecoveryQuestion, persona: PersonaData, jobUrl = ''): string | undefined {
  const scope = correctionScope(persona, field.label, jobUrl), options = JSON.stringify([...(field.options || [])].sort());
  return read().corrections.find(item => item.scope === scope && item.question === normalizeQuestion(field.label) && item.inputType === field.inputType && JSON.stringify([...item.options].sort()) === options)?.answer;
}
export async function confirmRecoveryAnswers(checkpoint: WorkflowCheckpoint, persona: PersonaData, answers: Record<string, string>): Promise<void> {
  if (checkpoint.revision !== profileRevision(persona)) throw new Error('Your profile changed. Recheck the form before saving these answers.');
  const corrections: Correction[] = checkpoint.pending.map(field => {
    const value = Object.hasOwn(answers, field.label) ? answers[field.label] : '';
    const answer = typeof value === 'string' ? value.trim() : '';
    if (!answer || answer.length > 4000 || (field.options?.length && !field.options.includes(answer))) throw new Error(`Choose or enter a valid answer for ${field.label}`);
    return { scope: correctionScope(persona, field.label, checkpoint.jobUrl), question: normalizeQuestion(field.label), inputType: field.inputType, options: field.options || [], answer, timestamp: Date.now() };
  });
  await update(data => ({ ...data, corrections: [...corrections, ...data.corrections.filter(old => !corrections.some(item => item.scope === old.scope && item.question === old.question && item.inputType === old.inputType))].slice(0, 500) }));
}
