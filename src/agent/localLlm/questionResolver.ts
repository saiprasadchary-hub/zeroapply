/**
 * ZeroApply Local LLM - Question Resolver
 * Master 3-tier question answering pipeline:
 * Tier 1: QuestionMemoryBank (0ms instant lookup)
 * Tier 2: Persona direct fields (0ms)
 * Tier 3: Resume RAG context + Local Ollama (qwen2.5:1.5b) (<400ms)
 */

import type { PersonaData } from '../../types';
import { questionMemory } from '../memory/questionMemoryBank';
import { buildResumeChunks, findRelevantResumeContext } from '../memory/resumeContextRetriever';
import { buildQuestionPrompt } from './promptBuilder';
import { parseAnswer, matchBestOption } from './answerParser';
import { checkOllamaHealth, generateOllamaAnswer } from './ollamaClient';
import type { ExtractedJobContext } from '../vision/jobContextExtractor';
import { extractCompanyFromResume } from '../domScanner/fieldClassifier';
import { resolveGeographicDetailsSync } from '../location/geoIntelligence';
import { analyzeErrorConstraint } from './errorConstraintAnalyzer';
import { evaluateDisqualificationArmor, resolveCompensationAnswer } from './ultraQuestionResolver';

export interface QuestionFieldTarget {
  id?: string;
  selector?: string;
  label: string;
  name?: string;
  placeholder?: string;
  inputType?: string;
  options?: string[];
  required?: boolean;
  confidence?: number;
  currentValue?: string;
  hasError?: boolean;
  errorMessage?: string;
  validationError?: string;
  helperText?: string;
  contextHint?: string;
  jobContext?: Partial<ExtractedJobContext>;
}

export interface ResolvedAnswer {
  answer: string;
  confidence: number;
  source: 'memory' | 'persona' | 'llm' | 'fallback';
  resumeContext?: string;
  isKnockout?: boolean;
}

function resolveMatch(val: string, options?: string[]): string {
  if (!options || options.length === 0) return val;
  const match = matchBestOption(val, options);
  return match?.option || options[0];
}

export async function resolveQuestion(
  field: QuestionFieldTarget,
  persona: PersonaData
): Promise<ResolvedAnswer> {
  const rawLabel = (field.label || field.name || field.placeholder || '').trim();
  if (!rawLabel) {
    return { answer: '', confidence: 0, source: 'fallback' };
  }
  const helper = (field.helperText || '').trim();
  const context = (field.contextHint || '').trim();
  const label = rawLabel;
  const enrichedText = `${context ? context + ' ' : ''}${rawLabel}${helper ? ' ' + helper : ''}`;
  const labelLower = enrichedText.toLowerCase();
  const activeError = (field.validationError || field.errorMessage || '').trim();
  const errorAnalysis = activeError ? analyzeErrorConstraint(activeError) : null;

  // ----------------------------------------------------
  // TIER 0: Disqualification Armor (Knockout Safeguard 2.0)
  // ----------------------------------------------------
  const armor = evaluateDisqualificationArmor(label, field.options).isKnockout
    ? evaluateDisqualificationArmor(label, field.options)
    : evaluateDisqualificationArmor(enrichedText || label, field.options);
  if (armor.isKnockout && armor.guaranteedAnswer) {
    const isCheckbox = field.inputType === 'checkbox' || field.inputType === 'switch';
    const answer = isCheckbox && /^(yes|no)$/i.test(armor.guaranteedAnswer)
      ? String(armor.guaranteedAnswer.toLowerCase() === 'yes')
      : armor.guaranteedAnswer;
    questionMemory.addOrUpdateEntry(label, answer, 'persona', 1.0);
    return {
      answer,
      confidence: 1.0,
      source: 'persona',
      isKnockout: true,
    };
  }

  // ----------------------------------------------------
  // TIER 1: Instant Memory Bank (0ms)
  // ----------------------------------------------------
  // If there is an active validation error on the field, bypass stale memory cache
  if (!activeError) {
    const memoryHit = questionMemory.lookup(label);
    if (memoryHit.hit && memoryHit.answer) {
      let rawAnswer = memoryHit.answer;
      // Normalize affirmative answers if target options are Yes/No
      if (field.options && field.options.some((o) => /^(yes|no)$/i.test(o.trim()))) {
        if (!/^(yes|no)$/i.test(rawAnswer)) {
          if (/remote|comfort|will|agree|authoriz|eligib|permit|able|yes/i.test(rawAnswer) || /comfortable|willing|open|remote/i.test(labelLower)) {
            rawAnswer = 'Yes';
          }
        }
      }
      // Guard against stale geographic memory entries (e.g. legacy Bengaluru when user is from Hyderabad)
      if (/location|city|address|country|state|postal|zip|pin/i.test(labelLower)) {
        const geo = resolveGeographicDetailsSync(persona.location, persona);
        const geoTokens = [geo.city.toLowerCase(), geo.state.toLowerCase(), geo.country.toLowerCase()];
        const ansLower = rawAnswer.toLowerCase();
        if (ansLower.includes('bengaluru') && !geoTokens.includes('bengaluru')) {
          const freshGeoAnswer = /city/i.test(labelLower) && !/state|country|location/i.test(labelLower)
            ? geo.city
            : geo.formattedAddress;
          questionMemory.set(label, freshGeoAnswer, 'persona');
          rawAnswer = freshGeoAnswer;
        }
      }

      // Guard against stale company memory entries holding candidate personal name
      if (/company|comapny|employer|license|licens/i.test(labelLower)) {
        if (persona?.fullName && rawAnswer.toLowerCase().includes(persona.fullName.toLowerCase())) {
          rawAnswer = /if\s*(?:a\s*)?(?:company|comapny)|licens/i.test(labelLower) ? 'N/A' : (extractCompanyFromResume(persona) || 'N/A');
          questionMemory.set(label, rawAnswer, 'persona');
        }
      }

      // Guard against stale portfolio memory entries (strictly respect persona.portfolio or N/A)
      if (/portfolio|personal\s*website|personal\s*site|project\s*showcase|homepage/i.test(labelLower)) {
        const rawP = (persona?.portfolio || persona?.portfolioUrl || '').trim();
        const hasValidP = Boolean(rawP && rawP !== 'N/A' && !/^(none|nil|no|false)$/i.test(rawP));
        const expectedPortfolio = hasValidP ? rawP : 'N/A';
        if (rawAnswer !== expectedPortfolio) {
          rawAnswer = expectedPortfolio;
          questionMemory.set(label, rawAnswer, 'persona');
        }
      }

      // Guard against stale employment status memory entries (fresher vs currently working)
      if (/are you currently (?:working|employed)|currently (?:working|employed)|current employment status|are you a fresher/i.test(labelLower)) {
        const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
        const isAskingFresher = /fresher/i.test(labelLower);
        const correctAns = isAskingFresher ? (isFresher ? 'Yes' : 'No') : (isFresher ? 'No' : 'Yes');
        if (rawAnswer !== correctAns) {
          rawAnswer = correctAns;
          questionMemory.set(label, rawAnswer, 'persona');
        }
      }

      // Guard against stale notice period memory entries
      if (/notice.*period|how long.*notice|notice.*in.*days/i.test(labelLower)) {
        const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
        const noticeDays = isFresher ? 0 : (persona.noticePeriodDays !== undefined ? persona.noticePeriodDays : 0);
        const expectedNotice = String(noticeDays);
        if (rawAnswer !== expectedNotice && /^\d+$/.test(rawAnswer)) {
          rawAnswer = expectedNotice;
          questionMemory.set(label, rawAnswer, 'persona');
        }
      }

      // Guard against stale compensation memory entries holding raw LPA instead of full INR figures
      if (/salary|compensation|expected.*pay|stipend|ctc|remuneration|wage/i.test(labelLower)) {
        const isAnnualOrInr = /\b(?:inr|rupees?|₹|ctc|annual|yearly|per\s*annum)\b/i.test(labelLower) || /larger\s*than\s*100|greater\s*than\s*100/i.test(labelLower);
        const isExplicitLpa = /\b(?:in\s*lpa|in\s*lakhs?|in\s*lacs?|\blpa\b|\blakhs?\b)\b/i.test(labelLower);
        const numAns = Number(rawAnswer);
        if (!isNaN(numAns) && numAns <= 100 && isAnnualOrInr && !isExplicitLpa) {
          const isCurrentCtc = /current\s*(?:ctc|salary|compensation|pay|rate|package)|present\s*(?:ctc|salary|compensation|pay|rate)|existing\s*ctc/i.test(labelLower);
          const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
          let baseLpa: number;
          if (isCurrentCtc) {
            baseLpa = isFresher ? 0 : (persona.currentCtcLpa !== undefined ? persona.currentCtcLpa : (persona.minSalary || 8));
          } else {
            baseLpa = persona.minSalary || (numAns > 0 ? numAns : 12);
          }
          if (baseLpa > 0) {
            const freshCompAnswer = String(baseLpa * 100000);
            questionMemory.set(label, freshCompAnswer, 'persona');
            rawAnswer = freshCompAnswer;
          }
        }
      }

      // If field is a textarea and memory answer is a simple boolean ("Yes"/"No"), pass through to generate full description
      if (field.inputType === 'textarea' && /^(yes|no)$/i.test(rawAnswer)) {
        // Continue to Tier 2 / 3 for rich text answer
      } else {
        const finalAnswer = resolveMatch(rawAnswer, field.options);
        return {
          answer: finalAnswer,
          confidence: Math.max(memoryHit.confidence, 0.95),
          source: 'memory',
        };
      }
    }
  }

  // Active validation error guard: Universal error recovery across all ATS platforms
  if (errorAnalysis && errorAnalysis.category !== 'generic') {
    if (errorAnalysis.category === 'decimal') {
      const min = errorAnalysis.targetMinValue ?? 0;
      let val = min > 0 ? min + 1.0 : 1.0;
      if (/salary|rate|pay|comp|ctc|stipend|remuneration/i.test(labelLower)) {
        val = /hourly/i.test(labelLower) ? 25.0 : (persona.minSalary || 25.0);
      } else if (/\b(?:experience|years?|yrs?)\b/i.test(labelLower) && !/expected|example/i.test(labelLower)) {
        val = (persona.experienceYears ?? 0);
      }
      const ans = `${val.toFixed(1)}`;
      questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
      return { answer: ans, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'whole_number' || errorAnalysis.category === 'min_numeric') {
      const min = errorAnalysis.targetMinValue ?? 1;
      const isStrictlyGreater = /(?:larger|greater|more)\s*than/i.test(activeError);
      const safeMin = isStrictlyGreater ? min + 1 : min;
      let val = safeMin;

      if (/salary|rate|pay|comp|ctc|stipend|remuneration/i.test(labelLower)) {
        if (/hourly/i.test(labelLower)) {
          val = 25;
        } else {
          const baseLpa = persona.minSalary || 12;
          if (baseLpa <= 150 && min >= 100) {
            val = baseLpa * 100000;
          } else {
            val = Math.max(baseLpa, safeMin);
          }
        }
      } else if (/\b(?:experience|years?|yrs?)\b/i.test(labelLower) && !/expected|example/i.test(labelLower)) {
        val = Math.max(persona.experienceYears ?? 0, safeMin);
      }
      const ans = String(val);
      questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
      return { answer: ans, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'url') {
      if (/portfolio|personal\s*website|personal\s*site|homepage/i.test(labelLower)) {
        const rawP = (persona.portfolio || persona.portfolioUrl || '').trim();
        const hasP = Boolean(rawP && rawP !== 'N/A' && !/^(none|nil|no|false)$/i.test(rawP));
        if (hasP) {
          return { answer: rawP, confidence: 0.98, source: 'persona' };
        }
      }
      const url = persona.linkedinUrl || persona.portfolioUrl || persona.githubUrl || 'https://linkedin.com';
      return { answer: url, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'phone') {
      const phone = persona.phone || '+91 9876543210';
      return { answer: phone, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'email') {
      return { answer: persona.email || 'candidate@example.com', confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'postal') {
      const geo = resolveGeographicDetailsSync(persona.location, persona);
      return { answer: geo.postalCode, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'required_selection' && field.options && field.options.length > 0) {
      const affirmative = field.options.find(o => /^(yes|agree|confirm|true|followed)$/i.test(o.trim()))
        || field.options.find(o => /yes|extensive|proficient|reference|hands-on|agree|confirm|followed/i.test(o));
      const validNonPlaceholder = field.options.find(o => !/^(select|choose|select an option|please select|--)$/i.test(o.trim()));
      const ans = affirmative || validNonPlaceholder || field.options[0];
      return { answer: ans, confidence: 0.98, source: 'persona' };
    }

    if (errorAnalysis.category === 'min_length') {
      const minLen = errorAnalysis.targetMinLength || 50;
      let richAnswer = persona.experienceSummary ||
        `Experienced software engineer with ${persona.experienceYears ?? 0}+ years delivering high-reliability production applications using ${(persona.techStack || []).join(', ')}. Proven track record of developing scalable architectures and driving technical innovation.`;
      while (richAnswer.length < minLen) {
        richAnswer += ` Dedicated to technical excellence, continuous learning, and creating impactful software solutions.`;
      }
      return { answer: richAnswer, confidence: 0.95, source: 'persona' };
    }

    if (errorAnalysis.category === 'max_length' && errorAnalysis.targetMaxLength) {
      const maxLen = errorAnalysis.targetMaxLength;
      const base = persona.targetRoles?.[0] || 'Software Engineer';
      const ans = base.length > maxLen ? base.slice(0, maxLen).trim() : base;
      return { answer: ans, confidence: 0.95, source: 'persona' };
    }
  }

  // ----------------------------------------------------
  // TIER 2: Deterministic Persona Mapping & Disqualification Guard (0ms)
  // ----------------------------------------------------

  // Inverted Disqualification Guard (Safety Guarantee: Always "No")
  // Criminal record / Felony
  if (/felony|criminal|convict|misdemeanor|arrest|guilty.*plea/i.test(labelLower)) {
    const ans = resolveMatch('No', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Disciplinary Termination / Asked to resign
  if (/terminat.*cause|fired|discharged.*cause|disciplinary|asked.*to.*resign|involuntary.*separation/i.test(labelLower)) {
    const ans = resolveMatch('No', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Non-compete / Restrictive covenants / Conflict of Interest
  if (/non-compete|non.*solicit|restrictive.*covenant|breach.*agreement|conflict.*interest/i.test(labelLower)) {
    const ans = resolveMatch('No', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // LinkedIn Top Choice / Premium Upsell / Paid Badges (Always "No")
  if (/top\s*choice|mark.*(?:as\s*a?\s*)?top\s*choice|top\s*applicant|premium\s*upsell|try\s*premium/i.test(labelLower)) {
    const ans = resolveMatch('No', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Mandatory Affirmative Guard (Always "Yes")
  // WhatsApp Community / Group Join Guard (Always Affirmative "Yes" / "true" without opening external link)
  if (/whatsapp|joined.*(?:community|group|channel)|join.*whatsapp/i.test(labelLower)) {
    const isCheckboxType = field.inputType === 'checkbox' || field.inputType === 'switch';
    const ans = isCheckboxType ? 'true' : resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Company / Social Media / LinkedIn Page Follow Guard (e.g. "Follow us for more insights https://www.linkedin.com/company/...")
  if (/follow.*(?:insights|page|company|channel|updates|linkedin)|(?:follow|join).*(?:us|page|channel|community|linkedin)/i.test(labelLower)) {
    const isCheckboxType = field.inputType === 'checkbox' || field.inputType === 'switch';
    let ans = isCheckboxType ? 'true' : resolveMatch('Yes', field.options);
    if (!isCheckboxType && field.options && field.options.length > 0) {
      const match = field.options.find((o) => /^(yes|agree|confirm|followed|true)$/i.test(o.trim()))
        || field.options.find((o) => /yes|agree|confirm|followed|true/i.test(o.trim()))
        || field.options.find((o) => !/^(choose|select|select an option|please select|--)$/i.test(o.trim()))
        || field.options[0];
      if (match) ans = match;
    }
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // 18 years of age or older
  if (/18.*years|age.*18|at.*least.*18|legal.*age/i.test(labelLower)) {
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Background check / Drug test consent
  if (/background.*check|drug.*screen|screening.*consent/i.test(labelLower)) {
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Work Authorization / Sponsorship
  if (/auth(oriz|orised)|legal.*work|eligible.*work/i.test(labelLower)) {
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  if (/sponsor|visa.*sponsorship/i.test(labelLower)) {
    const ans = resolveMatch('No', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Conditional Company Name for Code Licensing / Independent Engineers (Always "N/A")
  if (
    /if\s*(?:a\s*)?(?:company|comapny)|(?:company|comapny).*(?:if\s*applicable|if\s*any|licens)|licens.*(?:company|comapny)|(?:company|comapny).*that\s*will\s*license/i.test(labelLower)
  ) {
    questionMemory.addOrUpdateEntry(label, 'N/A', 'persona', 0.99);
    return { answer: 'N/A', confidence: 0.99, source: 'persona' };
  }

  // Portfolio / Personal Website / Project Showcase (Strictly "N/A" if candidate did not mention a portfolio)
  if (/portfolio|personal\s*website|personal\s*site|project\s*showcase|homepage/i.test(labelLower)) {
    const rawP = (persona.portfolio || persona.portfolioUrl || '').trim();
    const hasValidPortfolio = Boolean(
      rawP &&
      rawP !== 'N/A' &&
      !/^(none|nil|no|false|undefined|null)$/i.test(rawP)
    );
    const ans = hasValidPortfolio ? rawP : 'N/A';
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.99);
    return { answer: ans, confidence: 0.99, source: 'persona' };
  }

  // Applicant Entity Type / Applying As (Independent software engineer / Consultant vs Company / Other)
  if (
    /apply\s*to|applying\s*as|entity\s*type|applicant\s*type|capacity/i.test(labelLower) ||
    (field.options && field.options.some((o) => /independent\s*software\s*engineer|independent\s*consultant|independent\s*contractor/i.test(o)))
  ) {
    if (field.options && field.options.length > 0) {
      const match = field.options.find((o) =>
        /independent\s*software\s*engineer|independent\s*consultant|independent\s*contractor|individual|self-employed/i.test(o)
      );
      if (match) {
        questionMemory.addOrUpdateEntry(label, match, 'persona', 1.0);
        return { answer: match, confidence: 1.0, source: 'persona' };
      }
    }
  }

  // Code Licensing / AI Training / Non-exclusive licensing interest & consent (Always Affirmative "Yes")
  if (
    !/company|comapny|write|name|organization/i.test(labelLower) &&
    (/interest.*(?:licens|code|ai)|licens.*(?:interest|consent|agree)|retain\s*ownership|receive\s*payment.*(?:used|training)|would\s*you\s*be\s*interested/i.test(labelLower))
  ) {
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Target Job Position / Applied Role Selection (e.g. "Job Position *", "Applied Role")
  if (/job\s*position|target\s*role|applied\s*position|\bposition\b|\brole\b|internship\s*domain|internship\s*role/i.test(labelLower)) {
    if (field.options && field.options.length > 0) {
      const targetKeywords = [
        ...(persona.targetRoles || []),
        ...(persona.skills || []),
        field.jobContext?.jobTitle || '',
      ].filter(Boolean);

      let bestOpt = field.options[0];
      let bestScore = -1;

      for (const opt of field.options) {
        if (/^(choose|select|select an option|please select|--)$/i.test(opt.trim())) continue;
        const optLower = opt.toLowerCase();
        let score = 0;
        for (const kw of targetKeywords) {
          const kwLower = kw.toLowerCase();
          if (optLower === kwLower) score += 10;
          else if (optLower.includes(kwLower) || kwLower.includes(optLower)) score += 5;
          else {
            const words = kwLower.split(/\s+/).filter((w) => w.length > 2);
            for (const w of words) {
              if (optLower.includes(w)) score += 2;
            }
          }
        }
        if (persona.resumeText) {
          const words = optLower.split(/\s+/).filter((w) => w.length > 3);
          for (const w of words) {
            if (persona.resumeText.toLowerCase().includes(w)) score += 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestOpt = opt;
        }
      }

      return { answer: bestOpt, confidence: 0.98, source: 'persona' };
    }

    // Direct candidate role fallback when dropdown options are not yet expanded in DOM
    const fallbackRole = persona.targetRoles?.[0] || field.jobContext?.jobTitle || 'Software Engineer';
    return { answer: fallbackRole, confidence: 0.95, source: 'persona' };
  }

  // Mandatory Reply / Email Verification / Terms & Acknowledgment
  if (/email\s*verification|mandatory\s*reply|understand|acknowledge|terms|declaration|agree|confirmation/i.test(labelLower)) {
    if (field.options && field.options.length > 0) {
      const affirmative = field.options.find((o) => /understand|agree|yes|confirm|accept/i.test(o)) || field.options[0];
      return { answer: affirmative, confidence: 0.99, source: 'persona' };
    }
    return { answer: 'Yes', confidence: 0.99, source: 'persona' };
  }

  // Company / Recent Employer - Extracted directly from candidate resume
  if (/(?:current|recent|most\s*recent)?\s*(?:company|comapny|employer|organization|organisation|firm|business)(?:\s*name)?\b/i.test(labelLower) && !/follow/i.test(labelLower)) {
    const comp = extractCompanyFromResume(persona) || 'N/A';
    return { answer: comp, confidence: 0.95, source: 'persona' };
  }

  // Student Status / Currently Enrolled / Recent Graduate
  if (/currently.*(?:enrolled|student)|are\s*you.*(?:student|recent\s*graduate)|student\s*status/i.test(labelLower)) {
    if (field.options && field.options.length > 0) {
      const match = field.options.find((o) => /student|recent\s*graduate|yes|enrolled/i.test(o));
      if (match) {
        questionMemory.addOrUpdateEntry(label, match, 'persona', 0.98);
        return { answer: match, confidence: 0.98, source: 'persona' };
      }
    }
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.98, source: 'persona' };
  }

  // Graduation Year / Expected Graduation Date
  if (/graduat.*(?:year|date)|expected.*graduat|year.*graduat/i.test(labelLower)) {
    const edu = `${persona.education || ''} ${persona.resumeText || ''} ${persona.resumeChunks?.education || ''}`;
    const allYears = Array.from(edu.matchAll(/\b(20[123][0-9])\b/g)).map((m) => parseInt(m[1], 10));
    const gradYear = allYears.length > 0 ? String(Math.max(...allYears)) : '2025';
    const ans = resolveMatch(gradYear, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.98, source: 'persona' };
  }

  // GPA / Academic Percentage
  if (/\bgpa\b|grades|academic.*percentage/i.test(labelLower)) {
    const edu = `${persona.education || ''} ${persona.resumeText || ''}`;
    const gpaMatch = edu.match(/\b([34]\.\d{1,2}|[7-9]\.\d{1,2}|[89]\d%?)\b/);
    const gpaVal = gpaMatch ? gpaMatch[1] : (field.options?.length ? field.options[0] : '3.8');
    const ans = resolveMatch(gpaVal, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.95);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Education Institution / University / School - Extracted directly from candidate resume
  if (/university|college|school|institution/i.test(labelLower) && !/student|enrolled|graduat/i.test(labelLower)) {
    if (field.options && field.options.some((o) => /^(yes|no)$/i.test(o.trim()))) {
      const affirmative = resolveMatch('Yes', field.options);
      return { answer: affirmative, confidence: 0.95, source: 'persona' };
    }
    const edu = persona.education || persona.resumeChunks?.education || persona.resumeText || '';
    if (edu) {
      const match = edu.match(/([A-Z][A-Za-z\s&.'-]{2,45}?(?:University|College|Institute|School|Academy|Polytechnic))/i);
      if (match) {
        return { answer: match[1].trim(), confidence: 0.95, source: 'persona' };
      }
      const firstLine = edu.split(/[\n\r]+/)[0].trim();
      if (firstLine.length > 3 && firstLine.length < 60) {
        return { answer: firstLine, confidence: 0.90, source: 'persona' };
      }
    }
  }

  // Education Major / Field of Study
  if (/major|field.*study|discipline/i.test(labelLower)) {
    const edu = persona.education || persona.resumeChunks?.education || persona.resumeText || '';
    if (edu) {
      const match = edu.match(/(?:in|major(?:\s*in)?|degree in|discipline:\s*)\s+([A-Za-z\s&]{3,35}?)(?:\s*\(|,|\.|\n|$)/i);
      if (match) return { answer: match[1].trim(), confidence: 0.95, source: 'persona' };
      if (/computer\s*science/i.test(edu)) return { answer: 'Computer Science', confidence: 0.95, source: 'persona' };
      if (/information\s*technology/i.test(edu)) return { answer: 'Information Technology', confidence: 0.95, source: 'persona' };
      if (/electrical|electronics/i.test(edu)) return { answer: 'Electrical Engineering', confidence: 0.95, source: 'persona' };
    }
  }

  // Education Degree
  if (/degree|highest.*level.*education|education.*level/i.test(labelLower)) {
    const edu = persona.education || persona.resumeChunks?.education || persona.resumeText || '';
    let deg = "Bachelor's Degree";
    if (/(?:Ph\.?D|Doctorate)/i.test(edu)) deg = 'Doctorate';
    else if (/(?:Master|M\.?S|M\.?Tech|MBA|M\.?A)/i.test(edu)) deg = "Master's Degree";
    else if (/(?:Bachelor|B\.?S|B\.?Tech|B\.?E|B\.?A)/i.test(edu)) deg = "Bachelor's Degree";
    else if (/(?:Associate)/i.test(edu)) deg = "Associate's Degree";
    const ans = resolveMatch(deg, field.options);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Job Search / Keyword Query / Search Inputs (Concise keywords only: Python AI Automation Engineer / Python Software Engineer)
  if (
    /describe.*job.*want|search.*by.*title|search.*job|title.*skill.*company|what.*job.*looking|desired.*role|target.*role|keyword.*search/i.test(labelLower) ||
    (field.placeholder && /describe.*job|search.*title/i.test(field.placeholder))
  ) {
    const primarySkill = (persona.techStack || []).find((s) => /python/i.test(s)) || 'Python';
    const primaryRole = (persona.targetRoles || [])[0] || 'Software Engineer';
    const conciseSearch = primaryRole.toLowerCase().includes(primarySkill.toLowerCase())
      ? primaryRole
      : `${primarySkill} ${primaryRole}`;

    questionMemory.addOrUpdateEntry(label, conciseSearch, 'persona', 1.0);
    return { answer: conciseSearch, confidence: 1.0, source: 'persona' };
  }

  // Job Title
  if (/job title|recent title|current title|headline|position.*title/i.test(labelLower)) {
    const title = persona.targetRoles?.[0] || 'Software Engineer';
    return { answer: title, confidence: 0.95, source: 'persona' };
  }

  // AI Agents / Autonomous Workflows / Tool-calling
  if (/ai agent|autonomous agent|llm pipeline|tool-calling|multi-step/i.test(labelLower)) {
    // If open-ended textarea, allow it to fall through to Tier 3 (Local LLM with Resume Context RAG)
    if (field.inputType === 'textarea' || (!field.options?.length && /describe/i.test(labelLower))) {
      // Pass through to Tier 3
    } else {
      const ans = resolveMatch('Yes', field.options);
      return { answer: ans, confidence: 1.0, source: 'persona' };
    }
  }

  // Experience with Specific Skills or Total Years of Experience
  const isExpQuery =
    /year.*exp|yrs.*exp|total.*exp|years.*work.*experience|experience.*with|experience.*in|what is your experience/i.test(labelLower) ||
    /experience.*(?:development|engineering|programming|software|mobile|app|web|python|typescript|react)/i.test(labelLower);

  if (isExpQuery) {
    // If open-ended / textarea question, allow Tier 3 Local LLM with Resume RAG to synthesize
    if (field.inputType === 'textarea' || (!field.options?.length && /describe|tell us|summary|brief|overview/i.test(labelLower))) {
      // Pass through to Tier 3
    } else if (field.options && field.options.some((o) => /^(yes|no)$/i.test(o.trim()))) {
      // Binary Yes/No question
      const resumeAll = `${(persona.techStack || []).join(' ')} ${persona.resumeText || ''} ${Object.values(persona.resumeChunks || {}).join(' ')}`.toLowerCase();
      const techWords = labelLower.replace(/how many years|what is your|years of|experience|with|in|do you have|work|are you|proficient/gi, '').trim().split(/\s+/);
      const hasTech = techWords.some((w) => w.length > 2 && resumeAll.includes(w));
      const ans = resolveMatch(hasTech ? 'Yes' : 'Yes', field.options);
      return { answer: ans, confidence: 0.95, source: 'persona' };
    } else {
      const yrs = String(persona.experienceYears ?? 0);
      const ans = resolveMatch(yrs, field.options);
      questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
      return { answer: ans, confidence: 1.0, source: 'persona' };
    }
  }

  // Remote Setting Comfort / Willingness
  if (/comfortable.*remote|willing.*remote|remote.*setting|work.*remote/i.test(labelLower)) {
    const ans = resolveMatch('Yes', field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 1.0, source: 'persona' };
  }

  // Notice Period / Availability / Immediate Joiner
  if (/notice.*period|how long.*notice|notice.*in.*days|availability.*to.*join|how soon.*start|earliest.*start/i.test(labelLower)) {
    const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
    const noticeDays = isFresher ? 0 : (persona.noticePeriodDays !== undefined ? persona.noticePeriodDays : 0);
    const isNumericReq = field.inputType === 'number' || /in.*days|\bdays?\b|number/i.test(labelLower);
    let ans = '';
    if (field.options && field.options.length > 0) {
      ans = resolveMatch(noticeDays === 0 ? 'Immediate' : `${noticeDays} days`, field.options);
    } else {
      ans = isNumericReq ? String(noticeDays) : (noticeDays === 0 ? 'Immediate' : `${noticeDays} days`);
    }
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Currently Working / Employed / Fresher Status
  if (/are you currently (?:working|employed)|currently (?:working|employed)|current employment status|are you a fresher/i.test(labelLower)) {
    const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
    const isAskingFresher = /fresher/i.test(labelLower);
    let ans = '';
    if (isAskingFresher) {
      ans = resolveMatch(isFresher ? 'Yes' : 'No', field.options);
    } else {
      ans = resolveMatch(isFresher ? 'No' : 'Yes', field.options);
    }
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.98, source: 'persona' };
  }

  // Current Company / Employer
  if (/current.*(?:company|employer|organization)|present.*(?:company|employer)|where do you work/i.test(labelLower)) {
    const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
    const ans = isFresher ? 'Fresher' : (persona.currentCompany || 'Software Company');
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.95);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Salary / Stipend Comfort / Hourly Rate / CTC
  if (/salary|compensation|expected.*pay|stipend|ctc|hourly|hourly.*rate|expected.*rate|rate.*per.*hour|\bwage\b|\bhourly\b|remuneration/i.test(labelLower)) {
    if (field.options && field.options.length > 0 && field.options.some((o) => /^(yes|no)$/i.test(o.trim()))) {
      const ans = resolveMatch('Yes', field.options);
      return { answer: ans, confidence: 0.95, source: 'persona' };
    }
    const ans = resolveCompensationAnswer(enrichedText, persona, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 0.98);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Location / Office presence
  if (/office.*work|work.*from.*office|relocat|office.*presence/i.test(labelLower)) {
    const ans = resolveMatch('Yes', field.options);
    return { answer: ans, confidence: 0.95, source: 'persona' };
  }

  // Geographic Field Direct Matching (Country, State, City, Postal Code)
  if (/postal.*code|zip.*code|\bzip\b|\bpin\s*code|\bpin\b/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    questionMemory.addOrUpdateEntry(label, geo.postalCode, 'persona', 1.0);
    return { answer: geo.postalCode, confidence: 0.99, source: 'persona' };
  }

  if (/\bcountry\b/i.test(labelLower) && !/code/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    const ans = resolveMatch(geo.country, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 0.99, source: 'persona' };
  }

  if (/\bstate\b|province|region/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    const ans = resolveMatch(geo.state, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 0.99, source: 'persona' };
  }

  if (/\bcity\b/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    const ans = resolveMatch(geo.city, field.options);
    questionMemory.addOrUpdateEntry(label, ans, 'persona', 1.0);
    return { answer: ans, confidence: 0.99, source: 'persona' };
  }

  // Professional Summary / About Me / Bio / Candidate Overview
  if (/^summary$|professional\s*summary|profile\s*summary|about\s*(?:you|yourself|me)|candidate\s*summary|^bio$/i.test(labelLower)) {
    if (field.inputType === 'textarea') {
      // Pass through to Tier 3 so local LLM synthesizes an articulate, job-tailored summary from candidate projects & skills
    } else {
      const summaryVal =
        persona.experienceSummary ||
        persona.resumeChunks?.summary ||
        `Software Engineer with ${persona.experienceYears ?? 0}+ years of experience building scalable applications with ${(persona.techStack || []).slice(0, 5).join(', ')}. Demonstrated success delivering high-performance features, full-stack architectures, and AI-driven automation.`;
      questionMemory.addOrUpdateEntry(label, summaryVal, 'persona', 0.98);
      return { answer: summaryVal, confidence: 0.98, source: 'persona' };
    }
  }

  // ----------------------------------------------------
  // TIER 3: Local LLM Inference (Qwen 2.5 1.5B via Ollama)
  // ----------------------------------------------------
  try {
    const isOllamaUp = await checkOllamaHealth(3000);
    if (isOllamaUp) {
      const chunks = buildResumeChunks(persona);
      const resumeContext = findRelevantResumeContext(label, chunks);

      const prompt = buildQuestionPrompt({
        question: label,
        persona,
        options: field.options,
        inputType: field.inputType,
        resumeContext,
        validationError: activeError || undefined,
        jobContext: field.jobContext,
      });

      const maxTokens = field.inputType === 'textarea' ? 512 : 256;
      const rawLlmOutput = await generateOllamaAnswer(prompt.userPrompt, prompt.systemPrompt, 0.0, maxTokens);
      const parsed = parseAnswer(rawLlmOutput, {
        inputType: field.inputType,
        options: field.options,
        required: field.required,
        validationError: activeError || undefined,
      });

      if (parsed.answer) {
        questionMemory.addOrUpdateEntry(label, parsed.answer, 'llm', parsed.confidence);
        return {
          answer: parsed.answer,
          confidence: parsed.confidence,
          source: 'llm',
          resumeContext: resumeContext ? resumeContext.trim().slice(0, 180) : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[QuestionResolver] Local LLM query failed, falling back to resume heuristics:', err);
  }

  // ----------------------------------------------------
  // TIER 4: Safe Fallback Heuristics Grounded in Resume
  // ----------------------------------------------------
  const fallbackChunks = buildResumeChunks(persona);
  const relevantContext = findRelevantResumeContext(label, fallbackChunks, 1);

  if (field.inputType === 'textarea') {
    if (/^summary$|professional\s*summary|profile\s*summary|about\s*(?:you|yourself|me)|candidate\s*summary|^bio$/i.test(labelLower)) {
      const summaryVal =
        persona.experienceSummary ||
        persona.resumeChunks?.summary ||
        `Software Engineer with ${persona.experienceYears ?? 0}+ years of experience building scalable applications with ${(persona.techStack || []).slice(0, 5).join(', ')}. Demonstrated success delivering high-performance features, full-stack architectures, and AI-driven automation.`;
      return { answer: summaryVal, confidence: 0.95, source: 'fallback' };
    }

    if (relevantContext) {
      const clean = relevantContext.replace(/^[\w\s]+:\s*/, '').replace(/\s+/g, ' ').trim();
      let answer = clean;
      if (clean.length > 800) {
        const lastSentence = clean.slice(0, 800).lastIndexOf('.');
        if (lastSentence > 300) {
          answer = clean.slice(0, lastSentence + 1);
        } else {
          const lastSpace = clean.slice(0, 800).lastIndexOf(' ');
          answer = (lastSpace > 300 ? clean.slice(0, lastSpace) : clean.slice(0, 800)) + '.';
        }
      }
      return { answer, confidence: 0.85, source: 'fallback' };
    }
    const fallbackDesc =
      persona.experienceSummary ||
      persona.resumeChunks?.summary ||
      persona.resumeChunks?.experience ||
      `Passionate engineering student and software developer experienced in ${(persona.techStack || []).slice(0, 4).join(', ')} with ${persona.experienceYears ?? 0}+ years delivering software applications, projects, and modern web solutions.`;
    return { answer: fallbackDesc, confidence: 0.8, source: 'fallback' };
  }

  if (field.options && field.options.length > 0) {
    if (relevantContext) {
      for (const opt of field.options) {
        if (relevantContext.toLowerCase().includes(opt.toLowerCase())) {
          return { answer: opt, confidence: 0.85, source: 'fallback' };
        }
      }
    }
    const affirmative = field.options.find((o) => /^(yes|agree|authorized)/i.test(o));
    const fallbackAnswer = affirmative || field.options[0];
    return { answer: fallbackAnswer, confidence: 0.7, source: 'fallback' };
  }

  if (errorAnalysis) {
    if (errorAnalysis.category === 'decimal') {
      const min = errorAnalysis.targetMinValue ?? 0;
      return { answer: min > 0 ? `${(min + 1.0).toFixed(1)}` : '1.0', confidence: 0.9, source: 'fallback' };
    }
    if (errorAnalysis.category === 'whole_number' || errorAnalysis.category === 'min_numeric') {
      const min = errorAnalysis.targetMinValue ?? 1;
      return { answer: String(min), confidence: 0.9, source: 'fallback' };
    }
    if (errorAnalysis.category === 'url') {
      return { answer: persona.linkedinUrl || 'https://linkedin.com', confidence: 0.9, source: 'fallback' };
    }
    if (errorAnalysis.category === 'phone') {
      return { answer: persona.phone || '+91 9876543210', confidence: 0.9, source: 'fallback' };
    }
    if (errorAnalysis.category === 'email') {
      return { answer: persona.email || 'candidate@example.com', confidence: 0.9, source: 'fallback' };
    }
    if (errorAnalysis.category === 'postal') {
      const geo = resolveGeographicDetailsSync(persona.location, persona);
      return { answer: geo.postalCode, confidence: 0.9, source: 'fallback' };
    }
  }

  if (field.inputType === 'number') {
    return { answer: String(persona.experienceYears ?? 0), confidence: 0.7, source: 'fallback' };
  }

  // Fallback for location/geographic inputs
  if (/postal.*code|zip.*code|\bzip\b|\bpin\b/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    return { answer: geo.postalCode, confidence: 0.95, source: 'fallback' };
  }
  if (/\bcountry\b/i.test(labelLower) && !/code/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    return { answer: geo.country, confidence: 0.95, source: 'fallback' };
  }
  if (/\bstate\b|province|region/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    return { answer: geo.state, confidence: 0.95, source: 'fallback' };
  }
  if (/\bcity\b/i.test(labelLower)) {
    const geo = resolveGeographicDetailsSync(persona.location, persona);
    return { answer: geo.city, confidence: 0.95, source: 'fallback' };
  }

  // Fallback for salary / hourly rate
  if (/salary|compensation|expected.*pay|stipend|ctc|hourly|hourly.*rate|expected.*rate|rate.*per.*hour|\bwage\b|\bhourly\b/i.test(labelLower)) {
    const hourlyVal = /hourly|per.*hour|\brate\b/i.test(labelLower) ? '25' : String(persona.minSalary || '25');
    return { answer: hourlyVal, confidence: 0.9, source: 'fallback' };
  }

  if (relevantContext && relevantContext.length > 0 && relevantContext.length < 60) {
    const isEduChunk = /education|b\.?tech|m\.?tech|bachelor|master|degree|college|university|school/i.test(relevantContext);
    const isEduQuery = /education|degree|school|university|college|study|gpa|major/i.test(labelLower);
    if (isEduChunk && !isEduQuery) {
      // Do not return education chunk for non-education question!
    } else {
      return { answer: relevantContext.trim(), confidence: 0.8, source: 'fallback' };
    }
  }

  return { answer: 'Yes', confidence: 0.6, source: 'fallback' };
}

/**
 * Backward-compatible helper for screening question solving.
 */
export async function solveScreeningQuestion(
  question: string,
  persona: PersonaData,
  options: {
    availableOptions?: string[];
    timeoutMs?: number;
    inputType?: string;
  } = {}
): Promise<ResolvedAnswer> {
  return resolveQuestion(
    {
      label: question,
      options: options.availableOptions,
      inputType: options.inputType,
    },
    persona
  );
}

