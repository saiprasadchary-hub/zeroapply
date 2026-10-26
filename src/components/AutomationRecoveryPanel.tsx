import React, { useEffect, useState } from 'react';
import type { PersonaData } from '../types';
import { checkpointFor, confirmRecoveryAnswers, profileRevision, subscribeAutomationStore, type WorkflowCheckpoint } from '../agent/workflow/automationStore';
import { formatFieldAnswer } from '../agent/localLlm/fieldAnswer';
import { isPlaceholderOption } from '../agent/formFiller/optionMatching';

export function AutomationRecoveryPanel({ persona, jobUrl, onResume, running }: { persona: PersonaData; jobUrl: string; onResume: () => Promise<void>; running: boolean }): React.JSX.Element | null {
  const [, refresh] = useState(0);
  useEffect(() => subscribeAutomationStore(() => refresh(value => value + 1)), []);
  const checkpoint = checkpointFor(persona, jobUrl);
  if (!checkpoint || !['blocked', 'uncertain', 'submitting'].includes(checkpoint.phase)) return null;
  return <RecoveryForm key={`${checkpoint.id}:${checkpoint.updatedAt}`} checkpoint={checkpoint} persona={persona} onResume={onResume} running={running} />;
}

function RecoveryForm({ checkpoint, persona, onResume, running }: { checkpoint: WorkflowCheckpoint; persona: PersonaData; onResume: () => Promise<void>; running: boolean }): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const uncertain = checkpoint.phase === 'uncertain' || checkpoint.phase === 'submitting';
  const stale = checkpoint.revision !== profileRevision(persona);
  const save = async (): Promise<void> => {
    setSaving(true); setError('');
    try {
      const validated: Record<string, string> = {};
      for (const field of checkpoint.pending) {
        const answer = formatFieldAnswer(answers[field.label] || '', field);
        if (!answer) throw new Error(`Provide an answer in the required format: ${field.label}`);
        validated[field.label] = answer;
      }
      await confirmRecoveryAnswers(checkpoint, persona, validated);
      await onResume();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Answers could not be saved.'); }
    finally { setSaving(false); }
  };
  return <section aria-label="Application recovery" className="shrink-0 max-h-80 overflow-auto border-b border-amber-200 bg-amber-50 p-3 text-xs space-y-3">
    {(checkpoint.title || checkpoint.company) && <p className="font-semibold">{checkpoint.title}{checkpoint.company ? ` · ${checkpoint.company}` : ''}</p>}
    <p className="font-semibold">{uncertain ? 'Checking a previous submission' : `${checkpoint.answers.length} saved answer${checkpoint.answers.length === 1 ? '' : 's'} · ${checkpoint.pending.length} question${checkpoint.pending.length === 1 ? ' needs' : 's need'} review`}</p>
    {uncertain ? <p>A previous Submit action has no confirmed receipt yet. AutoApply will check for confirmation before allowing another submission.</p> : <>
      <p>Answer these together. Your confirmed answers are saved for this profile and reused only with matching question context.</p>
      {checkpoint.pending.map((field, index) => <label className="block space-y-1" key={`${field.label}:${index}`}>
        <span>{field.label}</span>
        {field.options?.length ? <select aria-label={field.label} value={answers[field.label] || ''} onChange={event => setAnswers(previous => ({ ...previous, [field.label]: event.target.value }))} className="block w-full rounded border bg-white p-2"><option value="">Choose an answer</option>{field.options.filter(option => !isPlaceholderOption(option)).map(option => <option value={option} key={option}>{option}</option>)}</select>
          : field.inputType === 'checkbox' || field.inputType === 'switch' ? <select aria-label={field.label} value={answers[field.label] || ''} onChange={event => setAnswers(previous => ({ ...previous, [field.label]: event.target.value }))} className="block rounded border bg-white p-2"><option value="">Choose an answer</option><option value="true">Yes</option><option value="false">No</option></select>
          : <input aria-label={field.label} type={['number', 'date', 'email', 'url'].includes(field.inputType) ? field.inputType : 'text'} value={answers[field.label] || ''} onChange={event => setAnswers(previous => ({ ...previous, [field.label]: event.target.value }))} className="block w-full rounded border bg-white p-2" />}
        {field.error && <span className="text-amber-900">{field.error}</span>}
      </label>)}
    </>}
    {stale && <p role="alert">Your profile changed. Recheck the application using Fill &amp; Apply before saving answers.</p>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {uncertain ? <button type="button" disabled={running} onClick={() => { void onResume().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not check confirmation.')); }} className="rounded border bg-white px-3 py-2 disabled:opacity-50">Check confirmation again</button>
      : checkpoint.pending.length > 0 && <button type="button" disabled={running || saving || stale} onClick={() => { void save(); }} className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">{saving ? 'Saving answers…' : 'Save answers & resume'}</button>}
  </section>;
}
