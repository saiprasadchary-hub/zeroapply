import { resolveAvailabilityFact } from './availabilityFacts';
import type { PersonaData } from '../../types';

/** Undefined means this guard does not handle the question; empty means unknown. */
export interface ScreeningContext {
  previouslyAppliedToCompany?: boolean;
}

export function resolveScreeningFact(label: string, persona: PersonaData, context: ScreeningContext = {}): string | undefined {
  const q = label.toLowerCase();
  const exactAnswer = Object.entries(persona.verifiedScreeningAnswers || {}).find(([question]) => question.toLowerCase().replace(/\s+/g, ' ').trim() === q.replace(/\s+/g, ' ').trim())?.[1];
  if (exactAnswer?.trim()) return exactAnswer.trim();
  const availability = resolveAvailabilityFact(label, persona);
  if (availability !== undefined) return availability;
  // These facts cannot be inferred from a job requirement, location or a model's confidence.
  if (/authoriz|sponsor|visa|legal right|permit.*work|eligible.*work|criminal|felony|misdemeanor|convict|disciplin|terminated|fired|asked to resign|non.?compete|restrictive covenant|conflict of interest|18.*years|age.*18|at.*least.*18|legal.*age|driver|driving|licen[sc]e|security clearance|itar|export control|u\.?s\.? person|accommodation|disabilit|background.*check|drug.*test|drug.*screen|screening.*consent|medical exam|relocat|travel|agree|consent|acknowledge|declaration|whatsapp|joined.*(?:community|group)|follow.*(?:company|page)|contact.*employer|relative.*work|family.*employed/.test(q)) return '';
  if (/\bgpa\b|cgpa|grade\s*point|grades|academic.*percentage|percentage|marks/.test(q)) {
    const education = `${persona.education || ''} ${persona.resumeText || ''}`;
    return education.match(/(?:gpa|cgpa|percentage)\s*[:=]?\s*(\d+(?:\.\d+)?%?)/i)?.[1] || '';
  }
  if (/graduat.*(?:year|date)|year.*graduat|completion\s*year/.test(q)) {
    const education = `${persona.education || ''} ${persona.resumeChunks?.education || ''} ${persona.resumeText || ''}`;
    return education.match(/graduat(?:ion|ing|ed)?(?:\s*(?:year|date|in|:))*\s*(20\d{2})/i)?.[1] || '';
  }
  if (/(?:completed|hold|possess|have).*\b(?:bachelor|master|degree|diploma)|level.*education/.test(q)) return '';
  if (/experience/.test(q) && /months?/.test(q) && !/describe|summary|tell us|do you have|have you/.test(q)) {
    if (persona.employmentStatus === 'fresher') return '0';
    if (/with|using|python|java|react|c\+\+/.test(q)) return '';
    const years = persona.experienceYears;
    if (years === undefined || !Number.isFinite(years) || years < 0) return '';
    const months = Math.round(years * 12);
    return String(/additional|remaining|remainder/.test(q) ? months % 12 : months);
  }
  if (/experience/.test(q) && /years?|yrs?/.test(q) && !/describe|summary|tell us/.test(q) && !/do you have|have you|at least|minimum/.test(q)) {
    if (persona.employmentStatus === 'fresher') return '0';
    if (/with|using|python|java|react|c\+\+/.test(q)) return '';
    return persona.experienceYears === undefined ? '' : String(persona.experienceYears);
  }

  if (/experience|proficien|ai agent|autonomous agent|tool.calling|llm pipeline/.test(q) && /do you have|have you|are you|can you/.test(q) && !/\d+\s*(?:[-–]\s*\d+)?\s*(?:years?|yrs?)/.test(q)) return '';
  if (/experience/.test(q) && /do you have|have you|at least|minimum/.test(q)) {
    const threshold = q.match(/(\d+(?:\.\d+)?)\s*(?:[-–]\s*\d+)?\s*(?:years?|yrs?)/);
    if (threshold) {
      const years = persona.employmentStatus === 'fresher' ? 0 : persona.experienceYears;
      if (years === undefined) return '';
      if (years < Number(threshold[1])) return 'No';
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
  const isCurrent = /(?:current|present|existing)\s*(?:ctc|salary|compensation|pay|package)/.test(q);
  const isExpected = /(?:desired|expected|minimum)\b.*(?:salary|ctc|pay|compensation|package)|(?:salary|compensation)\s*expectations?/.test(q);
  const isCompensation = isCurrent || isExpected || /salary|compensation|ctc|stipend|hourly|pay rate/.test(q);
  if (isCompensation && /hourly|per\s*hour|usd|\$|percent|increase/.test(q)) return '';
  if (isCompensation) {
    const lpa = isCurrent
      ? (persona.employmentStatus === 'fresher' ? 0 : persona.currentCtcLpa)
      : persona.expectedSalaryLpa ?? persona.minSalary;
    if (lpa === undefined || !Number.isFinite(lpa) || lpa < 0 || (!isCurrent && lpa === 0 && persona.employmentStatus !== 'fresher')) return '';
    if (/lpa|lakhs?|lacs?/.test(q)) return String(lpa);
    if (/month/.test(q)) return String(Math.round(lpa * 100000 / 12));
    return String(lpa * 100000);
  }
  return undefined;
}
