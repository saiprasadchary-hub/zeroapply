export interface QuestionMemoryEntry {
  id: string;
  questionPattern: string; // e.g. "Why do you want to work here?"
  answerText: string;
  category: 'behavioral' | 'technical' | 'screening' | 'custom';
  createdAt: string;
}

const MEMORY_BANK_STORAGE_KEY = 'zeroapply_question_memory_bank_v1';

const DEFAULT_MEMORY_ENTRIES: QuestionMemoryEntry[] = [
  {
    id: 'mem-1',
    questionPattern: 'Why do you want to work at our company?',
    answerText: 'I am drawn to your team’s innovation, engineering standards, and mission to deliver high-impact scalable products.',
    category: 'behavioral',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    questionPattern: 'Describe your most challenging project',
    answerText: 'Architected a high-throughput real-time web application with automated performance monitoring, reducing latency by 45%.',
    category: 'technical',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-3',
    questionPattern: 'What is your notice period or availability?',
    answerText: 'Immediately available / 2 weeks notice.',
    category: 'screening',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-4',
    questionPattern: 'Are you legally authorized to work in the United States?',
    answerText: 'Yes',
    category: 'screening',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-5',
    questionPattern: 'Will you now or in the future require sponsorship for employment visa status?',
    answerText: 'No',
    category: 'screening',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-6',
    questionPattern: 'What is your highest level of education completed?',
    answerText: "Bachelor's Degree",
    category: 'screening',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem-7',
    questionPattern: 'Are you willing to undergo a background check and drug test?',
    answerText: 'Yes',
    category: 'screening',
    createdAt: new Date().toISOString(),
  },
];

export class QuestionMemoryBank {
  public static getEntries(): QuestionMemoryEntry[] {
    try {
      const raw = localStorage.getItem(MEMORY_BANK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all default entries are represented if missing
          const existingPatterns = new Set(parsed.map((e: QuestionMemoryEntry) => e.questionPattern.toLowerCase().trim()));
          let added = false;
          DEFAULT_MEMORY_ENTRIES.forEach(def => {
            if (!existingPatterns.has(def.questionPattern.toLowerCase().trim())) {
              parsed.push(def);
              added = true;
            }
          });
          if (added) {
            this.saveEntries(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load question memory bank:', e);
    }
    this.saveEntries(DEFAULT_MEMORY_ENTRIES);
    return DEFAULT_MEMORY_ENTRIES;
  }

  public static saveEntries(entries: QuestionMemoryEntry[]): void {
    try {
      localStorage.setItem(MEMORY_BANK_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save memory bank:', e);
    }
  }

  public static addOrUpdateEntry(questionPattern: string, answerText: string, category: QuestionMemoryEntry['category'] = 'custom'): QuestionMemoryEntry {
    const entries = this.getEntries();
    const qLower = questionPattern.trim().toLowerCase();

    const existingIndex = entries.findIndex(e => e.questionPattern.trim().toLowerCase() === qLower);

    if (existingIndex !== -1) {
      entries[existingIndex].answerText = answerText.trim();
      entries[existingIndex].category = category;
      this.saveEntries(entries);
      return entries[existingIndex];
    }

    const newEntry: QuestionMemoryEntry = {
      id: 'mem_' + Math.random().toString(36).substr(2, 9),
      questionPattern: questionPattern.trim(),
      answerText: answerText.trim(),
      category,
      createdAt: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    this.saveEntries(entries);
    return newEntry;
  }

  public static deleteEntry(id: string): void {
    const entries = this.getEntries().filter(e => e.id !== id);
    this.saveEntries(entries);
  }

  /**
   * Performs fuzzy keyword matching to find a pre-saved custom answer for a given form question.
   */
  public static findSavedAnswer(questionText: string): string | null {
    if (!questionText || questionText.trim().length < 3) return null;
    const qLower = questionText.toLowerCase();

    const entries = this.getEntries();
    const stopwords = new Set(['what', 'have', 'does', 'with', 'your', 'from', 'about', 'when', 'which', 'there', 'their', 'will', 'you', 'now', 'for', 'the', 'and', 'not']);
    
    // Helper to tokenize and filter
    const getTokens = (str: string) => new Set(str.toLowerCase().split(/[^\w]+/).filter(w => w.length > 2 && !stopwords.has(w)));
    const qTokens = getTokens(questionText);

    let bestMatch: QuestionMemoryEntry | null = null;
    let bestScore = 0;

    for (const entry of entries) {
      const entryLower = entry.questionPattern.toLowerCase();
      if (qLower.includes(entryLower) || entryLower.includes(qLower)) {
        return entry.answerText;
      }

      const patternTokens = getTokens(entry.questionPattern);
      if (patternTokens.size === 0) continue;

      let matchCount = 0;
      patternTokens.forEach(token => {
        if (qTokens.has(token) || Array.from(qTokens).some(qt => qt.startsWith(token) || token.startsWith(qt))) {
          matchCount++;
        }
      });

      const matchRatio = matchCount / patternTokens.size;
      if (matchRatio > bestScore && (matchRatio >= 0.5 || matchCount >= 3)) {
        bestScore = matchRatio;
        bestMatch = entry;
      }
    }

    return bestMatch ? bestMatch.answerText : null;
  }
}
