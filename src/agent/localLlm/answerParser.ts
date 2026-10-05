/**
 * ZeroApply Local LLM - Answer Parser
 * Cleans raw LLM outputs, strips <think> reasoning tags, extracts numbers,
 * and performs fuzzy matching against radio/select option lists.
 */

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

  const wrapResult = (option: string, score: number): OptionMatchResult => {
    const res = { option, confidence: score, score };
    // Allow coercion to string if accessed directly
    Object.defineProperty(res, 'toString', { value: () => option, enumerable: false });
    return res;
  };

  // 1. Exact match
  for (const opt of options) {
    if (opt.toLowerCase() === clean) {
      return wrapResult(opt, 1.0);
    }
  }

  // 2. Boolean & Affirmative/Negative Semantic Match
  const isAffirmative = /^(yes|true|y|agree|authorized|willing|comfortable|1)$/i.test(clean);
  const isNegative = /^(no|false|n|disagree|unwilling|not authorized|0)$/i.test(clean);

  if (isAffirmative || isNegative) {
    for (const opt of options) {
      const oLower = opt.toLowerCase();
      if (isAffirmative && /^(yes|true|i agree|authorized|willing|i am authorized)/i.test(oLower)) {
        return wrapResult(opt, 0.98);
      }
      if (isNegative && /^(no|false|i disagree|not authorized|unwilling|i am not authorized)/i.test(oLower)) {
        return wrapResult(opt, 0.98);
      }
    }
  }

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

  // 4. Substring match (skipping placeholder labels)
  for (const opt of options) {
    const optLower = opt.toLowerCase();
    if (/^(select|choose|please select|--)/i.test(optLower)) continue;
    if (clean.includes(optLower) || optLower.includes(clean)) {
      return wrapResult(opt, 0.95);
    }
  }

  // 5. Levenshtein Distance & Token match (filtering out empty placeholders)
  const validOptions = options.filter(o => !/^(select|choose|please select|--)/i.test(o.trim()));
  const candidatePool = validOptions.length > 0 ? validOptions : options;

  let bestOpt = candidatePool[0];
  let minDistance = Infinity;

  for (const opt of candidatePool) {
    const dist = levenshteinDistance(clean, opt.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      bestOpt = opt;
    }
  }

  return wrapResult(bestOpt, 0.85);
}

/**
 * Master parser parsing answer based on field input type and options.
 */
export function parseAnswer(rawOutput: string, context: ParseContext = {}): ParsedAnswerResult {
  const cleaned = cleanRawOutput(rawOutput);
  if (!cleaned) {
    return { answer: '', confidence: 0 };
  }

  const { inputType, options, validationError } = context;

  // Universal validation error constraint handling across all ATS error types
  if (validationError) {
    const analysis = analyzeErrorConstraint(validationError);

    if (analysis.category === 'decimal') {
      const num = parseNumericValue(cleaned);
      const min = analysis.targetMinValue ?? 0;
      if (!num || parseFloat(num) <= min) {
        const val = min > 0 ? min + 1.0 : 1.0;
        return { answer: `${val.toFixed(1)}`, confidence: 0.98 };
      }
      return { answer: num.includes('.') ? num : `${num}.0`, confidence: 0.98 };
    }

    if (analysis.category === 'whole_number' || analysis.category === 'min_numeric') {
      const num = parseNumericValue(cleaned);
      const min = analysis.targetMinValue ?? 1;
      const parsedInt = num ? parseInt(num, 10) : min;
      const finalVal = isNaN(parsedInt) || parsedInt < min ? min : parsedInt;
      return { answer: String(finalVal), confidence: 0.98 };
    }

    if (analysis.category === 'max_numeric' && analysis.targetMaxValue !== undefined) {
      const num = parseNumericValue(cleaned);
      const parsedVal = num ? parseFloat(num) : analysis.targetMaxValue;
      const finalVal = isNaN(parsedVal) || parsedVal > analysis.targetMaxValue ? analysis.targetMaxValue : parsedVal;
      return { answer: String(finalVal), confidence: 0.98 };
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

    if (analysis.isNumericConstraint) {
      const num = parseNumericValue(cleaned);
      if (num) {
        return { answer: num, confidence: 0.95 };
      }
      return { answer: '1', confidence: 0.95 };
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
    return { answer: matched?.option || options[0], confidence: matched?.confidence || 0.9 };
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
