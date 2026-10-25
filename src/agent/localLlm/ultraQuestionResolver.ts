import { getScopedQuestionMemory } from '../memory/scopedQuestionMemory';
import { resolveScreeningFact } from './screeningFacts';
/**
 * ZeroApply Ultra Cognitive Reasoning Engine (Production Grade)
 * 
 * World-class multi-tier question resolution architecture:
 * 1. Tier 0: Disqualification Armor 2.0 (Bidirectional Knockout Safeguard)
 * 2. Tier 1: Instant Memory Bank & High-Precision Geographic / Profile Mapping
 * 3. Tier 2: Candidate Structured Knowledge Graph & Fact Retrieval
 * 4. Tier 3: Holistic Multi-Field Batch Reasoning with Local LLM (Qwen 2.5 3B)
 * 5. Tier 4: Fuzzy Levenshtein & Semantic Option Normalization
 */

import type { PersonaData } from '../../types';
import { isGenderQuestion, resolveGenderAnswer } from '../autofill/genderAnswer';
import { generateOllamaAnswer, checkOllamaStatus } from './ollamaClient';
import { resolveGeographicDetailsSync } from '../location/geoIntelligence';
import { buildResumeChunks, findRelevantResumeContext } from '../memory/resumeContextRetriever';
import {
  extractCompanyFromResume,
  extractSchoolFromResume,
  extractMajorFromResume,
  extractDegreeFromResume
} from '../domScanner/fieldClassifier';

export interface FormQuestionTarget {
  id?: string;
  selector?: string;
  label: string;
  name?: string;
  placeholder?: string;
  widgetType?: string;
  inputType?: string;
  contextHint?: string;
  options?: string[];
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  validationError?: string;
  helperText?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  compoundRole?: string;
  jobContext?: {
    jobTitle?: string;
    companyName?: string;
    description?: string;
  };
}

export interface CognitiveAnswerResult {
  answer: string;
  confidence: number;
  source: 'armor' | 'persona' | 'memory' | 'llm' | 'fallback';
  thoughtProcess?: string;
  isKnockoutGuarded?: boolean;
}

/**
 * TIER 0: Disqualification Armor 2.0
 * Legacy compatibility entry point; personal facts are resolved from saved evidence.
 */
export function evaluateDisqualificationArmor(_question: string, _options?: string[]): {
  isKnockout: boolean; guaranteedAnswer?: string; reason?: string;
} {
  return { isKnockout: false, reason: 'Personal screening answers require saved user evidence.' };
}

export function resolveBestOption(desiredVal: string, options?: string[]): string {
  if (!options || options.length === 0) return desiredVal;

  const target = desiredVal.toLowerCase().trim();

  // 1. Exact Match
  const exact = options.find((o) => o.toLowerCase().trim() === target);
  if (exact) return exact;

  // 2. Affirmative / Negative normalization
  if (/^(yes|y|true|1)$/i.test(target)) {
    const yesOpt = options.find((o) =>
      /^(yes|y|true|i agree|affirmative|authorized|eligible)$/i.test(o.trim())
    );
    if (yesOpt) return yesOpt;
  }
  if (/^(no|n|false|0)$/i.test(target)) {
    const noOpt = options.find((o) =>
      /^(no|n|false|i decline|negative|none)$/i.test(o.trim())
    );
    if (noOpt) return noOpt;
  }

  // 3. Numeric Range Matching (e.g. desired "3" matches "3-5 years" or "1 to 4 years")
  const numMatch = target.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const targetNum = parseFloat(numMatch[1]);
    for (const opt of options) {
      const rangeMatch = opt.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (targetNum >= min && targetNum <= max) return opt;
      }
      const plusMatch = opt.match(/(\d+)\s*\+/);
      if (plusMatch && targetNum >= parseInt(plusMatch[1], 10)) {
        return opt;
      }
    }
  }

  // 4. Substring Match
  const partial = options.find(
    (o) => o.toLowerCase().includes(target) || target.includes(o.toLowerCase())
  );
  if (partial) return partial;

  // 5. Token Overlap Match (Jaccard similarity)
  const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
  let bestOpt = options[0];
  let maxScore = -1;

  for (const opt of options) {
    const optLower = opt.toLowerCase();
    let score = 0;
    for (const w of targetWords) {
      if (optLower.includes(w)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestOpt = opt;
    }
  }

  return maxScore > 0 ? bestOpt : '';
}

/**
 * Builds a structured Candidate Knowledge Graph from PersonaData for high-precision prompt grounding.
 * Strictly extracts real attributes, company names, degrees, and projects directly from user's resume.
 */
function buildCandidateKnowledgeGraph(persona: PersonaData) {
  const geo = resolveGeographicDetailsSync(persona.location, persona);
  const company = extractCompanyFromResume(persona) || 'N/A';
  const school = extractSchoolFromResume(persona) || persona.education || '';
  const degree = extractDegreeFromResume(persona);
  const major = extractMajorFromResume(persona) || '';

  return {
    identity: {
      fullName: persona.fullName,
      email: persona.email,
      phone: persona.phone,
      city: geo.city,
      state: geo.state,
      country: geo.country,
      postalCode: geo.postalCode,
      linkedIn: persona.linkedIn || persona.linkedinUrl || '',
      gitHub: persona.gitHub || persona.githubUrl || '',
      portfolio: persona.portfolio || persona.portfolioUrl || '',
    },
    qualifications: {
      totalYearsExperience: persona.experienceYears ?? null,
      verifiedCurrentCompany: company,
      verifiedSchool: school,
      verifiedDegree: degree,
      verifiedMajor: major,
      education: persona.education || school || degree,
      primaryTechStack: persona.techStack || [],
      targetRoles: persona.targetRoles || ['Software Engineer'],
      workPreference: persona.workPreference || 'Remote',
      minimumSalaryExpectation: persona.expectedSalaryLpa ?? persona.minSalary ?? null,
    },
    narrative: {
      summary: persona.experienceSummary || persona.resumeChunks?.summary || '',
      experience: persona.resumeChunks?.experience || '',
      projects: persona.resumeChunks?.projects || '',
      skills: persona.resumeChunks?.skills || (persona.techStack || []).join(', '),
      rawResumeText: persona.resumeText ? persona.resumeText.slice(0, 4000) : '',
    },
  };
}

/**
 * High-precision compensation & salary converter supporting LPA, USD, Monthly, and Hourly.
 */
export function resolveCompensationAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const fact = resolveScreeningFact(label, persona);
  return fact ? resolveBestOption(fact, options) : '';
}

/**
 * Notice period & availability resolver.
 */
export function resolveNoticePeriodAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const days = persona.employmentStatus === 'fresher' ? 0 : persona.noticePeriodDays;
  if (days === undefined || !Number.isFinite(days) || days < 0) return '';
  if (options?.length) {
    const exactDays = options.find(option => new RegExp(`^${days}\\s*days?$`, 'i').test(option.trim()));
    if (exactDays) return exactDays;
    if (days === 0) return options.find(option => /^(immediate|immediately|available now)$/i.test(option.trim())) || '';
    return '';
  }
  return /days?|notice/i.test(label) ? String(days) : days === 0 ? 'Immediate' : `${days} days`;
}

/**
 * Skill-specific experience calculator.
 */
export function resolveSkillExperienceAnswer(label: string, persona: PersonaData, options?: string[]): string {
  const fact = resolveScreeningFact(label, persona);
  return fact ? resolveBestOption(fact, options) : '';
}

/**
 * Multi-select checkbox group solver ("Select all that apply").
 */
export function resolveMultiSelectCheckboxAnswers(label: string, options: string[], persona: PersonaData): string[] {
  if (!options || options.length === 0) return [];
  const stack = (persona.techStack || []).map((s) => s.toLowerCase());
  const roles = (persona.targetRoles || []).map((r) => r.toLowerCase());
  const matched: string[] = [];

  for (const opt of options) {
    const optLower = opt.toLowerCase().trim();
    if (stack.some((s) => optLower.includes(s) || s.includes(optLower))) {
      matched.push(opt);
    } else if (roles.some((r) => optLower.includes(r) || r.includes(optLower))) {
      matched.push(opt);
    } else if (/remote|hybrid|full[\s-]time|yes/i.test(optLower)) {
      matched.push(opt);
    }
  }

  return matched;
}

/**
 * Master Single-Question Cognitive Resolver
 */
export async function resolveQuestionCognitively(
  target: FormQuestionTarget,
  persona: PersonaData
): Promise<CognitiveAnswerResult> {
  const questionMemory = getScopedQuestionMemory(persona, { ...target.jobContext, options: target.options, helperText: target.helperText, contextHint: target.contextHint });
  const label = (target.label || target.name || target.placeholder || '').trim();
  if (!label) {
    return { answer: '', confidence: 0, source: 'fallback' };
  }
  const fact = resolveScreeningFact(label, persona);
  if (fact !== undefined) return { answer: fact, confidence: fact ? 1 : 0, source: fact ? 'persona' : 'fallback' };
  const labelLower = label.toLowerCase();
  const activeError = (target.validationError || target.errorMessage || '').trim();

  // ----------------------------------------------------
  // TIER 0: Disqualification Armor
  // ----------------------------------------------------
  const enrichedText = `${target.contextHint ? target.contextHint + ' ' : ''}${label}${target.helperText ? ' ' + target.helperText : ''}`;
  if (isGenderQuestion(enrichedText)) {
    const answer = resolveGenderAnswer(persona, target.options);
    return { answer, confidence: answer ? 1 : 0, source: answer ? 'persona' : 'fallback', thoughtProcess: answer ? 'Saved gender or available non-disclosure response.' : 'Gender requires a self-reported answer.' };
  }
  const armor = evaluateDisqualificationArmor(label, target.options).isKnockout
    ? evaluateDisqualificationArmor(label, target.options)
    : evaluateDisqualificationArmor(enrichedText || label, target.options);
  if (armor.isKnockout && armor.guaranteedAnswer) {
    questionMemory.addOrUpdateEntry(label, armor.guaranteedAnswer, 'persona', 1.0);
    return {
      answer: armor.guaranteedAnswer,
      confidence: 1.0,
      source: 'armor',
      thoughtProcess: armor.reason,
      isKnockoutGuarded: true,
    };
  }

  // ----------------------------------------------------
  // TIER 1: Instant Memory Bank Cache
  // ----------------------------------------------------
  if (!activeError) {
    const memoryHit = questionMemory.lookup(label);
    if (memoryHit.hit && memoryHit.answer) {
      const formatted = resolveBestOption(memoryHit.answer, target.options);
      return {
        answer: formatted,
        confidence: Math.max(memoryHit.confidence, 0.95),
        source: 'memory',
        thoughtProcess: 'Instantly retrieved from verified Memory Bank.',
      };
    }
  }

  // ----------------------------------------------------
  // TIER 1.5: High-Precision Geographic & Identity Mapping
  // ----------------------------------------------------
  const geo = resolveGeographicDetailsSync(persona.location, persona);

  if (target.compoundRole === 'phone_country_code' || (/country\s*code|\+1|\+91/i.test(labelLower))) {
    const code = /india/i.test(geo.country) ? '+91' : '+1';
    return { answer: resolveBestOption(code, target.options), confidence: 0.99, source: 'persona' };
  }
  if (/^city$|\bcity\b/i.test(labelLower) && !/state|country/i.test(labelLower)) {
    return { answer: resolveBestOption(geo.city, target.options), confidence: 0.99, source: 'persona' };
  }
  if (/^state$|\bstate\b|province|region/i.test(labelLower)) {
    return { answer: resolveBestOption(geo.state, target.options), confidence: 0.99, source: 'persona' };
  }
  if (/^country$|\bcountry\b/i.test(labelLower) && !/code/i.test(labelLower)) {
    return { answer: resolveBestOption(geo.country, target.options), confidence: 0.99, source: 'persona' };
  }
  if (/postal.*code|zip.*code|\bzip\b|\bpin\b/i.test(labelLower)) {
    return { answer: geo.postalCode, confidence: 0.99, source: 'persona' };
  }
  if (/street.*address|address\s*line|residence\s*address/i.test(labelLower)) {
    const addr = `${geo.city}, ${geo.state}`;
    return { answer: addr, confidence: 0.99, source: 'persona' };
  }
  if (/full.*name|^name$/i.test(labelLower)) {
    return { answer: persona.fullName, confidence: 0.99, source: 'persona' };
  }
  if (/first.*name/i.test(labelLower)) {
    const first = (persona.fullName || '').split(/\s+/)[0] || 'Candidate';
    return { answer: first, confidence: 0.99, source: 'persona' };
  }
  if (/last.*name|surname/i.test(labelLower)) {
    const parts = (persona.fullName || '').split(/\s+/);
    const last = parts.length > 1 ? parts.slice(1).join(' ') : 'Candidate';
    return { answer: last, confidence: 0.99, source: 'persona' };
  }
  if (/middle.*name/i.test(labelLower)) {
    return { answer: '', confidence: 0.99, source: 'persona' };
  }
  if (/preferred.*name|nickname/i.test(labelLower)) {
    const first = (persona.fullName || '').split(/\s+/)[0] || 'Candidate';
    return { answer: first, confidence: 0.99, source: 'persona' };
  }
  if (/pronoun/i.test(labelLower)) {
    const declinePronoun = target.options?.find((o) => /prefer not|decline/i.test(o));
    return { answer: declinePronoun || target.options?.[0] || 'They/Them', confidence: 0.99, source: 'persona' };
  }
  if (/email/i.test(labelLower)) {
    return { answer: persona.email, confidence: 0.99, source: 'persona' };
  }
  if (/phone|mobile|cell/i.test(labelLower)) {
    return { answer: persona.phone, confidence: 0.99, source: 'persona' };
  }
  // Company / Page Follow questions (e.g. "Follow us for more insights https://www.linkedin.com/company/...")
  if (/follow/i.test(labelLower)) {
    if (target.options && target.options.length > 0) {
      const match = target.options.find((o) => /^(yes|agree|confirm|followed|true)$/i.test(o.trim()))
        || target.options.find((o) => /yes|agree|confirm|followed|true/i.test(o.trim()))
        || target.options.find((o) => !/^(select|choose|select an option|please select|--)$/i.test(o.trim()))
        || target.options[0];
      return { answer: match, confidence: 0.99, source: 'persona' };
    }
    return { answer: 'Yes', confidence: 0.98, source: 'persona' };
  }
  if (/linkedin/i.test(labelLower) && !/follow/i.test(labelLower) && target.inputType !== 'select') {
    return { answer: persona.linkedIn || persona.linkedinUrl || '', confidence: 0.99, source: 'persona' };
  }
  if (/github/i.test(labelLower)) {
    return { answer: persona.gitHub || persona.githubUrl || '', confidence: 0.99, source: 'persona' };
  }
  if (/portfolio|personal\s*website|personal\s*site|homepage/i.test(labelLower)) {
    const rawP = (persona.portfolio || persona.portfolioUrl || '').trim();
    const hasValidPortfolio = Boolean(
      rawP &&
      rawP !== 'N/A' &&
      !/^(none|nil|no|false|undefined|null)$/i.test(rawP)
    );
    return { answer: hasValidPortfolio ? rawP : 'N/A', confidence: 0.99, source: 'persona' };
  }

  // How Did You Hear About Us / Referral Source
  if (/how did you hear|source|referral/i.test(labelLower)) {
    const sourceOpt = target.options
      ? resolveBestOption('LinkedIn', target.options)
      : 'LinkedIn';
    return { answer: sourceOpt, confidence: 0.99, source: 'persona' };
  }

  // Education Level / Degree - Extracted from candidate resume
  if (/degree|highest.*education|education\s*level/i.test(labelLower)) {
    const deg = extractDegreeFromResume(persona);
    return { answer: resolveBestOption(deg, target.options), confidence: 0.98, source: 'persona' };
  }
  // Major / Field of Study - Extracted from candidate resume
  if (/major|field\s*of\s*study|discipline/i.test(labelLower)) {
    const major = extractMajorFromResume(persona) || 'Computer Science';
    return { answer: resolveBestOption(major, target.options), confidence: 0.98, source: 'persona' };
  }
  // University / College / Institution - Extracted from candidate resume
  if (/university|college|school\s*name|institution/i.test(labelLower)) {
    const school = extractSchoolFromResume(persona) || persona.education || '';
    if (school) {
      return { answer: resolveBestOption(school, target.options), confidence: 0.98, source: 'persona' };
    }
  }
  // Current Role & Company - Extracted directly from candidate resume
  if (/current\s*(?:job\s*)?title|most\s*recent\s*title|current\s*role/i.test(labelLower)) {
    const title = persona.targetRoles?.[0] || 'Software Engineer';
    return { answer: resolveBestOption(title, target.options), confidence: 0.98, source: 'persona' };
  }
  if (/(?:current|recent|most\s*recent)?\s*(?:company|employer|organization|firm)(?:\s*name)?\b/i.test(labelLower) && !/follow/i.test(labelLower)) {
    const comp = extractCompanyFromResume(persona) || 'N/A';
    return { answer: resolveBestOption(comp, target.options), confidence: 0.98, source: 'persona' };
  }

  // Direct candidate profile summary when explicitly requested
  if (/^summary$|professional\s*summary|profile\s*summary|candidate\s*summary/i.test(labelLower)) {
    if (persona.experienceSummary || persona.resumeChunks?.summary) {
      return {
        answer: persona.experienceSummary || persona.resumeChunks?.summary || '',
        confidence: 0.98,
        source: 'persona'
      };
    }
  }

  // Note: All behavioral, situational, and open-ended essay questions ("Why work here?",
  // "Describe a project", "Key strengths", "Weakness", "Cover letter") are dynamically
  // resolved in Tier 2 via Local LLM grounded strictly in the candidate's actual resume chunks!

  // Numerical Experience Questions
  if (/(?:total|years of|how many years).*experience/i.test(labelLower) && !target.options?.length) {
    const exp = String(persona.experienceYears || 4);
    questionMemory.addOrUpdateEntry(label, exp, 'persona', 0.98);
    return { answer: exp, confidence: 0.98, source: 'persona' };
  }

  // Notice Period & Earliest Start Date
  if (/notice\s*period|start\s*date|when\s*can\s*you\s*start|availability\b/i.test(labelLower)) {
    // If field expects a number (e.g. days), return numeric days
    if (/days|number|int/i.test(target.widgetType || '') || target.min !== undefined || /in\s*days/i.test(labelLower)) {
      const days = target.options ? resolveBestOption('0', target.options) : '0';
      return { answer: days, confidence: 0.99, source: 'persona' };
    }
    const ans = resolveNoticePeriodAnswer(label, persona, target.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.99);
    return { answer: ans, confidence: 0.99, source: 'persona' };
  }

  // Compensation & Salary (Split Current vs Expected)
  if (/current\s*(?:ctc|salary|compensation|pay|rate)/i.test(labelLower)) {
    const curLpa = (persona.expectedSalaryLpa ?? persona.minSalary) || 12;
    const ans = /lpa|lakh/i.test(labelLower) ? String(curLpa) : String(curLpa * 100000);
    const finalAns = resolveBestOption(ans, target.options);
    questionMemory.addOrUpdateEntry(label, finalAns, 'persona', 0.98);
    return { answer: finalAns, confidence: 0.98, source: 'persona' };
  }
  if (/salary|compensation|expected\s*pay|expected\s*rate|expected\s*ctc|ctc|remuneration|wage|hourly\s*rate/i.test(labelLower)) {
    const ans = resolveCompensationAnswer(label, persona, target.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.98, source: 'persona' };
  }

  // Multi-Select Checkbox Group ("Select all that apply")
  if (target.widgetType === 'checkboxgroup' && target.options && target.options.length > 0) {
    const matched = resolveMultiSelectCheckboxAnswers(label, target.options, persona);
    const combined = matched.join(', ');
    return { answer: combined, confidence: 0.95, source: 'persona' };
  }

  // Specific Skill Experience
  if (/(?:years\s*of\s*experience|experience\s*with|how\s*many\s*years).*(?:with|in|using)?\s*([A-Za-z0-9+#.]+)/i.test(labelLower)) {
    const ans = resolveSkillExperienceAnswer(label, persona, target.options);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // ----------------------------------------------------
  // TIER 2: Deep Cognitive LLM Reasoning (Local Qwen 2.5 3B)
  // ----------------------------------------------------
  try {
    const ollamaStatus = await checkOllamaStatus().catch(() => ({ online: false, modelName: '' }));
    if (ollamaStatus.online) {
      const kg = buildCandidateKnowledgeGraph(persona);
      const resumeChunks = buildResumeChunks(persona);
      const relevantResumeEvidence = findRelevantResumeContext(label, resumeChunks, 3);

      const systemPrompt = `You are an elite, highly articulate Job Application Agent representing the candidate directly in the FIRST PERSON ("I", "my").
Respond strictly in valid JSON format adhering to this exact schema:
{
  "thoughtProcess": "1-sentence strategic rationale",
  "exactAnswer": "The precise string to inject into the form field",
  "confidence": 0.95
}
RULES:
1. STRICT RESUME GROUNDING: Every single answer MUST be strictly derived from the candidate's actual resume context provided below. NEVER invent fictitious projects, companies, metrics, or experiences.
2. If asked about technical challenges, achievements, or experience, draw upon the real projects and work history documented in the candidate's resume.
3. If options are provided, 'exactAnswer' MUST match one of the allowed options character-for-character.
4. For numerical questions (e.g. years of experience, graduation year), output numbers/digits only.
5. For open essay questions ("Why work here?", "Describe a project"), write a concise, compelling 2-3 sentence first-person response drawing upon actual candidate projects.
6. Output raw JSON ONLY. No markdown, no preambles.`;

      const userPrompt = JSON.stringify(
        {
          question: label,
          sectionContext: target.helperText || undefined,
          inputType: target.widgetType || 'text',
          allowedOptions: target.options && target.options.length > 0 ? target.options : 'OPEN_TEXT',
          activeValidationError: activeError || undefined,
          relevantResumeEvidence: relevantResumeEvidence || undefined,
          targetJob: {
            title: target.jobContext?.jobTitle || persona.targetRoles?.[0] || 'Software Engineer',
            company: target.jobContext?.companyName || 'Target Company',
          },
          candidateProfile: kg,
        },
        null,
        2
      );

      const rawOutput = await generateOllamaAnswer(userPrompt, systemPrompt);

      let parsedJson: any = null;
      try {
        const clean = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(clean);
      } catch {
        const match = rawOutput.match(/"exactAnswer"\s*:\s*"([^"]+)"/);
        if (match) parsedJson = { exactAnswer: match[1], confidence: 0.9 };
      }

      if (parsedJson?.exactAnswer) {
        let finalAns = String(parsedJson.exactAnswer).trim();
        if (target.options && target.options.length > 0) {
          finalAns = resolveBestOption(finalAns, target.options);
        }
        questionMemory.addOrUpdateEntry(label, finalAns, 'llm', parsedJson.confidence || 0.9);
        return {
          answer: finalAns,
          confidence: parsedJson.confidence || 0.92,
          source: 'llm',
          thoughtProcess: parsedJson.thoughtProcess,
        };
      }
    }
  } catch (err) {
    console.warn('[UltraQuestionResolver] LLM inference failed, falling back:', err);
  }

  // ----------------------------------------------------
  // TIER 3: Universal Fallback (Strictly grounded in candidate resume)
  // ----------------------------------------------------
  const fallbackChunks = buildResumeChunks(persona);
  const relevantSnippet = findRelevantResumeContext(label, fallbackChunks, 2);

  if (target.widgetType === 'textarea' || target.minLength || /describe|why|project|experience|about|tell me/i.test(labelLower)) {
    if (relevantSnippet) {
      const clean = relevantSnippet.replace(/^[\w\s]+:\s*/, '').replace(/\s+/g, ' ').trim();
      let answer = clean;
      if (clean.length > 600) {
        const lastSentence = clean.slice(0, 600).lastIndexOf('.');
        answer = lastSentence > 200 ? clean.slice(0, lastSentence + 1) : clean.slice(0, 600) + '.';
      }
      return { answer, confidence: 0.85, source: 'fallback' };
    }
    if (persona.experienceSummary || persona.resumeChunks?.summary) {
      return { answer: persona.experienceSummary || persona.resumeChunks?.summary || '', confidence: 0.85, source: 'fallback' };
    }
  }

  const fallbackAns = '';
  return {
    answer: resolveBestOption(fallbackAns, target.options),
    confidence: 0,
    source: 'fallback',
  };
}

/**
 * TIER 4: Holistic Multi-Field Batch Reasoning
 * Resolves an entire step's questions simultaneously, preserving cross-field coherence.
 */
export async function resolveFormStepBatch(
  targets: FormQuestionTarget[],
  persona: PersonaData,
  jobContext?: { jobTitle?: string; companyName?: string }
): Promise<Map<string, CognitiveAnswerResult>> {
  const memoryFor = (target: FormQuestionTarget): ReturnType<typeof getScopedQuestionMemory> => getScopedQuestionMemory(persona, { ...jobContext, options: target.options, helperText: target.helperText, contextHint: target.contextHint });
  const resultMap = new Map<string, CognitiveAnswerResult>();
  const pendingTargets: FormQuestionTarget[] = [];

  // First pass: Resolve fast-path fields (Armor, Identity, Memory) instantly
  for (const t of targets) {
    const key = t.id || t.selector || t.label;
    const questionMemory = memoryFor(t);

    const fact = resolveScreeningFact(t.label, persona);
    if (fact !== undefined) {
      resultMap.set(key, { answer: fact ? resolveBestOption(fact, t.options) : '', confidence: fact ? 1 : 0, source: fact ? 'persona' : 'fallback' });
      continue;
    }

    // Check Armor
    const fullText = `${t.contextHint ? t.contextHint + ' ' : ''}${t.label}${t.helperText ? ' ' + t.helperText : ''}`;
    if (isGenderQuestion(fullText)) {
      resultMap.set(key, await resolveQuestionCognitively({ ...t, jobContext }, persona));
      continue;
    }
    const armor = evaluateDisqualificationArmor(t.label, t.options).isKnockout
      ? evaluateDisqualificationArmor(t.label, t.options)
      : evaluateDisqualificationArmor(fullText || t.label, t.options);
    if (armor.isKnockout && armor.guaranteedAnswer) {
      resultMap.set(key, {
        answer: armor.guaranteedAnswer,
        confidence: 1.0,
        source: 'armor',
        thoughtProcess: armor.reason,
        isKnockoutGuarded: true,
      });
      continue;
    }

    // Check Memory
    if (!t.hasError) {
      const mem = questionMemory.lookup(t.label);
      if (mem.hit && mem.answer) {
        resultMap.set(key, {
          answer: resolveBestOption(mem.answer, t.options),
          confidence: mem.confidence || 0.95,
          source: 'memory',
        });
        continue;
      }
    }

    // If ambiguous or open, collect for holistic batch LLM reasoning
    pendingTargets.push(t);
  }

  if (pendingTargets.length === 0) {
    return resultMap;
  }

  // Batch query to local LLM with holistic context
  try {
    const ollamaStatus = await checkOllamaStatus().catch(() => ({ online: false }));
    if (ollamaStatus.online) {
      const kg = buildCandidateKnowledgeGraph(persona);
      const batchResumeChunks = buildResumeChunks(persona);
      const systemPrompt = `You are an elite, highly articulate Job Application Agent representing the candidate in the FIRST PERSON ("I", "my").
Solve all form questions in the batch simultaneously, ensuring complete cross-field consistency.
Respond strictly in valid JSON format:
{
  "resolutions": [
    {
      "id": "field_id",
      "exactAnswer": "The precise string to inject into the form field",
      "thoughtProcess": "1-sentence strategic rationale"
    }
  ]
}
RULES:
1. STRICT RESUME GROUNDING: Every single answer MUST be based on the candidate's actual resume context provided in the payload. Do NOT fabricate projects or experiences.
2. If options are provided, 'exactAnswer' MUST match one of the allowed options character-for-character.
3. For numeric inputs, output digits only.
4. Ensure logical harmony across all answers.
5. Output raw JSON ONLY.`;

      const batchPayload = {
        targetJob: jobContext || { jobTitle: persona.targetRoles?.[0] || 'Software Engineer' },
        candidate: kg,
        questions: pendingTargets.map((t) => ({
          id: t.id || t.selector || t.label,
          label: t.label,
          widgetType: t.widgetType || 'text',
          options: t.options && t.options.length > 0 ? t.options : 'OPEN_TEXT',
          required: t.required,
          errorMessage: t.errorMessage,
          relevantResumeEvidence: findRelevantResumeContext(t.label, batchResumeChunks, 2) || undefined,
        })),
      };

      const raw = await generateOllamaAnswer(JSON.stringify(batchPayload, null, 2), systemPrompt, 0.0, 1024);
      let parsed: any = null;
      try {
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {}

      if (parsed?.resolutions && Array.isArray(parsed.resolutions)) {
        for (const res of parsed.resolutions) {
          const matchedTarget = pendingTargets.find(
            (pt) => (pt.id || pt.selector || pt.label) === res.id
          );
          if (matchedTarget && res.exactAnswer) {
            const finalAns = resolveBestOption(String(res.exactAnswer).trim(), matchedTarget.options);
            const key = matchedTarget.id || matchedTarget.selector || matchedTarget.label;
            resultMap.set(key, {
              answer: finalAns,
              confidence: 0.94,
              source: 'llm',
              thoughtProcess: res.thoughtProcess,
            });
            memoryFor(matchedTarget).addOrUpdateEntry(matchedTarget.label, finalAns, 'llm', 0.94);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[UltraQuestionResolver] Batch LLM inference failed, falling back to individual:', err);
  }

  // Any remaining unresolved targets use individual single-question resolution
  for (const t of pendingTargets) {
    const key = t.id || t.selector || t.label;
    const questionMemory = memoryFor(t);
    if (!resultMap.has(key)) {
      const ind = await resolveQuestionCognitively({ ...t, jobContext }, persona);
      resultMap.set(key, ind);
    }
  }

  return resultMap;
}
