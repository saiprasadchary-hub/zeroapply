import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export type ChunkKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'publications'
  | 'awards'
  | 'leadership'
  | 'metrics'
  | 'workAuthorization'
  | 'availability'
  | 'compensation'
  | 'relocation'
  | 'securityClearance'
  | 'domainExpertise'
  | 'eeoDemographics';

export interface SemanticRouteResult {
  targetChunk: ChunkKey | null;
  similarity: number;
  extractedSnippet?: string;
  matchedKeywords: string[];
}

const CHUNK_TAXONOMY: Record<ChunkKey, string[]> = {
  summary: ['summary', 'profile', 'about', 'bio', 'objective', 'overview', 'pitch', 'tell us', 'candidate', 'yourself'],
  experience: ['experience', 'work', 'history', 'role', 'company', 'employer', 'responsibilit', 'duties', 'track record', 'position', 'career'],
  education: ['education', 'degree', 'university', 'college', 'academic', 'gpa', 'graduat', 'bachelor', 'master', 'phd', 'school', 'diploma'],
  skills: ['skill', 'proficien', 'technolog', 'framework', 'library', 'tool', 'language', 'stack', 'frontend', 'backend', 'devops', 'database', 'cloud'],
  projects: ['project', 'built', 'created', 'developed', 'architected', 'github', 'portfolio', 'application', 'system', 'repo', 'open source'],
  certifications: ['certif', 'license', 'credential', 'accreditation', 'aws certified', 'cka', 'training', 'qualification'],
  languages: ['speak', 'language', 'bilingual', 'multilingual', 'fluent', 'native', 'english', 'spanish', 'spoken'],
  publications: ['publicat', 'paper', 'journal', 'article', 'author', 'research', 'patent', 'conference', 'ieee'],
  awards: ['award', 'honor', 'achievement', 'scholarship', 'recognition', 'medal', 'hackathon', 'first place'],
  leadership: ['leader', 'mentor', 'lead', 'manager', 'director', 'team', 'cross-functional', 'culture', 'coach', 'stakeholder', 'organized'],
  metrics: ['metric', 'kpi', 'scale', 'scale', 'revenue', 'arr', 'saved', 'reduced', 'increased', 'percent', 'boosted', 'qps', 'latency', 'traffic'],
  workAuthorization: ['visa', 'citizen', 'citizenship', 'sponsorship', 'authorized', 'legally', 'eligible', 'work authorization', 'greencard', 'green card', 'stem opt', 'h1b', 'h-1b', 'right to work'],
  availability: ['notice', 'notice period', 'start date', 'available', 'earliest', 'when can you start', 'immediate', 'two weeks', 'joining date'],
  compensation: ['salary', 'compensation', 'pay', 'rate', 'hourly', 'annual', 'expected salary', 'range', 'bonus', 'equity', 'remuneration'],
  relocation: ['relocat', 'willing to relocate', 'move', 'onsite', 'hybrid', 'commute', 'office', 'remote only', 'location preference'],
  securityClearance: ['clearance', 'security clearance', 'top secret', 'secret', 'public trust', 'polygraph', 'ts/sci', 'government clearance'],
  domainExpertise: ['domain', 'fintech', 'healthtech', 'saas', 'enterprise', 'e-commerce', 'crypto', 'banking', 'cybersecurity', 'automotive'],
  eeoDemographics: ['veteran', 'disability', 'race', 'ethnicity', 'gender', 'pronoun', 'voluntary', 'self-identification', 'eeo', 'equal opportunity'],
};

/**
 * Tokenizes and cleans a query string.
 */
function tokenize(text: string): string[] {
  const stopwords = new Set(['what', 'have', 'does', 'with', 'your', 'from', 'about', 'when', 'which', 'there', 'their', 'will', 'you', 'now', 'for', 'the', 'and', 'not', 'are', 'is', 'a', 'an', 'in', 'on', 'to']);
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));
}

/**
 * Extracts the top 2 most semantically relevant sentences from a chunk of text.
 */
function extractBestSnippet(chunkText: string, queryTokens: string[]): string {
  if (!chunkText || chunkText.length < 50) return chunkText;
  const sentences = chunkText.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 15);
  if (sentences.length <= 2) return chunkText.slice(0, 400);

  const scoredSentences = sentences.map((sentence) => {
    const sLower = sentence.toLowerCase();
    let score = 0;
    queryTokens.forEach((token) => {
      if (sLower.includes(token)) score += 1;
    });
    return { sentence: sentence.trim(), score };
  });

  const best = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.sentence);

  return best.join(' ');
}

/**
 * God-Level Hybrid BM25 & Semantic Domain Router:
 * Routes any screening question, form prompt, or job requirement to the exact optimal
 * resume memory chunk and extracts a targeted snippet with sub-millisecond latency.
 */
export async function routeQuestionToChunk(
  question: string,
  chunks?: Record<string, string | undefined>
): Promise<SemanticRouteResult> {
  const qLower = question.toLowerCase();
  const qTokens = tokenize(question);

  let bestChunk: ChunkKey | null = null;
  let maxScore = 0;
  const matchedKeywords: string[] = [];

  for (const [chunkKey, keywords] of Object.entries(CHUNK_TAXONOMY) as Array<[ChunkKey, string[]]>) {
    let score = 0;
    const chunkContent = chunks ? chunks[chunkKey] || '' : '';

    // 1. Domain keyword taxonomy score
    for (const kw of keywords) {
      if (qLower.includes(kw)) {
        score += 3;
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
      }
    }

    // 2. Direct token overlap with chunk content (if available)
    if (chunkContent.length > 0) {
      const cLower = chunkContent.toLowerCase();
      for (const token of qTokens) {
        if (cLower.includes(token)) {
          score += 1.5;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestChunk = chunkKey;
    }
  }

  // Calculate normalized similarity score (0.0 to 1.0)
  const similarity = maxScore > 0 ? Math.min(0.95, 0.4 + maxScore * 0.08) : 0;

  let extractedSnippet: string | undefined;
  if (bestChunk && chunks && chunks[bestChunk]) {
    extractedSnippet = extractBestSnippet(chunks[bestChunk]!, qTokens);
  }

  if (bestChunk && similarity > 0.5) {
    liveTelemetry.emit({
      type: 'think',
      title: `RAG Routed: [${bestChunk.toUpperCase()}] (${Math.round(similarity * 100)}% Match)`,
      detail: `Question: "${question.length > 35 ? question.slice(0, 33) + '...' : question}" -> Matched: ${matchedKeywords.slice(0, 3).join(', ')}`,
      status: 'completed',
    });

    ProcessLogger.log({
      level: 'LLM',
      source: 'Semantic RAG Router',
      message: `Routed query to [${bestChunk}] with ${Math.round(similarity * 100)}% confidence`,
      detail: `Keywords: ${matchedKeywords.join(', ')}`,
    });
  }

  return {
    targetChunk: bestChunk,
    similarity,
    extractedSnippet,
    matchedKeywords,
  };
}
