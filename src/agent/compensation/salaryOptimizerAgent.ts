import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'hourly' | 'annual' | 'monthly';
  rawText: string;
}

export interface CompensationResult {
  value: string;
  numericValue: number;
  period: 'hourly' | 'annual' | 'monthly';
  currency: string;
  source: 'job_posting_optimized' | 'persona_minimum' | 'persona_market_target';
  rationale: string;
}

export class SalaryOptimizerAgent {
  /**
   * Extracts salary range from job description or posting text.
   */
  public static extractSalaryRange(text: string): SalaryRange | null {
    if (!text) return null;

    // Pattern 1: $120,000 - $160,000 or $120k - $160k (Annual/General)
    const annualRangeRegex = /(?:(\$|€|£|₹)\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:k|kilo)?)\s*(?:-|to|–)\s*(?:(?:\$|€|£|₹)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(k|kilo)?)/i;
    const match = text.match(annualRangeRegex);

    if (match) {
      const currency = match[1] || '$';
      let minRaw = match[2].replace(/,/g, '');
      let maxRaw = match[3].replace(/,/g, '');
      const hasK = !!match[4] || text.includes('k') || text.includes('K');

      let min = parseFloat(minRaw);
      let max = parseFloat(maxRaw);

      if (hasK || (min < 1000 && max < 1000 && min > 20)) {
        if (min < 1000) min *= 1000;
        if (max < 1000) max *= 1000;
      }

      // Check if hourly
      const isHourly = /hr|hour|\/hr/i.test(text.slice(match.index || 0, (match.index || 0) + 40));
      const period = isHourly ? 'hourly' : 'annual';

      return {
        min,
        max,
        currency,
        period,
        rawText: match[0],
      };
    }

    // Pattern 2: LPA / Indian convention (e.g. 15-25 LPA)
    const lpaRegex = /(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs|lac)/i;
    const lpaMatch = text.match(lpaRegex);
    if (lpaMatch) {
      const min = parseFloat(lpaMatch[1]) * 100000;
      const max = parseFloat(lpaMatch[2]) * 100000;
      return {
        min,
        max,
        currency: '₹',
        period: 'annual',
        rawText: lpaMatch[0],
      };
    }

    return null;
  }

  /**
   * Computes the optimal salary value to fill in for a given field.
   */
  public static calculateOptimalCompensation(
    fieldLabel: string,
    minSalaryK: number = 80, // e.g. 80k from persona
    jobPostingText: string = ''
  ): CompensationResult {
    const isHourlyField = /hour|hr|hourly/i.test(fieldLabel);
    const requiresNumericOnly = /number|numeric|digits/i.test(fieldLabel);

    const detectedRange = this.extractSalaryRange(jobPostingText);
    const candidateMinAnnual = (minSalaryK || 80) * 1000;
    const candidateMinHourly = Math.round(candidateMinAnnual / 2080);

    let optimalNumeric = 0;
    let period: 'hourly' | 'annual' | 'monthly' = isHourlyField ? 'hourly' : 'annual';
    let currency = '$';
    let source: CompensationResult['source'] = 'persona_minimum';
    let rationale = '';

    if (detectedRange) {
      currency = detectedRange.currency;
      period = isHourlyField ? 'hourly' : detectedRange.period;

      if (period === 'hourly') {
        const postedMin = detectedRange.period === 'hourly' ? detectedRange.min : Math.round(detectedRange.min / 2080);
        const postedMax = detectedRange.period === 'hourly' ? detectedRange.max : Math.round(detectedRange.max / 2080);
        
        // Target 75th percentile of posted range
        const target = Math.round(postedMin + (postedMax - postedMin) * 0.75);
        optimalNumeric = Math.max(target, candidateMinHourly);
        source = 'job_posting_optimized';
        rationale = `Optimized to 75th percentile ($${optimalNumeric}/hr) from posted range $${postedMin}-$${postedMax}/hr`;
      } else {
        const postedMin = detectedRange.min;
        const postedMax = detectedRange.max;
        
        // Target 75th percentile of posted range
        const target = Math.round(postedMin + (postedMax - postedMin) * 0.75);
        optimalNumeric = Math.max(target, candidateMinAnnual);
        source = 'job_posting_optimized';
        rationale = `Optimized to 75th percentile ($${optimalNumeric.toLocaleString()}) from posted range $${postedMin.toLocaleString()}-$${postedMax.toLocaleString()}`;
      }
    } else {
      // No range posted in description -> target candidate min + 10% market buffer
      if (period === 'hourly') {
        optimalNumeric = Math.round(candidateMinHourly * 1.1);
        source = 'persona_market_target';
        rationale = `Calculated market hourly rate ($${optimalNumeric}/hr) based on $${minSalaryK}k minimum`;
      } else {
        optimalNumeric = Math.round(candidateMinAnnual * 1.1);
        source = 'persona_market_target';
        rationale = `Calculated market annual target ($${optimalNumeric.toLocaleString()}) based on $${minSalaryK}k minimum`;
      }
    }

    let finalValue = requiresNumericOnly ? String(optimalNumeric) : String(optimalNumeric);

    // If text field without strict numeric type, can provide readable format
    if (!requiresNumericOnly && !/only numbers/i.test(fieldLabel)) {
      finalValue = String(optimalNumeric);
    }

    const result: CompensationResult = {
      value: finalValue,
      numericValue: optimalNumeric,
      period,
      currency,
      source,
      rationale,
    };

    liveTelemetry.emit({
      type: 'validate',
      title: `Salary Optimized: ${currency}${optimalNumeric.toLocaleString()}${period === 'hourly' ? '/hr' : '/yr'}`,
      detail: rationale,
      status: 'completed',
    });

    ProcessLogger.log({
      level: 'SUCCESS',
      source: 'Salary Optimizer Agent',
      message: `Optimal compensation calculated: ${currency}${optimalNumeric.toLocaleString()} (${period})`,
      detail: rationale,
      metadata: {
        fieldLabel,
        result,
      },
    });

    return result;
  }
}
