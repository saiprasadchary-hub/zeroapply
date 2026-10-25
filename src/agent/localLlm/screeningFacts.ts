import type { PersonaData } from '../../types';

/** Undefined means this guard does not handle the question; empty means unknown. */
export interface ScreeningContext {
  previouslyAppliedToCompany?: boolean;
}

export function resolveScreeningFact(label: string, persona: PersonaData, context: ScreeningContext = {}): string | undefined {
  const q = label.toLowerCase();
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
  if (/pacific|time\s*zone|night\s*shift|rotating\s*shift/.test(q)) return persona.workingHoursPreference === 'daytime' ? 'No' : '';
  if (/applied.*(?:company|before)|previously.*applied/.test(q)) return context.previouslyAppliedToCompany === undefined ? '' : context.previouslyAppliedToCompany ? 'Yes' : 'No';
  if (/previously.*employed|ever.*worked.*(?:company|us)/.test(q)) return '';
  const isCurrent = /(?:current|present|existing)\s*(?:ctc|salary|compensation|pay|package)/.test(q);
  const isExpected = /(?:desired|expected|minimum)\b.*(?:salary|ctc|pay|compensation|package)|(?:salary|compensation)\s*expectations?/.test(q);
  if ((isCurrent || isExpected) && !/hourly|per\s*hour|usd|\$|percent|increase/.test(q)) {
    const lpa = isCurrent
      ? (persona.employmentStatus === 'fresher' ? 0 : persona.currentCtcLpa)
      : persona.expectedSalaryLpa ?? persona.minSalary;
    if (!isCurrent && persona.employmentStatus === 'fresher') return '0';
    if (lpa === undefined || !Number.isFinite(lpa) || lpa < 0 || (!isCurrent && lpa === 0)) return '';
    if (/lpa|lakhs?|lacs?/.test(q)) return String(lpa);
    if (/month/.test(q)) return String(Math.round(lpa * 100000 / 12));
    return String(lpa * 100000);
  }
  return undefined;
}
