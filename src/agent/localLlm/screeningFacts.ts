import type { PersonaData } from '../../types';

/** Undefined means this guard does not handle the question; empty means unknown. */
export function resolveScreeningFact(label: string, persona: PersonaData): string | undefined {
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
  if (/pacific|time\s*zone|night\s*shift|rotating\s*shift/.test(q)) return '';
  if (/applied.*(?:company|before)|previously.*(?:applied|employed)|ever.*worked.*(?:company|us)/.test(q)) return '';
  if (/desired.*pay.*lpa/.test(q)) return !Number.isFinite(persona.minSalary) || persona.minSalary <= 0 ? '' : String(persona.minSalary);
  return undefined;
}
