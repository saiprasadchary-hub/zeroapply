export type PersonaTone = 'Confident' | 'Minimalist' | 'Detailed';
export type WorkLocation = 'Remote' | 'Hybrid' | 'On-site';
export type ApplyMode = 'easy' | 'normal';

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
  email: string;
  phone: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  experienceYears: number;
  minSalary: number; // in thousands (e.g., 150 = $150k)
  workPreference: WorkLocation;
  tone: PersonaTone;
  techStack: string[];
  targetRoles: string[];
  applyMode: ApplyMode;
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
