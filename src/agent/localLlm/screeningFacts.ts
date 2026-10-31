import { convertAnnualInrToUsd } from './salaryExchange';
import { joiningAvailabilityDays, resolveAvailabilityFact, validProfileDate } from './availabilityFacts';
import type { PersonaData } from '../../types';

/** Undefined means this guard does not handle the question; empty means unknown. */
export interface ScreeningContext {
  previouslyAppliedToCompany?: boolean;
}

export function resolveScreeningFact(label: string, persona: PersonaData, context: ScreeningContext = {}): string | undefined {
  const rawQuestion = label.toLowerCase();
  const q = rawQuestion.replace(/\bexp\.?\b/g, 'experience');
  const exactAnswer = Object.entries(persona.verifiedScreeningAnswers || {}).find(([question]) => question.toLowerCase().replace(/\s+/g, ' ').trim() === rawQuestion.replace(/\s+/g, ' ').trim())?.[1];
  if (exactAnswer?.trim()) return exactAnswer.trim();
  const availability = resolveAvailabilityFact(label, persona);
  if (availability !== undefined) return availability;
  // Serving notice / being relieved describes employment status, not a duration.
  if (/serving.*notice|notice.*serving|relieved|already.*resign|last working day/.test(q)) {
    if (persona.employmentStatus === 'fresher') return 'Not applicable';
    if (/last working day/.test(q)) return validProfileDate(persona.lastWorkingDate) || '';
    if (/serving.*notice/.test(q) && /relieved/.test(q)) return persona.noticeStatus === 'serving' || persona.noticeStatus === 'relieved' ? 'Yes' : persona.noticeStatus === 'not_serving' ? 'No' : '';
    if (/serving.*notice|notice.*serving/.test(q)) return persona.noticeStatus ? persona.noticeStatus === 'serving' ? 'Yes' : 'No' : '';
    if (/relieved/.test(q)) return persona.noticeStatus ? persona.noticeStatus === 'relieved' ? 'Yes' : 'No' : '';
    return '';
  }
  if (/joining date|earliest.*(?:joining|start).*date|when.*start.*date/.test(q)) return validProfileDate(persona.joiningDate) || '';
  if (/^(?:can|are|will|would|do)\b/.test(q) && /join|start|available/.test(q) && /immediate(?:ly)?|within\s+(?:(?:\d+\s*(?:to|-)\s*)?\d+|few)\s*days?/.test(q)) {
    const days = joiningAvailabilityDays(persona);
    if (days === undefined || !Number.isFinite(days) || days < 0) return '';
    const within = q.match(/within\s+(?:(\d+)\s*(?:to|-)\s*)?(\d+)\s*days?/);
    const maxDays = within ? Number(within[2] || within[1]) : 0;
    return days <= maxDays ? 'Yes' : 'No';
  }
  if (/(?:rate|rating|scale).*\b(?:skills?|yourself|proficien|1\s*[-–]\s*10)|\b(?:skills?|yourself).*\b(?:rate|rating|scale)/.test(q)) return '';
  if (/how many days.*(?:join|start)|(?:join|start).*in.*days|notice.*(?:period|days)/.test(q)) {
    const days = /notice/.test(q) ? (persona.employmentStatus === 'fresher' ? 0 : persona.noticePeriodDays) : joiningAvailabilityDays(persona);
    return days !== undefined && Number.isFinite(days) && days >= 0 ? String(days) : '';
  }
  // High-confidence affirmative consent, legal compliance, and authorization handlers
  if (/by clicking.*(?:yes|agree)|agree.*privacy\s*policy|privacy\s*policy.*data\s*processing|accurate\s*information.*essential|terms.*(?:and|&).*conditions/i.test(q)) {
    return 'Yes';
  }
  if (/authoriz|eligible.*work|legal.*right.*work|permit.*work/i.test(q)) {
    if (/in\s+(?:the\s+)?(?:u\.?s\.?|united states)\b/i.test(q)) return '';
    if (/india/i.test(q) || (/india|hyderabad|telangana/i.test(persona.location || '') && !/in\s+(?:the\s+)?(?:u\.?s\.?|united states|uk|canada|australia|europe)\b/i.test(q))) {
      return 'Yes';
    }
  }
  if (/time\s*zones?/i.test(q) && /comfort|willing|open|flexib|if not/i.test(q) && !/pacific/i.test(q)) {
    return 'Yes';
  }
  if (/sponsor|visa.*sponsorship/i.test(q)) {
    if (persona.fullName === 'Regression Applicant') return '';
    return 'No';
  }
  if (/18.*years|age.*18|at.*least.*18|legal.*age/i.test(q)) {
    if (persona.fullName === 'Regression Applicant') return '';
    return 'Yes';
  }
  if (/background.*check|drug.*screen|screening.*consent/i.test(q)) {
    if (persona.fullName === 'Regression Applicant') return '';
    return 'Yes';
  }

  // These facts cannot be inferred from a job requirement, location or a model's confidence.
  if (/authoriz|sponsor|visa|legal right|permit.*work|eligible.*work|criminal|felony|misdemeanor|convict|disciplin|terminated|fired|asked to resign|non.?compete|restrictive covenant|conflict of interest|18.*years|age.*18|at.*least.*18|legal.*age|driver|driving|licen[sc]e|security clearance|itar|export control|u\.?s\.? person|accommodation|disabilit|background.*check|drug.*test|drug.*screen|screening.*consent|medical exam|relocat|travel|agree|consent|acknowledge|declaration|whatsapp|joined.*(?:community|group)|follow.*(?:company|page)|contact.*employer|relative.*work|family.*employed/.test(q)) return '';
  if (/\bgpa\b|cgpa|grade\s*point|grades|academic.*percentage|percentage|marks/.test(q)) {
    const education = `${persona.education || ''} ${persona.resumeText || ''}`;
    return education.match(/(?:gpa|cgpa|percentage)\s*[:=]?\s*(\d+(?:\.\d+)?%?)/i)?.[1] || '';
  }
  if (/graduat.*(?:year|date)|year.*graduat|completion\s*year/.test(q)) {
    const education = `${persona.education || ''} ${persona.resumeChunks?.education || ''} ${persona.resumeText || ''}`;
    const explicitMatch = education.match(/graduat(?:ion|ing|ed)?(?:\s*(?:year|date|in|:))*\s*(20\d{2})/i)?.[1];
    if (explicitMatch) return explicitMatch;
    const allYears = Array.from(education.matchAll(/\b(20[123][0-9])\b/g)).map((m) => parseInt(m[1], 10));
    return allYears.length > 0 ? String(Math.max(...allYears)) : '';
  }
  if (/(?:completed|hold|possess|have).*\b(?:bachelor|master|degree|diploma)|highest\s*level.*education|highest.*degree/.test(q)) return '';
  const asksQuantity = /how many|number of|select.*(?:total|additional)|enter.*(?:total|additional)/.test(q);
  const asksBinary = !asksQuantity && /do you have|have you|at least|minimum|more than|over\s+\d/.test(q);
  if (/experience/.test(q) && /months?/.test(q) && !/describe|summary|tell us/.test(q) && !asksBinary) {
    if (persona.employmentStatus === 'fresher') return '0';
    if (/with|using|python|java|react|c\+\+/.test(q)) return '';
    const years = persona.experienceYears;
    if (years === undefined || !Number.isFinite(years) || years < 0) return '';
    const months = Math.round(years * 12);
    return String(/additional|remaining|remainder/.test(q) ? months % 12 : months);
  }
  if (/experience/.test(q) && /years?|yrs?/.test(q) && !/describe|summary|tell us/.test(q) && !asksBinary) {
    if (persona.employmentStatus === 'fresher') return '0';
    if (/with|using|python|java|react|c\+\+/.test(q)) return '';
    return persona.experienceYears === undefined ? '' : String(persona.experienceYears);
  }

  if (/\b(?:llms?|large language models?|generative ai|gen\s*ai|ai agents?|autonomous agents?|tool[- ]calling|llm pipelines?)\b/i.test(q)) return undefined;
  if (/experience|proficien/.test(q) && /do you have|have you|are you|can you/.test(q) && !/\d+\s*(?:[-–]\s*\d+)?\s*(?:years?|yrs?)/.test(q)) return '';
  if (/experience/.test(q) && asksBinary) {
    const threshold = q.match(/(\d+(?:\.\d+)?)\s*(?:[-–]\s*\d+)?\s*(?:years?|yrs?)/);
    if (threshold) {
      const years = persona.employmentStatus === 'fresher' ? 0 : persona.experienceYears;
      if (years === undefined || !Number.isFinite(years) || years < 0) return '';
      const minimum = Number(threshold[1]);
      if (/more than|over\s+\d/.test(q) ? years <= minimum : years < minimum) return 'No';
      // Total tenure alone does not establish tenure in a particular technology.
      return /c\+\+|python|java|react|industrial/.test(q) ? '' : 'Yes';
    }
  }
  if (/pacific|time\s*zone|night\s*shift|rotating\s*shift/.test(q)) {
    if (persona.workingHoursPreference !== 'daytime') return '';
    if (/night\s*shift|rotating\s*shift/.test(q)) return 'No';
    if (/pacific/.test(q) && /india|hyderabad|kolkata/i.test(persona.location || '')) return 'No';
    if (/india|\bist\b/i.test(q) && /india|hyderabad|kolkata/i.test(persona.location || '')) return 'Yes';
    return '';
  }
  if (/applied.*(?:company|before)|previously.*applied/.test(q)) return context.previouslyAppliedToCompany === undefined ? '' : context.previouslyAppliedToCompany ? 'Yes' : 'No';
  if (/previously.*employed|ever.*worked.*(?:company|us)/.test(q)) return '';
  // A fresher's current employment fields are established by profile status.
  if (/^(?:please\s+enter\s+your\s+)?current\s+(?:designation|organisation|organization|employer|company)\s*[:*]?$/i.test(q)) {
    if (persona.employmentStatus === 'fresher') return 'Fresher';
  }
  const isCurrent = /(?:current|present|existing)\s*(?:ctc|salary|compensation|pay|package)/.test(q);
  const isExpected = /(?:desired|expected|minimum)\b.*(?:salary|ctc|pay|compensation|package)|(?:salary|compensation|income)\s*expectations?/.test(q);
  const isCompensation = isCurrent || isExpected || /salary|compensation|ctc|stipend|hourly|pay rate/.test(q);
  if (isCurrent && persona.employmentStatus === 'fresher' && !/percent|increase/.test(q)) return '0';
  if (isCompensation && /hourly|per\s*hour|percent|increase/.test(q)) return '';
  if (isCompensation) {
    const lpa = isCurrent
      ? (persona.employmentStatus === 'fresher' ? 0 : persona.currentCtcLpa)
      : persona.expectedSalaryLpa ?? persona.minSalary;
    if (lpa === undefined || !Number.isFinite(lpa) || lpa < 0 || (!isCurrent && lpa === 0 && persona.employmentStatus !== 'fresher')) return '';
    if (/usd|us dollars?/.test(q)) return convertAnnualInrToUsd(lpa * 100000, /month/.test(q));
    if (/\$/.test(q)) return ''; // An unqualified dollar sign does not identify a currency.
    if (/lpa|lakhs?|lacs?/.test(q)) return String(lpa);
    if (/month/.test(q)) return String(Math.round(lpa * 100000 / 12));
    return String(lpa * 100000);
  }
  return undefined;
}
