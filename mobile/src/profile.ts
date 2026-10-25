import type { PersonaData } from '../../src/types';

export function emptyPersona(): PersonaData {
  return { fullName: '', email: '', phone: '', location: '', linkedIn: '', gitHub: '', portfolio: '', experienceYears: 0, minSalary: 0, workPreference: 'Remote', tone: 'Confident', techStack: [], targetRoles: [], applyMode: 'easy', applicationLimit: 5, verified: false };
}

export function readPersona(storageKey: string): PersonaData {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!value || typeof value !== 'object') return emptyPersona();
    const saved = value as Record<string, unknown>;
    const result = emptyPersona();
    for (const key of ['fullName', 'email', 'phone', 'location', 'linkedIn', 'gitHub', 'portfolio', 'resumeText'] as const) {
      if (typeof saved[key] === 'string') result[key] = saved[key].slice(0, key === 'resumeText' ? 100000 : 2000);
    }
    for (const key of ['techStack', 'targetRoles'] as const) {
      if (Array.isArray(saved[key])) result[key] = saved[key].filter((item: unknown): item is string => typeof item === 'string').slice(0, 100);
    }
    return result;
  } catch { return emptyPersona(); }
}

export function validateResume(file: Pick<File, 'name' | 'size'>): void {
  if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error('Choose a PDF, DOCX or TXT resume.');
  if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error('Choose a nonempty resume smaller than 10 MB.');
}
