import { ACTION_VERB_CATEGORIES, PASSIVE_WEAK_PHRASES, EMPTY_BUZZWORDS } from '../ats/atsScorer';
import { queryOllama } from '../agent/llm/ollamaClient';

export interface BulletEnhancementResult {
  original: string;
  enhanced: string;
  powerVerbUsed: string;
  metricsAdded: boolean;
  scoreGainEst: number;
}

export interface BulletWeaknessReport {
  isWeak: boolean;
  hasPassiveVoice: boolean;
  hasBuzzwords: boolean;
  hasQuantifiedMetric: boolean;
  passivePhrasesFound: string[];
  buzzwordsFound: string[];
  suggestions: string[];
}

/**
 * Analyzes a single resume bullet point for ATS red flags, passive voice, and lack of metrics
 */
export function analyzeBulletWeakness(bullet: string): BulletWeaknessReport {
  const textLower = bullet.toLowerCase().trim();
  const passivePhrasesFound = PASSIVE_WEAK_PHRASES.filter((p) => textLower.includes(p));
  const buzzwordsFound = EMPTY_BUZZWORDS.filter((b) => textLower.includes(b));
  
  // Check for quantified numbers, %, $, scale multiplier
  const hasQuantifiedMetric = /\d+%\s*|\$\s*\d+|₹\s*\d+|\b\d+x\b|\b\d+\s*ms\b|\b\d{2,}\s*(?:users|projects|clients|records|qps|engineers|microservices)/i.test(bullet);

  const suggestions: string[] = [];
  if (passivePhrasesFound.length > 0) {
    suggestions.push(`Replace passive voice ("${passivePhrasesFound[0]}") with a strong power verb (e.g. "Architected", "Spearheaded", "Optimized").`);
  }
  if (!hasQuantifiedMetric) {
    suggestions.push('Add measurable KPIs (e.g. "improved latency by 35%", "scaled to 100k users", "saved $50k annually").');
  }
  if (buzzwordsFound.length > 0) {
    suggestions.push(`Remove generic buzzword ("${buzzwordsFound[0]}") and describe concrete technical deliverables.`);
  }

  const isWeak = passivePhrasesFound.length > 0 || !hasQuantifiedMetric || buzzwordsFound.length > 0;

  return {
    isWeak,
    hasPassiveVoice: passivePhrasesFound.length > 0,
    hasBuzzwords: buzzwordsFound.length > 0,
    hasQuantifiedMetric,
    passivePhrasesFound,
    buzzwordsFound,
    suggestions,
  };
}

/**
 * Returns a list of power verbs categorized for quick candidate selection
 */
export function getPowerVerbsByCategory(): Record<string, string[]> {
  return ACTION_VERB_CATEGORIES;
}

/**
 * Enhances a bullet point into a high-impact, quantified ATS statement.
 * Attempts local Ollama (qwen2.5) first, with instant deterministic heuristic fallback.
 */
export async function enhanceBulletStatement(
  bullet: string,
  roleContext?: string,
  companyContext?: string
): Promise<BulletEnhancementResult> {
  const cleanInput = bullet.trim().replace(/^[-•*–—]\s*/, '');
  if (!cleanInput) {
    return {
      original: bullet,
      enhanced: bullet,
      powerVerbUsed: 'Engineered',
      metricsAdded: false,
      scoreGainEst: 0,
    };
  }

  // 1. Attempt LLM Enhancement via Local Ollama
  try {
    const prompt = `You are a Principal Technical Recruiter and ATS Optimization Expert at Google.
Rewrite the following resume bullet point into a high-impact, single-sentence ATS bullet point.
Requirements:
1. Start directly with a strong past-tense power verb (e.g., Architected, Spearheaded, Optimized, Engineered, Streamlined).
2. Incorporate realistic quantified impact (percentages, latency reduction, scale numbers, or efficiency multipliers).
3. Do NOT include markdown bolding, quotes, bullet symbols (•), or introductory conversational text.
4. Output ONLY the polished statement.

Role: ${roleContext || 'Software Engineer'}
Company: ${companyContext || 'Tech Company'}
Original Bullet: "${cleanInput}"

Polished ATS Bullet:`;

    const llmResponse = await queryOllama(prompt);
    if (llmResponse && llmResponse.trim().length > 15) {
      const cleaned = llmResponse
        .replace(/^["'•\-*–—\s]+/, '')
        .replace(/["']$/, '')
        .replace(/^(here is|polished bullet|rewritten bullet):?\s*/i, '')
        .trim();

      const firstWord = cleaned.split(/\s+/)[0] || 'Engineered';
      return {
        original: cleanInput,
        enhanced: cleaned,
        powerVerbUsed: firstWord,
        metricsAdded: true,
        scoreGainEst: 8,
      };
    }
  } catch {
    // Fall back to algorithmic heuristic engine
  }

  // 2. High-Quality Deterministic Heuristic Fallback
  let enhanced = cleanInput;
  
  // Replace passive starters
  enhanced = enhanced
    .replace(/^responsible for (developing|building|creating)/i, 'Architected and built')
    .replace(/^responsible for (managing|leading)/i, 'Spearheaded and directed')
    .replace(/^responsible for (optimizing|improving)/i, 'Optimized and accelerated')
    .replace(/^responsible for /i, 'Engineered ')
    .replace(/^worked on (the )?/i, 'Spearheaded development of ')
    .replace(/^helped (to )?/i, 'Collaborated to deploy ')
    .replace(/^assisted in /i, 'Streamlined and delivered ')
    .replace(/^duties included /i, 'Executed ');

  // Capitalize first letter
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);

  // If missing power verb, prepend strong verb
  const firstWord = enhanced.split(/\s+/)[0].toLowerCase();
  const allPowerVerbs = Object.values(ACTION_VERB_CATEGORIES).flat();
  let verbUsed = 'Engineered';

  if (!allPowerVerbs.includes(firstWord)) {
    if (/design|ui|frontend|component/i.test(enhanced)) {
      enhanced = `Architected and developed ${enhanced.charAt(0).toLowerCase() + enhanced.slice(1)}`;
      verbUsed = 'Architected';
    } else if (/api|backend|database|sql|server/i.test(enhanced)) {
      enhanced = `Engineered scalable ${enhanced.charAt(0).toLowerCase() + enhanced.slice(1)}`;
      verbUsed = 'Engineered';
    } else if (/speed|fast|performance|latency|scale/i.test(enhanced)) {
      enhanced = `Optimized and scaled ${enhanced.charAt(0).toLowerCase() + enhanced.slice(1)}`;
      verbUsed = 'Optimized';
    } else {
      enhanced = `Spearheaded ${enhanced.charAt(0).toLowerCase() + enhanced.slice(1)}`;
      verbUsed = 'Spearheaded';
    }
  } else {
    verbUsed = enhanced.split(/\s+/)[0];
  }

  // Add metric suffix if missing quantification
  let metricsAdded = false;
  if (!/\d+%\s*|\$\s*\d+|\b\d+x\b/i.test(enhanced)) {
    if (/latency|speed|performance|query/i.test(enhanced)) {
      enhanced = `${enhanced.replace(/\.$/, '')}, reducing system latency by 35%.`;
      metricsAdded = true;
    } else if (/test|ci\/cd|deploy|pipeline/i.test(enhanced)) {
      enhanced = `${enhanced.replace(/\.$/, '')}, accelerating release deployment velocity by 40%.`;
      metricsAdded = true;
    } else if (/user|customer|traffic|throughput/i.test(enhanced)) {
      enhanced = `${enhanced.replace(/\.$/, '')}, supporting 100k+ active daily transactions.`;
      metricsAdded = true;
    } else {
      enhanced = `${enhanced.replace(/\.$/, '')}, elevating operational efficiency by 25%.`;
      metricsAdded = true;
    }
  }

  return {
    original: cleanInput,
    enhanced: enhanced.endsWith('.') ? enhanced : `${enhanced}.`,
    powerVerbUsed: verbUsed,
    metricsAdded,
    scoreGainEst: 6,
  };
}

/**
 * Polishes executive summary for maximum ATS keyword punchiness
 */
export async function polishSummary(summary: string, role?: string): Promise<string> {
  const cleanSummary = summary.trim();
  if (!cleanSummary) return '';

  try {
    const prompt = `You are a Principal Tech Recruiter. Rewrite the following resume summary into a concise 2-3 line high-impact executive summary for an ATS resume.
Target Role: ${role || 'Senior Software Engineer'}
Raw Summary: "${cleanSummary}"

Output ONLY the rewritten summary paragraph without conversational fluff:`;

    const res = await queryOllama(prompt);
    if (res && res.trim().length > 30) {
      return res.replace(/^["']|["']$/g, '').trim();
    }
  } catch {}

  // Fallback
  return cleanSummary;
}

export interface LlmAtsFeedback {
  summary: string;
  strengths: string[];
  missingKeywords: string[];
  recommendations: string[];
  predictedPassRate: number;
  source: 'ollama' | 'heuristic';
}

/**
 * Real-time LLM-grounded ATS Reviewer powered by local Ollama (Qwen 2.5) with heuristic fallback.
 */
export async function generateLlmAtsFeedback(
  resumeText: string,
  targetRole?: string
): Promise<LlmAtsFeedback> {
  const role = targetRole || 'Senior Software Engineer';
  const truncatedText = resumeText.slice(0, 3000);

  // 1. Attempt LLM Critique via Local Ollama
  try {
    const prompt = `You are a Principal Technical Recruiter and ATS Algorithms Expert at Google.
Analyze the following candidate resume for the role "${role}".
Provide a concise, JSON-formatted ATS critique with the following exact keys:
{
  "summary": "1-sentence executive summary of resume readiness",
  "strengths": ["standout point 1", "standout point 2"],
  "missingKeywords": ["missing tech or skill 1", "missing tech or skill 2"],
  "recommendations": ["actionable advice 1", "actionable advice 2"],
  "predictedPassRate": 92
}

Resume Text:
"""
${truncatedText}
"""

Output valid JSON only:`;

    const raw = await queryOllama(prompt);
    if (raw) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary && Array.isArray(parsed.recommendations)) {
          return {
            summary: String(parsed.summary),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
            missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.map(String) : [],
            recommendations: parsed.recommendations.map(String),
            predictedPassRate: typeof parsed.predictedPassRate === 'number' ? parsed.predictedPassRate : 88,
            source: 'ollama',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Ollama ATS critique fallback to heuristics:', err);
  }

  // 2. Intelligent Heuristic Rule Engine Fallback
  const lower = resumeText.toLowerCase();
  const strengths: string[] = [];
  const missing: string[] = [];
  const recs: string[] = [];

  if (/\d+%\s*|\$\s*\d+|\b\d+x\b/i.test(resumeText)) {
    strengths.push('Strong quantification of business impact and performance metrics.');
  } else {
    recs.push('Add measurable KPIs to bullet points (percentages, cost reduction, or scale).');
  }

  if (['typescript', 'react', 'python', 'aws', 'docker', 'kubernetes'].filter(s => lower.includes(s)).length >= 3) {
    strengths.push('High density of market-standard engineering technologies.');
  } else {
    missing.push('CI/CD Pipelines', 'Cloud Architecture (AWS/GCP)', 'Distributed Caching');
  }

  if (lower.includes('architect') || lower.includes('spearhead') || lower.includes('optimize')) {
    strengths.push('Authoritative action verbs matching Staff/Senior ATS screening benchmarks.');
  } else {
    recs.push('Replace passive phrasing with active leadership power verbs.');
  }

  return {
    summary: strengths.length >= 2
      ? `Strong candidate profile for ${role} with solid technical foundations and clear impact.`
      : `Promising draft for ${role}; needs additional quantified metrics and keyword depth for 95%+ ATS matching.`,
    strengths: strengths.length ? strengths : ['Clear chronological structure', 'Covers core technical stack'],
    missingKeywords: missing.length ? missing : ['System Design', 'Kafka / Event Streaming', 'Performance Profiling'],
    recommendations: recs.length ? recs : ['Expand on system throughput metrics', 'Include recent certifications or cloud credentials'],
    predictedPassRate: strengths.length >= 2 ? 91 : 78,
    source: 'heuristic',
  };
}
