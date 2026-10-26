import type { PersonaData } from '../../types';
import { isPlaceholderOption, optionPolarity } from '../formFiller/optionMatching';
import { matchBestOption } from './answerParser';
import { resolveScreeningFact, type ScreeningContext } from './screeningFacts';
import { learnedAnswer } from '../workflow/automationStore';

export interface AnswerField {
  label: string;
  inputType?: string;
  options?: string[];
  jobUrl?: string;
}

const isNoticeStatus = (label: string): boolean => /serving.*notice|notice.*serving|relieved|already.*resign|last working day/i.test(label);
const isNoticeTiming = (label: string): boolean => !isNoticeStatus(label) && /notice.*period|(?:join|start).*days|days.*(?:join|start)|when.*(?:join|start)|how soon.*start|earliest.*start|availability.*join/i.test(label);

/** Convert an established answer to the control's format, never to an unrelated choice. */
export function formatFieldAnswer(value: string, field: AnswerField): string {
  const answer = value.trim();
  if (!answer) return '';
  const type = (field.inputType || '').toLowerCase();
  if (isNoticeStatus(field.label) && /^(?:immediate(?:ly)?|available now|asap|\d+(?:\.\d+)?(?:\s*days?)?)$/i.test(answer)) return '';
  if (type === 'checkbox' || type === 'switch') {
    const polarity = optionPolarity(answer);
    return polarity === null ? '' : String(polarity === 'yes');
  }
  // Searchable dropdowns load suggestions after typing. This is a query, not a
  // committed answer: the combobox filler must select and verify a live option.
  if (type === 'combobox' && !field.options?.length) return answer;
  const choice = /^(radio|radiogroup|select|select-one|dropdown|combobox|listbox)$/.test(type);
  if (choice || field.options?.length) {
    const options = (field.options || []).filter(option => !isPlaceholderOption(option));
    if (!options.length) return '';
    if (isNoticeStatus(field.label) && /^(not applicable|n\/?a|fresher)$/i.test(answer)) {
      const notApplicable = options.find(option => /^(?:not applicable|n\/?a|fresher|not employed|currently not employed|unemployed)(?:\s*[-–:(].*)?$/i.test(option.trim()));
      if (notApplicable) return notApplicable;
      if (/^(are|have|do|is|were)\b/i.test(field.label.trim())) return options.find(option => /^no$/i.test(option.trim())) || '';
      return '';
    }
    if (isNoticeTiming(field.label) && /^(?:0(?:\s*days?)?|immediate(?:ly)?|available now|asap)$/i.test(answer)) {
      const immediate = options.find(option => /^(?:0\s*(?:days?)?|immediate(?:ly)?|available now|asap)$/i.test(option.trim()));
      return immediate || '';
    }
    return matchBestOption(answer, options)?.option || '';
  }
  if (type === 'number' || type === 'numeric') {
    if (isNoticeTiming(field.label) && /^(immediate(?:ly)?|available now|asap)$/i.test(answer)) return '0';
    return /^[+-]?\d+(?:\.\d+)?$/.test(answer.replace(/,/g, '')) ? answer.replace(/,/g, '') : '';
  }
  return answer;
}

export function resolveFieldScreeningFact(field: AnswerField, persona: PersonaData, context: ScreeningContext = {}): string | undefined {
  const fact = resolveScreeningFact(field.label, persona, context);
  if (isNoticeStatus(field.label) && persona.employmentStatus !== 'fresher' && persona.noticeStatus && field.options?.length && !field.options.includes(fact || '')) {
    const statusOptions = {
      serving: /^(?:yes[,.:\s-]*)?(?:i(?:'m| am)\s+)?(?:currently\s+)?serving\s+(?:my\s+)?notice(?:\s+period)?[.!]?$/i,
      relieved: /^(?:no[,.:\s-]*)?(?:i(?:'ve| have)\s+)?(?:already\s+)?(?:been\s+)?relieved(?:\s+from\s+.*)?[.!]?$/i,
      not_serving: /^(?:no[,.:\s-]*)?(?:i(?:'m| am)\s+)?not\s+(?:currently\s+)?serving\s+(?:my\s+)?notice(?:\s+period)?[.!]?$/i,
    };
    const matching = field.options.filter(option => statusOptions[persona.noticeStatus!].test(option.trim()));
    if (matching.length === 1) return matching[0];
  }
  if (fact) return formatFieldAnswer(fact, field);
  const confirmed = learnedAnswer({ ...field, inputType: field.inputType || 'text' }, persona, field.jobUrl);
  return confirmed ? formatFieldAnswer(confirmed, field) : fact;
}
