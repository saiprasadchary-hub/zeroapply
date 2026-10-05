export type PersonaTone = 'Confident' | 'Minimalist' | 'Detailed';
export type WorkLocation = 'Remote' | 'Hybrid' | 'On-site';
export type ApplyMode = 'easy' | 'normal';
import type { BrowserMode } from '../browserSelect/types';

export interface ProfessionalReference {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship?: string;
}

export interface PersonaData {
  fullName: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email: string;
  phone: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  experienceYears: number;
  minSalary: number; // in LPA / Lakhs Per Annum (e.g., 12 = ₹12 LPA)
  workPreference: WorkLocation;
  tone: PersonaTone;
  techStack: string[];
  targetRoles: string[];
  employmentStatus?: 'fresher' | 'currently_working';
  currentCompany?: string;
  currentCtcLpa?: number; // in LPA / Lakhs Per Annum (0 for fresher, e.g., 8 = ₹8 LPA)
  noticePeriodDays?: number; // in days (0 for immediate/fresher, 15, 30, etc.)
  skills?: string[];
  customSkills?: string[];
  linkedinUrl?: string;
  gitHubUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  applyMode: ApplyMode;
  browserMode?: BrowserMode;
  applicationLimit?: number;
  verified: boolean;
  resumeText?: string;
  experienceSummary?: string;
  education?: string;
  references?: ProfessionalReference[];
  resumeChunks?: {
    summary?: string;
    experience?: string;
    education?: string;
    skills?: string;
    projects?: string;
    certifications?: string;
    languages?: string;
    publications?: string;
    awards?: string;
    leadership?: string;
    metrics?: string;
    workAuthorization?: string;
    availability?: string;
    compensation?: string;
    relocation?: string;
    securityClearance?: string;
    domainExpertise?: string;
    eeoDemographics?: string;
    references?: string;
    [key: string]: string | undefined;
  };
}
