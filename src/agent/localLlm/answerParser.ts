/**
 * ZeroApply Local LLM - Answer Parser
 * Cleans raw LLM outputs, strips <think> reasoning tags, extracts numbers,
 * and performs fuzzy matching against radio/select option lists.
 */

import { isPlaceholderOption, matchSelectOption, optionPolarity } from '../formFiller/optionMatching';
import { analyzeErrorConstraint } from './errorConstraintAnalyzer';

export interface ParseContext {
  inputType?: string;
  options?: string[];
  required?: boolean;
  validationError?: string;
}

export interface ParsedAnswerResult {
  answer: string;
  confidence: number;
}

export interface OptionMatchResult {
  option: string;
  confidence: number;
  score: number;
}

/**
 * Strips <think>...</think> reasoning tags, code blocks, and conversational noise.
 */
export function cleanRawOutput(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // Remove reasoning thinking tags
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-z]*\n?|```/g, '')) // Strip code fences
    .replace(/^(?:(?:here is (?:the|a)|my|candidate|suggested)?\s*(?:answer|output|response|summary|bio):\s*)+/i, '')
    .replace(/^["'“”]|["'“”]$/g, '')
    .replace(/^[-•*]\s*/, '')
    .trim();
}

/**
 * Extracts digits/numeric values from text, ignoring commas in currency.
 */
export function parseNumericValue(raw: string): string {
  const cleaned = cleanRawOutput(raw).replace(/,/g, '');
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : '';
}

/**
 * Levenshtein distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Fuzzily matches raw answer against candidate options.
 */
export function matchBestOption(rawAnswer: string, options: string[]): OptionMatchResult | null {
  if (!options || options.length === 0) return null;
  const clean = cleanRawOutput(rawAnswer).toLowerCase();
  if (!clean || /^(unknown|insufficient information|cannot determine)$/i.test(clean)) return null;
  options = options.filter((option) => !isPlaceholderOption(option));
  if (!options.length) return null;

  const wrapResult = (option: string, score: number): OptionMatchResult => {
    const res = { option, confidence: score, score };
    // Allow coercion to string if accessed directly
    Object.defineProperty(res, 'toString', { value: () => option, enumerable: false });
    return res;
  };

  const direct = matchSelectOption(clean, options);
  if (direct) return wrapResult(direct, 0.98);
  // A boolean answer must never be converted into its opposite by fuzzy matching.
  if (optionPolarity(clean) !== null) return null;

  // 3. Numeric Range Matching (e.g. rawAnswer = "4", options = ["1-3 years", "3-5 years", "5+ years"])
  const numMatch = clean.match(/\d+(?:\.\d+)?/);
  if (numMatch) {
    const targetNum = parseFloat(numMatch[0]);
    for (const opt of options) {
      // Check range like "3-5" or "3 to 5"
      const rangeMatch = opt.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1]);
        const high = parseFloat(rangeMatch[2]);
        if (targetNum >= low && targetNum <= high) {
          return wrapResult(opt, 0.96);
        }
      }
      // Check range like "5+" or "5 or more" or "more than 5"
      const plusMatch = opt.match(/(\d+)\s*(?:\+|or more|plus)/i);
      if (plusMatch) {
        const threshold = parseFloat(plusMatch[1]);
        if (targetNum >= threshold) {
          return wrapResult(opt, 0.96);
        }
      }
      // Check range like "less than 1" or "< 1"
      const lessMatch = opt.match(/(?:less than|<)\s*(\d+)/i);
      if (lessMatch) {
        const threshold = parseFloat(lessMatch[1]);
        if (targetNum < threshold) {
          return wrapResult(opt, 0.96);
        }
      }
    }
  }

  const candidatePool = options;
  if (clean.length < 4 || /^\d+(?:\.\d+)?$/.test(clean)) return null;

  let bestOpt = candidatePool[0];
  let minDistance = Infinity;

  for (const opt of candidatePool) {
    const dist = levenshteinDistance(clean, opt.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      bestOpt = opt;
    }
  }

  const similarity = 1 - minDistance / Math.max(clean.length, bestOpt.length);
  return similarity >= 0.85 ? wrapResult(bestOpt, similarity) : null;
}

/**
 * Master parser parsing answer based on field input type and options.
 */
export function parseAnswer(rawOutput: string, context: ParseContext = {}): ParsedAnswerResult {
  const cleaned = cleanRawOutput(rawOutput);
  if (!cleaned || /^(unknown|insufficient information|cannot determine)$/i.test(cleaned)) {
    return { answer: '', confidence: 0 };
  }

  const { inputType, options, validationError } = context;

  // Universal validation error constraint handling across all ATS error types
  if (validationError) {
    const analysis = analyzeErrorConstraint(validationError);

    if (analysis.isNumericConstraint) {
      const num = parseNumericValue(cleaned);
      if (!num) return { answer: '', confidence: 0 };
      // Formatting may change; the candidate's factual value must not.
      return { answer: analysis.category === 'decimal' && !num.includes('.') ? `${num}.0` : num, confidence: 0.95 };
    }

    if (analysis.category === 'max_length' && analysis.targetMaxLength) {
      if (cleaned.length > analysis.targetMaxLength) {
        return { answer: cleaned.slice(0, analysis.targetMaxLength).trim(), confidence: 0.95 };
      }
    }

    if (analysis.category === 'url') {
      if (!/^https?:\/\//i.test(cleaned)) {
        return { answer: `https://${cleaned.replace(/^www\./i, '')}`, confidence: 0.95 };
      }
    }

    if (analysis.category === 'postal') {
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length >= 5) {
        return { answer: digits.slice(0, 6), confidence: 0.95 };
      }
    }


  }

  // Number / numeric field
  if (inputType === 'number' || inputType === 'numeric') {
    const num = parseNumericValue(cleaned);
    if (num) {
      return { answer: num, confidence: 0.95 };
    }
  }

  // Date input field
  if (inputType === 'date') {
    if (/immediately|asap|now|today|earliest/i.test(cleaned)) {
      return { answer: new Date().toISOString().split('T')[0], confidence: 0.95 };
    }
  }

  // Radio / Select dropdown option list
  if (options && options.length > 0) {
    const matched = matchBestOption(cleaned, options);
    return { answer: matched?.option || '', confidence: matched?.confidence ?? 0 };
  }

  // Checkbox boolean value
  if (inputType === 'checkbox') {
    if (/^(yes|yep|true|agree|authorized|willing|comfortable)/i.test(cleaned)) {
      return { answer: 'true', confidence: 0.95 };
    }
    if (/^(no|nope|false|not|disagree|unwilling)/i.test(cleaned)) {
      return { answer: 'false', confidence: 0.95 };
    }
  }

  // Boolean radio heuristics
  if (inputType === 'radio') {
    if (/^(yes|yep|true|authorized|willing|comfortable)/i.test(cleaned)) {
      return { answer: 'Yes', confidence: 0.9 };
    }
    if (/^(no|nope|false|not authorized|unwilling)/i.test(cleaned)) {
      return { answer: 'No', confidence: 0.9 };
    }
  }

  return { answer: cleaned, confidence: 0.85 };
}
