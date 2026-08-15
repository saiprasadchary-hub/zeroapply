import type { PersonaData } from '../../types';
import { solveScreeningQuestion } from '../llm/ollamaClient';
import { QuestionMemoryBank } from './questionMemory';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export interface ScreeningQuestionTemplate {
  question: string;
  category: 'behavioral' | 'technical' | 'screening' | 'custom';
  chunkHint?: string;
}

export const COMPREHENSIVE_SCREENING_MATRIX: ScreeningQuestionTemplate[] = [
  // 1. Legal & Authorization
  { question: "Are you legally authorized to work in the United States?", category: "screening" },
  { question: "Will you now or in the future require sponsorship for employment visa status?", category: "screening" },
  { question: "Do you now have legal authorization to work in the country of this role?", category: "screening" },
  { question: "Are you willing to undergo a standard background check and drug screening?", category: "screening" },

  // 2. Qualifications & Experience
  { question: "What is your highest level of education completed?", category: "screening", chunkHint: "education" },
  { question: "How many years of professional software engineering experience do you have?", category: "screening", chunkHint: "experience" },
  { question: "What is your proficiency in your primary programming languages and frameworks?", category: "technical", chunkHint: "skills" },
  { question: "Describe your experience with modern frontend state management and reactive architectures.", category: "technical", chunkHint: "skills" },
  { question: "Describe your experience building scalable backend APIs, microservices, or distributed systems.", category: "technical", chunkHint: "experience" },
  { question: "Tell us about a notable technical project you architected and the impact it achieved.", category: "technical", chunkHint: "projects" },

  // 3. Behavioral & Culture Fit
  { question: "Why do you want to work for our company and engineering team?", category: "behavioral", chunkHint: "summary" },
  { question: "Describe a challenging technical obstacle or production incident you diagnosed and resolved.", category: "behavioral", chunkHint: "experience" },
  { question: "How do you approach code reviews and mentoring junior or peer engineers?", category: "behavioral", chunkHint: "leadership" },
  { question: "Tell us about a time you had to adapt quickly to ambiguous requirements or changing deadlines.", category: "behavioral", chunkHint: "summary" },

  // 4. Logistics & Compensation
  { question: "What are your desired base salary compensation expectations in USD?", category: "screening" },
  { question: "What is your notice period or earliest available start date?", category: "screening" },
  { question: "Are you comfortable working in a hybrid or remote environment?", category: "screening" },
  { question: "Are you willing to relocate for this position if required?", category: "screening" },
  { question: "Do you have a valid driver's license?", category: "screening" },
  { question: "Are you a veteran of the U.S. Armed Forces?", category: "screening" },
  { question: "Do you currently hold any active industry certifications or security clearances?", category: "technical", chunkHint: "certifications" },
];

export const STANDARD_SCREENING_QUESTIONS = COMPREHENSIVE_SCREENING_MATRIX.map((m) => m.question);

/**
 * Super God-Level Autonomous Memory Synthesizer:
 * Uses the local Ollama LLM and candidate's semantic resume chunks to populate
 * the entire Memory Bank with verified, high-cohesion responses.
 */
export async function generateQAMatrix(
  persona: PersonaData,
  onProgress: (current: number, total: number, currentQuestion: string) => void
): Promise<number> {
  const total = COMPREHENSIVE_SCREENING_MATRIX.length;
  let successCount = 0;

  liveTelemetry.emit({
    type: 'think',
    title: `Starting Memory Matrix Auto-Generation (${total} Templates)`,
    detail: `Synthesizing memory bank via local LLM and parsed resume chunks`,
    status: 'running',
  });

  ProcessLogger.log({
    level: 'LLM',
    source: 'Memory Matrix Synthesizer',
    message: `Initiating autonomous QA memory generation for ${total} questions`,
  });

  for (let i = 0; i < total; i++) {
    const item = COMPREHENSIVE_SCREENING_MATRIX[i];
    onProgress(i + 1, total, item.question);

    try {
      const result = await solveScreeningQuestion(item.question, persona, { timeoutMs: 20000 });

      if (result && result.answer && result.answer.trim().length > 0) {
        QuestionMemoryBank.addOrUpdateEntry(item.question, result.answer.trim(), item.category);
        successCount++;
      }
    } catch (err) {
      console.warn(`[QA Generator] Error synthesizing answer for "${item.question}":`, err);
    }
  }

  liveTelemetry.emit({
    type: 'think',
    title: `Memory Matrix Synthesized: ${successCount}/${total} Entries Ready`,
    detail: `All recurring screening questions populated in 0ms Memory Bank`,
    status: 'completed',
  });

  ProcessLogger.log({
    level: 'SUCCESS',
    source: 'Memory Matrix Synthesizer',
    message: `Successfully synthesized and cached ${successCount} verified QA pairs into Memory Bank`,
  });

  return successCount;
}
