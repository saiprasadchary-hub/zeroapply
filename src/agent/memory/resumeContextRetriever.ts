/**
 * ZeroApply Memory - Resume Context Retriever
 * Performs semantic chunking and keyword relevance retrieval (Lightweight RAG)
 * from the candidate's resume and persona text.
 */

import type { PersonaData } from '../../types';
import { tokenize } from './questionMemoryBank';

export interface ResumeChunk {
  id: string;
  section: 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'general' | 'auth';
  content: string;
  keywords: Set<string>;
}

/**
 * Extracts normalized unique keywords from text.
 */
export function extractKeywords(text: string): string[] {
  return Array.from(new Set(tokenize(text)));
}

/**
 * Chunks resume into semantic sections from both structured resumeChunks and raw resumeText.
 */
export function buildResumeChunks(persona: PersonaData): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];

  // 1. Ingest structured resumeChunks (from memory chunks tab / parser)
  if (persona.resumeChunks && typeof persona.resumeChunks === 'object') {
    for (const [key, value] of Object.entries(persona.resumeChunks)) {
      if (typeof value === 'string' && value.trim()) {
        let section: ResumeChunk['section'] = 'general';
        const keyLower = key.toLowerCase();
        if (keyLower.includes('summary') || keyLower.includes('bio')) section = 'summary';
        else if (keyLower.includes('experience') || keyLower.includes('employment') || keyLower.includes('history')) section = 'experience';
        else if (keyLower.includes('education') || keyLower.includes('academic') || keyLower.includes('degree')) section = 'education';
        else if (keyLower.includes('skill') || keyLower.includes('tech')) section = 'skills';
        else if (keyLower.includes('project')) section = 'projects';
        else if (keyLower.includes('auth') || keyLower.includes('visa') || keyLower.includes('sponsor')) section = 'auth';

        chunks.push({
          id: `chunk_${key}`,
          section,
          content: `${key.toUpperCase()}:\n${value.trim()}`,
          keywords: new Set(extractKeywords(value)),
        });
      }
    }
  }

  // 2. Parse raw resumeText if provided
  const text = persona.resumeText || '';
  if (text.trim()) {
    const sectionRegex = /(PROFESSIONAL SUMMARY|WORK EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY|EDUCATION|ACADEMICS|TECHNICAL SKILLS|SKILLS|PROJECTS|KEY PROJECTS|CERTIFICATIONS)/gi;
    const parts = text.split(sectionRegex);

    if (parts.length > 1) {
      let currentSection: ResumeChunk['section'] = 'general';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;

        if (i % 2 === 1) {
          const upper = part.toUpperCase();
          if (upper.includes('SUMMARY')) currentSection = 'summary';
          else if (upper.includes('EXPERIENCE') || upper.includes('EMPLOYMENT')) currentSection = 'experience';
          else if (upper.includes('EDUCATION') || upper.includes('ACADEMIC')) currentSection = 'education';
          else if (upper.includes('SKILL')) currentSection = 'skills';
          else if (upper.includes('PROJECT')) currentSection = 'projects';
          else currentSection = 'general';
        } else {
          // Avoid duplicate chunks if already covered by resumeChunks
          const isDuplicate = chunks.some(c => c.section === currentSection && c.content.includes(part.slice(0, 50)));
          if (!isDuplicate) {
            chunks.push({
              id: `chunk_raw_${chunks.length + 1}`,
              section: currentSection,
              content: part,
              keywords: new Set(extractKeywords(part)),
            });
          }
        }
      }
    } else if (chunks.length === 0) {
      chunks.push({
        id: 'chunk_all',
        section: 'general',
        content: text.trim(),
        keywords: new Set(extractKeywords(text)),
      });
    }
  }

  // 3. Fallback to basic persona fields if chunks are still empty
  if (chunks.length === 0) {
    const fallbackParts = [
      `Name: ${persona.fullName}`,
      `Roles: ${(persona.targetRoles || []).join(', ')}`,
      `Skills: ${(persona.techStack || []).join(', ')}`,
      `Experience: ${persona.experienceYears || 0} years`,
      `Location: ${persona.location || ''}`,
      persona.education ? `Education: ${persona.education}` : '',
      persona.experienceSummary ? `Summary: ${persona.experienceSummary}` : '',
    ].filter(Boolean);

    const fallback = fallbackParts.join('\n');
    chunks.push({
      id: 'persona_overview',
      section: 'general',
      content: fallback,
      keywords: new Set(extractKeywords(fallback)),
    });
  }

  // 4. Always ensure tech stack skills are included if provided in persona
  if (persona.techStack && persona.techStack.length > 0 && !chunks.some(c => c.id === 'chunk_skills')) {
    const techContent = `Technical Skills: ${persona.techStack.join(', ')}`;
    chunks.push({
      id: 'chunk_tech_stack',
      section: 'skills',
      content: techContent,
      keywords: new Set(extractKeywords(techContent)),
    });
  }

  return chunks;
}

/**
 * Finds the top relevant resume context chunks for a given question with semantic section boosting.
 */
export function findRelevantResumeContext(
  question: string,
  chunks: ResumeChunk[] | string[],
  maxChunks = 3
): string {
  if (!chunks || chunks.length === 0) return '';

  const qLower = question.toLowerCase();
  const qTokens = tokenize(question);
  if (qTokens.length === 0) {
    const first = chunks[0];
    return typeof first === 'string' ? first : first.content;
  }

  const scored = chunks.map((chunk) => {
    const content = typeof chunk === 'string' ? chunk : chunk.content;
    const keywords = typeof chunk === 'string' ? new Set(tokenize(content)) : chunk.keywords;
    const section = typeof chunk === 'string' ? 'general' : chunk.section;

    let matchCount = 0;
    for (const token of qTokens) {
      if (keywords.has(token)) {
        matchCount++;
      }
    }

    // Section relevance boost based on question intent
    if ((section === 'summary') && /summary|bio|about|overview|profile/i.test(qLower)) {
      matchCount += 5;
    } else if ((section === 'education') && /degree|university|college|school|gpa|major|study|graduat/i.test(qLower)) {
      matchCount += 4;
    } else if ((section === 'experience') && /experience|work|company|employer|role|title|responsib/i.test(qLower)) {
      matchCount += 3;
    } else if ((section === 'skills') && /skill|tech|framework|language|tool|proficien|python|react|java/i.test(qLower)) {
      matchCount += 3;
    } else if ((section === 'projects') && /project|portfolio|built|architected|deliver/i.test(qLower)) {
      matchCount += 6;
    } else if ((section === 'auth') && /visa|sponsor|citizen|legal|authoriz/i.test(qLower)) {
      matchCount += 4;
    }

    return { content, score: matchCount };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, maxChunks).filter((s) => s.score > 0 || scored[0].score === 0);
  return top.map((s) => s.content).join('\n\n');
}
