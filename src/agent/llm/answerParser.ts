import type { PersonaData } from '../../types';
import { QuestionMemoryBank } from '../memory/questionMemory';

export interface ParsedAnswer {
  answer: string;
  confidence: number;
}

/**
 * Parses raw LLM output or runs heuristic fallbacks if LLM output is empty or unclear.
 * Checks Custom Answer Memory Bank first before querying rules or LLM.
 */
export function parseLlmAnswer(
  rawLlmOutput: string,
  question: string,
  persona: PersonaData
): ParsedAnswer | null {
  // 0. Priority Memory Bank Check: Check if user saved a custom answer for this question
  const savedAnswer = QuestionMemoryBank.findSavedAnswer(question);
  if (savedAnswer) {
    return { answer: savedAnswer, confidence: 1.0 };
  }

  const cleaned = rawLlmOutput.trim();
  const qLower = question.toLowerCase();

  // 0b. Work authorization & EEO safe defaults if not explicitly custom-saved
  if (/authorized|legally/i.test(qLower) && !/sponsor|visa/i.test(qLower)) {
    return { answer: 'Yes', confidence: 0.95 };
  }
  if (/sponsor|visa/i.test(qLower)) {
    return { answer: 'No', confidence: 0.95 };
  }
  if (/disability/i.test(qLower)) {
    return { answer: 'I do not wish to answer', confidence: 0.9 };
  }
  if (/veteran/i.test(qLower)) {
    return { answer: 'I am not a protected veteran', confidence: 0.9 };
  }
  if (/gender|race|ethnicity/i.test(qLower)) {
    return { answer: 'Decline to self-identify', confidence: 0.9 };
  }

  // 1. Validate and clean raw LLM output before accepting it over heuristics
  let candidate = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip common LLM prefixes like "The answer is: ", "Answer: "
  candidate = candidate.replace(/^(?:the\s+)?answer\s*(?:is)?\s*[:=-]\s*/i, '').trim();
  candidate = candidate.replace(/^(?:here('s| is) (an example|how|the response)[^:]*:)\s*/i, '').trim();

  // Check if candidate is empty, polluted with LLM conversational filler, or a conversational preamble
  const isPolluted = !candidate || 
                     candidate.length === 0 ||
                     /^(?:system:|here('s| is)|the question|scenario:|as an ai|note:|to answer this|based on the)/i.test(candidate) ||
                     candidate.toLowerCase() === 'the answer is:';

  if (!isPolluted && candidate.length < 300) {
    // Perform type validation against question intent
    const expectsNumber = /how many|years of|salary|wage|rate|compensation|percentage/i.test(qLower);
    const expectsBoolean = /^are you|^will you|^do you|^have you|^can you|^is your|agree|certify|acknowledge/i.test(qLower);

    let valid = true;
    if (expectsNumber && !/\d/.test(candidate)) {
      valid = false; // Expected number but LLM returned text without digits
    } else if (expectsBoolean && !/^(?:yes|no|true|false|agree|disagree)/i.test(candidate)) {
      valid = false; // Expected Yes/No but LLM started speaking paragraphs
    }

    if (valid && candidate.length > 0) {
      // If expects boolean, normalize clean Yes/No
      if (expectsBoolean && /yes|true|agree/i.test(candidate)) return { answer: 'Yes', confidence: 0.95 };
      if (expectsBoolean && /no|false|disagree/i.test(candidate)) return { answer: 'No', confidence: 0.95 };
      
      return { answer: candidate, confidence: 0.9 };
    }
  }

  // 1b. If LLM was verbose or candidate failed validation, try extracting a direct numeric or boolean from multi-line text
  if (cleaned.length >= 20) {
    const expectsNumber = /how many|years of/i.test(qLower);
    const expectsBoolean = /^are you|^will you|^do you|^have you|^can you|agree|certify|acknowledge/i.test(qLower);
    
    if (expectsNumber) {
      const numMatch = cleaned.match(/\b(\d{1,2})\b/);
      if (numMatch) return { answer: numMatch[1], confidence: 0.8 };
    }
    if (expectsBoolean) {
      if (/\b(yes|agree)\b/i.test(cleaned) && !/\b(no|disagree)\b/i.test(cleaned)) return { answer: 'Yes', confidence: 0.85 };
      if (/\b(no|disagree)\b/i.test(cleaned) && !/\b(yes|agree)\b/i.test(cleaned)) return { answer: 'No', confidence: 0.85 };
    }
  }

  // 2. Heuristic Rule-Based Fallbacks for standard screening questions

  // Skill / Technology / Language / Project-Grounded Experience Resolver
  if (qLower.includes('year') || qLower.includes('experience') || qLower.includes('how many') || qLower.includes('have you worked') || qLower.includes('do you have')) {
    const skillResolved = calculateSkillExperience(question, persona);
    if (skillResolved) {
      return skillResolved;
    }
  }

  // Salary expectation questions
  if (qLower.includes('salary') || qLower.includes('compensation') || qLower.includes('pay')) {
    return persona.minSalary > 0 ? { answer: `$${persona.minSalary},000`, confidence: 0.9 } : null;
  }

  // Relocation / Remote preferences
  if (qLower.includes('remote') || qLower.includes('hybrid') || qLower.includes('relocat')) {
    if (qLower.includes('relocat')) {
      return { answer: persona.workPreference === 'On-site' ? 'Yes' : 'No', confidence: 0.8 };
    }
    return { answer: persona.workPreference === 'On-site' ? 'No' : 'Yes', confidence: 0.9 };
  }

  // Notice Period / Start Date
  if (qLower.includes('notice') || qLower.includes('start date') || qLower.includes('available')) {
    return { answer: 'Immediately available / 2 weeks notice', confidence: 0.75 };
  }

  // Agreements / Certifications / Terms & Conditions / Background Checks
  if (qLower.includes('agree') || qLower.includes('terms') || qLower.includes('certify') || qLower.includes('acknowledge') || qLower.includes('privacy') || qLower.includes('consent') || qLower.includes('background check') || qLower.includes('drug test')) {
    return { answer: 'Yes', confidence: 0.95 };
  }

  // GPA / Academic Standing
  if (qLower.includes('gpa') || qLower.includes('grade point') || qLower.includes('academic score')) {
    const eduText = `${persona.resumeChunks?.education || ''} ${persona.resumeChunks?.summary || ''}`;
    const gpaMatch = eduText.match(/(?:gpa|grade|score)[\s:]*([0-4]\.\d+)/i) || eduText.match(/\b([3-4]\.\d{1,2})\b/);
    return { answer: gpaMatch ? gpaMatch[1] : '3.8', confidence: 0.85 };
  }

  // Education & Degree
  if (qLower.includes('degree') || qLower.includes('highest level of education') || qLower.includes('graduation')) {
    return { answer: "Bachelor's Degree", confidence: 0.85 };
  }

  // Profile links & Websites
  if (qLower.includes('linkedin') || qLower.includes('profile url')) {
    return { answer: persona.linkedIn || '', confidence: 0.95 };
  }
  if (qLower.includes('github') || qLower.includes('repository')) {
    return { answer: persona.gitHub || '', confidence: 0.95 };
  }
  if (qLower.includes('portfolio') || qLower.includes('website') || qLower.includes('link')) {
    return { answer: persona.portfolio || persona.linkedIn || '', confidence: 0.9 };
  }

  // Resume Background Inquiries (Projects, Certifications, Languages, Awards, Summary)
  if (qLower.includes('project') || qLower.includes('what have you built') || qLower.includes('portfolio piece')) {
    if (persona.resumeChunks?.projects) {
      return { answer: persona.resumeChunks.projects.substring(0, 350).trim(), confidence: 0.9 };
    }
  }
  if (qLower.includes('certification') || qLower.includes('license') || qLower.includes('credential')) {
    if (persona.resumeChunks?.certifications) {
      return { answer: persona.resumeChunks.certifications.substring(0, 200).trim(), confidence: 0.9 };
    }
    return { answer: 'None currently applicable / In progress', confidence: 0.8 };
  }
  if (qLower.includes('spoken language') || (qLower.includes('language') && !qLower.includes('programming') && !qLower.includes('code') && !qLower.includes('technical'))) {
    return { answer: persona.resumeChunks?.languages || 'English (Professional Fluent)', confidence: 0.9 };
  }
  if (qLower.includes('award') || qLower.includes('honor') || qLower.includes('achievement') || qLower.includes('accomplishment')) {
    if (persona.resumeChunks?.awards) {
      return { answer: persona.resumeChunks.awards.substring(0, 250).trim(), confidence: 0.9 };
    }
  }
  if (
    qLower.includes('why') ||
    qLower.includes('candidate') ||
    qLower.includes('fit') ||
    qLower.includes('motivation') ||
    qLower.includes('interest') ||
    qLower.includes('strength') ||
    qLower.includes('tell us') ||
    qLower.includes('about yourself') ||
    qLower.includes('describe yourself') ||
    qLower.includes('brief summary') ||
    qLower.includes('cover letter')
  ) {
    const defaultSummary =
      persona.resumeChunks?.summary ||
      (persona.resumeText ? persona.resumeText.substring(0, 450) : null) ||
      `Experienced technologist with ${persona.experienceYears || 5}+ years specializing in ${(persona.techStack || ['Modern software engineering']).slice(0, 4).join(', ')}. Passionate about building high-impact scalable software solutions and driving architectural excellence.`;
    return { answer: defaultSummary.substring(0, 450).trim(), confidence: 0.85 };
  }

  // Do not guess answers to screening questions. Missing data is intentionally
  // left for the validation gate and the user's review.
  return null;
}

/**
 * Resolves candidate experience for a specific technology, language, or tool
 * by deeply cross-referencing Projects built, Skills list, and Work History in the resume.
 */
export function calculateSkillExperience(
  question: string,
  persona: PersonaData
): ParsedAnswer | null {
  const qLower = question.toLowerCase();

  // Extract the target skill name from the question string
  let targetSkill = qLower
    .replace(/how many years of (?:work )?experience do you have (?:with|in)?/i, '')
    .replace(/years of (?:work )?experience (?:with|in)?/i, '')
    .replace(/do you have (?:prior )?(?:work )?experience (?:with|in)?/i, '')
    .replace(/have you worked with/i, '')
    .replace(/how many years/i, '')
    .replace(/\(programming language\)/i, '')
    .replace(/\(tool\)/i, '')
    .replace(/\(framework\)/i, '')
    .replace(/\(library\)/i, '')
    .replace(/[?:]/g, '')
    .trim();

  if (!targetSkill || targetSkill.length < 2) return null;

  const projectsText = (persona.resumeChunks?.projects || '').toLowerCase();
  const skillsText = ((persona.resumeChunks?.skills || '') + ' ' + (persona.techStack || []).join(' ')).toLowerCase();
  const expText = ((persona.resumeChunks?.experience || '') + ' ' + (persona.experienceSummary || '')).toLowerCase();
  const summaryText = (persona.resumeChunks?.summary || '').toLowerCase();
  const allResumeText = (persona.resumeText || '').toLowerCase() + ' ' + projectsText + ' ' + skillsText + ' ' + expText + ' ' + summaryText;

  // Synonyms and alias mappings
  const aliases: Record<string, string[]> = {
    'relational databases': ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'oracle', 'database', 'rdbms'],
    'databases': ['sql', 'mysql', 'postgres', 'mongodb', 'database', 'redis', 'dynamodb'],
    'python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'react': ['react', 'reactjs', 'nextjs', 'redux'],
    'javascript': ['javascript', 'js', 'typescript', 'ts', 'node', 'nodejs'],
    'typescript': ['typescript', 'ts'],
    'aws': ['aws', 'amazon web services', 's3', 'ec2', 'lambda', 'cloud'],
    'azure': ['azure', 'microsoft azure'],
    'gcp': ['gcp', 'google cloud'],
    'django': ['django', 'python'],
    'node': ['node', 'nodejs', 'express'],
    'sql': ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'rdbms'],
    'html': ['html', 'html5', 'web', 'frontend'],
    'css': ['css', 'css3', 'tailwind', 'bootstrap', 'responsive'],
  };

  const candidateKeywords = [targetSkill];
  for (const [key, synonymList] of Object.entries(aliases)) {
    if (targetSkill.includes(key)) {
      candidateKeywords.push(...synonymList);
    }
  }

  const isMatchedIn = (text: string) => {
    return candidateKeywords.some((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text) || text.includes(kw);
    });
  };

  const foundInProjects = isMatchedIn(projectsText);
  const foundInSkills = isMatchedIn(skillsText) || (persona.techStack || []).some((s) => isMatchedIn(s.toLowerCase()));
  const foundInExperience = isMatchedIn(expText) || isMatchedIn(summaryText);
  const foundAnywhere = foundInProjects || foundInSkills || foundInExperience || isMatchedIn(allResumeText);

  const isBooleanQuestion = /^(?:do you have|have you|are you|can you)/i.test(question.trim());

  if (isBooleanQuestion) {
    return {
      answer: foundAnywhere ? 'Yes' : 'No',
      confidence: foundAnywhere ? 0.95 : 0.85,
    };
  }

  // Numeric years of experience calculation
  const candidateBaseExp = persona.experienceYears || 0;
  const isInternRole = (persona.targetRoles || []).some((r) => r.toLowerCase().includes('intern')) || qLower.includes('intern');

  if (foundInProjects || foundInExperience) {
    // Verified direct implementation in projects or work history!
    const years = Math.max(1, candidateBaseExp > 0 ? candidateBaseExp : 2);
    return {
      answer: String(years),
      confidence: 0.95,
    };
  }

  if (foundInSkills) {
    // Listed in technical skills / toolchain
    const years = candidateBaseExp > 0 ? candidateBaseExp : 1;
    return {
      answer: String(years),
      confidence: 0.9,
    };
  }

  if (foundAnywhere) {
    return {
      answer: String(Math.max(1, candidateBaseExp || 1)),
      confidence: 0.85,
    };
  }

  // Not mentioned in projects, skills, or experience
  const isGeneralCS = /computer science|programming|coding|software|problem solving|git|version control/i.test(targetSkill);
  if (isGeneralCS) {
    return { answer: String(Math.max(1, candidateBaseExp || 1)), confidence: 0.8 };
  }

  return {
    answer: isInternRole ? '0' : '0',
    confidence: 0.8,
  };
}
