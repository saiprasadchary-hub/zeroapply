import { classifyFields, type ClassifiedField } from '../domScanner/fieldClassifier';
import { scanFormFields, type WebviewTarget } from '../domScanner/injectedScanner';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { recordQuality } from '../telemetry/qualityMetrics';
import type { PersonaData } from '../../types';
import { fillField, type FieldFillResult } from './formFiller';

const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

/** Retry the same answer against a freshly scanned control after a UI remount. */
export async function fillFieldWithRecovery(
  view: WebviewTarget,
  original: ClassifiedField,
  value: string,
  persona: PersonaData,
  isCancelled?: () => boolean,
): Promise<FieldFillResult> {
  let field = original;
  let result: FieldFillResult = { success: false, error: 'Field was not filled.' };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (isCancelled?.()) return { success: false, error: 'Application cancelled by user' };
    result = await fillField(view, field, value, persona);
    if (result.success) { if (attempt > 0) recordQuality('recoveredFields'); return result; }
    if (field.inputType === 'file' || /Invalid parameters|Missing selector|global navigation|subscription widget/i.test(result.error || '')) return result;
    if (attempt === 2) break;
    liveTelemetry.emit({ type: 'check', target: original.label, title: `Rechecking ${original.label}: refreshing the field before retry ${attempt + 1}/2.`, status: 'running' });
    await new Promise<void>(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    if (isCancelled?.()) return { success: false, error: 'Application cancelled by user' };
    const scanned = await scanFormFields(view).catch(() => []);
    // A selector may now point at another question. Require semantic identity as well.
    const candidates = classifyFields(scanned, persona).filter(candidate =>
      normalize(candidate.label) === normalize(original.label)
      && candidate.inputType === original.inputType);
    if (!normalize(original.label)) return result;
    const sameControl = candidates.filter(candidate =>
      (original.name && candidate.name === original.name)
      || (original.id && candidate.id === original.id));
    const matches = sameControl.length === 1 ? sameControl : candidates;
    if (matches.length !== 1) return result;
    field = matches[0];
  }
  return result;
}
