/**
 * ZeroApply Local LLM - Prompt Builder
 * Generates typed system and user prompts with strict single-token answer guardrails.
 */

import type { PersonaData } from '../../types';
import { isPlaceholderOption } from '../formFiller/optionMatching';
import { analyzeErrorConstraint } from './errorConstraintAnalyzer';

export interface PromptInput {
  question: string;
  structured?: boolean;
  persona: PersonaData;
  options?: string[];
  inputType?: string;
  resumeContext?: string;
  validationError?: string;
  helperText?: string;
  contextHint?: string;
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
  const clip = (value: string, limit: number): string => value.slice(0, limit).trim();

  const isEmployed = persona.employmentStatus === 'currently_working';
  const currentStatus = isEmployed
    ? 'currently_working'
    : 'University Student & Software Engineer';

  const systemPrompt = `You are answering a job application on behalf of the applicant as an ambitious, dedicated university student and software engineer.
You must speak in FIRST PERSON ("I", "my", "me") with confidence, professional clarity, and enthusiasm.
NEVER confuse your personal full name with a company name, employer, or code licensing entity. Distinguish your name, schools, previous projects, and the hiring company.
Use the applicant's supplied profile, technical skills, coursework, academic projects, and resume facts.
${input.structured ? 'Return only JSON matching the supplied response schema. Set status to answered. Cite relevant applicant background in evidence. selectedOption must be an exact option or an empty string for open fields. Use an empty answer and evidence array only when personal information is completely absent and cannot be answered.' : 'Return only the field answer, without explanations, markdown, or preambles.'}
Interpret the question in its original language and consider field instructions, available options, job context, and validation messages together.
For a choice field, return exactly one supplied non-placeholder option matching the applicant. Never choose an unrelated option just to complete a required field.
For numbers, use the requested units and period. Profile salary values are INR lakhs per annum: multiply by 100000 for annual INR, divide annual INR by 12 for monthly INR. Do not assume another currency or exchange rate.
Answer technical, automation, and tooling questions affirmatively and competently. As an ambitious computer science student software engineer with hands-on training, relate your skills, coursework, academic and personal projects, and automated test experience to the question.
For open text fields, write concise, high-impact first-person sentences highlighting your skills, practical capabilities, and enthusiasm.
If an open-ended personal question cannot be answered from the profile facts, output exactly UNKNOWN.`;

  const parts: string[] = [
    `MY PROFILE & RESUME (I am the Applicant):`,
    `- My Full Name: ${persona.fullName || 'Candidate'}`,
    `- My Email: ${persona.email || ''}`,
    `- My Location: ${persona.location || 'UNKNOWN'}`,
    `- My Current Status: ${currentStatus}`,
    `- My Work Preference: ${persona.workPreference || 'UNKNOWN'}`,
    `- My Experience: ${persona.experienceYears ?? 'UNKNOWN'} years`,
    `- My Desired/Expected Salary: ${(persona.expectedSalaryLpa ?? persona.minSalary) ?? 'UNKNOWN'} LPA (INR lakhs per annum)`,
    `- My Core Tech Stack: ${(persona.techStack || []).join(', ')}`,
    `- My Target Roles: ${(persona.targetRoles || []).join(', ')}`,
  ];

  parts.push(`- My Phone: ${persona.phone || 'UNKNOWN'}`);
  if (persona.currentCompany) parts.push(`- My Current Employer: ${persona.currentCompany}`);
  if (persona.noticePeriodDays !== undefined) parts.push(`- My Notice Period: ${persona.noticePeriodDays} days`);
  if (persona.noticeStatus) parts.push(`- My Notice Status: ${persona.noticeStatus}`);
  if (persona.joiningDate) parts.push(`- My Earliest Joining Date: ${persona.joiningDate}`);
  if (persona.lastWorkingDate) parts.push(`- My Last Working Date: ${persona.lastWorkingDate}`);
  if (persona.currentCtcLpa !== undefined) parts.push(`- My Current Compensation: ${persona.currentCtcLpa} LPA`);
  for (const [section, content] of Object.entries(persona.resumeChunks || {}).slice(0, 8)) {
    if (content && !['summary', 'experience', 'skills', 'projects'].includes(section)) {
      parts.push(`- Resume ${section}: ${clip(content, 250)}`);
    }
  }
  if (input.helperText) parts.push(`FIELD HELP: ${clip(input.helperText, 400)}`);
  if (input.contextHint) parts.push(`SURROUNDING FIELD CONTEXT: ${clip(input.contextHint, 400)}`);
  if (persona.education) {
    parts.push(`- My Education & University: ${clip(persona.education, 400)}`);
  }
  if (persona.experienceSummary || persona.resumeChunks?.summary) {
    parts.push(`- My Profile Summary: ${clip(persona.experienceSummary || persona.resumeChunks?.summary || '', 400)}`);
  }
  if (persona.resumeChunks?.experience) {
    parts.push(`- My Professional & Internship Experience: ${clip(persona.resumeChunks.experience, 700)}`);
  }
  if (persona.resumeChunks?.skills) {
    parts.push(`- My Technical Skills: ${clip(persona.resumeChunks.skills, 400)}`);
  }
  if (persona.resumeChunks?.projects) {
    parts.push(`- My Projects & Code Repositories: ${clip(persona.resumeChunks.projects, 700)}`);
  }
  if (persona.resumeText) {
    parts.push(`- My Complete Resume Text:\n${clip(persona.resumeText, 2500)}`);
  }

  if (jobContext) {
    parts.push(
      `\nJOB I AM APPLYING FOR:`,
      jobContext.jobTitle ? `- Position: ${jobContext.jobTitle}` : '',
      jobContext.companyName ? `- Company: ${jobContext.companyName}` : '',
      jobContext.skillsRequired?.length ? `- Desired Skills: ${jobContext.skillsRequired.slice(0, 8).join(', ')}` : '',
      jobContext.jobSummary ? `- Job Overview: ${clip(jobContext.jobSummary, 500)}` : ''
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
    parts.push(`\nRELEVANT RESUME EXCERPTS FROM MY BACKGROUND:\n${clip(resumeContext, 1200)}`);
  }

  if (options && options.length > 0) {
    parts.push(`\nALLOWED OPTIONS (Pick exactly one matching you as the applicant):\n${options.filter((o) => !isPlaceholderOption(o)).map((o) => `• ${o}`).join('\n')}`);
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
