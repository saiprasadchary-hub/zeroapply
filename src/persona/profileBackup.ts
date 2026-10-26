import type { PersonaData } from '../types';
import type { PersonaProfile } from './personaManager';

export function parseProfileBackup(value: unknown): { data: PersonaData; savedResume?: PersonaProfile['savedResume']; name?: string } {
  const item = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!item || typeof item !== 'object') throw new Error('Choose a backup containing one profile.');
  const record = item as Record<string, unknown>;
  const data = (record.data || record) as Partial<PersonaData>;
  for (const key of ['fullName', 'email', 'location', 'phone', 'linkedIn', 'gitHub', 'portfolio'] as const) if (typeof data[key] !== 'string') throw new Error(`The backup is missing ${key}.`);
  if (!Array.isArray(data.techStack) || !data.techStack.every(item => typeof item === 'string') || !Array.isArray(data.targetRoles) || !data.targetRoles.every(item => typeof item === 'string') || !Number.isFinite(data.experienceYears) || !Number.isFinite(data.minSalary)) throw new Error('The backup has invalid profile facts.');
  let savedResume: PersonaProfile['savedResume'];
  if (record.savedResume && typeof record.savedResume === 'object') {
    const file = record.savedResume as NonNullable<PersonaProfile['savedResume']>;
    if (typeof file.name !== 'string' || !/\.(pdf|docx?)$/i.test(file.name) || typeof file.type !== 'string' || typeof (file.base64Data ?? file.base64) !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.base64Data ?? file.base64 ?? '')) throw new Error('The backup contains an invalid resume file.');
    savedResume = file;
  }
  return { data: data as PersonaData, savedResume, name: typeof record.name === 'string' ? record.name : undefined };
}

