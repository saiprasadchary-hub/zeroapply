export type ResumeTemplateId = 'harvard' | 'modern' | 'executive';
export type ResumeFontFamily = 'sans' | 'serif' | 'mono';
export type ResumeFontSize = 'compact' | 'standard' | 'spacious';

export interface ResumeContact {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  jobTitle: string;
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeEducationItem {
  id: string;
  institution: string;
  degree: string;
  location: string;
  graduationYear: string;
  gpa?: string;
  honors?: string;
}

export interface ResumeSkillsData {
  languages: string[];
  frontend: string[];
  backend: string[];
  databases: string[];
  cloudDevops: string[];
  tools: string[];
  custom: string[];
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role?: string;
  url?: string;
  gitHub?: string;
  techStack: string[];
  bullets: string[];
}

export interface ResumeCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface ResumeCustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  description?: string;
  bullets: string[];
}

export interface ResumeCustomSection {
  id: string;
  title: string;
  description?: string;
  items: ResumeCustomSectionItem[];
}

export type ResumeStandardSectionKey = 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'certifications';
export type ResumeSectionKey = ResumeStandardSectionKey | string;

export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  'summary',
  'experience',
  'skills',
  'projects',
  'education',
];

export interface ResumeSettings {
  templateId: ResumeTemplateId;
  fontFamily: ResumeFontFamily;
  fontSize: ResumeFontSize;
  pageMargins?: 'compact' | 'normal' | 'wide';
  lineSpacing?: 'snug' | 'normal' | 'relaxed';
  accentColor: string;
  showIcons: boolean;
  showSectionDividers: boolean;
  sectionOrder?: ResumeSectionKey[];
}

export interface ResumeDocument {
  id: string;
  title: string;
  updatedAt: number;
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: ResumeSkillsData;
  projects: ResumeProjectItem[];
  certifications: ResumeCertificationItem[];
  customSections?: ResumeCustomSection[];
  settings: ResumeSettings;
}
