import type { PersonaData } from '../../types';
import { QuestionMemoryBank } from './questionMemory';

class HierarchicalMemoryService {
  public onPersonaOrResumeUpdated(persona: PersonaData): void {
    QuestionMemoryBank.getInstance().seedFromPersona(persona);
  }

  public clearEpisodicMemory(): void {
    QuestionMemoryBank.getInstance().clear();
  }

  public lookup(question: string): string | null {
    return QuestionMemoryBank.getInstance().get(question);
  }

  public async retrieveMemoryForQuestion(
    question: string,
    persona?: PersonaData
  ): Promise<{ targetChunkKey: string; extractedSnippet: string }> {
    const qLower = question.toLowerCase();
    const chunks = persona?.resumeChunks || {};

    let targetChunkKey = 'summary';
    if (/project|portfolio|built|engineered|repo|github/i.test(qLower) && chunks.projects) {
      targetChunkKey = 'projects';
    } else if (/skill|tech stack|technology|framework|language|tool/i.test(qLower) && chunks.skills) {
      targetChunkKey = 'skills';
    } else if (/experience|work|job|employment|career|company|role/i.test(qLower) && chunks.experience) {
      targetChunkKey = 'experience';
    } else if (/degree|education|university|college|school|gpa|major/i.test(qLower) && chunks.education) {
      targetChunkKey = 'education';
    } else if (/certif|licen/i.test(qLower) && chunks.certifications) {
      targetChunkKey = 'certifications';
    } else if (/reference/i.test(qLower) && (chunks as Record<string, string | undefined>)['references']) {
      targetChunkKey = 'references';
    } else if (chunks.summary) {
      targetChunkKey = 'summary';
    }

    const extractedSnippet =
      (chunks as Record<string, string | undefined>)[targetChunkKey] || persona?.resumeText || '';

    return {
      targetChunkKey,
      extractedSnippet,
    };
  }
}

export const HierarchicalMemory = new HierarchicalMemoryService();
