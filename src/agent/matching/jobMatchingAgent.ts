import type { PersonaData } from '../../types';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export interface JobDetails {
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType?: string;
  salaryText?: string;
}

export interface MatchEvaluation {
  score: number; // 0 to 100
  isMatch: boolean;
  recommendation: 'APPLY' | 'SKIP' | 'REVIEW';
  reason: string;
  breakdown: {
    roleScore: number;
    techStackScore: number;
    experienceScore: number;
    locationScore: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

export const EXTRACT_JOB_DETAILS_SCRIPT = `
(function extractJobPostingDetails() {
  // Title detection across LinkedIn, Indeed, Glassdoor, Greenhouse, Lever
  const titleEl = document.querySelector(
    '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .jobsearch-JobInfoHeader-title, .css-172z051, [data-test-id="job-title"], h1'
  );
  const title = titleEl ? titleEl.innerText.trim() : document.title || '';

  // Company detection
  const companyEl = document.querySelector(
    '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, [data-company-name="true"], .jobsearch-InlineCompanyRating-companyHeader, [data-test-id="company-name"]'
  );
  const company = companyEl ? companyEl.innerText.trim() : '';

  // Location detection
  const locationEl = document.querySelector(
    '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .jobsearch-JobInfoHeader-companyLocation'
  );
  const location = locationEl ? locationEl.innerText.trim() : '';

  // Full job description
  const descEl = document.querySelector(
    '#job-details, .jobs-description__content, .jobs-box__html-content, #jobDescriptionText, .job-description, article'
  );
  const description = descEl ? descEl.innerText.trim() : document.body ? document.body.innerText : '';

  // Salary text if present
  const salaryEl = document.querySelector(
    '.job-details-jobs-unified-top-card__job-insight, .salary-snippet, [data-test-id="salary-info"]'
  );
  const salaryText = salaryEl ? salaryEl.innerText.trim() : '';

  return {
    title,
    company,
    location,
    description: description.slice(0, 10000),
    salaryText,
  };
})();
`;

export class JobMatchingAgent {
  /**
   * Evaluates job posting against candidate persona and returns a 0-100% Match Evaluation.
   */
  public static evaluateMatch(job: JobDetails, persona: PersonaData, threshold: number = 60): MatchEvaluation {
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const jobTitleLower = job.title.toLowerCase();

    // 1. Role Keyword Matching (35%)
    let roleScore = 0;
    const targetRoles = persona.targetRoles && persona.targetRoles.length > 0 ? persona.targetRoles : ['Software Engineer', 'Developer'];
    for (const role of targetRoles) {
      const roleTokens = role.toLowerCase().split(/\s+/).filter(Boolean);
      const matchCount = roleTokens.filter(tok => jobTitleLower.includes(tok) || jobText.includes(tok)).length;
      const ratio = roleTokens.length > 0 ? matchCount / roleTokens.length : 0;
      if (ratio > roleScore) {
        roleScore = ratio;
      }
    }
    const rolePoints = Math.round(roleScore * 35);

    // 2. Tech Stack Overlap (35%)
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const candidateTech = persona.techStack && persona.techStack.length > 0 ? persona.techStack : ['JavaScript', 'TypeScript', 'React'];

    candidateTech.forEach((tech) => {
      const techLower = tech.toLowerCase();
      const regex = new RegExp(`\\b${techLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(jobText)) {
        matchedSkills.push(tech);
      } else {
        missingSkills.push(tech);
      }
    });

    const techRatio = candidateTech.length > 0 ? matchedSkills.length / candidateTech.length : 0.5;
    const techPoints = Math.round(techRatio * 35);

    // 3. Experience Level Alignment (15%)
    let expScore = 15;
    const expMatch = jobText.match(/(\d+)\s*\+?\s*(?:years|yrs)/i);
    if (expMatch && expMatch[1]) {
      const reqYears = parseInt(expMatch[1], 10);
      const userYears = persona.experienceYears || 0;
      if (userYears >= reqYears) {
        expScore = 15;
      } else if (userYears + 2 >= reqYears) {
        expScore = 10;
      } else {
        expScore = 4;
      }
    }

    // 4. Work / Location Preference Alignment (15%)
    let locScore = 15;
    const isRemoteJob = jobText.includes('remote') || job.location.toLowerCase().includes('remote');
    const isHybridJob = jobText.includes('hybrid') || job.location.toLowerCase().includes('hybrid');
    if (persona.workPreference === 'Remote') {
      locScore = isRemoteJob ? 15 : isHybridJob ? 8 : 4;
    } else if (persona.workPreference === 'Hybrid') {
      locScore = isHybridJob || isRemoteJob ? 15 : 10;
    } else {
      locScore = 15;
    }

    const totalScore = Math.min(100, Math.max(0, rolePoints + techPoints + expScore + locScore));
    const isMatch = totalScore >= threshold;
    const recommendation: 'APPLY' | 'SKIP' | 'REVIEW' = totalScore >= 70 ? 'APPLY' : totalScore >= threshold ? 'REVIEW' : 'SKIP';

    let reason = `${totalScore}% Match: Found ${matchedSkills.length} skills (${matchedSkills.slice(0, 3).join(', ')})`;
    if (!isMatch) {
      reason = `Low match (${totalScore}% < ${threshold}% threshold). Lacks key role alignment.`;
    }

    const evaluation: MatchEvaluation = {
      score: totalScore,
      isMatch,
      recommendation,
      reason,
      breakdown: {
        roleScore: rolePoints,
        techStackScore: techPoints,
        experienceScore: expScore,
        locationScore: locScore,
      },
      matchedSkills,
      missingSkills,
    };

    liveTelemetry.emit({
      type: 'validate',
      title: `Job Match Score: ${totalScore}% [${recommendation}]`,
      detail: `${job.title} at ${job.company || 'Employer'} | ${matchedSkills.length} matching skills`,
      confidence: totalScore / 100,
      status: isMatch ? 'completed' : 'warning',
    });

    ProcessLogger.log({
      level: isMatch ? 'SUCCESS' : 'WARNING',
      source: 'Job Matching Agent',
      message: `Evaluated "${job.title}" at "${job.company || 'Company'}" -> ${totalScore}% Score (${recommendation})`,
      detail: reason,
      metadata: {
        score: totalScore,
        recommendation,
        matchedSkills,
        missingSkills,
        breakdown: evaluation.breakdown,
      },
    });

    return evaluation;
  }

  /**
   * Extracts job details from webview and executes match evaluation.
   */
  public static async analyzeCurrentJob(webview: any, persona: PersonaData, threshold: number = 60): Promise<MatchEvaluation> {
    try {
      if (!webview || typeof webview.executeJavaScript !== 'function') {
        return this.evaluateMatch({ title: 'Software Engineer', company: '', location: '', description: '' }, persona, threshold);
      }

      const jobDetails: JobDetails = await webview.executeJavaScript(EXTRACT_JOB_DETAILS_SCRIPT);
      return this.evaluateMatch(jobDetails || { title: 'Unknown Role', company: '', location: '', description: '' }, persona, threshold);
    } catch (err) {
      console.warn('[JobMatchingAgent] Failed to extract job details:', err);
      return this.evaluateMatch({ title: 'Job Application', company: '', location: '', description: '' }, persona, threshold);
    }
  }
}
