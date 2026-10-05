/**
 * ZeroApply Job Scanner - Job Match Scorer
 * Production-grade evaluation engine computing algorithmic relevance scores
 * between posted job requirements and candidate persona attributes.
 */

import type { PersonaData } from '../../types';
import { extractSkillsFromDescription, type ExtractedJobDetails } from './jobDescriptionExtractor';

export interface JobMatchEvaluation {
  isMatch: boolean;
  score: number;
  recommendation: 'APPLY' | 'REVIEW' | 'SKIP';
  matchedSkills: string[];
  missingSkills: string[];
  roleScore: number;
  skillScore: number;
  rationale: string;
}

export class JobMatchScorer {
  /**
   * Evaluates overall compatibility between a job and candidate persona.
   */
  public static evaluate(
    job: ExtractedJobDetails | { title: string; company?: string; location?: string; descriptionText?: string; description?: string },
    persona: PersonaData,
    minThreshold = 60
  ): JobMatchEvaluation {
    const jobTitle = (job.title || '').toLowerCase().trim();
    const jobDesc = ('descriptionText' in job ? job.descriptionText : (job as any).description) || '';

    // 1. Role Match Score (0 - 100)
    let roleScore = 0;
    const targets = Array.isArray(persona.targetRoles) ? persona.targetRoles : [persona.targetRoles].filter(Boolean);

    if (targets.length === 0) {
      roleScore = 70; // neutral default if no targets set
    } else {
      for (const target of targets) {
        const lowerTarget = (target || '').toLowerCase().trim();
        if (jobTitle === lowerTarget) {
          roleScore = 100;
          break;
        }
        // Substring / token matching
        const targetTokens = lowerTarget.split(/\s+/).filter((t) => t.length > 2);
        const matchedTokens = targetTokens.filter((token) => jobTitle.includes(token));
        const tokenMatchRate = targetTokens.length > 0 ? (matchedTokens.length / targetTokens.length) * 100 : 0;

        if (tokenMatchRate > roleScore) {
          roleScore = tokenMatchRate;
        }
      }
    }

    // 2. Skill Match Score (0 - 100)
    const personaSkills = [
      ...(persona.techStack || []),
      ...(persona.customSkills || []),
    ].map((s) => s.toLowerCase().trim()).filter(Boolean);

    const extractedJobSkills = extractSkillsFromDescription(jobDesc);
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    if (extractedJobSkills.length > 0) {
      for (const skill of extractedJobSkills) {
        if (personaSkills.some((ps) => ps === skill || ps.includes(skill) || skill.includes(ps))) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    } else {
      // Fallback: search persona skills directly in job description
      for (const ps of personaSkills) {
        if (ps.length > 1 && new RegExp(`\\b${ps}\\b`, 'i').test(jobDesc)) {
          matchedSkills.push(ps);
        }
      }
    }

    const skillScore = extractedJobSkills.length > 0
      ? Math.round((matchedSkills.length / extractedJobSkills.length) * 100)
      : (matchedSkills.length > 0 ? Math.min(100, matchedSkills.length * 20) : 50);

    // 3. Composite Score Calculation
    // Role title: 50% weight, Technical skills: 50% weight
    const compositeScore = Math.round((roleScore * 0.5) + (skillScore * 0.5));
    const isMatch = compositeScore >= minThreshold;

    let recommendation: 'APPLY' | 'REVIEW' | 'SKIP' = 'REVIEW';
    let rationale = '';

    if (compositeScore >= minThreshold) {
      recommendation = 'APPLY';
      rationale = `Strong match (${compositeScore}%): Target title aligned (${Math.round(roleScore)}%) with ${matchedSkills.length} key skills matched.`;
    } else if (compositeScore < 40 || roleScore < 30) {
      recommendation = 'SKIP';
      rationale = `Poor fit (${compositeScore}%): Job title or core prerequisites deviate significantly from target roles.`;
    } else {
      recommendation = 'REVIEW';
      rationale = `Moderate match (${compositeScore}%): Relevant skills found, but requires manual confirmation.`;
    }

    return {
      isMatch,
      score: compositeScore,
      recommendation,
      matchedSkills,
      missingSkills,
      roleScore: Math.round(roleScore),
      skillScore: Math.round(skillScore),
      rationale,
    };
  }
}
