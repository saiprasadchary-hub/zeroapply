/**
 * ZeroApply - Salary & Compensation Optimizer Agent
 * Production-grade module to parse posted compensation ranges (annual, hourly, LPA)
 * and calculate optimal 75th percentile bids or market-adjusted salary targets.
 */

export interface SalaryRange {
  min: number;
  max: number;
  period: 'hourly' | 'annual' | 'monthly';
  currency: string;
}

export interface OptimalCompensationResult {
  value: string;
  numericValue: number;
  currency: string;
  period: 'hourly' | 'annual' | 'monthly';
  rationale: string;
}

export class SalaryOptimizerAgent {
  /**
   * Extracts min, max, period, and currency from job description snippets or salary lines.
   */
  public static extractSalaryRange(text: string): SalaryRange | null {
    if (!text || typeof text !== 'string') return null;

    const normalized = text.replace(/,/g, '');

    // 1. Detect LPA (Lakhs Per Annum) format: e.g. "20 - 30 LPA" or "20 to 30 LPA"
    const lpaMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac)/i);
    if (lpaMatch) {
      const minLakh = parseFloat(lpaMatch[1]);
      const maxLakh = parseFloat(lpaMatch[2]);
      return {
        min: Math.round(minLakh * 100000),
        max: Math.round(maxLakh * 100000),
        period: 'annual',
        currency: '₹',
      };
    }

    // 2. Detect Hourly format: e.g. "$55.00 - $75.00 / hour" or "$55 - $75 per hour"
    const isHourly = /hour|hr|\/hr|\/hour/i.test(normalized);
    const hourlyMatch = normalized.match(/([$€£₹]?)\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*([$€£₹]?)\s*(\d+(?:\.\d+)?)/i);
    if (isHourly && hourlyMatch) {
      const currency = hourlyMatch[1] || hourlyMatch[3] || '$';
      const min = parseFloat(hourlyMatch[2]);
      const max = parseFloat(hourlyMatch[4]);
      return {
        min,
        max,
        period: 'hourly',
        currency,
      };
    }

    // 3. Detect Annual / Standard Range: e.g. "$140000 - $180000" or "$140k - $180k a year"
    const annualMatch = normalized.match(/([$€£₹]?)\s*(\d+(?:\.\d+)?)\s*k?\s*(?:-|to)\s*([$€£₹]?)\s*(\d+(?:\.\d+)?)\s*k?/i);
    if (annualMatch) {
      const currency = annualMatch[1] || annualMatch[3] || '$';
      let min = parseFloat(annualMatch[2]);
      let max = parseFloat(annualMatch[4]);

      // Handle 'k' suffixes or standard 5-6 digit salaries
      if (/k/i.test(annualMatch[0]) && min < 1000) {
        min *= 1000;
        max *= 1000;
      }

      const period = isHourly ? 'hourly' : 'annual';
      return {
        min,
        max,
        period,
        currency,
      };
    }

    return null;
  }

  /**
   * Calculates the optimal compensation bid targeting the 75th percentile of posted ranges
   * or a 10% premium over the candidate's minimum baseline.
   */
  public static calculateOptimalCompensation(
    fieldLabel: string,
    personaMinSalary = 0,
    jobDescriptionOrRangeText?: string
  ): OptimalCompensationResult {
    const isHourlyField = /hourly|hour|rate/i.test(fieldLabel);

    // Try extracting posted range from text
    const postedRange = jobDescriptionOrRangeText
      ? this.extractSalaryRange(jobDescriptionOrRangeText)
      : null;

    if (postedRange) {
      // 75th percentile calculation: min + 0.75 * (max - min)
      const optimal75th = Math.round(postedRange.min + 0.75 * (postedRange.max - postedRange.min));
      return {
        value: optimal75th.toString(),
        numericValue: optimal75th,
        currency: postedRange.currency,
        period: postedRange.period,
        rationale: '75th percentile of posted compensation range',
      };
    }

    // Baseline fallback if no posted range found
    if (isHourlyField) {
      // If personaMinSalary provided as e.g. 12 (LPA), convert to hourly (~$60-$70) or use baseline
      const hourlyVal = personaMinSalary > 0 && personaMinSalary < 100 ? Math.round(personaMinSalary * 5.5) : 65;
      return {
        value: hourlyVal.toString(),
        numericValue: hourlyVal,
        currency: '$',
        period: 'hourly',
        rationale: 'Competitive market standard hourly rate',
      };
    }

    // Annual salary logic: if persona provided small number (e.g. 12 = 12 LPA), convert to full annual with 10% premium
    let baseAnnual = personaMinSalary;
    if (personaMinSalary > 0 && personaMinSalary <= 100) {
      // Treated as Lakhs (LPA): 12 LPA = 1,200,000 INR
      baseAnnual = personaMinSalary * 100000;
    } else if (personaMinSalary > 100 && personaMinSalary <= 1000) {
      // Treated as thousands (e.g. 150 = $150k USD)
      baseAnnual = personaMinSalary * 1000;
    }

    // Apply 10% optimization premium: e.g. 1,200,000 * 1.10 = 1,320,000
    const optimalAnnual = Math.round(baseAnnual * 1.10);
    const currency = personaMinSalary <= 100 ? '₹' : '$';

    return {
      value: optimalAnnual.toString(),
      numericValue: optimalAnnual,
      currency,
      period: 'annual',
      rationale: 'Target candidate baseline plus 10% optimization buffer',
    };
  }
}
