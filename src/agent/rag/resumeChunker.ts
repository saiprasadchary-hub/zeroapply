/** Extract verbatim resume evidence into the topics shown in Profile knowledge. */
const HEADINGS: Record<string, string> = {
  overview: 'summary', 'career summary': 'summary', 'professional background': 'summary',
  summary: 'summary', 'professional summary': 'summary', 'executive summary': 'summary',
  profile: 'summary', 'professional profile': 'summary', objective: 'summary', 'career objective': 'summary', 'about me': 'summary',
  'relevant experience': 'experience', 'internship experience': 'experience', 'employment': 'experience',
  experience: 'experience', 'work experience': 'experience', 'professional experience': 'experience',
  'employment history': 'experience', 'work history': 'experience', internships: 'experience',
  skills: 'skills', 'technical skills': 'skills', 'skills and tools': 'skills', 'core competencies': 'skills',
  'technical competencies': 'skills', technologies: 'skills', 'tech stack': 'skills',
  'programming languages': 'skills', frameworks: 'skills', tools: 'skills',
  education: 'education', academics: 'education', 'academic qualifications': 'education', 'educational qualifications': 'education',
  projects: 'projects', 'key projects': 'projects', 'personal projects': 'projects', 'academic projects': 'projects', 'selected projects': 'projects',
  'professional certifications': 'certifications', 'certifications and training': 'certifications', 'licenses and certifications': 'certifications',
  certifications: 'certifications', certificates: 'certifications', licenses: 'certifications', 'certifications and licenses': 'certifications',
  'language skills': 'languages', 'language proficiencies': 'languages',
  languages: 'languages', 'spoken languages': 'languages', 'language proficiency': 'languages',
  publications: 'publications', research: 'publications', 'publications and research': 'publications', patents: 'publications',
  awards: 'awards', achievements: 'awards', honors: 'awards', 'awards and achievements': 'awards', 'honors and awards': 'awards',
  leadership: 'leadership', 'leadership experience': 'leadership', volunteering: 'leadership',
  metrics: 'metrics', 'results and metrics': 'metrics', 'key achievements': 'metrics',
  'domain expertise': 'domainExpertise', 'industry experience': 'domainExpertise',
  'work authorization': 'workAuthorization', 'visa status': 'workAuthorization', 'sponsorship': 'workAuthorization',
  availability: 'availability', 'notice period': 'availability', 'start date': 'availability',
  'compensation preferences': 'compensation', 'salary expectations': 'compensation', 'expected salary': 'compensation',
  'location preferences': 'relocation', 'work preferences': 'relocation', relocation: 'relocation',
  'security clearance': 'securityClearance', 'clearance status': 'securityClearance',
  'voluntary eeo responses': 'ignored', 'eeo demographics': 'ignored', 'equal employment opportunity': 'ignored',
  references: 'references', 'professional references': 'references',
  interests: 'general', hobbies: 'general', 'personal details': 'general', 'additional information': 'general',
};

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/^[\s#•*\d.)-]+|[\s:–—-]+$/g, '').replace(/\s+/g, ' ').trim();
}

function appendEvidence(result: Record<string, string>, key: string, value: string): void {
  const clean = value.trim();
  if (!clean) return;
  const existing = result[key]?.split('\n') ?? [];
  if (!existing.includes(clean)) result[key] = [...existing, clean].join('\n');
}

export function chunkResumeText(rawText: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawText.trim()) return result;
  const lines = rawText.normalize('NFKC').replace(/\r\n?/g, '\n').split('\n');
  const preamble: string[] = [];
  const evidence: Array<{ section: string; line: string }> = [];
  let section = 'general';
  let seenHeading = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    const heading = normalizeHeading(colon >= 0 ? line.slice(0, colon) : line);
    const nextSection = HEADINGS[heading];
    if (nextSection) {
      section = nextSection;
      seenHeading = true;
      if (colon >= 0 && section !== 'ignored') appendEvidence(result, section, line.slice(colon + 1));
      continue;
    }
    if (section === 'ignored') continue;
    if (!seenHeading) preamble.push(line);
    appendEvidence(result, section, line);
    evidence.push({ section, line });
  }

  // Bare “Languages” can describe code. Never convert programming skills into speech fluency.
  if (result.languages && /(?:\b(?:python|javascript|typescript|java|sql|html|css)\b|c\+\+|c#)/i.test(result.languages)
    && !/\b(?:english|hindi|telugu|tamil|french|spanish|german|mandarin|arabic|native|fluent|conversational)\b/i.test(result.languages)) {
    appendEvidence(result, 'skills', result.languages);
    delete result.languages;
  }

  // An unheaded introduction can be reused as a summary without inventing a pitch.
  if (!result.summary) {
    const introduction = preamble.filter((line) => line.split(/\s+/).length >= 8
      && !/@|https?:|linkedin\.com|github\.com|\+\d/.test(line));
    if (introduction.length) result.summary = introduction.join('\n');
    else {
      const background = evidence.filter(({ section: key, line }) => ['experience', 'projects'].includes(key)
        && /\b(?:built|developed|designed|implemented|engineered|managed|led|delivered|created)\b/i.test(line));
      if (background.length) result.summary = background.slice(0, 3).map(({ line }) => line).join('\n');
    }
  }

  for (const { section: key, line } of evidence) {
    if (['experience', 'projects', 'metrics', 'leadership'].includes(key)) {
      if (/(?:\d+(?:\.\d+)?\s*(?:%|x\b|k\b|million\b|users\b|customers\b|requests\b|ms\b|seconds\b)|[$₹€£]\s*\d)/i.test(line)) appendEvidence(result, 'metrics', line);
      if (/\b(?:led|managed|mentored|coached|supervised|cross-functional|team lead|leadership)\b/i.test(line)) appendEvidence(result, 'leadership', line);
      if (/\b(?:healthcare|fintech|banking|financial services|e-commerce|ecommerce|cybersecurity|telecommunications|logistics|insurance|edtech|manufacturing)\b/i.test(line)) appendEvidence(result, 'domainExpertise', line);
    }
    // Only direct statements; nationality, university location, or employer benefits are insufficient.
    if (/\b(?:authorized to work|work authorization|require.{0,15}sponsorship|no.{0,15}sponsorship|visa status|work permit)\b/i.test(line)) appendEvidence(result, 'workAuthorization', line);
    if (/\b(?:notice period|available to (?:start|join)|start date|immediate joiner)\b/i.test(line)) appendEvidence(result, 'availability', line);
    if (/\b(?:expected salary|salary expectations|target compensation|compensation expectations)\b/i.test(line)) appendEvidence(result, 'compensation', line);
    if (/\b(?:willing to relocate|open to relocation|prefer.{0,20}(?:remote|hybrid|onsite)|location preference)\b/i.test(line)) appendEvidence(result, 'relocation', line);
    if (/\b(?:hold|have|active|current|no)\b.{0,30}\b(?:security clearance|public trust|top secret clearance)\b/i.test(line)) appendEvidence(result, 'securityClearance', line);
  }
  // EEO responses require a voluntary user entry, never inference from a resume.
  return result;
}
