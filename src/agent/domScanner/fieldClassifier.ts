/**
 * ZeroApply DOM Scanner - Advanced Field Classifier
 * Semantically classifies discovered DOM form fields into 20+ standardized candidate attributes,
 * handles hierarchical fieldset/legend context, and binds mapped values from candidate Persona data.
 */

import type { PersonaData } from '../../types';
import { resolveGeographicDetailsSync } from '../location/geoIntelligence';
import { analyzeErrorConstraint } from '../localLlm/errorConstraintAnalyzer';
import { matchBestOption } from '../localLlm/answerParser';

/**
 * Resolves skill experience years or binary match against candidate resume/techStack.
 */
export function resolveSkillExperienceFromResume(
  text: string,
  options?: string[],
  persona?: PersonaData
): string {
  const baseYears = persona?.experienceYears !== undefined ? String(persona.experienceYears) : '2';

  // Binary Yes/No question
  if (options && options.some(o => /^(yes|no)$/i.test(o.trim()))) {
    const match = matchBestOption('Yes', options);
    return match?.option || 'Yes';
  }

  // If specific options provided (e.g. ranges: "1-3 years", "3-5 years")
  if (options && options.length > 0) {
    const match = matchBestOption(baseYears, options);
    if (match?.option) return match.option;
  }

  return baseYears;
}

export interface ScannedField {
  id: string;
  selector: string;
  fallbackSelectors?: string[];
  tagName: string;
  inputType: string;
  label: string;
  placeholder: string;
  name: string;
  autocomplete?: string;
  options?: string[];
  required: boolean;
  currentValue: string;
  hasError?: boolean;
  errorMessage?: string;
  rect?: { x: number; y: number; width: number; height: number; clientX?: number; clientY?: number };
  element?: unknown;
  contextHint?: string;
  helperText?: string;
  isCustomComponent?: boolean;
  platformSpecificType?: string;
}

export type StandardFieldType =
  | 'summary'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'name'
  | 'email'
  | 'phone'
  | 'phone_country_code'
  | 'address'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'country'
  | 'location'
  | 'linkedin_url'
  | 'github_url'
  | 'portfolio_url'
  | 'current_title'
  | 'current_company'
  | 'experience'
  | 'years_exp'
  | 'role_years_exp'
  | 'notice_period'
  | 'relocation'
  | 'work_preference'
  | 'work_authorization'
  | 'sponsorship_required'
  | 'sponsorship'
  | 'salary'
  | 'education_degree'
  | 'education_school'
  | 'education_major'
  | 'education_gpa'
  | 'education'
  | 'resume'
  | 'resume_upload'
  | 'cover_letter'
  | 'gender'
  | 'race_ethnicity'
  | 'veteran_status'
  | 'disability'
  | 'screening'
  | 'terms';

export interface ClassifiedField extends ScannedField {
  fieldType: StandardFieldType;
  confidence: number;
  standardKey: string;
  mappedValue?: string;
}

/**
 * Resolves appropriate phone country code based on candidate location or phone.
 */
export function resolvePhoneCountryCode(persona?: PersonaData): string {
  const loc = (persona?.location || '').toLowerCase();
  const phone = (persona?.phone || '');
  if (loc.includes('india') || phone.startsWith('+91') || phone.startsWith('91')) {
    return 'India (+91)';
  }
  if (loc.includes('united states') || loc.includes('usa') || phone.startsWith('+1')) {
    return 'United States (+1)';
  }
  if (loc.includes('united kingdom') || loc.includes('uk') || phone.startsWith('+44')) {
    return 'United Kingdom (+44)';
  }
  if (loc.includes('canada')) {
    return 'Canada (+1)';
  }
  if (loc.includes('germany') || phone.startsWith('+49')) {
    return 'Germany (+49)';
  }
  return 'India (+91)';
}

/**
 * Extracts city component from location string.
 */
function extractCity(location?: string, persona?: PersonaData): string | undefined {
  return resolveGeographicDetailsSync(location, persona).city;
}

/**
 * Extracts country component from location string.
 */
function extractCountry(location?: string, persona?: PersonaData): string | undefined {
  return resolveGeographicDetailsSync(location, persona).country;
}

/**
 * Extracts company name from candidate resume/persona.
 */
export function extractCompanyFromResume(persona?: PersonaData): string | undefined {
  if (!persona) return undefined;
  const sources = [
    persona.resumeChunks?.experience || '',
    persona.experienceSummary || '',
    persona.resumeText || '',
  ];

  for (const src of sources) {
    if (!src) continue;
    // Match "at Company", "for Company", "with Company", "company: Company", "employer: Company"
    const compMatch = src.match(/(?:\bat\b|\bfor\b|\bwith\b|\bcompany:\s*|\bemployer:\s*)\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40}?)(?:\s*\(|,|\.|\n|\s+-\s+|\s+–\s+|:|$)/i);
    if (compMatch && compMatch[1]) {
      const candidate = compMatch[1].trim();
      if (!/^(the|a|an|present|current|previous)$/i.test(candidate) && candidate.length > 2) {
        return candidate;
      }
    }
    // Match "Company | Role"
    const pipeMatch = src.match(/(?:^|\n)\s*([A-Z][A-Za-z0-9\s&.,'-]{2,35}?)\s*(?:\||•|–|-)\s*(?:[A-Za-z\s]+(?:Engineer|Developer|Architect|Manager|Lead|Intern|Specialist))/i);
    if (pipeMatch && pipeMatch[1]) {
      return pipeMatch[1].trim();
    }
  }
  return undefined;
}

/**
 * Extracts school / university name from candidate resume/persona.
 */
export function extractSchoolFromResume(persona?: PersonaData): string | undefined {
  if (!persona) return undefined;
  const sources = [
    persona.education || '',
    persona.resumeChunks?.education || '',
    persona.resumeText || '',
  ];

  for (const edu of sources) {
    if (!edu) continue;
    // 1. Match "University of ...", "College of ...", "Institute of ..."
    const uniOfMatch = edu.match(/\b((?:University|College|Institute|School|Academy)\s+of\s+[A-Z][A-Za-z\s&.'-]{2,35})/i);
    if (uniOfMatch && uniOfMatch[1]) {
      return uniOfMatch[1].trim();
    }
    // 2. Match "... University", "... College", "... Institute"
    const match = edu.match(/\b([A-Z][A-Za-z\s&.'-]{2,40}?\s+(?:University|College|Institute|School|Academy|Polytechnic))\b/i);
    if (match && match[1]) {
      const clean = match[1].replace(/^(?:at|in|from|degree|bachelor|master|phd|b\.?tech|m\.?tech|m\.?s|b\.?s)\s+/i, '').trim();
      return clean;
    }
  }
  return undefined;
}

/**
 * Extracts major / field of study from candidate resume/persona.
 */
export function extractMajorFromResume(persona?: PersonaData): string | undefined {
  if (!persona) return undefined;
  const edu = persona.education || persona.resumeChunks?.education || persona.resumeText || '';
  if (edu) {
    const match = edu.match(/(?:in|major(?:\s*in)?|degree in|discipline:\s*)\s+([A-Za-z\s&]{3,35}?)(?:\s*\(|,|\.|\n|$)/i);
    if (match) return match[1].trim();
    if (/computer\s*science/i.test(edu)) return 'Computer Science';
    if (/information\s*technology/i.test(edu)) return 'Information Technology';
    if (/electrical|electronics/i.test(edu)) return 'Electrical Engineering';
    if (/mechanical/i.test(edu)) return 'Mechanical Engineering';
    if (/data\s*science/i.test(edu)) return 'Data Science';
    if (/business\s*administration|finance|marketing/i.test(edu)) return 'Business Administration';
  }
  return undefined;
}

/**
 * Extracts degree level from candidate resume/persona.
 */
export function extractDegreeFromResume(persona?: PersonaData): string {
  if (!persona) return "Bachelor's Degree";
  const edu = persona.education || persona.resumeChunks?.education || persona.resumeText || '';
  if (/(?:Ph\.?D|Doctorate)/i.test(edu)) return 'Doctorate';
  if (/(?:Master|M\.?S|M\.?Tech|MBA|M\.?A)/i.test(edu)) return "Master's Degree";
  if (/(?:Bachelor|B\.?S|B\.?Tech|B\.?E|B\.?A)/i.test(edu)) return "Bachelor's Degree";
  if (/(?:Associate)/i.test(edu)) return "Associate's Degree";
  return "Bachelor's Degree";
}

/**
 * Classifies a single scanned field and optionally binds persona value.
 */
export function classifySingleField(field: ScannedField, persona?: PersonaData): ClassifiedField {
  // Combine context hint (legend / section heading), helper text, and error message with field labels
  const context = (field.contextHint || '').toLowerCase();
  const helper = (field.helperText || '').toLowerCase();
  const errText = (field.errorMessage || '').toLowerCase();
  const text = `${context ? context + ' ' : ''}${field.label} ${field.name} ${field.placeholder} ${field.id} ${helper} ${errText}`.toLowerCase();
  const inputType = (field.inputType || '').toLowerCase();

  // 0. LinkedIn Top Choice & Premium Upsell Guard (ALWAYS Skip / Say No / Uncheck)
  if (/top\s*choice|mark.*(?:as\s*a?\s*)?top\s*choice|top\s*applicant|premium\s*upsell|try\s*premium/i.test(text)) {
    return {
      ...field,
      fieldType: 'screening',
      confidence: 0.99,
      standardKey: 'top_choice_upsell',
      mappedValue: 'No',
    };
  }

  // 1. Phone Country Code (must precede general phone and location matchers)
  if (
    /country.*code|phone.*country|dialing.*code/i.test(text) ||
    field.id === 'input-phone-country' ||
    field.name === 'phoneCountry'
  ) {
    const countryCode = resolvePhoneCountryCode(persona);
    return {
      ...field,
      fieldType: 'phone_country_code',
      confidence: 0.98,
      standardKey: 'phone_country_code',
      mappedValue: countryCode,
    };
  }

  // 2. Mobile / Phone Number
  const labelOnly = (field.label || '').toLowerCase();
  const isExpLabel = /(?:how many years|years of?|what is your)\s*experience/i.test(labelOnly) || /(?:experience in|experience with)/i.test(labelOnly);
  const isExplicitPhone =
    /\bphone\b|\bmobile\s*phone\b|\bcell\s*phone\b|\bmobile\s*number\b|\bphone\s*number\b|\bcontact\s*number\b/i.test(labelOnly) ||
    inputType === 'tel' ||
    (field.name && /\bphone|\bmobile_phone/i.test(field.name)) ||
    (field.id && /\bphone|\bmobile_phone/i.test(field.id));

  if (!isExpLabel && (isExplicitPhone || (!/experience|years|how many/i.test(labelOnly) && /\bphone\b|\bmobile\s*(?:phone|number|no\b)|\bcontact\s*number\b/i.test(text)))) {
    return {
      ...field,
      fieldType: 'phone',
      confidence: 0.99,
      standardKey: 'phone',
      mappedValue: persona?.phone,
    };
  }

  // 3. Email
  if (inputType === 'email' || /email|e-mail/i.test(text)) {
    return {
      ...field,
      fieldType: 'email',
      confidence: 0.98,
      standardKey: 'email',
      mappedValue: persona?.email,
    };
  }

  // 4. First Name
  if (
    /first.*name|^first$|given.*name/i.test(text) ||
    field.id === 'first-name' ||
    field.name === 'firstName'
  ) {
    const mappedValue = persona?.fullName ? persona.fullName.trim().split(/\s+/)[0] : undefined;
    return {
      ...field,
      fieldType: 'first_name',
      confidence: 0.98,
      standardKey: 'first_name',
      mappedValue,
    };
  }

  // 5. Last Name
  if (
    /last.*name|^last$|family.*name|surname/i.test(text) ||
    field.id === 'last-name' ||
    field.name === 'lastName'
  ) {
    const parts = persona?.fullName ? persona.fullName.trim().split(/\s+/) : [];
    const mappedValue = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    return {
      ...field,
      fieldType: 'last_name',
      confidence: 0.98,
      standardKey: 'last_name',
      mappedValue,
    };
  }

  // 6. Full Name (Applicant / Candidate Personal Name ONLY)
  const cleanLabel = (field.label || '').trim().replace(/[*:]+$/, '').trim();
  const cleanPlaceholder = (field.placeholder || '').trim().replace(/[*:]+$/, '').trim();

  const isExcludedName =
    /(?:company|comapny|employer|organization|organisation|firm|business|agency|client|vendor|contractor|entity|school|college|university|institution|degree|project|repo|repository|software|tool|file|license|licens|licensing|manager|supervisor|reference|referee|emergency|product|team|git|github|domain|account|code|service|father|mother|spouse|friend|colleague)\b/i.test(text) ||
    /(?:company|comapny|employer|school|college|university|institution|firm|organization|organisation|manager|supervisor|reference)\s+name/i.test(text) ||
    /name\s+of\s+(?:your\s+)?(?:company|comapny|employer|school|college|university|institution|firm|organization|organisation|manager|supervisor|reference)/i.test(text);

  const isExplicitFullName =
    /\b(?:full\s*name|legal\s*name|candidate\s*name|applicant\s*name|your\s*full\s*name|first\s*(?:and|&|\/)\s*last\s*name|complete\s*name)\b/i.test(text);

  const isStrictIsolatedName =
    /^(?:your\s+)?name$/i.test(cleanLabel) ||
    /^(?:your\s+)?name$/i.test(cleanPlaceholder) ||
    /^(?:enter\s+(?:your\s+)?)?name$/i.test(cleanPlaceholder);

  const isNameAttribute =
    field.id === 'name' || field.name === 'name' ||
    field.id === 'full-name' || field.name === 'fullName' ||
    field.id === 'applicant-name' || field.name === 'applicantName' ||
    field.id === 'candidate-name' || field.name === 'candidateName';

  const isFullName = (isExplicitFullName || isStrictIsolatedName || isNameAttribute) && !isExcludedName;

  if (isFullName) {
    return {
      ...field,
      fieldType: 'full_name',
      confidence: 0.98,
      standardKey: 'full_name',
      mappedValue: persona?.fullName,
    };
  }

  // 6.5. Company / Page / Social Follow Questions (e.g. "Follow us for more insights https://www.linkedin.com/company/...")
  if (
    /follow.*(?:insights|page|company|channel|updates|linkedin)|(?:follow|join).*(?:us|page|channel|community|linkedin)/i.test(text)
  ) {
    const isCheckbox = inputType === 'checkbox' || inputType === 'switch' || field.inputType === 'checkbox';
    let affirmativeVal = 'Yes';
    if (isCheckbox) {
      affirmativeVal = 'true';
    } else if (field.options && field.options.length > 0) {
      const match = field.options.find((o) => /^(yes|agree|confirm|followed|true)$/i.test(o.trim()))
        || field.options.find((o) => /yes|agree|confirm|followed|true/i.test(o.trim()))
        || field.options.find((o) => !/^(choose|select|select an option|please select|--)$/i.test(o.trim()))
        || field.options[0];
      affirmativeVal = match;
    }
    return {
      ...field,
      fieldType: isCheckbox ? 'terms' : 'screening',
      confidence: 0.99,
      standardKey: 'company_follow_consent',
      mappedValue: affirmativeVal,
    };
  }

  // 7. Online Presence & Profiles (LinkedIn, GitHub, Portfolio)
  if (
    inputType !== 'checkbox' &&
    inputType !== 'select' &&
    field.tagName !== 'select' &&
    !/top\s*choice|premium/i.test(text) &&
    !/follow/i.test(text) &&
    /linkedin/i.test(text)
  ) {
    return {
      ...field,
      fieldType: 'linkedin_url',
      confidence: 0.98,
      standardKey: 'linkedin_url',
      mappedValue: persona?.linkedIn || persona?.linkedinUrl,
    };
  }
  if (/github/i.test(text)) {
    return {
      ...field,
      fieldType: 'github_url',
      confidence: 0.98,
      standardKey: 'github_url',
      mappedValue: persona?.gitHub,
    };
  }
  if (/portfolio|personal.*website|personal.*site|homepage|project.*showcase/i.test(text)) {
    const rawPortfolio = (persona?.portfolio || persona?.portfolioUrl || '').trim();
    const hasValidPortfolio = Boolean(
      rawPortfolio &&
      rawPortfolio !== 'N/A' &&
      !/^(none|nil|no|false|undefined|null)$/i.test(rawPortfolio)
    );
    return {
      ...field,
      fieldType: 'portfolio_url',
      confidence: 0.95,
      standardKey: 'portfolio_url',
      mappedValue: hasValidPortfolio ? rawPortfolio : 'N/A',
    };
  }

  // 8. Resume / CV File Upload
  if (
    (inputType === 'file' || /resume|cv|curriculum vitae/i.test(text)) &&
    !/cover.*letter/i.test(text)
  ) {
    return {
      ...field,
      fieldType: 'resume_upload',
      confidence: 0.95,
      standardKey: 'resume',
    };
  }

  // 9. Cover Letter
  if (/cover.*letter/i.test(text)) {
    return {
      ...field,
      fieldType: 'cover_letter',
      confidence: 0.92,
      standardKey: 'cover_letter',
    };
  }

  // 10. Visa Sponsorship & Work Authorization
  if (/sponsor|visa/i.test(text)) {
    return {
      ...field,
      fieldType: 'sponsorship',
      confidence: 0.95,
      standardKey: 'visa_sponsorship',
      mappedValue: 'No',
    };
  }
  if (/auth(oriz|orised)|eligible.*work|legal.*work|legally.*authorized/i.test(text)) {
    return {
      ...field,
      fieldType: 'work_authorization',
      confidence: 0.95,
      standardKey: 'work_authorization',
      mappedValue: 'Yes',
    };
  }

  // 10.5. Driver's License & Mobility / Commute (ALWAYS Affirmative "Yes" to prevent knockout/rejection)
  if (
    /(?:driver|driving|valid|operator|motor|commercial)\s*['’`]?\s*(?:s\s*)?licen[sc]e|clean\s*driving\s*record|reliable\s*(?:transport|transportation)|valid\s*(?:driver|driving)\s*licen[sc]e|\bvalid\s*licen[sc]e\b/i.test(text) ||
    (/\blicen[sc]e\b/i.test(text) && /driver|driving|vehicle|car|transport|valid/i.test(text))
  ) {
    let affirmativeVal = 'Yes';
    if (inputType === 'checkbox' || inputType === 'switch' || field.inputType === 'checkbox') {
      affirmativeVal = 'true';
    } else if (field.options && field.options.length > 0) {
      const match = field.options.find((o) => /^(yes|agree|confirm|true)$/i.test(o.trim()))
        || field.options.find((o) => /yes|agree|confirm|true/i.test(o.trim()))
        || field.options[0];
      affirmativeVal = match;
    }
    return {
      ...field,
      fieldType: 'screening',
      confidence: 0.99,
      standardKey: 'driver_license',
      mappedValue: affirmativeVal,
    };
  }

  // 11. Relocation & Work Preference
  if (/relocat/i.test(text)) {
    return {
      ...field,
      fieldType: 'relocation',
      confidence: 0.92,
      standardKey: 'relocation',
      mappedValue: 'Yes',
    };
  }
  if (/comfortable.*remote|willing.*remote|open.*remote|remote.*setting/i.test(text)) {
    return {
      ...field,
      fieldType: 'screening',
      confidence: 0.98,
      standardKey: 'remote_comfort',
      mappedValue: 'Yes',
    };
  }
  if (/work.*preference|workplace.*type/i.test(text)) {
    return {
      ...field,
      fieldType: 'work_preference',
      confidence: 0.92,
      standardKey: 'work_preference',
      mappedValue: persona?.workPreference || 'Remote',
    };
  }

  // 12. Notice Period / Availability
  if (/notice.*period|availability|how soon.*start|earliest.*start/i.test(text)) {
    const isNumericReq = field.inputType === 'number' ||
      /week|month|day|hour|decimal|numeric|number/i.test(text) ||
      Boolean(field.errorMessage && /decimal|number|larger than|greater than/i.test(field.errorMessage));

    const isFresher = persona?.employmentStatus === 'fresher' || (persona?.currentCtcLpa === 0 && persona?.employmentStatus !== 'currently_working');
    const noticeDays = isFresher ? 0 : (persona?.noticePeriodDays !== undefined ? persona.noticePeriodDays : 0);

    let noticeVal = noticeDays === 0 ? 'Immediately' : `${noticeDays} days`;
    if (isNumericReq) {
      if (noticeDays === 0 && field.errorMessage && /larger than 0(?:\.0)?|greater than 0/i.test(field.errorMessage)) {
        noticeVal = '1.0';
      } else {
        noticeVal = String(noticeDays);
      }
    }

    return {
      ...field,
      fieldType: 'notice_period',
      confidence: 0.90,
      standardKey: 'notice_period',
      mappedValue: noticeVal,
    };
  }

  // 13. Experience (Total Years vs Role / Specific Tech Experience)
  if (/total.*years|years.*experience|yrs.*exp|how many years.*experience/i.test(text) && !/experience\s+(?:in|with)/i.test(text)) {
    const yrs = resolveSkillExperienceFromResume(text, field.options, persona);
    return {
      ...field,
      fieldType: 'years_exp',
      confidence: 0.95,
      standardKey: 'experience_years',
      mappedValue: yrs,
    };
  }
  if (
    /experience\s+(?:in|with)|years.*(?:with|using|in)|what is your experience/i.test(text) ||
    /experience.*(?:development|engineering|programming|software|mobile|web|frontend|backend|cloud|app)/i.test(text)
  ) {
    // If textarea or open-ended essay question, route to screening resolution to synthesize project/experience text from resume
    if (inputType === 'textarea' || (!field.options?.length && /describe|tell us|summary|brief|overview/i.test(text))) {
      return {
        ...field,
        fieldType: 'screening',
        confidence: 0.90,
        standardKey: 'experience_description',
      };
    }
    const yrs = resolveSkillExperienceFromResume(text, field.options, persona);
    return {
      ...field,
      fieldType: 'role_years_exp',
      confidence: 0.95,
      standardKey: 'role_years_exp',
      mappedValue: yrs,
    };
  }

  // 12.5. Professional Summary / About Me / Bio / Candidate Profile Summary
  if (/^summary$|professional\s*summary|profile\s*summary|about\s*(?:you|yourself|me)|candidate\s*summary|^bio$/i.test(text)) {
    if (inputType === 'textarea') {
      return {
        ...field,
        fieldType: 'summary',
        confidence: 0.95,
        standardKey: 'professional_summary',
      };
    }
    const summaryVal =
      persona?.experienceSummary ||
      persona?.resumeChunks?.summary ||
      `Software Engineer with ${persona?.experienceYears || 2}+ years of experience building modern applications using ${(persona?.techStack || []).slice(0, 5).join(', ')}. Demonstrated success delivering high-performance features, full-stack architectures, and AI-driven automation.`;
    return {
      ...field,
      fieldType: 'summary',
      confidence: 0.95,
      standardKey: 'professional_summary',
      mappedValue: summaryVal,
    };
  }

  if (
    /job\s*position|target\s*role|applied\s*position|\bposition\s*applied\b|\brole\s*applied\b|\bposition\b|\brole\b|job.*title|recent.*title|current.*title|headline|position.*title/i.test(text)
  ) {
    let bestVal = persona?.targetRoles?.[0] || 'Software Engineer';
    if (field.options && field.options.length > 0) {
      const targetKeywords = [
        ...(persona?.targetRoles || []),
        ...(persona?.skills || []),
      ].filter(Boolean);

      let bestScore = -1;
      let matchedOpt = field.options[0];

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
        if (persona?.resumeText) {
          const words = optLower.split(/\s+/).filter((w) => w.length > 3);
          for (const w of words) {
            if (persona.resumeText.toLowerCase().includes(w)) score += 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          matchedOpt = opt;
        }
      }
      bestVal = matchedOpt;
    }

    return {
      ...field,
      fieldType: 'current_title',
      confidence: 0.95,
      standardKey: 'job_title',
      mappedValue: bestVal,
    };
  }
  // 13b. Conditional Company for Code Licensing / Independent Engineers
  if (
    /if\s*(?:a\s*)?(?:company|comapny)|(?:company|comapny).*(?:if\s*applicable|if\s*any|licens)|licens.*(?:company|comapny)|(?:company|comapny).*that\s*will\s*license/i.test(text)
  ) {
    return {
      ...field,
      fieldType: 'current_company',
      confidence: 0.99,
      standardKey: 'company_name',
      mappedValue: 'N/A',
    };
  }

  // 13c. General Current/Recent Company / Employer
  if (
    /(?:current|recent|most\s*recent)?\s*(?:company|comapny|employer|organization|organisation|firm|business)(?:\s*name)?\b/i.test(text) &&
    !/follow/i.test(text)
  ) {
    const isFresher = persona?.employmentStatus === 'fresher' || (persona?.currentCtcLpa === 0 && persona?.employmentStatus !== 'currently_working');
    const comp = isFresher ? 'Fresher' : (persona?.currentCompany || extractCompanyFromResume(persona) || 'N/A');
    return {
      ...field,
      fieldType: 'current_company',
      confidence: comp !== 'N/A' ? 0.95 : 0.70,
      standardKey: 'company_name',
      mappedValue: comp,
    };
  }

  // 14. Salary / Hourly Rate / Compensation / CTC
  if (/salary|compensation|expected.*pay|stipend|ctc|hourly|hourly.*rate|expected.*rate|rate.*per.*hour|\bwage\b|\bhourly\b|remuneration/i.test(text)) {
    const isHourly = /hourly|per.*hour|\brate\b|\/hr/i.test(text);
    if (isHourly) {
      return {
        ...field,
        fieldType: 'salary',
        confidence: 0.95,
        standardKey: 'salary',
        mappedValue: '25',
      };
    }

    const isCurrentCtc = /current\s*(?:ctc|salary|compensation|pay|rate|package)|present\s*(?:ctc|salary|compensation|pay|rate)|existing\s*ctc/i.test(text);
    const isFresher = persona?.employmentStatus === 'fresher' || (persona?.currentCtcLpa === 0 && persona?.employmentStatus !== 'currently_working');

    let baseLpa: number;
    if (isCurrentCtc) {
      if (isFresher) {
        baseLpa = 0;
      } else {
        baseLpa = persona?.currentCtcLpa !== undefined ? persona.currentCtcLpa : (persona?.minSalary !== undefined ? persona.minSalary : 8);
      }
    } else {
      // Expected CTC / Minimum salary
      baseLpa = persona?.minSalary !== undefined ? persona.minSalary : 12;
    }

    const isExplicitLpa = /\b(?:in\s*lpa|in\s*lakhs?|in\s*lacs?|\blpa\b|\blakhs?\b)\b/i.test(text);
    const isAnnualOrInr = /\b(?:inr|rupees?|₹|ctc|annual|yearly|per\s*annum)\b/i.test(text) ||
      /larger\s*than\s*100|greater\s*than\s*100|example:\s*\d{5,}/i.test(text);

    let sal: string;
    if (baseLpa === 0) {
      sal = '0';
    } else if (baseLpa <= 150 && isAnnualOrInr && !isExplicitLpa) {
      // LPA shorthand (e.g. 8) converted to full INR currency units (800000)
      sal = String(baseLpa * 100000);
    } else {
      sal = String(baseLpa);
    }

    return {
      ...field,
      fieldType: 'salary',
      confidence: 0.95,
      standardKey: 'salary',
      mappedValue: sal,
    };
  }

  // 15. Geographic Details (City, State, Postal Code, Country, Location)
  const geo = resolveGeographicDetailsSync(persona?.location, persona);
  if (/\bcity\b/i.test(text)) {
    const cityVal = /location/i.test(text) ? (geo.formattedAddress || geo.city) : geo.city;
    let mappedVal = cityVal;
    if (field.options && field.options.length > 0) {
      const match = matchBestOption(geo.formattedAddress, field.options) || matchBestOption(geo.city, field.options);
      if (match?.option) mappedVal = match.option;
    }
    return {
      ...field,
      fieldType: 'city',
      confidence: 0.95,
      standardKey: 'city',
      mappedValue: mappedVal,
    };
  }
  if (/\bcountry\b/i.test(text) && !/code/i.test(text)) {
    let countryVal = geo.country;
    if (field.options && field.options.length > 0) {
      const match = matchBestOption(countryVal, field.options);
      if (match?.option) countryVal = match.option;
    }
    return {
      ...field,
      fieldType: 'country',
      confidence: 0.95,
      standardKey: 'country',
      mappedValue: countryVal,
    };
  }
  if (/postal.*code|zip.*code|\bzip\b|\bpin\b/i.test(text)) {
    return {
      ...field,
      fieldType: 'postal_code',
      confidence: 0.95,
      standardKey: 'postal_code',
      mappedValue: geo.postalCode,
    };
  }
  if (/\bstate\b|province|region/i.test(text)) {
    let stateVal = geo.state;
    if (field.options && field.options.length > 0) {
      const match = matchBestOption(stateVal, field.options);
      if (match?.option) stateVal = match.option;
    }
    return {
      ...field,
      fieldType: 'state',
      confidence: 0.95,
      standardKey: 'state',
      mappedValue: stateVal,
    };
  }
  if (/street.*address|^address|address line/i.test(text)) {
    return {
      ...field,
      fieldType: 'address',
      confidence: 0.90,
      standardKey: 'address',
      mappedValue: geo.formattedAddress || persona?.location,
    };
  }
  if (/location/i.test(text)) {
    let locVal = geo.formattedAddress || persona?.location || geo.city;
    if (field.options && field.options.length > 0) {
      const match = matchBestOption(locVal, field.options) || matchBestOption(geo.city, field.options);
      if (match?.option) locVal = match.option;
    }
    return {
      ...field,
      fieldType: 'location',
      confidence: 0.90,
      standardKey: 'location',
      mappedValue: locVal,
    };
  }

  // 16. Education (Degree, School, Major, GPA)
  if (/degree|highest.*level.*education|education.*level/i.test(text)) {
    let deg = extractDegreeFromResume(persona);
    if (field.options && field.options.length > 0) {
      const match = matchBestOption(deg, field.options);
      if (match?.option) deg = match.option;
    }
    return {
      ...field,
      fieldType: 'education_degree',
      confidence: 0.95,
      standardKey: 'education_degree',
      mappedValue: deg,
    };
  }
  if (/university|college|school|institution/i.test(text)) {
    const school = extractSchoolFromResume(persona);
    return {
      ...field,
      fieldType: 'education_school',
      confidence: school ? 0.95 : 0.70,
      standardKey: 'education_school',
      mappedValue: school,
    };
  }
  if (/major|field.*study|discipline/i.test(text)) {
    const major = extractMajorFromResume(persona);
    return {
      ...field,
      fieldType: 'education_major',
      confidence: major ? 0.95 : 0.70,
      standardKey: 'education_major',
      mappedValue: major,
    };
  }
  if (/gpa|percentage|grades/i.test(text)) {
    return {
      ...field,
      fieldType: 'education_gpa',
      confidence: 0.88,
      standardKey: 'education_gpa',
    };
  }
  if (/education/i.test(text)) {
    return {
      ...field,
      fieldType: 'education',
      confidence: 0.85,
      standardKey: 'education',
      mappedValue: persona?.education,
    };
  }

  // 17. Voluntary Self-Identification & Equal Opportunity (EEO)
  if (/\bgender\b|\bsex\b/i.test(text)) {
    return {
      ...field,
      fieldType: 'gender',
      confidence: 0.92,
      standardKey: 'gender',
      mappedValue: 'Decline to self-identify',
    };
  }
  if (/race|ethnicity|hispanic|latino/i.test(text)) {
    return {
      ...field,
      fieldType: 'race_ethnicity',
      confidence: 0.92,
      standardKey: 'race_ethnicity',
      mappedValue: 'Decline to self-identify',
    };
  }
  if (/veteran|military/i.test(text)) {
    return {
      ...field,
      fieldType: 'veteran_status',
      confidence: 0.92,
      standardKey: 'veteran_status',
      mappedValue: 'I am not a protected veteran',
    };
  }
  if (/disability|handicap/i.test(text)) {
    return {
      ...field,
      fieldType: 'disability',
      confidence: 0.92,
      standardKey: 'disability',
      mappedValue: 'I do not have a disability',
    };
  }

  // 17.5. LinkedIn Top Choice & Premium Upsell Guard (ALWAYS Skip / Say No / Uncheck)
  if (/top\s*choice|mark.*(?:as\s*a?\s*)?top\s*choice|top\s*applicant|premium\s*upsell|try\s*premium/i.test(text)) {
    return {
      ...field,
      fieldType: 'screening',
      confidence: 0.99,
      standardKey: 'top_choice_upsell',
      mappedValue: 'No',
    };
  }

  // 17.9. Resume Pickers and Document Cards (must never be classified as generic checkboxes)
  if (/resume|\.pdf|\.docx?|cv\b/i.test(field.label || '') || /resume|\.pdf|\.docx?|cv\b/i.test(field.name || '') || /jobs-resume-picker/i.test(field.id || '')) {
    return {
      ...field,
      fieldType: 'resume',
      confidence: 0.99,
      standardKey: 'resume_upload',
    };
  }

  // 17.5. Applicant Entity Type / Applying As (Independent software engineer / Consultant vs Company / Other)
  if (
    /apply\s*to|applying\s*as|entity\s*type|applicant\s*type|capacity/i.test(text) ||
    (field.options && field.options.some((o) => /independent\s*software\s*engineer|independent\s*consultant|independent\s*contractor/i.test(o)))
  ) {
    if (field.options && field.options.length > 0) {
      const match = field.options.find((o) =>
        /independent\s*software\s*engineer|independent\s*consultant|independent\s*contractor|individual|self-employed/i.test(o)
      );
      if (match) {
        return {
          ...field,
          fieldType: 'screening',
          confidence: 0.99,
          standardKey: 'applicant_type',
          mappedValue: match,
        };
      }
    }
  }

  // 17.6. Code Licensing / AI Training Interest (Affirmative "Yes")
  if (/licens.*(?:code|software|ai\s*training)|retain\s*ownership|receive\s*payment.*(?:used|training)|interested\s*in.*licensing/i.test(text)) {
    let affirmativeVal = 'Yes';
    if (field.options && field.options.length > 0) {
      const opt = field.options.find((o) => /^(yes|agree|confirm|true)$/i.test(o.trim())) || field.options[0];
      affirmativeVal = opt;
    }
    return {
      ...field,
      fieldType: 'screening',
      confidence: 0.99,
      standardKey: 'licensing_consent',
      mappedValue: affirmativeVal,
    };
  }

  // 18. Terms, Privacy Agreement, Verification, and Community Checkboxes
  if (
    (inputType === 'checkbox' || field.inputType === 'checkbox' || field.tagName === 'input' || field.tagName === 'label' || field.isCustomComponent) &&
    (/terms|privacy|policy|follow.*company|consent|agree|agreement|verify|accurate|confirm|declaration|certify|communications|whatsapp|joined|community|receive|updates/i.test(text))
  ) {
    return {
      ...field,
      fieldType: 'terms',
      confidence: 0.98,
      standardKey: 'terms_agreement',
      mappedValue: 'true',
    };
  }

  // 18.5. Job Search / Search Keywords / Role Query (Only for in-form questions, never global search bars)
  const isGlobalSearchBar = /jobs-search-box|global-nav|search-global-typeahead|jobs-search__input|search-box/i.test(
    `${field.selector || ''} ${field.name || ''} ${field.id || ''}`
  );
  if (
    !isGlobalSearchBar &&
    (/describe.*job.*want|what.*job.*looking|desired.*role|target.*role/i.test(text) ||
    (field.placeholder && /describe.*job.*want|desired.*role/i.test(field.placeholder)))
  ) {
    const primarySkill = (persona?.techStack || []).find((s) => /python/i.test(s)) || 'Python';
    const primaryRole = (persona?.targetRoles || [])[0] || 'Software Engineer';
    const conciseSearch = primaryRole.toLowerCase().includes(primarySkill.toLowerCase())
      ? primaryRole
      : `${primarySkill} ${primaryRole}`;

    return {
      ...field,
      fieldType: 'current_title',
      confidence: 0.98,
      standardKey: 'current_title',
      mappedValue: conciseSearch,
    };
  }

  // 18.8. General Application & Consent Checkboxes
  if (inputType === 'checkbox' || inputType === 'switch' || field.inputType === 'checkbox') {
    if (/top\s*choice|premium|upsell/i.test(text)) {
      return {
        ...field,
        fieldType: 'terms',
        confidence: 0.99,
        standardKey: 'top_choice_upsell',
        mappedValue: 'No',
      };
    }
    return {
      ...field,
      fieldType: 'terms',
      confidence: 0.92,
      standardKey: 'consent_checkbox',
      mappedValue: 'true',
    };
  }

  // 19. Default: Novel Screening Question (routed to local Qwen 2.5)
  return {
    ...field,
    fieldType: 'screening',
    confidence: 0.80,
    standardKey: 'screening_question',
  };
}

export function classifyFields(fields: ScannedField[], persona?: PersonaData): ClassifiedField[] {
  return (fields || [])
    .filter((f) => {
      const text = ((f.label || '') + ' ' + (f.name || '') + ' ' + (f.placeholder || '') + ' ' + (f.id || '')).toLowerCase();
      if (/(?:receive|create|get)\s*(?:an?\s*)?alert|alert\s*frequency|job\s*alert|search\s*by\s*keyword|search\s*by\s*location|search\s*by\s*postal/i.test(text)) {
        return false;
      }
      return true;
    })
    .map((f) => {
    const classified = classifySingleField(f, persona);
    if (classified.standardKey === 'top_choice_upsell') {
      classified.mappedValue = 'No';
      return classified;
    }

    // Universal validation error constraint handler (e.g. decimal, integer, URL, phone, etc.)
    const activeErr = classified.errorMessage || '';
    if (activeErr) {
      const analysis = analyzeErrorConstraint(activeErr);
      if (analysis.category === 'decimal') {
        const currentVal = classified.mappedValue ? Number(classified.mappedValue) : NaN;
        const isCurrentNonNumeric = isNaN(currentVal);
        const min = analysis.targetMinValue ?? 0;
        const violatesMin = !isCurrentNonNumeric && (currentVal < min || (currentVal === min && /(?:larger|greater|more)\s*than/i.test(activeErr)));
        if (isCurrentNonNumeric || violatesMin) {
          classified.mappedValue = min > 0 ? `${(min + 1.0).toFixed(1)}` : '1.0';
        }
      } else if (analysis.category === 'whole_number' || analysis.category === 'min_numeric') {
        const min = analysis.targetMinValue ?? 1;
        const currentVal = classified.mappedValue ? Number(classified.mappedValue) : NaN;
        const isCurrentNonNumeric = isNaN(currentVal);
        const violatesMin = !isCurrentNonNumeric && (currentVal < min || (currentVal === min && /(?:larger|greater|more)\s*than/i.test(activeErr)));

        if (isCurrentNonNumeric || violatesMin) {
          const isCompField = classified.fieldType === 'salary' || /salary|compensation|pay|ctc|remuneration|wage/i.test(classified.label || '');
          if (isCompField && persona) {
            const isCurrentCtc = /current\s*(?:ctc|salary|compensation|pay|rate|package)|present\s*(?:ctc|salary|compensation|pay|rate)|existing\s*ctc/i.test(classified.label || '');
            const isFresher = persona.employmentStatus === 'fresher' || (persona.currentCtcLpa === 0 && persona.employmentStatus !== 'currently_working');
            let baseLpa: number;
            if (isCurrentCtc) {
              baseLpa = isFresher ? 0 : (persona.currentCtcLpa !== undefined ? persona.currentCtcLpa : (persona.minSalary || 8));
            } else {
              baseLpa = persona.minSalary || 12;
            }

            if (baseLpa <= 150 && min >= 100 && baseLpa > 0) {
              // Convert LPA shorthand (e.g. 8) to full INR value (e.g. 800000)
              classified.mappedValue = String(baseLpa * 100000);
            } else {
              const safeMin = /(?:larger|greater|more)\s*than/i.test(activeErr) ? min + 1 : min;
              classified.mappedValue = String(Math.max(baseLpa, safeMin));
            }
          } else if (/\b(?:experience|years?|yrs?)\b/i.test(classified.label || '') && !/expected|example/i.test(classified.label || '') && persona) {
            const safeMin = /(?:larger|greater|more)\s*than/i.test(activeErr) ? min + 1 : min;
            classified.mappedValue = String(Math.max(persona.experienceYears || 2, safeMin));
          } else {
            const safeMin = /(?:larger|greater|more)\s*than/i.test(activeErr) ? min + 1 : min;
            classified.mappedValue = String(safeMin);
          }
        }
      } else if (analysis.category === 'url' && persona) {
        if (/portfolio|personal\s*website|personal\s*site|homepage/i.test(classified.label || '')) {
          const rawP = (persona.portfolio || persona.portfolioUrl || '').trim();
          const hasP = Boolean(rawP && rawP !== 'N/A' && !/^(none|nil|no|false)$/i.test(rawP));
          classified.mappedValue = hasP ? rawP : (persona.linkedinUrl || persona.githubUrl || 'https://linkedin.com');
        } else {
          classified.mappedValue = persona.linkedinUrl || persona.portfolioUrl || persona.githubUrl || 'https://linkedin.com';
        }
      } else if (analysis.category === 'phone' && persona) {
        classified.mappedValue = persona.phone || '+91 9876543210';
      } else if (analysis.category === 'email' && persona) {
        classified.mappedValue = persona.email || 'candidate@example.com';
      } else if (analysis.category === 'required_selection' && classified.options && classified.options.length > 0) {
        const affirmative = classified.options.find(o => /^(yes|agree|confirm|true|followed)$/i.test(o.trim()))
          || classified.options.find(o => /yes|agree|confirm|true|followed/i.test(o.trim()));
        const validNonPlaceholder = classified.options.find(o => !/^(select|choose|select an option|please select|--)$/i.test(o.trim()));
        classified.mappedValue = affirmative || validNonPlaceholder || classified.options[0];
      }
    }

    // Sanity check: If options are binary Yes/No, mappedValue must be 'Yes' or 'No'
    if (classified.options && classified.options.some((o) => /^(yes|no)$/i.test(o.trim()))) {
      if (classified.mappedValue && !/^(yes|no)$/i.test(classified.mappedValue)) {
        if (
          /remote|on-site|hybrid|comfort|will|agree|authoriz|eligib|permit|able|yes|licens|retain\s*ownership|receive\s*payment|ai\s*training|driver|driving/i.test(classified.mappedValue) ||
          /comfortable|willing|open|authorize|eligible|remote.*setting|interest.*licens|retain\s*ownership|receive\s*payment|ai\s*training|driver|driving|licen[sc]e/i.test(classified.label || '')
        ) {
          classified.mappedValue = 'Yes';
        }
      }
    }
    return classified;
  });
}

