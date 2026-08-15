import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export const RESUME_CHUNK_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'publications',
  'awards',
  'leadership',
  'metrics',
  'workAuthorization',
  'availability',
  'compensation',
  'relocation',
  'securityClearance',
  'domainExpertise',
  'eeoDemographics',
] as const;

export type ResumeChunks = Record<(typeof RESUME_CHUNK_KEYS)[number], string>;

const HEADING_PATTERNS: Array<[keyof ResumeChunks, RegExp]> = [
  ['summary', /^(?:professional\s+)?(?:summary|profile|objective|about(?:\s+me)?|career\s+overview|executive\s+summary|highlights?)$/i],
  ['experience', /^(?:work|professional|employment|career|industry|relevant)\s+(?:experience|history)|experience|work\s+history$/i],
  ['education', /^(?:education|academic(?:\s+(?:background|qualifications?))?|degrees?)$/i],
  ['skills', /^(?:technical\s+)?(?:skills|competenc(?:y|ies)|technologies|tools(?:\s*(?:&|and)\s*technologies)?|core\s+competencies|expertise|proficiencies|tech\s+stack)$/i],
  ['projects', /^(?:selected|personal|academic|key|notable|featured)?\s*projects?$/i],
  ['certifications', /^(?:certifications?|licenses?(?:\s*(?:&|and)\s*certifications?)?|credentials|accreditations|training)$/i],
  ['languages', /^(?:languages?|language\s+proficiency|spoken\s+languages)$/i],
  ['publications', /^(?:publications?|research(?:\s+papers?)?|patents?)$/i],
  ['awards', /^(?:awards?(?:\s*(?:&|and)\s*(?:honors?|achievements?))?|honors?|achievements?|accomplishments?|recognitions?)$/i],
  ['leadership', /^(?:leadership|community|extracurricular|volunteering|affiliations?)$/i],
  ['workAuthorization', /^(?:work\s+authorization|citizenship|visa\s+status|eligibility\s+to\s+work|immigration\s+status|right\s+to\s+work)$/i],
  ['availability', /^(?:availability|notice\s+period|start\s+date|earliest\s+start)$/i],
  ['compensation', /^(?:compensation|salary\s+expectations?|target\s+compensation|expected\s+salary)$/i],
  ['relocation', /^(?:relocation|location\s+preferences?|mobility|willingness\s+to\s+relocate)$/i],
  ['securityClearance', /^(?:security\s+clearance|clearance\s+level|government\s+clearance)$/i],
  ['domainExpertise', /^(?:domain\s+expertise|industry\s+experience|specializations?|domain\s+knowledge)$/i],
  ['eeoDemographics', /^(?:voluntary\s+self-identification|eeo\s+information|demographics?|diversity)$/i],
];

export function emptyChunks(): ResumeChunks {
  return Object.fromEntries(RESUME_CHUNK_KEYS.map((key) => [key, ''])) as ResumeChunks;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '•')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function headingFor(line: string): keyof ResumeChunks | null {
  const candidate = line
    .replace(/^[•\-–—*\s]+/, '')
    .replace(/[:|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!candidate || candidate.length > 70 || /[.!?]$/.test(candidate)) return null;
  return HEADING_PATTERNS.find(([, pattern]) => pattern.test(candidate))?.[0] ?? null;
}

function append(chunks: ResumeChunks, key: keyof ResumeChunks, lines: string[]): void {
  const value = lines.join('\n').trim();
  if (!value) return;
  chunks[key] = chunks[key] ? `${chunks[key]}\n\n${value}` : value;
}

/**
 * Extracts quantifiable metrics (e.g. "reduced latency by 45%", "$2M ARR") into a dedicated metrics chunk.
 */
function extractQuantifiableMetrics(text: string): string[] {
  const metricRegex = /([^.\n]*?(?:\d+%\s*(?:increase|reduction|improvement|growth|boost|saved|faster)|\$\d+(?:\.\d+)?[MBKmbk]?|\d+\+?\s*(?:users|clients|engineers|microservices|requests|QPS|TPS|stars))[^.\n]*\.?)/gi;
  const matches = text.match(metricRegex) || [];
  return Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 8);
}

/**
 * Extracts in-text legal, authorization, and clearance mentions.
 */
function extractAuthorizationMentions(text: string): { auth?: string; clearance?: string; notice?: string } {
  const result: { auth?: string; clearance?: string; notice?: string } = {};

  if (/\b(?:u\.?s\.?\s+citizen|permanent\s+resident|green\s+card|authorized\s+to\s+work|no\s+sponsorship\s+required|stem\s+opt|h1-?b)\b/i.test(text)) {
    const match = text.match(/[^.\n]*?\b(?:u\.?s\.?\s+citizen|permanent\s+resident|green\s+card|authorized\s+to\s+work|no\s+sponsorship\s+required|stem\s+opt|h1-?b)\b[^.\n]*/i);
    if (match) result.auth = match[0].trim();
  }

  if (/\b(?:top\s+secret|secret\s+clearance|public\s+trust|security\s+clearance|ts\/sci)\b/i.test(text)) {
    const match = text.match(/[^.\n]*?\b(?:top\s+secret|secret\s+clearance|public\s+trust|security\s+clearance|ts\/sci)\b[^.\n]*/i);
    if (match) result.clearance = match[0].trim();
  }

  if (/\b(?:immediate\s+start|2\s+weeks?\s+notice|30\s+days?\s+notice|available\s+immediately)\b/i.test(text)) {
    const match = text.match(/[^.\n]*?\b(?:immediate\s+start|2\s+weeks?\s+notice|30\s+days?\s+notice|available\s+immediately)\b[^.\n]*/i);
    if (match) result.notice = match[0].trim();
  }

  return result;
}

/**
 * Super God-Level Autonomous Multi-Pass Resume Chunker:
 * 1. Pass 1: Syntax & Structural Heading Boundary Detection (18 Compartments)
 * 2. Pass 2: Semantic Keyword & Entity Classification
 * 3. Pass 3: Quantifiable Performance Metric & KPI Extraction
 * 4. Pass 4: Legal / Authorization / Clearance Heuristic Extraction
 */
export async function chunkResumeText(rawText: string, _options?: { enableLlmSynthesis?: boolean }): Promise<ResumeChunks> {
  const startTime = Date.now();
  const chunks = emptyChunks();
  const text = normalizeText(rawText);
  if (!text) return chunks;

  const lines = text.split('\n').map((line) => line.trim());
  let activeSection: keyof ResumeChunks | null = null;
  let pending: string[] = [];
  let foundHeading = false;

  for (const line of lines) {
    const section = headingFor(line);
    if (section) {
      if (activeSection) append(chunks, activeSection, pending);
      else if (pending.some(Boolean)) append(chunks, 'summary', pending);
      pending = [];
      activeSection = section;
      foundHeading = true;
      continue;
    }
    pending.push(line);
  }
  if (activeSection) append(chunks, activeSection, pending);

  // Pass 2: Fallback heuristic for unstructured or non-standard resumes
  if (!foundHeading) {
    const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter((block) => block.length >= 20);
    for (const block of blocks) {
      const lower = block.toLowerCase();
      let assignedKey: keyof ResumeChunks = 'summary';

      if (/\b(bachelor|master|degree|university|college|gpa|bs|ms|phd|education|graduated)\b/i.test(lower)) {
        assignedKey = 'education';
      } else if (/\b(skill|python|react|typescript|javascript|node|java|c\+\+|sql|aws|docker|git|html|css|kubernetes)\b/i.test(lower)) {
        assignedKey = 'skills';
      } else if (/\b(project|built|developed|github|app|application|designed|architected)\b/i.test(lower)) {
        assignedKey = 'projects';
      } else if (/\b(company|inc|llc|worked|engineer|developer|manager|intern|experience|present|20\d\d)\b/i.test(lower)) {
        assignedKey = 'experience';
      } else if (/\b(certified|certification|aws certified|license|cka)\b/i.test(lower)) {
        assignedKey = 'certifications';
      } else if (/\b(lead|mentor|organized|president|director|managed\s+team)\b/i.test(lower)) {
        assignedKey = 'leadership';
      } else if (/\b(clearance|security clearance|secret|top secret)\b/i.test(lower)) {
        assignedKey = 'securityClearance';
      } else if (/\b(citizen|citizenship|visa|sponsorship|work authorization)\b/i.test(lower)) {
        assignedKey = 'workAuthorization';
      }

      append(chunks, assignedKey, [block]);
    }
  }

  // Pass 3: Impact & Quantifiable Metrics Extraction
  const metrics = extractQuantifiableMetrics(text);
  if (metrics.length > 0) {
    chunks.metrics = metrics.map((m) => `• ${m}`).join('\n');
  }

  // Pass 4: In-line Legal / Authorization Extraction
  const authMentions = extractAuthorizationMentions(text);
  if (authMentions.auth && !chunks.workAuthorization) {
    chunks.workAuthorization = authMentions.auth;
  }
  if (authMentions.clearance && !chunks.securityClearance) {
    chunks.securityClearance = authMentions.clearance;
  }
  if (authMentions.notice && !chunks.availability) {
    chunks.availability = authMentions.notice;
  }

  const populatedCount = Object.values(chunks).filter((c) => c.trim().length > 0).length;
  const elapsed = Date.now() - startTime;

  liveTelemetry.emit({
    type: 'scan',
    title: `Resume Chunked into ${populatedCount} Semantic Modules (${elapsed}ms)`,
    detail: `Populated: ${Object.entries(chunks).filter(([, v]) => v.trim().length > 0).map(([k]) => k).join(', ')}`,
    status: 'completed',
  });

  ProcessLogger.log({
    level: 'SUCCESS',
    source: 'Resume Chunker',
    message: `Resume segmented into ${populatedCount} high-density semantic chunks`,
    detail: `Latency: ${elapsed}ms | Metrics extracted: ${metrics.length}`,
    metadata: {
      populatedChunks: populatedCount,
      metricsCount: metrics.length,
      chunksSummary: Object.fromEntries(Object.entries(chunks).map(([k, v]) => [k, v.length])),
    },
  });

  return chunks;
}
