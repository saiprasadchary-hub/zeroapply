/**
 * ZeroApply Local LLM - Prompt Builder
 * Generates typed system and user prompts with strict single-token answer guardrails.
 */

import type { PersonaData } from '../../types';
import { analyzeErrorConstraint } from './errorConstraintAnalyzer';

export interface PromptInput {
  question: string;
  persona: PersonaData;
  options?: string[];
  inputType?: string;
  resumeContext?: string;
  validationError?: string;
  jobContext?: {
    jobTitle?: string;
    companyName?: string;
    skillsRequired?: string[];
    jobSummary?: string;
  };
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildQuestionPrompt(input: PromptInput): BuiltPrompt {
  const { question, persona, options, inputType, resumeContext, validationError, jobContext } = input;

  const candidateName = persona.fullName || 'Candidate';
  const systemPrompt = `You are the job applicant yourself: an ambitious, dedicated university student and software engineer actively applying for this job. The resume, educational background, skills, and projects provided are YOUR OWN personal achievements and background.

CORE IDENTITY & MINDSET:
1. Speak directly in the FIRST PERSON ("I", "my", "me"). You are answering the hiring manager or recruiter directly on the application form. Never refer to yourself in the third person (never say "the candidate", "he", "she", or "${candidateName}").
2. You are a tech-driven student / recent graduate and software developer skilled in building real software and AI workflows.
3. Identity Precision (Crucial):
   - Your personal full name is ONLY your applicant name (${candidateName}).
   - You are applying as an individual student / independent engineer.
   - If asked for an entity or company name:
     * If conditional ("If a company, write company name...", "Company name that will license code", "Company (if any)"): answer "N/A" because you are an individual student/independent applicant.
     * NEVER confuse your personal full name with a company, employer, school, or organization name!
     * If asked for your current/most recent employer, answer with your past company/internship from your resume or "N/A".
   - If asked for your school/university, answer with your university from your education details.

APPLICATION RULES & FORMATTING:
1. Provide ONLY the direct, concise answer needed for the form field.
2. If given a list of options (radios or dropdown):
   - Respond with EXACTLY one matching option from the list.
   - If options distinguish entity type (e.g. "Independent software engineer / consultant", "Student", "Other"), select the option that best represents you as an individual student/independent applicant.
3. If numeric (years of experience, graduation year, salary, hours): output ONLY the number or digits (e.g. '2', '25', '2025').
4. If binary Yes/No:
   - Answer "Yes" for: interest in the role, licensing code for payments, AI training participation, legal work authorization, comfortable working remotely, and skills mentioned in your tech stack.
   - Answer "No" for: requiring visa sponsorship, criminal history, or paid upsells.
5. If the field is a TEXTAREA or open-ended essay (e.g. 'Tell us about yourself', 'Why are you a good fit?', 'Cover letter', 'Project experience'):
   - Write an energetic, confident, articulate first-person response (2-4 clear sentences, ~60-120 words).
   - Draw directly upon your real projects, skills, education, and measurable achievements.
   - NEVER output raw resume section headers ('PROJECTS:', 'EXPERIENCE:'), markdown bullets ('•', '-'), or conversational preambles ('Here is my response:').
6. If the question is for a search/query input (e.g. 'Describe the job you want', 'Job Title Search'): output ONLY 2-4 concise keywords such as 'Python AI Software Engineer'.
7. If an ACTIVE VALIDATION ERROR is present: strictly satisfy the SYSTEM CORRECTION GUIDANCE without conversational filler.`;

  const parts: string[] = [
    `MY PROFILE & RESUME (I am the Applicant):`,
    `- My Full Name: ${persona.fullName || 'Candidate'}`,
    `- My Email: ${persona.email || ''}`,
    `- My Location: ${persona.location || 'Hyderabad, Telangana, India'}`,
    `- My Current Status: University Student & Software Engineer / Independent Developer`,
    `- My Work Preference: ${persona.workPreference || 'Remote'}`,
    `- My Experience: ${persona.experienceYears || 0} years`,
    `- My Expected Minimum Compensation: ${persona.minSalary || 0}`,
    `- My Core Tech Stack: ${(persona.techStack || []).join(', ')}`,
    `- My Target Roles: ${(persona.targetRoles || []).join(', ')}`,
  ];

  if (persona.education) {
    parts.push(`- My Education & University: ${persona.education}`);
  }
  if (persona.experienceSummary || persona.resumeChunks?.summary) {
    parts.push(`- My Profile Summary: ${persona.experienceSummary || persona.resumeChunks?.summary}`);
  }
  if (persona.resumeChunks?.experience) {
    parts.push(`- My Professional & Internship Experience: ${persona.resumeChunks.experience}`);
  }
  if (persona.resumeChunks?.skills) {
    parts.push(`- My Technical Skills: ${persona.resumeChunks.skills}`);
  }
  if (persona.resumeChunks?.projects) {
    parts.push(`- My Projects & Code Repositories: ${persona.resumeChunks.projects}`);
  }

  if (jobContext && (jobContext.jobTitle || jobContext.companyName)) {
    parts.push(
      `\nJOB I AM APPLYING FOR:`,
      jobContext.jobTitle ? `- Position: ${jobContext.jobTitle}` : '',
      jobContext.companyName ? `- Company: ${jobContext.companyName}` : '',
      jobContext.skillsRequired?.length ? `- Desired Skills: ${jobContext.skillsRequired.slice(0, 8).join(', ')}` : '',
      jobContext.jobSummary ? `- Job Overview: ${jobContext.jobSummary}` : ''
    );
  }

  if (validationError && validationError.trim()) {
    const analysis = analyzeErrorConstraint(validationError);
    parts.push(
      `\nACTIVE VALIDATION ERROR ON THIS FIELD:`,
      `"⛔ ${analysis.rawError}"`,
      `SYSTEM CORRECTION GUIDANCE:`,
      `${analysis.guidance}`
    );
  }

  if (resumeContext && resumeContext.trim()) {
    parts.push(`\nRELEVANT RESUME EXCERPTS FROM MY BACKGROUND:\n${resumeContext.trim()}`);
  }

  if (options && options.length > 0) {
    parts.push(`\nALLOWED OPTIONS (Pick exactly one matching you as the applicant):\n${options.map((o) => `• ${o}`).join('\n')}`);
  }

  if (inputType) {
    parts.push(`\nFIELD INPUT TYPE: ${inputType}`);
  }

  parts.push(`\nQUESTION ON APPLICATION FORM:\n"${question}"\n\nYOUR DIRECT ANSWER AS THE APPLICANT:`);

  return {
    systemPrompt,
    userPrompt: parts.join('\n'),
  };
}
