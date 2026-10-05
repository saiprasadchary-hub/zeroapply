/**
 * ZeroApply Memory - Question Memory Bank
 * High-performance O(1) persistent cache for previously answered screening questions.
 * Handles synonym expansion, punctuation normalization, persona seeding,
 * persistent disk/localStorage synchronization, and JSON export/import.
 */

import type { PersonaData } from '../../types';
import { resolvePhoneCountryCode } from '../domScanner/fieldClassifier';
import { resolveGeographicDetailsSync } from '../location/geoIntelligence';

export interface MemoryEntry {
  answer: string;
  source: 'persona' | 'llm' | 'user' | 'custom';
  confidence: number;
  timestamp: number;
  hitCount?: number;
  lastUsedTimestamp?: number;
  rawQuestion?: string;
}

export interface LookupResult {
  hit: boolean;
  answer: string;
  confidence: number;
  source?: MemoryEntry['source'];
  hitCount?: number;
}

export const QUESTION_MEMORY_STORAGE_KEY = 'zeroapply_question_memory_v1';

const SYNONYM_MAP: Record<string, string> = {
  'yrs': 'years',
  'exp': 'experience',
  'req': 'require',
  'auth': 'authorized',
  'authz': 'authorized',
  'spons': 'sponsorship',
  'sal': 'salary',
  'comp': 'compensation',
  'loc': 'location',
  'pref': 'preference',
  'curr': 'current',
  'prev': 'previous',
};

/**
 * Normalizes question string for deterministic O(1) map indexing.
 */
export function normalizeQuestion(raw: string): string {
  if (!raw) return '';
  const cleaned = raw
    .toLowerCase()
    .replace(/[*?:!.,;'"()[\]{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').map((w) => SYNONYM_MAP[w] || w);
  return words.join(' ');
}

/**
 * Tokenizes text into unique lowercase words.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export class QuestionMemoryBank {
  private static instance: QuestionMemoryBank | null = null;
  private memory = new Map<string, MemoryEntry>();

  public constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): QuestionMemoryBank {
    if (!QuestionMemoryBank.instance) {
      QuestionMemoryBank.instance = new QuestionMemoryBank();
    }
    return QuestionMemoryBank.instance;
  }

  public size(): number {
    return this.memory.size;
  }

  /**
   * Adds or updates a question-answer memory pair and immediately persists to storage.
   */
  public addOrUpdateEntry(
    question: string,
    answer: string,
    source: MemoryEntry['source'] = 'custom',
    confidence = 1.0
  ): void {
    const key = normalizeQuestion(question);
    if (!key || answer === undefined || answer === null || String(answer).trim() === '') return;

    const existing = this.memory.get(key);
    this.memory.set(key, {
      answer: String(answer).trim(),
      source,
      confidence,
      timestamp: Date.now(),
      hitCount: existing?.hitCount ? existing.hitCount + 1 : 0,
      lastUsedTimestamp: Date.now(),
      rawQuestion: question,
    });

    this.saveToStorage();
  }

  public set(
    question: string,
    answer: string,
    source: MemoryEntry['source'] = 'custom',
    confidence = 1.0
  ): void {
    this.addOrUpdateEntry(question, answer, source, confidence);
  }

  public clear(): void {
    this.memory.clear();
    this.saveToStorage();
  }

  public get(question: string): MemoryEntry | undefined {
    const key = normalizeQuestion(question);
    return this.memory.get(key);
  }

  /**
   * Pre-seeds memory bank from candidate Persona data.
   */
  public seedFromPersona(persona: PersonaData): void {
    if (!persona) return;

    const add = (q: string, a: string | number | boolean | undefined) => {
      if (a !== undefined && a !== null && String(a).trim() !== '') {
        this.addOrUpdateEntry(q, String(a), 'persona', 1.0);
      }
    };

    // Standard Persona Q&A seeds
    add('legal authorization to work', 'Yes');
    add('legally authorized to work in the united states', 'Yes');
    add('require visa sponsorship now or in the future', 'No');
    add('will you require visa sponsorship', 'No');
    add('do you require visa sponsorship', 'No');
    add('require sponsorship', 'No');
    add('how many years experience do you have', persona.experienceYears || 0);
    add('years of experience', persona.experienceYears || 0);
    add('total years of experience', persona.experienceYears || 0);
    add('minimum expected salary', persona.minSalary || 0);
    add('desired salary', persona.minSalary || 0);
    add('compensation expectations', persona.minSalary || 0);

    const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
    const curLpa = isFresher ? 0 : (persona.currentCtcLpa !== undefined ? persona.currentCtcLpa : (persona.minSalary || 8));
    const expLpa = persona.minSalary || 12;

    add('current ctc', curLpa);
    add('current ctc in lpa', curLpa);
    add('current ctc (in lpa)', curLpa);
    add('current ctc in inr', isFresher ? 0 : curLpa * 100000);
    add('current salary', curLpa);
    add('expected ctc', expLpa);
    add('expected ctc in lpa', expLpa);
    add('expected ctc (in lpa)', expLpa);
    add('expected ctc in inr', expLpa * 100000);
    add('notice period', isFresher ? 0 : (persona.noticePeriodDays ?? 0));
    add('notice period in days', isFresher ? 0 : (persona.noticePeriodDays ?? 0));
    add('how long is your notice period (in days)', isFresher ? 0 : (persona.noticePeriodDays ?? 0));
    add('current company', isFresher ? 'Fresher' : (persona.currentCompany || ''));
    add('currently working', isFresher ? 'No' : 'Yes');
    add('are you currently working', isFresher ? 'No' : 'Yes');
    add('are you a fresher', isFresher ? 'Yes' : 'No');
    add('email address', persona.email);
    add('phone number', persona.phone);
    add('mobile phone number', persona.phone);
    const countryCode = resolvePhoneCountryCode(persona);
    add('phone country code', countryCode);
    add('country code', countryCode);
    add('full name', persona.fullName);
    add('current location', persona.location);

    // High-precision geographic details (City, State, Country, Postal Code)
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    add('country', geo.country);
    add('current country', geo.country);
    add('state', geo.state);
    add('province', geo.state);
    add('state/province', geo.state);
    add('current state', geo.state);
    add('city', geo.city);
    add('current city', geo.city);
    add('postal code', geo.postalCode);
    add('zip code', geo.postalCode);
    add('zip/postal code', geo.postalCode);
    add('pin code', geo.postalCode);

    add('linkedin profile', persona.linkedIn);
    add('github profile', persona.gitHub);
    const cleanPortfolio = (persona.portfolio || persona.portfolioUrl || '').trim();
    const portfolioVal = cleanPortfolio && cleanPortfolio !== 'N/A' && !/^(none|nil|no|false)$/i.test(cleanPortfolio)
      ? cleanPortfolio
      : 'N/A';
    add('portfolio website', portfolioVal);
    add('portfolio', portfolioVal);
    add('work preference', persona.workPreference || 'Remote');
    add('are you comfortable working remote', persona.workPreference === 'Remote' ? 'Yes' : 'No');

    // Concise Search Query seeds (e.g. "Python AI Automation Engineer" instead of essay)
    const primarySkill = (persona.techStack || []).find((s) => /python/i.test(s)) || 'Python';
    const primaryRole = (persona.targetRoles || [])[0] || 'Software Engineer';
    const conciseSearch = primaryRole.toLowerCase().includes(primarySkill.toLowerCase())
      ? primaryRole
      : `${primarySkill} ${primaryRole}`;

    add('describe the job you want', conciseSearch);
    add('search by title, skill, or company', conciseSearch);
    add('search jobs', conciseSearch);
    add('job title', conciseSearch);
    add('target role', conciseSearch);
  }

  /**
   * Performs an exact or fuzzy lookup across stored memory questions.
   */
  public lookup(rawQuestion: string, threshold = 0.55): LookupResult {
    const normalizedTarget = normalizeQuestion(rawQuestion);
    if (!normalizedTarget) {
      return { hit: false, answer: '', confidence: 0 };
    }

    // 1. Direct O(1) Exact Match
    if (this.memory.has(normalizedTarget)) {
      const entry = this.memory.get(normalizedTarget)!;
      entry.hitCount = (entry.hitCount || 0) + 1;
      entry.lastUsedTimestamp = Date.now();
      return {
        hit: true,
        answer: entry.answer,
        confidence: entry.confidence,
        source: entry.source,
        hitCount: entry.hitCount,
      };
    }

    // 2. Keyword Jaccard/Token Overlap Match
    const targetTokens = new Set(tokenize(normalizedTarget));
    if (targetTokens.size === 0) {
      return { hit: false, answer: '', confidence: 0 };
    }

    let bestMatch: MemoryEntry | null = null;
    let highestScore = 0;

    for (const [key, entry] of this.memory.entries()) {
      const keyTokens = new Set(tokenize(key));
      let intersection = 0;
      for (const token of targetTokens) {
        if (keyTokens.has(token)) intersection++;
      }
      const union = new Set([...targetTokens, ...keyTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      const coverage = targetTokens.size > 0 ? intersection / targetTokens.size : 0;
      // High containment/coverage (e.g. query terms are fully present in question) is a strong match
      const score = Math.max(jaccard, coverage >= 0.7 ? coverage * 0.85 : jaccard);

      if (score > highestScore && score >= threshold) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount = (bestMatch.hitCount || 0) + 1;
      bestMatch.lastUsedTimestamp = Date.now();
      return {
        hit: true,
        answer: bestMatch.answer,
        confidence: highestScore * bestMatch.confidence,
        source: bestMatch.source,
        hitCount: bestMatch.hitCount,
      };
    }

    return { hit: false, answer: '', confidence: 0 };
  }

  /**
   * Retrieves all stored entries for UI visualization or debugging.
   */
  public getAllEntries(): Array<{ key: string; entry: MemoryEntry }> {
    const result: Array<{ key: string; entry: MemoryEntry }> = [];
    for (const [key, entry] of this.memory.entries()) {
      result.push({ key, entry: { ...entry } });
    }
    return result;
  }

  /**
   * Exports entire question memory bank as a portable JSON string.
   */
  public exportToJson(): string {
    const serialized = Array.from(this.memory.entries());
    return JSON.stringify(serialized, null, 2);
  }

  /**
   * Imports questions and answers from a JSON backup.
   */
  public importFromJson(jsonStr: string): number {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;

      let count = 0;
      for (const item of parsed) {
        if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && item[1]?.answer) {
          this.memory.set(item[0], item[1]);
          count++;
        }
      }
      this.saveToStorage();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Synchronizes memory bank to persistent storage.
   */
  public saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const serialized = Array.from(this.memory.entries());
        localStorage.setItem(QUESTION_MEMORY_STORAGE_KEY, JSON.stringify(serialized));
      }
    } catch {}
  }

  /**
   * Hydrates memory bank from persistent storage.
   */
  public loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(QUESTION_MEMORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && item[1]?.answer) {
                this.memory.set(item[0], item[1]);
              }
            }
          }
        }
      }
    } catch {}
  }
}

export const questionMemory = QuestionMemoryBank.getInstance();
