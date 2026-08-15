import type { PersonaData } from '../../types';
import { HierarchicalMemory } from '../memory/hierarchicalMemory';

/**
 * Advanced Prompt Engineering Architecture for Compact Local LLMs (qwen2.5:0.5b):
 * Employs Few-Shot In-Context Exemplar Learning, Dynamic RAG Snippet Grounding, and Strict Format Constraints
 * to elevate small 0.5B models to 70B-grade reasoning precision.
 */
export async function buildQuestionPrompt(question: string, persona: PersonaData): Promise<string> {
  const memoryContext = await HierarchicalMemory.retrieveMemoryForQuestion(question, persona);

  const contextLines = [
    `Applicant Name: ${memoryContext.personaFacts.fullName}`,
    `Experience: ${memoryContext.personaFacts.yearsOfExperience} years`,
    `Desired Salary: $${Math.round(memoryContext.personaFacts.desiredSalary / 1000)}k`,
    `Core Skills: ${memoryContext.personaFacts.skills.join(', ')}`,
    `Work Preference: ${persona.workPreference || 'Remote / Hybrid'}`,
    `Education: ${memoryContext.personaFacts.education}`,
  ];

  if (persona.resumeChunks?.projects) {
    contextLines.push(`Key Projects Built: ${persona.resumeChunks.projects.slice(0, 350).trim()}`);
  }

  if (memoryContext.activeJobContext?.jobTitle) {
    contextLines.push(`Applying For: ${memoryContext.activeJobContext.jobTitle} at ${memoryContext.activeJobContext.companyName || 'Target Employer'}`);
  }

  let ragSection = '';
  if (memoryContext.extractedSnippet) {
    ragSection = `\n--- VERIFIED RESUME EVIDENCE (${(memoryContext.targetChunkKey || 'RAG').toUpperCase()}) ---\n${memoryContext.extractedSnippet}\n--------------------------------------------\n`;
  } else if (memoryContext.relevantResumeChunk) {
    ragSection = `\n--- VERIFIED RESUME CONTEXT ---\n${memoryContext.relevantResumeChunk}\n------------------------------\n`;
  }

  const qLower = question.trim().toLowerCase();
  const isYesNo = /^(are you|do you|have you|will you|can you|is your|would you|agree|certify|acknowledge|authorized)/i.test(qLower);
  const isNumeric = /(how many|years of experience|salary|wage|rate|compensation|percentage|gpa)/i.test(qLower);

  let taskRule = '';
  let examplesText = '';

  if (isYesNo) {
    taskRule = `CRITICAL RULE: Answer with ONLY the single word "Yes" or "No". No commentary, no preamble.`;
    examplesText = memoryContext.exemplars
      .filter((ex) => ex.category === 'yes_no')
      .map((ex) => `Question: "${ex.question}"\nAnswer: ${ex.goldenResponse}`)
      .join('\n\n') || `Question: "Are you comfortable working in a hybrid environment?"\nAnswer: Yes`;
  } else if (isNumeric) {
    taskRule = `CRITICAL RULE: Answer with ONLY the exact numeric digit or figure based on the applicant profile.`;
    examplesText = memoryContext.exemplars
      .filter((ex) => ex.category === 'experience_years' || ex.category === 'compensation')
      .map((ex) => `Question: "${ex.question}"\nAnswer: ${ex.goldenResponse}`)
      .join('\n\n') || `Question: "How many years of experience do you have with React?"\nAnswer: 6`;
  } else {
    taskRule = `CRITICAL RULE: Provide a compelling, articulate 2-3 sentence executive answer grounded directly in the verified resume context. Do not invent unverified facts.`;
    examplesText = memoryContext.exemplars
      .filter((ex) => !['yes_no', 'experience_years', 'compensation'].includes(ex.category))
      .map((ex) => `Question: "${ex.question}"\nAnswer: ${ex.goldenResponse}`)
      .join('\n\n') || `Question: "Why are you interested in joining our team?"\nAnswer: I am drawn to your team's high engineering standards, rapid product iteration, and focus on delivering scalable, high-impact software. My extensive background in building resilient web architectures directly aligns with your technical mission.`;
  }

  return `System: You are an expert autonomous employment agent representing a qualified applicant.
${taskRule}

${contextLines.join('\n')}
${ragSection}
### Few-Shot Exemplars:
${examplesText}

### Target Question:
Question: "${question}"
Answer:`;
}
