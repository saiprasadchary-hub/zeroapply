/**
 * ZeroApply Job Scanner - Multi-Card Job Detector
 * Detects, parses, and identifies Easy Apply job cards across LinkedIn, Indeed,
 * and testbed search result listings.
 */

export interface DetectedJobCard {
  jobId: string;
  title: string;
  company: string;
  location: string;
  isEasyApply: boolean;
  selector: string;
}

/**
 * In-browser injection script string to detect all job cards on current page.
 * Works inside Electron Webview via executeJavaScript.
 */
export const DETECT_JOB_CARDS_SCRIPT = `
(function() {
  const cards = [];
  
  // 1. LinkedIn & Clone Selectors
  const linkedInItems = document.querySelectorAll(
    'li.jobs-search-results__list-item, div.job-card-container, div[data-job-id], div.job-card'
  );

  if (linkedInItems.length > 0) {
    linkedInItems.forEach((el, index) => {
      const jobId = el.getAttribute('data-job-id') 
        || el.getAttribute('data-occludable-job-id') 
        || el.getAttribute('id') 
        || ('job-' + index);

      const titleEl = el.querySelector(
        '.job-card-list__title, .base-search-card__title, .job-title, h3, h2, a[data-control-name="job_card_click"]'
      );
      const title = titleEl ? titleEl.textContent.trim() : '';

      const companyEl = el.querySelector(
        '.job-card-container__primary-description, .base-search-card__subtitle, .job-card-container__company-name, .company-name, .job-company'
      );
      const company = companyEl ? companyEl.textContent.trim() : '';

      const locationEl = el.querySelector(
        '.job-card-container__metadata-item, .job-search-card__location, .job-location, .metadata-item'
      );
      const location = locationEl ? locationEl.textContent.trim() : '';

      const textContent = el.textContent || '';
      const isEasyApply = /Easy Apply/i.test(textContent) || 
        Boolean(el.querySelector('.job-card-container__apply-method, [aria-label*="Easy Apply"]'));

      if (title) {
        cards.push({
          jobId,
          title,
          company,
          location,
          isEasyApply,
          selector: el.getAttribute('data-job-id') 
            ? '[data-job-id="' + el.getAttribute('data-job-id') + '"]'
            : (el.id ? '#' + el.id : ':nth-child(' + (index + 1) + ')')
        });
      }
    });

    if (cards.length > 0) return cards;
  }

  // 2. Indeed Selectors
  const indeedItems = document.querySelectorAll('div.job_seen_beacon, td.resultContent, div.cardOutline');
  if (indeedItems.length > 0) {
    indeedItems.forEach((el, index) => {
      const titleEl = el.querySelector('h2.jobTitle, a[data-jk]');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const jobId = (titleEl && titleEl.getAttribute('data-jk')) || ('indeed-' + index);
      const companyEl = el.querySelector('[data-testid="company-name"], .companyName');
      const company = companyEl ? companyEl.textContent.trim() : '';
      const locationEl = el.querySelector('[data-testid="text-location"], .companyLocation');
      const location = locationEl ? locationEl.textContent.trim() : '';
      const isEasyApply = /Easily apply|Easy Apply/i.test(el.textContent || '');

      if (title) {
        cards.push({
          jobId,
          title,
          company,
          location,
          isEasyApply,
          selector: '[data-jk="' + jobId + '"]'
        });
      }
    });
  }

  return cards;
})();
`;

/**
 * Pure parsing function for DOM node structures or serialized cards in tests.
 */
export function filterEasyApplyCards(cards: DetectedJobCard[]): DetectedJobCard[] {
  if (!Array.isArray(cards)) return [];
  return cards.filter((card) => card.isEasyApply);
}

/**
 * Selects the optimal job card index from detected cards based on target role keyword match.
 */
export function rankJobCards(cards: DetectedJobCard[], targetRoles: string[] = []): DetectedJobCard[] {
  if (!cards || cards.length === 0) return [];
  if (!targetRoles || targetRoles.length === 0) return [...cards];

  const normalizedTargets = targetRoles.map((r) => r.toLowerCase().trim());

  return [...cards].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();

    const aMatch = normalizedTargets.some((t) => aTitle.includes(t));
    const bMatch = normalizedTargets.some((t) => bTitle.includes(t));

    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;

    // Secondary preference: Easy Apply priority
    if (a.isEasyApply && !b.isEasyApply) return -1;
    if (!a.isEasyApply && b.isEasyApply) return 1;

    return 0;
  });
}
