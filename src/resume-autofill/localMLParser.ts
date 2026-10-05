import type { PersonaData } from '../types';

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

  text = text.normalize('NFKC').replace(/\r\n?/g, '\n');
  const contactText = text.split(/\n(?:work experience|professional experience|experience|education|projects|skills)\s*[:\n]/i)[0];

  // 1. Email Extraction (strict real email regex)
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i);
  if (emailMatch) {
    const matchedEmail = emailMatch[0].toLowerCase().trim();
    if (!matchedEmail.includes('example.com') && !matchedEmail.includes('domain.com')) {
      result.email = matchedEmail;
    }
  }

  // 2. Phone Extraction
  const phoneLabelMatch = contactText.match(/(?:phone|mobile|tel|contact|cell)[\s:]*([+\d \t().-]{10,25})/i);
  if (phoneLabelMatch) {
    const rawPhone = phoneLabelMatch[1].trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      result.phone = rawPhone;
    }
  }
  if (!result.phone) {
    const phoneMatches = Array.from(contactText.matchAll(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}\b/g));
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
  const nameLabelMatch = text.match(/^(?:full[ \t]*name|candidate[ \t]*name|name)[ \t:]+([\p{L}\p{M}. \t'-]{2,60})$/imu);
  if (nameLabelMatch) {
    const candidate = nameLabelMatch[1].trim();
    if (candidate.length >= 3 && !/@|http|linkedin|github|resume|email/i.test(candidate)) {
      result.fullName = candidate;
    }
  }

  if (!result.fullName) {
    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    for (const rawLine of lines.slice(0, 4)) {
      let cleanLine = rawLine.split(/[|,•–—]/)[0].trim();
      cleanLine = cleanLine.replace(/(?:Hyderabad|Bengaluru|Bangalore|Mumbai|Delhi|Pune|Chennai|Noida|San Francisco|New York|Seattle|Austin|Boston|London|Toronto|India|Telangana|Karnataka|Maharashtra|USA|US).*/i, '').trim();
      if (/@|http|linkedin|github|resume|curriculum|phone|email|skills|experience|education|summary|contact|profile|project|page/i.test(cleanLine)) {
        continue;
      }
      const words = cleanLine.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4 && cleanLine.length <= 40 && cleanLine.length >= 3) {
        if (words.every((w) => /^[\p{L}\p{M}.'-]+$/u.test(w))) {
          result.fullName = words.map((w) => (w === w.toUpperCase() && w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
          break;
        }
      }
    }
  }

  // Residence must be grounded in contact lines, never an employer or school location.
  const headerLines = contactText.split('\n').slice(0, 6).join('\n');
  for (const city of KNOWN_CITIES.filter((value) => value !== 'Remote')) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(headerLines)) {
      result.location = city;
      result.city = city;
      result.state = '';
      result.country = '';
      result.postalCode = '';
      if (city === 'Hyderabad') {
        result.state = 'Telangana';
        result.country = 'India';
        result.location = 'Hyderabad, Telangana, India';
      }
      break;
    }
  }
  const postalMatch = headerLines.match(/(?:postal(?: code)?|zip(?: code)?|pincode|pin code)[ \t:]+([A-Z0-9 -]{3,10})(?=$|[|,\n])/im);
  if (postalMatch) result.postalCode = postalMatch[1].trim();

  // Do not mistake degree dates or project durations for employment tenure.
  const expMatch = text.match(/\b(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|work\s+|industry\s+)?experience\b/i);
  if (expMatch) {
    const years = Number(expMatch[1]);
    if (years >= 0 && years <= 60) result.experienceYears = years;
  } else if (/\b(?:fresher|no (?:prior |professional |work )?experience)\b/i.test(text)) {
    result.experienceYears = 0;
  }

  // 9. Authentic Tech Stack Skills Extraction
  const extractedSkills = new Set<string>();
  for (const skill of TECH_DICTIONARY) {
    const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9_])${escaped}(?=$|[^a-z0-9_+#])`, 'i');
    if (regex.test(text)) {
      extractedSkills.add(skill);
    }
  }
  if (extractedSkills.size > 0) result.techStack = Array.from(extractedSkills);

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

  // 12. Education Detection (Degree, Major, Institution)
  const eduMatch = text.match(/(?:B\.?Tech|Bachelor(?:'s)?|B\.?S\.?|B\.?E\.?|M\.?Tech|Master(?:'s)?|M\.?S\.?|Ph\.?D\.?|Associate(?:'s)?)\s+(?:in\s+|of\s+)?([A-Za-z \t&]{3,80})/i);
  if (eduMatch) {
    result.education = eduMatch[0].trim();
  } else {
    const generalEdu = text.match(/(?:EDUCATION|ACADEMICS)[\s\S]{1,200}?(?:University|College|Institute|Degree|School)[^\n\r]+/i);
    if (generalEdu) {
      const firstLine = generalEdu[0].replace(/^(?:EDUCATION|ACADEMICS)[\s:]*/i, '').split(/[\n\r]+/)[0].trim();
      if (firstLine.length > 5 && firstLine.length < 100) {
        result.education = firstLine;
      }
    }
  }

  // 13. Experience Summary Extraction
  const summaryMatch = text.match(/(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT ME)[\s:]+([\s\S]{20,350}?)(?=\n\s*\n|[A-Z\s]{4,}:|$)/i);
  if (summaryMatch) {
    const cleanSummary = summaryMatch[1].replace(/\s+/g, ' ').trim();
    if (cleanSummary.length > 20) {
      result.experienceSummary = cleanSummary;
    }
  }

  // 14. Current / Recent Job Title Extraction from Resume
  const titleMatch = text.match(/(?:EXPERIENCE|EMPLOYMENT HISTORY|WORK HISTORY)[\s\S]{1,120}?\b((?:Senior\s+|Lead\s+|Staff\s+|Principal\s+|Junior\s+|Associate\s+)?(?:Software\s+Engineer|Full\s*Stack\s+Developer|Frontend\s+Engineer|Backend\s+Engineer|AI\s+Engineer|ML\s+Engineer|Data\s+Scientist|Product\s+Manager|DevOps\s+Engineer|Mobile\s+Developer|Android\s+Developer|iOS\s+Developer|Application\s+Engineer))\b/i);
  if (titleMatch && titleMatch[1]) {
    const extractedTitle = titleMatch[1].trim();
    if (!result.targetRoles || result.targetRoles.length === 0) {
      result.targetRoles = [extractedTitle];
    } else if (!result.targetRoles.includes(extractedTitle)) {
      result.targetRoles = [extractedTitle, ...result.targetRoles];
    }
  }

  return result;
}
