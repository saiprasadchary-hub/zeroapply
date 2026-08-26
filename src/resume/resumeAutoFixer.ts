import type { ResumeDocument } from './types';

// Cliché Buzzwords to Technical Action Verb Mappings
export const BUZZWORD_REPLACEMENTS: Record<string, string> = {
  'responsible for': 'Architected, spearheaded, and executed',
  'helped with': 'Collaborated on and accelerated',
  'worked on': 'Engineered and deployed',
  'assisted': 'Co-engineered and delivered',
  'hard worker': 'High-velocity technical contributor',
  'team player': 'Cross-functional collaborator',
  'fast learner': 'Rapidly adopted and integrated modern tooling',
  'synergy': 'Cross-team technical alignment',
  'go-to person': 'Subject matter expert (SME)',
  'dynamic': 'High-throughput, scalable',
  'thought leader': 'Technical mentor and design lead',
  'passionate': 'Proven track record in building',
};

export interface BuzzwordIssue {
  original: string;
  suggested: string;
  location: string;
}

// 1. Detect Buzzwords and Passive Voice
export function scanResumeForBuzzwords(doc: ResumeDocument): BuzzwordIssue[] {
  const issues: BuzzwordIssue[] = [];

  // Check summary
  const summaryLower = doc.summary.toLowerCase();
  Object.keys(BUZZWORD_REPLACEMENTS).forEach((buzz) => {
    if (summaryLower.includes(buzz)) {
      issues.push({
        original: buzz,
        suggested: BUZZWORD_REPLACEMENTS[buzz],
        location: 'Executive Summary',
      });
    }
  });

  // Check experience bullets
  doc.experience.forEach((exp, eIdx) => {
    exp.bullets.forEach((bullet, bIdx) => {
      const bLower = bullet.toLowerCase();
      Object.keys(BUZZWORD_REPLACEMENTS).forEach((buzz) => {
        if (bLower.includes(buzz)) {
          issues.push({
            original: buzz,
            suggested: BUZZWORD_REPLACEMENTS[buzz],
            location: `${exp.role || `Role #${eIdx + 1}`} (Bullet #${bIdx + 1})`,
          });
        }
      });
    });
  });

  return issues;
}

// 2. 1-Click Normalizer & Dealbreaker Auto-Fixer
export function autoFixAndNormalizeResume(doc: ResumeDocument): {
  document: ResumeDocument;
  fixedCount: number;
} {
  let count = 0;
  const newDoc: ResumeDocument = JSON.parse(JSON.stringify(doc));

  // Normalize Summary
  if (newDoc.summary) {
    const trimmed = newDoc.summary.trim();
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (formatted !== newDoc.summary) count++;
    newDoc.summary = formatted;
  }

  // Normalize Contact
  if (newDoc.contact.phone) {
    const cleanPhone = newDoc.contact.phone.replace(/[^0-9+() -]/g, '').trim();
    if (cleanPhone !== newDoc.contact.phone) count++;
    newDoc.contact.phone = cleanPhone;
  }

  // Normalize Experience
  newDoc.experience = newDoc.experience.map((exp) => {
    // Normalize date format
    let sDate = (exp.startDate || '').trim();
    let eDate = (exp.endDate || '').trim();
    if (exp.current) eDate = 'Present';

    // Normalize bullets: capitalize first letter, ensure trailing period, trim whitespace
    const fixedBullets = exp.bullets
      .map((b) => {
        let clean = b.trim();
        if (!clean) return '';
        // Capitalize first letter
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        // Ensure ends with period
        if (!clean.endsWith('.') && !clean.endsWith('!') && !clean.endsWith('?')) {
          clean += '.';
          count++;
        }
        // Replace cliché buzzwords
        Object.keys(BUZZWORD_REPLACEMENTS).forEach((buzz) => {
          const regex = new RegExp(`\\b${buzz}\\b`, 'gi');
          if (regex.test(clean)) {
            clean = clean.replace(regex, BUZZWORD_REPLACEMENTS[buzz]);
            count++;
          }
        });
        return clean;
      })
      .filter(Boolean);

    return {
      ...exp,
      startDate: sDate,
      endDate: eDate,
      bullets: fixedBullets.length > 0 ? fixedBullets : [''],
    };
  });

  // Normalize Projects
  newDoc.projects = newDoc.projects.map((proj) => {
    const fixedBullets = proj.bullets.map((b) => {
      let clean = b.trim();
      if (!clean) return '';
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      if (!clean.endsWith('.')) {
        clean += '.';
        count++;
      }
      return clean;
    });
    return {
      ...proj,
      bullets: fixedBullets.length > 0 ? fixedBullets : [''],
    };
  });

  newDoc.updatedAt = Date.now();
  return { document: newDoc, fixedCount: count };
}
