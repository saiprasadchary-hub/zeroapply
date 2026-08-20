export interface BatchSearchQuery {
  roleKeyword: string;
  location: string;
  platform: 'linkedin' | 'unstop' | 'indeed' | 'naukri' | 'glassdoor';
  maxApplications: number;
}

export function buildSearchUrl(query: BatchSearchQuery): string {
  const role = encodeURIComponent(query.roleKeyword.trim());
  const loc = encodeURIComponent(query.location.trim());

  switch (query.platform) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${loc}&f_AL=true`; // f_AL=true filters Easy Apply
    case 'unstop':
      return `https://unstop.com/jobs?keyword=${role}&location=${loc}`;
    case 'indeed':
      return `https://www.indeed.com/jobs?q=${role}&l=${loc}&sc=0kf%3Aattr(KOCMT)%3B`;
    case 'naukri':
      return `https://www.naukri.com/${role}-jobs-in-${loc}`;
    case 'glassdoor':
      return `https://www.glassdoor.com/Job/jobs.htm?keyword=${role}&loc=${loc}&applicationType=1`;
    default:
      return `https://www.google.com/search?q=${role}+jobs+${loc}+easy+apply`;
  }
}

/**
 * Script injected into job search pages to locate clickable job listings or Easy Apply buttons.
 */
export const BATCH_JOB_SCANNER_SCRIPT = `
(function scanJobCards() {
  const cards = Array.from(document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, [data-oc-id], .jobTuple'));
  const links = [];

  cards.forEach((card, idx) => {
    const titleEl = card.querySelector('.job-card-list__title, .job-title, h3, a');
    const title = titleEl ? titleEl.innerText.trim() : 'Job #' + (idx + 1);
    const linkEl = card.querySelector('a[href*="/jobs/"], a[href*="/job/"]') || card.closest('a') || titleEl;

    if (!card.id) card.id = 'za_job_card_' + idx;

    links.push({
      id: card.id,
      title: title,
      selector: '#' + CSS.escape(card.id),
      href: linkEl ? linkEl.href : '',
    });
  });

  return links;
})();
`;
