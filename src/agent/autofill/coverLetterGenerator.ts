import type { PersonaData } from '../../types';
import { checkOllamaStatus } from '../llm/ollamaClient';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:0.5b';

export interface CoverLetterOptions {
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  maxWords?: number;
  tone?: string;
}

/**
 * Production-grade Dynamic Cover Letter & Employer Pitch Generator
 * Uses local Qwen-2.5-0.5B to craft personalized applications on the fly.
 */
export async function generateCoverLetter(
  persona: PersonaData,
  options: CoverLetterOptions
): Promise<string> {
  const model = DEFAULT_MODEL;
  const status = await checkOllamaStatus(model);
  const applicantName = persona.fullName || 'Applicant';
  const role = options.jobTitle || 'Software Professional';
  const company = options.companyName || 'your company';
  const tone = options.tone || persona.tone || 'Professional and confident';

  const summary = persona.resumeChunks?.summary || (persona.resumeText ? persona.resumeText.substring(0, 400) : 'Experienced technologist.');
  const skills = (persona.techStack || []).join(', ') || 'Modern system design and development';

  // Fallback heuristic if Ollama is unreachable
  if (!status.online) {
    return `Dear Hiring Manager at ${company},\n\nI am thrilled to submit my application for the ${role} position. With ${persona.experienceYears || 'several'} years of professional experience in high-impact engineering environments, my skill set aligns directly with your technological mission.\n\nMy technical expertise spans ${skills}, where I have consistently architected high-performance systems and led impactful product initiatives. ${summary}\n\nI welcome the opportunity to further discuss how my background and enthusiasm can contribute to ${company}'s ongoing success.\n\nSincerely,\n${applicantName}`;
  }

  const prompt = `System: You are an expert career executive composing a tailored cover letter for a job applicant. Write a clean, highly engaging 3-paragraph cover letter directed to the hiring manager.
Do NOT include boilerplate instructional text or placeholders like [Address] or [Date]. Output ONLY the finished letter.

Applicant Profile:
- Name: ${applicantName}
- Experience: ${persona.experienceYears || 'Several'} years
- Core Tech & Skills: ${skills}
- Summary & Accomplishments: ${summary}
- Target Job: ${role} at ${company}
- Job Description Context: ${options.jobDescription ? options.jobDescription.substring(0, 500) : 'Standard ' + role + ' requirements.'}
- Tone: ${tone}

Cover Letter Output:`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 350,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const output = (data.response || '').trim();
      if (output && output.length > 50) {
        return output.replace(/^["']|["']$/g, '');
      }
    }
  } catch (e) {
    console.warn('[CoverLetterGenerator] Ollama generation timeout or error. Using heuristic fallback:', e);
  }

  return `Dear Hiring Manager at ${company},\n\nI am eager to apply for the ${role} opening. Leveraging ${persona.experienceYears || 5}+ years of hands-on expertise in ${skills}, I am excited by the opportunity to deliver measurable technical excellence to your team.\n\nSincerely,\n${applicantName}`;
}
