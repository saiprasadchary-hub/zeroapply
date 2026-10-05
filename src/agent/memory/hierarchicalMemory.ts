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
}

export const HierarchicalMemory = new HierarchicalMemoryService();
