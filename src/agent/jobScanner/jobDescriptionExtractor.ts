/**
 * ZeroApply Job Scanner - Job Description Extractor
 * Extracts detailed job descriptions, posted compensation, and requirements
 * from the active job detail pane across supported job portals.
 */

export interface ExtractedJobDetails {
  title: string;
  company: string;
  location: string;
  descriptionText: string;
  salaryText?: string;
  employmentType?: string;
  workModel?: 'Remote' | 'Hybrid' | 'On-site';
  easyApplyAvailable: boolean;
}

/**
 * In-browser injection script string to inspect the currently active job detail pane.
 */
export const EXTRACT_JOB_DETAILS_SCRIPT = `
(function() {
  // Title
  const titleEl = document.querySelector(
    '.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title, h1.t-24, h1.jobsearch-JobInfoHeader-title, .job-details h2'
  );
  const title = titleEl ? titleEl.textContent.trim() : '';

  // Company
  const companyEl = document.querySelector(
    '.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name, [data-company-name="true"], .company-name'
  );
  const company = companyEl ? companyEl.textContent.trim() : '';

  // Location
  const locationEl = document.querySelector(
    '.jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__bullet, .jobsearch-JobInfoHeader-companyLocation'
  );
  const location = locationEl ? locationEl.textContent.trim() : '';

  // Description
  const descEl = document.querySelector(
    '#job-details, .jobs-description-content__text, .jobs-box__html-content, .jobsearch-jobDescriptionText, .job-description'
  );
  const descriptionText = descEl ? descEl.textContent.trim().replace(/\\s+/g, ' ') : '';

  // Salary text
  const salaryEl = document.querySelector(
    '.job-details-jobs-unified-top-card__job-insight:has(svg), .jobs-unified-top-card__job-insight:has(svg), .salary-snippet-container, [data-testid="attribute_snippets_test_id"]'
  );
  const salaryText = salaryEl ? salaryEl.textContent.trim() : undefined;

  // Easy Apply Button availability
  const applyBtn = document.querySelector(
    'button.jobs-apply-button, button[aria-label*="Easy Apply"], button#main-easy-apply-btn, [data-control-name="jobdetails_topcard_inapply"]'
  );
  const easyApplyAvailable = Boolean(applyBtn && !applyBtn.disabled && /Easy Apply/i.test(applyBtn.textContent || applyBtn.getAttribute('aria-label') || ''));

  // Work model
  let workModel = 'On-site';
  const fullText = (title + ' ' + location + ' ' + descriptionText).toLowerCase();
  if (fullText.includes('remote') || fullText.includes('work from home')) {
    workModel = 'Remote';
  } else if (fullText.includes('hybrid')) {
    workModel = 'Hybrid';
  }

  return {
    title,
    company,
    location,
    descriptionText,
    salaryText,
    workModel,
    easyApplyAvailable
  };
})();
`;

/**
 * Extracts required technical skills mentioned in the job description text.
 */
export function extractSkillsFromDescription(description: string, knownTaxonomy: string[] = []): string[] {
  if (!description) return [];
  const lowerDesc = description.toLowerCase();

  const defaultSkills = [
    'react', 'typescript', 'javascript', 'python', 'node', 'nodejs', 'nextjs',
    'vue', 'angular', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'sql',
    'postgresql', 'mongodb', 'graphql', 'rest', 'tailwind', 'electron', 'ollama', 'llm'
  ];

  const candidatePool = knownTaxonomy.length > 0 ? knownTaxonomy : defaultSkills;
  const matched: string[] = [];

  for (const skill of candidatePool) {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(lowerDesc)) {
      matched.push(skill);
    }
  }

  return Array.from(new Set(matched));
}
