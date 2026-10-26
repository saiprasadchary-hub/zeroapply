import { resolveQuestion } from './questionResolver';
import { resolveScreeningFact } from './screeningFacts';
import { formatFieldAnswer, resolveFieldScreeningFact } from './fieldAnswer';
/** Compatibility API. Single and batch questions use the shared grounded resolver. */

import type { PersonaData } from '../../types';


export interface FormQuestionTarget {
  id?: string;
  selector?: string;
  label: string;
  name?: string;
  placeholder?: string;
  widgetType?: string;
  inputType?: string;
  contextHint?: string;
  options?: string[];
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  validationError?: string;
  helperText?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  compoundRole?: string;
  jobContext?: {
    jobTitle?: string;
    companyName?: string;
    description?: string;
  };
}

export interface CognitiveAnswerResult {
  answer: string;
  confidence: number;
  source: 'armor' | 'persona' | 'memory' | 'llm' | 'fallback';
  thoughtProcess?: string;
  isKnockoutGuarded?: boolean;
}

/**
 * TIER 0: Disqualification Armor 2.0
 * Legacy compatibility entry point; personal facts are resolved from saved evidence.
 */
export function evaluateDisqualificationArmor(_question: string, _options?: string[]): {
  isKnockout: boolean; guaranteedAnswer?: string; reason?: string;
} {
  return { isKnockout: false, reason: 'Personal screening answers require saved user evidence.' };
}

export function resolveBestOption(desiredVal: string, options?: string[]): string {
  if (!options || options.length === 0) return desiredVal;

  const target = desiredVal.toLowerCase().trim();

  // 1. Exact Match
  const exact = options.find((o) => o.toLowerCase().trim() === target);
  if (exact) return exact;

  // 2. Affirmative / Negative normalization
  if (/^(yes|y|true|1)$/i.test(target)) {
    const yesOpt = options.find((o) =>
      /^(yes|y|true|i agree|affirmative|authorized|eligible)$/i.test(o.trim())
    );
    if (yesOpt) return yesOpt;
  }
  if (/^(no|n|false|0)$/i.test(target)) {
    const noOpt = options.find((o) =>
      /^(no|n|false|i decline|negative|none)$/i.test(o.trim())
    );
    if (noOpt) return noOpt;
  }

  // 3. Numeric Range Matching (e.g. desired "3" matches "3-5 years" or "1 to 4 years")
  const numMatch = target.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const targetNum = parseFloat(numMatch[1]);
    for (const opt of options) {
      const rangeMatch = opt.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (targetNum >= min && targetNum <= max) return opt;
      }
      const plusMatch = opt.match(/(\d+)\s*\+/);
      if (plusMatch && targetNum >= parseInt(plusMatch[1], 10)) {
        return opt;
      }
    }
  }

  // 4. Substring Match
  const partial = options.find(
    (o) => o.toLowerCase().includes(target) || target.includes(o.toLowerCase())
  );
  if (partial) return partial;

  // 5. Token Overlap Match (Jaccard similarity)
  const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
  let bestOpt = options[0];
  let maxScore = -1;

  for (const opt of options) {
    const optLower = opt.toLowerCase();
    let score = 0;
    for (const w of targetWords) {
      if (optLower.includes(w)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestOpt = opt;
    }
  }

  return maxScore > 0 ? bestOpt : '';
}

/**
 * High-precision compensation & salary converter supporting LPA, USD, Monthly, and Hourly.
 */
export function resolveCompensationAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const fact = resolveScreeningFact(label, persona);
  return fact ? resolveBestOption(fact, options) : '';
}

/**
 * Notice period & availability resolver.
 */
export function resolveNoticePeriodAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const guarded = resolveFieldScreeningFact({ label, options }, persona);
  if (guarded !== undefined) return guarded;
  const days = persona.employmentStatus === 'fresher' ? 0 : persona.noticePeriodDays;
  if (days === undefined || !Number.isFinite(days) || days < 0) return '';
  if (options?.length) {
    const exactDays = options.find(option => new RegExp(`^${days}\\s*days?$`, 'i').test(option.trim()));
    if (exactDays) return exactDays;
    if (days === 0) return options.find(option => /^(immediate|immediately|available now)$/i.test(option.trim())) || '';
    return '';
  }
  return /days?|notice/i.test(label) ? String(days) : days === 0 ? 'Immediate' : `${days} days`;
}

/**
 * Skill-specific experience calculator.
 */
export function resolveSkillExperienceAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const fact = resolveScreeningFact(label, persona);
  return fact ? resolveBestOption(fact, options) : '';
}

/**
 * Multi-select checkbox group solver ("Select all that apply").
 */
export function resolveMultiSelectCheckboxAnswers(label: string, options: string[], persona: PersonaData): string[] {
  if (!options || options.length === 0) return [];
  const stack = (persona.techStack || []).map((s) => s.toLowerCase());
  const roles = (persona.targetRoles || []).map((r) => r.toLowerCase());
  const matched: string[] = [];

  for (const opt of options) {
    const optLower = opt.toLowerCase().trim();
    if (stack.some((s) => optLower.includes(s) || s.includes(optLower))) {
      matched.push(opt);
    } else if (roles.some((r) => optLower.includes(r) || r.includes(optLower))) {
      matched.push(opt);
    } else if (/remote|hybrid|full[\s-]time|yes/i.test(optLower)) {
      matched.push(opt);
    }
  }

  return matched;
}

/**
 * Master Single-Question Cognitive Resolver
 */
export async function resolveQuestionCognitively(
  target: FormQuestionTarget,
  persona: PersonaData
): Promise<CognitiveAnswerResult> {
  const resolved = await resolveQuestion({ ...target, inputType: target.inputType || target.widgetType }, persona);
  const answer = formatFieldAnswer(resolved.answer, { ...target, inputType: target.inputType || target.widgetType });
  return { ...resolved, answer, confidence: answer ? resolved.confidence : 0 };
}

export async function resolveFormStepBatch(
  targets: FormQuestionTarget[],
  persona: PersonaData,
  jobContext?: { jobTitle?: string; companyName?: string }
): Promise<Map<string, CognitiveAnswerResult>> {
  const results = new Map<string, CognitiveAnswerResult>();
  for (const target of targets) {
    const key = target.id || target.selector || target.label;
    results.set(key, await resolveQuestionCognitively({ ...target, jobContext: { ...jobContext, ...target.jobContext } }, persona));
  }
  return results;
}
