import type { PersonaData, PersonaTone, WorkLocation } from '../types';

/**
 * Local NLP & Pattern Classifier
 * Extracts ONLY authentic, verified entities from raw resume text.
 * NEVER generates fake or dummy fallback data.
 */

const TECH_DICTIONARY = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL',
  'HTML', 'CSS', 'TailwindCSS', 'Tailwind', 'Next.js', 'Vite', 'Vue', 'Angular', 'Svelte', 'Express', 'FastAPI', 'Django', 'Flask',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase', 'Supabase', 'DynamoDB',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Linux', 'Git', 'GitHub', 'CI/CD', 'Terraform',
  'PyTorch', 'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy', 'OpenCV', 'NLP', 'LLM', 'Electron'
];

const KNOWN_CITIES = [
  'Bengaluru', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Noida', 'Gurugram',
  'San Francisco', 'New York', 'Seattle', 'Austin', 'Boston', 'London', 'Berlin', 'Toronto', 'Remote'
];

export async function runLocalMLClassification(text: string, current: PersonaData): Promise<Partial<PersonaData>> {
  const result: Partial<PersonaData> = {};

  if (!text || text.trim().length < 5) {
    return result;
  }

  // 1. Email Extraction (strict real email regex)
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i);
  if (emailMatch) {
    const matchedEmail = emailMatch[0].toLowerCase().trim();
    if (!matchedEmail.includes('example.com') && !matchedEmail.includes('domain.com')) {
      result.email = matchedEmail;
    }
  }

  // 2. Phone Extraction
  const phoneLabelMatch = text.match(/(?:phone|mobile|tel|contact|cell)[\s:]*([+\d\s().-]{10,25})/i);
  if (phoneLabelMatch) {
    const rawPhone = phoneLabelMatch[1].trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      result.phone = rawPhone;
    }
  }
  if (!result.phone) {
    const phoneMatches = Array.from(text.matchAll(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}\b/g));
    for (const m of phoneMatches) {
      const rawPhone = m[0].trim();
      const digits = rawPhone.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        result.phone = rawPhone;
        break;
      }
    }
  }

  // 3. LinkedIn Profile Extraction
  const linkedinUrlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_.-]+)/i);
  if (linkedinUrlMatch && linkedinUrlMatch[1]) {
    result.linkedIn = `https://linkedin.com/in/${linkedinUrlMatch[1].replace(/\/$/, '').trim()}`;
  }

  // 4. GitHub Profile Extraction
  const githubUrlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)/i);
  if (githubUrlMatch && githubUrlMatch[1]) {
    const handle = githubUrlMatch[1].replace(/\/$/, '').trim();
    if (!['features', 'topics', 'trending'].includes(handle.toLowerCase())) {
      result.gitHub = `https://github.com/${handle}`;
    }
  }

  // 5. Full Name Extraction
  const nameLabelMatch = text.match(/(?:full\s*name|candidate\s*name|name)[\s:]+([A-Za-z.\s'-]{2,40})/i);
  if (nameLabelMatch) {
    const candidate = nameLabelMatch[1].trim();
    if (candidate.length >= 3 && !/@|http|linkedin|github|resume|email/i.test(candidate)) {
      result.fullName = candidate;
    }
  }

  if (!result.fullName) {
    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    for (const rawLine of lines.slice(0, 15)) {
      const cleanLine = rawLine.split(/[|•–—-]/)[0].trim();
      if (/@|http|linkedin|github|resume|curriculum|phone|email|skills|experience|education|summary|contact|profile|project|page/i.test(cleanLine)) {
        continue;
      }
      const words = cleanLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && cleanLine.length <= 40 && cleanLine.length >= 3) {
        if (words.every((w) => /^[A-Za-z.-]+$/.test(w))) {
          result.fullName = words.map((w) => (w === w.toUpperCase() && w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
          break;
        }
      }
    }
  }

  // 7. Location Detection
  for (const city of KNOWN_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(text)) {
      result.location = city;
      break;
    }
  }

  // 8. Experience Years Calculation
  const expMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\b(?:\s+of)?\s*(?:experience|exp)?/i);
  if (expMatch) {
    const yrs = parseInt(expMatch[1], 10);
    if (!isNaN(yrs) && yrs >= 0 && yrs <= 30) {
      result.experienceYears = yrs;
    }
  } else {
    // Date range analysis
    const yearMatches = Array.from(text.matchAll(/\b(20[0-2][0-9])\b/g)).map((m) => parseInt(m[1], 10));
    if (yearMatches.length >= 2) {
      const minYear = Math.min(...yearMatches);
      const maxYear = Math.max(...yearMatches, new Date().getFullYear());
      const diff = maxYear - minYear;
      if (diff > 0 && diff <= 30) {
        result.experienceYears = diff;
      }
    }
  }

  // 9. Authentic Tech Stack Skills Extraction
  const extractedSkills = new Set<string>(current.techStack);
  for (const skill of TECH_DICTIONARY) {
    const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      extractedSkills.add(skill);
    }
  }
  result.techStack = Array.from(extractedSkills);

  // 10. Target Roles Extraction
  const ROLES = ['Software Engineer', 'Full Stack Developer', 'Frontend Engineer', 'Backend Developer', 'DevOps Engineer', 'Data Scientist'];
  const extractedRoles = new Set<string>(current.targetRoles);
  for (const role of ROLES) {
    const regex = new RegExp(`\\b${role}\\b`, 'i');
    if (regex.test(text)) {
      extractedRoles.add(role);
    }
  }
  if (extractedRoles.size > 0) {
    result.targetRoles = Array.from(extractedRoles);
  }

  // 11. Work Preference & Tone Detection
  if (/remote|work from home/i.test(text)) {
    result.workPreference = 'Remote' as WorkLocation;
  } else if (/hybrid/i.test(text)) {
    result.workPreference = 'Hybrid' as WorkLocation;
  } else if (/on-site|onsite|office/i.test(text)) {
    result.workPreference = 'On-site' as WorkLocation;
  }

  if (/\b(architected|spearheaded|engineered|led|scaled|delivered)\b/i.test(text)) {
    result.tone = 'Confident' as PersonaTone;
  }

  return result;
}
