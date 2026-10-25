import type { PersonaData } from '../../types';
import { resolveGeographicDetailsSync } from '../location/geoIntelligence';

export interface MemoryEntry {
  question: string;
  normalizedQuestion: string;
  answer: string;
  source: 'persona' | 'llm' | 'custom';
  createdAt: string;
  hitCount: number;
}

export function normalizeQuestion(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeQuestion(text)
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STORAGE_KEY = 'zeroapply_question_memory_bank';

export class QuestionMemoryBank {
  private static instance: QuestionMemoryBank | null = null;
  private entries: Map<string, MemoryEntry> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): QuestionMemoryBank {
    if (!QuestionMemoryBank.instance) {
      QuestionMemoryBank.instance = new QuestionMemoryBank();
    }
    return QuestionMemoryBank.instance;
  }

  public static addOrUpdateEntry(question: string, answer: string, source: 'persona' | 'llm' | 'custom' = 'custom'): void {
    QuestionMemoryBank.getInstance().set(question, answer, source);
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr: MemoryEntry[] = JSON.parse(raw);
        arr.forEach((e) => this.entries.set(e.normalizedQuestion, e));
      }
    } catch {}
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const arr = Array.from(this.entries.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }

  public set(question: string, answer: string, source: 'persona' | 'llm' | 'custom' = 'custom'): void {
    const norm = normalizeQuestion(question);
    if (!norm) return;

    const existing = this.entries.get(norm);
    this.entries.set(norm, {
      question,
      normalizedQuestion: norm,
      answer,
      source,
      createdAt: existing?.createdAt || new Date().toISOString(),
      hitCount: (existing?.hitCount || 0) + 1,
    });
    this.saveToStorage();
  }

  public get(question: string): string | null {
    const res = this.lookup(question);
    return res.hit ? res.answer : null;
  }

  public lookup(question: string): { hit: boolean; answer: string; source?: string; confidence: number } {
    const norm = normalizeQuestion(question);
    if (!norm) return { hit: false, answer: '', confidence: 0 };

    // 1. Exact match
    if (this.entries.has(norm)) {
      const e = this.entries.get(norm)!;
      e.hitCount++;
      return { hit: true, answer: e.answer, source: e.source, confidence: 1.0 };
    }

    // 2. Fuzzy Token Overlap
    const qTokens = new Set(tokenize(question));
    let bestMatch: MemoryEntry | null = null;
    let highestScore = 0;

    for (const entry of this.entries.values()) {
      const entryTokens = tokenize(entry.normalizedQuestion);
      if (entryTokens.length === 0) continue;

      let overlap = 0;
      for (const t of entryTokens) {
        if (qTokens.has(t)) overlap++;
      }

      const score = overlap / Math.max(qTokens.size, entryTokens.length);
      if (score > highestScore && score >= 0.6) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      return { hit: true, answer: bestMatch.answer, source: bestMatch.source, confidence: highestScore };
    }

    return { hit: false, answer: '', confidence: 0 };
  }

  public seedFromPersona(persona: PersonaData): void {
    if (!persona) return;

    if (persona.fullName) {
      this.set('full name', persona.fullName, 'persona');
      this.set('first name', persona.fullName.split(' ')[0] || '', 'persona');
      this.set('last name', persona.fullName.split(' ').slice(1).join(' ') || '', 'persona');
    }
    if (persona.email) {
      this.set('email address', persona.email, 'persona');
      this.set('email', persona.email, 'persona');
    }
    if (persona.phone) {
      this.set('phone number', persona.phone, 'persona');
      this.set('mobile number', persona.phone, 'persona');
      this.set('phone', persona.phone, 'persona');
    }
    if (persona.location) {
      this.set('location', persona.location, 'persona');
      const geo = resolveGeographicDetailsSync(persona.location, persona);
      this.set('city', geo.city, 'persona');
      this.set('current city', geo.city, 'persona');
      this.set('state', geo.state, 'persona');
      this.set('province', geo.state, 'persona');
      this.set('state/province', geo.state, 'persona');
      this.set('country', geo.country, 'persona');
      this.set('postal code', geo.postalCode, 'persona');
      this.set('zip code', geo.postalCode, 'persona');
      this.set('zip/postal code', geo.postalCode, 'persona');
      this.set('pin code', geo.postalCode, 'persona');
    }
    if (persona.linkedIn) {
      this.set('linkedin profile url', persona.linkedIn, 'persona');
      this.set('linkedin', persona.linkedIn, 'persona');
    }
    if (persona.gitHub) {
      this.set('github profile url', persona.gitHub, 'persona');
      this.set('github', persona.gitHub, 'persona');
    }
    const cleanPortfolio = (persona.portfolio || persona.portfolioUrl || '').trim();
    if (cleanPortfolio && cleanPortfolio !== 'N/A' && !/^(none|nil|no|false)$/i.test(cleanPortfolio)) {
      this.set('portfolio website url', cleanPortfolio, 'persona');
      this.set('website', cleanPortfolio, 'persona');
      this.set('portfolio', cleanPortfolio, 'persona');
    } else {
      this.set('portfolio website url', 'N/A', 'persona');
      this.set('website', 'N/A', 'persona');
      this.set('portfolio', 'N/A', 'persona');
    }
    if (typeof persona.experienceYears === 'number') {
      this.set('years of experience', String(persona.experienceYears), 'persona');
      this.set('total experience in years', String(persona.experienceYears), 'persona');
      this.set('how many years of work experience do you have', String(persona.experienceYears), 'persona');
    }

    // Common screening defaults
    this.set('are you legally authorized to work', 'Yes', 'persona');
    this.set('do you require visa sponsorship', 'No', 'persona');
    this.set('will you now or in the future require sponsorship', 'No', 'persona');
  }

  public getAll(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  public clear(): void {
    this.entries.clear();
    this.saveToStorage();
  }
}

export const questionMemory = QuestionMemoryBank.getInstance();
