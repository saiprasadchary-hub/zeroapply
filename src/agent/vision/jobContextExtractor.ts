/**
 * ZeroApply Vision - Job Context & Description Extractor
 * Extracts comprehensive job posting metadata, requirements, technical skills,
 * and compensation directly from the active webpage to feed local Qwen 2.5 RAG reasoning.
 */

import type { WebviewTarget } from './domObserver';

export interface ExtractedJobContext {
  jobTitle: string;
  companyName: string;
  location: string;
  workplaceType: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  employmentType: string;
  compensation?: string;
  experienceRequired?: string;
  skillsRequired: string[];
  jobSummary: string;
  rawDescriptionText: string;
  timestamp: number;
}

export const EXTRACT_JOB_CONTEXT_SCRIPT = `
(() => {
  try {
    // 1. Job Title
    const titleEl = document.querySelector(
      '.job-details__title, .jobs-unified-top-card__job-title, [data-automation-id*="jobTitle"], .job-title, h1'
    );
    const jobTitle = titleEl ? titleEl.textContent.trim() : '';

    // 2. Company Name
    const companyEl = document.querySelector(
      '.company-banner__name, .jobs-unified-top-card__company-name, [data-automation-id*="companyName"], .job-company, [class*="company-name"], a[href*="/company/"]'
    );
    const companyName = companyEl ? companyEl.textContent.trim() : '';

    // 3. Location & Workplace Type
    const locEl = document.querySelector(
      '.job-details__location, .jobs-unified-top-card__bullet, [data-automation-id*="locations"], .job-location, [class*="location"]'
    );
    const locationText = locEl ? locEl.textContent.trim() : '';

    let workplaceType = 'Unknown';
    const combinedText = (document.body.innerText || '').toLowerCase();
    if (combinedText.includes('remote') || locationText.toLowerCase().includes('remote')) {
      workplaceType = 'Remote';
    } else if (combinedText.includes('hybrid') || locationText.toLowerCase().includes('hybrid')) {
      workplaceType = 'Hybrid';
    } else if (combinedText.includes('on-site') || combinedText.includes('onsite') || locationText.toLowerCase().includes('on-site')) {
      workplaceType = 'On-site';
    }

    // 4. Compensation / Stipend
    let compensation = '';
    const compMatch = document.body.innerText.match(
      /(?:₹|\\$|€|£)\\s*\\d+(?:[.,]\\d+)?(?:k)?(?:\\s*[-–—to]\\s*(?:₹|\\$|€|£)?\\s*\\d+(?:[.,]\\d+)?(?:k)?)?(?:\\s*\\/\\s*(?:mo|month|yr|year|hr|hour))?/i
    );
    if (compMatch) {
      compensation = compMatch[0].trim();
    }

    // 5. Employment Type
    let employmentType = 'Full-time';
    if (/internship|intern\\b/i.test(jobTitle + ' ' + combinedText)) {
      employmentType = 'Internship';
    } else if (/contract|temporary|freelance/i.test(combinedText)) {
      employmentType = 'Contract';
    } else if (/part-time/i.test(combinedText)) {
      employmentType = 'Part-time';
    }

    // 6. Full Job Description text
    const descEl = document.querySelector(
      '#job-details, .jobs-description__content, .job-details__description, [data-automation-id*="jobDescription"], .description, article'
    ) || document.body;
    
    const rawDescriptionText = descEl ? descEl.innerText.slice(0, 4000) : '';

    // 7. Extract Key Technical Skills
    const KNOWN_SKILLS = [
      'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Vue', 'Angular',
      'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
      'AI', 'Machine Learning', 'LangChain', 'LLM', 'RAG', 'PyTorch', 'TensorFlow',
      'REST', 'GraphQL', 'Microservices', 'FastAPI', 'Django', 'Flask', 'Spring Boot'
    ];

    const skillsRequired = [];
    for (const skill of KNOWN_SKILLS) {
      const safeSkill = skill.replace(/([+.*#\\/])/g, '\\\\$1');
      const regex = new RegExp('\\\\b' + safeSkill + '\\\\b', 'i');
      if (regex.test(rawDescriptionText)) {
        skillsRequired.push(skill);
      }
    }

    // 8. Experience Requirements
    let experienceRequired = '';
    const expMatch = rawDescriptionText.match(/(\\d+\\+?\\s*(?:to|-)?\\s*\\d*\\s*(?:years?|yrs?)(?:\\s*of)?\\s*(?:work)?\\s*experience)/i);
    if (expMatch) {
      experienceRequired = expMatch[1].trim();
    }

    // 9. Synthesize a 2-sentence summary
    const firstLines = rawDescriptionText
      .split('\\n')
      .map(s => s.trim())
      .filter(s => s.length > 20 && !s.toLowerCase().startsWith('about the job'))
      .slice(0, 2)
      .join(' ');
    
    const jobSummary = firstLines || (jobTitle + (companyName ? ' at ' + companyName : ''));

    return {
      jobTitle,
      companyName,
      location: locationText,
      workplaceType,
      employmentType,
      compensation,
      experienceRequired,
      skillsRequired,
      jobSummary: jobSummary.slice(0, 350),
      rawDescriptionText: rawDescriptionText.slice(0, 1500),
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      jobTitle: '',
      companyName: '',
      location: '',
      workplaceType: 'Unknown',
      employmentType: 'Full-time',
      skillsRequired: [],
      jobSummary: '',
      rawDescriptionText: '',
      timestamp: Date.now()
    };
  }
})()
`;

/**
 * Extracts structured job context directly from the active webview.
 */
export async function extractJobContext(webview: WebviewTarget): Promise<ExtractedJobContext> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return {
      jobTitle: '',
      companyName: '',
      location: '',
      workplaceType: 'Unknown',
      employmentType: 'Full-time',
      skillsRequired: [],
      jobSummary: '',
      rawDescriptionText: '',
      timestamp: Date.now(),
    };
  }

  try {
    const context = await webview.executeJavaScript<ExtractedJobContext>(EXTRACT_JOB_CONTEXT_SCRIPT);
    return context || {
      jobTitle: '',
      companyName: '',
      location: '',
      workplaceType: 'Unknown',
      employmentType: 'Full-time',
      skillsRequired: [],
      jobSummary: '',
      rawDescriptionText: '',
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      jobTitle: '',
      companyName: '',
      location: '',
      workplaceType: 'Unknown',
      employmentType: 'Full-time',
      skillsRequired: [],
      jobSummary: '',
      rawDescriptionText: '',
      timestamp: Date.now(),
    };
  }
}
