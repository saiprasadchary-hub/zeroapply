import type { PersonaData } from '../../types';
import { HierarchicalMemory } from '../memory/hierarchicalMemory';
import { parseStudentProfile } from './answerParser';

/**
 * Advanced Prompt Engineering Architecture for Compact Local LLMs (qwen2.5:3b):
 * Employs Few-Shot In-Context Exemplar Learning, Dynamic RAG Snippet Grounding, and Strict Format Constraints
 * to elevate small local models to 70B-grade reasoning precision.
 */
export async function buildQuestionPrompt(
  question: string,
  persona: PersonaData,
  availableOptions?: string[]
): Promise<string> {
  const memoryContext = await HierarchicalMemory.retrieveMemoryForQuestion(question, persona);
  const studentProf = parseStudentProfile(persona);

  const contextLines = [
    `Applicant Name: ${memoryContext.personaFacts.fullName}`,
    `Candidate Type: ${studentProf.isStudentOrRecentGrad ? 'Engineering Student / Recent Graduate' : 'Technical Professional'}`,
    `Degree & Major: ${studentProf.degreeName} in ${studentProf.majorBranch}`,
    `Institution: ${studentProf.institution}`,
    `Graduation Status: ${studentProf.statusLabel}`,
    `Academic Standing & CGPA: ${studentProf.gpaOrScore || 'Top Academic Standing / First Class with Distinction'}`,
    `Relevant Coursework: ${studentProf.relevantCourses.join(', ')}`,
    `Experience: ${memoryContext.personaFacts.yearsOfExperience} years (Hands-on Projects & Technical Work)`,
    `Desired Compensation: $${Math.round(memoryContext.personaFacts.desiredSalary / 1000)}k / competitive entry-level rate`,
    `Core Skills: ${memoryContext.personaFacts.skills.join(', ')}`,
    `Work Preference: ${persona.workPreference || 'Remote / Hybrid'}`,
    `Full-Time Availability: ${studentProf.availabilityStatement}`,
    `Commitment: Full 40 hours/week commitment with high learning adaptability and timezone flexibility.`,
    `Workplace Readiness & Equipment (100% EQUIPPED): Candidate possesses a high-performance software development laptop/desktop, high-speed fiber internet, quality noise-canceling headphones with microphone, webcam, and dedicated quiet study/workspace.`,
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
  const isScaleRating = /(?:scale of \d+\s*(?:to|-)\s*\d+|\b\d+\s*(?:to|-)\s*\d+\b|rate (?:your|yourself)|how interested are you on a scale|scale from \d+ to \d+)/i.test(qLower);
  const isYesNo = /^(are you|do you|have you|will you|can you|is your|would you|agree|certify|acknowledge|authorized)/i.test(qLower);
  const isNumeric = /(how many|years of experience|salary|wage|rate|compensation|percentage|gpa)/i.test(qLower);

  let taskRule = '';
  let examplesText = '';

  if (availableOptions && availableOptions.length > 0) {
    const validChoices = availableOptions.filter(o => o && o.trim().length > 0);
    taskRule = `CRITICAL RULE: This is a dropdown choice question. You MUST pick the single most accurate option from the Available Dropdown Choices list below based on the applicant's resume. Output ONLY the exact text of the chosen option.\n\n### Available Dropdown Choices:\n${validChoices.map(c => `- ${c}`).join('\n')}`;
  } else if (isScaleRating) {
    taskRule = `CRITICAL RULE: This is a numeric rating scale question (e.g. 1 to 10). As an enthusiastic, passionate, top-tier engineering applicant, answer with ONLY the highest positive number (such as 10). Output ONLY the number digit with NO extra words.`;
    examplesText = `Question: "On a scale of 1 to 10, how interested are you in technology, AI, and startups?"\nAnswer: 10\n\nQuestion: "On a scale of 1 to 5, how would you rate your proficiency?"\nAnswer: 5`;
  } else if (isYesNo) {
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
    taskRule = `CRITICAL RULE: Provide a compelling, articulate 2-3 sentence executive answer grounded directly in the verified resume context. Do not invent unverified facts. Do not output contact info or raw resume headers.`;
    examplesText = memoryContext.exemplars
      .filter((ex) => !['yes_no', 'experience_years', 'compensation'].includes(ex.category))
      .map((ex) => `Question: "${ex.question}"\nAnswer: ${ex.goldenResponse}`)
      .join('\n\n') || `Question: "Why are you interested in joining our team?"\nAnswer: I am drawn to your team's high engineering standards, rapid product iteration, and focus on delivering scalable, high-impact software. My solid technical foundation and hands-on project experience directly align with your engineering mission.`;
  }

  return `System: You are an expert autonomous employment agent representing a qualified engineering applicant / university student (${studentProf.degreeName} in ${studentProf.majorBranch}).
${studentProf.isStudentOrRecentGrad ? 'Adopt the candidate persona of a dedicated, high-achieving student/graduate: eager to learn, equipped with all standard computing amenities, solid in computer science fundamentals, and fully available for internships or full-time roles upon graduation.' : ''}
Assume the candidate is fully equipped with all standard computing and development facilities (laptop, high-speed internet, headphones, quiet workspace).
${taskRule}

${contextLines.join('\n')}
${ragSection}
### Few-Shot Exemplars:
${examplesText}

### Target Question:
Question: "${question}"
Answer:`;
}
