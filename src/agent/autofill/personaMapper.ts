import type { PersonaData } from '../../types';
import type { ClassifiedField } from '../detector/fieldClassifier';
import { solveScreeningQuestion } from '../llm/ollamaClient';
import { SalaryOptimizerAgent } from '../compensation/salaryOptimizerAgent';

export interface FieldFillInstruction {
  fieldId: string;
  selector: string;
  type: string;
  value: string;
  category: string;
  confidence: number;
  field?: ClassifiedField['field'];
}

/**
 * Helper to extract granular details from persona profile and parsed resume chunks.
 */
function extractResumeDetail(category: string, persona: PersonaData): string {
  const nameParts = (persona.fullName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

  const rawLoc = (persona.location || '').trim();
  const locParts = rawLoc.split(',').map(s => s.trim()).filter(Boolean);
  const city = locParts[0] || rawLoc;
  const stateMatch = rawLoc.match(/\b([A-Z]{2})\b/);
  const state = locParts.length > 1 ? (stateMatch ? stateMatch[1] : locParts[1].replace(/\d+/g, '').trim()) : '';
  const zipMatch = rawLoc.match(/\b(\d{5,6})\b/);
  const zip = zipMatch ? zipMatch[1] : '94101';
  
  const isIndia = /india|hyderabad|bengaluru|bangalore|mumbai|delhi|pune|chennai|kolkata|noida|gurgaon/i.test(rawLoc);
  const isUK = /london|uk|united kingdom|england/i.test(rawLoc);
  const isCanada = /toronto|vancouver|canada|montreal/i.test(rawLoc);
  const country = isIndia ? 'India' : isUK ? 'United Kingdom' : isCanada ? 'Canada' : 'United States';

  const edu = persona.resumeChunks?.education || '';
  const exp = persona.resumeChunks?.experience || '';

  switch (category) {
    case 'firstName':
      return firstName;
    case 'lastName':
      return lastName;
    case 'fullName':
      return persona.fullName || '';
    case 'email':
      return persona.email || '';
    case 'phone':
      return persona.phone || '';
    case 'phoneCountryCode': {
      if (persona.phone && persona.phone.startsWith('+91')) return '+91';
      if (persona.phone && persona.phone.startsWith('+44')) return '+44';
      if (persona.phone && persona.phone.startsWith('+1')) return '+1';
      return isIndia ? '+91' : isUK ? '+44' : '+1';
    }
    case 'city':
      return city;
    case 'state':
      return state;
    case 'zip':
      return zip;
    case 'country':
      return country;
    case 'location':
      return persona.location || '';
    case 'linkedIn':
      return persona.linkedIn || '';
    case 'gitHub':
      return persona.gitHub || '';
    case 'portfolio':
      return persona.portfolio || persona.linkedIn || '';
    case 'experienceYears': {
      const isInternRole = (persona.targetRoles || []).some(r => r.toLowerCase().includes('intern'));
      const expValue = isInternRole ? Math.min(persona.experienceYears || 1, 2) : (persona.experienceYears || 0);
      return String(expValue);
    }
    case 'minSalary': {
      const opt = SalaryOptimizerAgent.calculateOptimalCompensation('Desired Salary', persona.minSalary || 65);
      return opt.value;
    }
    case 'workPreference':
      return persona.workPreference || 'Remote';
    case 'currentTitle': {
      if (persona.targetRoles && persona.targetRoles[0]) return persona.targetRoles[0];
      const titleMatch = exp.match(/^([A-Z][A-Za-z0-9\s,&+-]+?)(?:\s+(?:at|@|-|–|—|\|)\s+|\n|$)/m);
      return titleMatch ? titleMatch[1].trim() : 'Software Engineer';
    }
    case 'currentCompany': {
      const compMatch = exp.match(/(?:at|@|–|—|-|\|)\s+([A-Z0-9][A-Za-z0-9\s,&.-]+?)(?:\s*\(|\s*\d{4}|\n|$)/m);
      return compMatch ? compMatch[1].trim() : 'Current Organization';
    }
    case 'university': {
      const uniMatch = edu.match(/((?:University|College|Institute|School|Academy|IIT|NIT|State)[^\n,.-]*|[A-Z][A-Za-z\s&]+(?:University|College|Institute|School))/i);
      return uniMatch ? uniMatch[0].trim() : "Bachelor's Institute of Technology";
    }
    case 'degree': {
      if (/Ph\.?D|Doctorate/i.test(edu)) return 'Doctorate / Ph.D.';
      if (/M\.?S\.?|Master|M\.Tech|M\.E\.|M\.B\.A/i.test(edu)) return "Master's Degree";
      return "Bachelor's Degree";
    }
    case 'major': {
      const majorMatch = edu.match(/(?:in|of|major in|specializing in)\s+([A-Z][A-Za-z\s&]+?)(?:\s+[-–—]|\s*\(|\s*\n|,|\.|$)/i);
      return majorMatch ? majorMatch[1].trim() : 'Computer Science';
    }
    case 'graduationYear': {
      const years = (edu.match(/\b(19\d{2}|20\d{2})\b/g) || []).map(Number).sort();
      if (years.length > 0) return String(years[years.length - 1]);
      return String(new Date().getFullYear() - Math.max(persona.experienceYears || 2, 1));
    }
    case 'skills':
      return (persona.techStack && persona.techStack.length > 0)
        ? persona.techStack.join(', ')
        : (persona.resumeChunks?.skills || 'Software Development, React, Python, JavaScript, SQL');
    case 'summary':
      return persona.resumeChunks?.summary ||
        `Dedicated and results-driven engineering professional with ${persona.experienceYears || 3}+ years of experience in ${(persona.techStack || []).slice(0, 4).join(', ')}. Passionate about building reliable, high-performance software solutions.`;
    case 'coverLetter': {
      const role = persona.targetRoles?.[0] || 'Software Engineer';
      const techList = (persona.techStack || ['Full Stack Development', 'TypeScript', 'React', 'Python']).slice(0, 4).join(', ');
      return `Dear Hiring Team,\n\nI am writing to express my strong interest in joining your team as a ${role}. With a background in technical engineering and practical experience developing with ${techList}, I specialize in architecting responsive web applications, robust APIs, and intelligent automation systems.\n\nThroughout my work, I have focused on building clean, high-performance software and solving complex technical challenges. I thrive in collaborative environments that emphasize rapid iteration, user-centric design, and continuous learning.\n\nI welcome the opportunity to discuss how my technical problem-solving and engineering skills can contribute to your upcoming goals. Thank you for your time and consideration.\n\nSincerely,\n${persona.fullName || 'Applicant'}`;
    }
    case 'signature':
      return persona.fullName || 'Authorized Applicant';
    case 'references': {
      if (persona.resumeChunks?.references) return persona.resumeChunks.references;
      if (persona.references && persona.references.length > 0) {
        return persona.references.map(r => `${r.name} - ${r.title} at ${r.company} (Email: ${r.email}, Phone: ${r.phone})`).join('\n');
      }
      return 'Available upon request';
    }
    case 'resume':
      return '[ATTACH_RESUME]';
    default:
      return '';
  }
}

/**
 * Maps all classified fields to concrete fill values using active persona data & local LLM.
 */
export async function mapPersonaToFields(
  classifiedFields: ClassifiedField[],
  persona: PersonaData
): Promise<FieldFillInstruction[]> {
  const instructions: FieldFillInstruction[] = [];

  for (const item of classifiedFields) {
    const { field, category } = item;
    let fillValue = '';

    if (category === 'screeningQuestion') {
      if (field.label) {
        const solved = await solveScreeningQuestion(field.label, persona, { availableOptions: field.options });
        fillValue = solved.answer;
      }
    } else if (category !== 'ignore') {
      fillValue = extractResumeDetail(category, persona);
      // If it's a dropdown with explicit options, refine value to best matching option
      if ((field.type === 'select' || field.type === 'custom_dropdown' || field.type === 'radio') && field.options && field.options.length > 0) {
        const directMatch = field.options.some(o => o.toLowerCase().trim() === fillValue.toLowerCase().trim());
        if (!directMatch && field.label) {
          const refined = await solveScreeningQuestion(field.label, persona, { availableOptions: field.options });
          if (refined.answer) {
            fillValue = refined.answer;
          }
        }
      }
    }

    // Defensive Type Casting: Ensure numeric and scale inputs receive valid digits only
    if (field.type === 'number' || (field.label && /(?:scale of \d+|rate (?:your|yourself)|\b1 to 10\b|\b1-10\b|\b1 to 5\b|\b1-5\b)/i.test(field.label))) {
      const digitMatch = fillValue.match(/\b\d+(\.\d+)?\b/);
      if (digitMatch) {
        fillValue = digitMatch[0];
      } else {
        fillValue = '10';
      }
    }

    if (fillValue) {
      instructions.push({
        fieldId: field.id,
        selector: field.elementSelector,
        type: field.type,
        value: fillValue,
        category,
        confidence: item.confidence,
        field,
      });
    }
  }

  return instructions;
}
