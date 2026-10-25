import type { PersonaData } from '../../types';
import { QuestionMemoryBank } from './questionMemoryBank';

export interface AnswerMemoryContext {
  companyName?: string;
  jobTitle?: string;
  options?: string[];
  helperText?: string;
  contextHint?: string;
}

/** A profile revision and the full question context form one isolated namespace. */
export function getScopedQuestionMemory(persona: PersonaData, context: AnswerMemoryContext = {}): QuestionMemoryBank {
  const revision = JSON.stringify({ persona, context });
  // Persist only a revision fingerprint, rather than duplicating a full resume in every namespace.
  const hashes = [2166136261, 3339675911, 1268118805, 2246822507];
  for (let i = 0; i < revision.length; i++) {
    for (let h = 0; h < hashes.length; h++) hashes[h] = Math.imul(hashes[h] ^ revision.charCodeAt(i), 16777619) >>> 0;
  }
  const scope = `${revision.length}:${hashes.map(hash => hash.toString(16).padStart(8, '0')).join('')}`;
  // Each resolver owns its bank throughout asynchronous inference; no mutable global scope.
  return new QuestionMemoryBank(scope, Boolean(context.companyName?.trim()));
}
