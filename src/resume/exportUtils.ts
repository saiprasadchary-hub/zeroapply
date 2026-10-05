import type { PersonaData } from '../types';
import type { ResumeDocument } from './types';

export const DEFAULT_RESUME_DOCUMENT: ResumeDocument = {
  id: 'resume_default',
  title: 'Senior Software Engineer — ATS Resume',
  updatedAt: Date.now(),
  contact: {
    fullName: 'Alex Vance',
    jobTitle: 'Senior Full Stack Software Engineer',
    email: 'alex.vance.dev@gmail.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedIn: 'https://linkedin.com/in/alexvance-dev',
    gitHub: 'https://github.com/alexvance-dev',
    portfolio: 'https://alexvance.dev',
  },
  summary:
    'Results-driven Senior Full Stack Software Engineer with 6+ years of experience architecting high-throughput distributed web applications and microservices. Expert in TypeScript, React, Next.js, Node.js, Python, and AWS cloud infrastructure. Proven track record of scaling user-facing platforms to 2M+ MAU, cutting API latency by 45%, and leading high-performing agile engineering squads.',
  experience: [
    {
      id: 'exp-1',
      company: 'Nexus Cloud Technologies',
      role: 'Senior Full Stack Engineer',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      bullets: [
        'Architected and deployed high-performance distributed microservices in TypeScript, Node.js, and AWS ECS, handling 15M+ daily API transactions with 99.99% uptime.',
        'Redesigned core client-facing dashboard using React 18, Next.js, and TailwindCSS, improving Lighthouse performance score by 40% and cutting page load times from 3.2s to 850ms.',
        'Implemented event-driven asynchronous processing pipeline using Kafka, Redis, and PostgreSQL, increasing system throughput by 3.5x during peak traffic events.',
        'Mentored 6 junior and mid-level engineers in distributed systems design, clean architecture, and automated CI/CD deployment workflows.',
      ],
    },
    {
      id: 'exp-2',
      company: 'Vanguard Software Labs',
      role: 'Full Stack Software Engineer',
      location: 'Austin, TX',
      startDate: '2019',
      endDate: '2022',
      current: false,
      bullets: [
        'Engineered full-stack features using React, Python FastAPI, and PostgreSQL for an enterprise SaaS workflow automation platform serving 250,000+ active users.',
        'Developed automated end-to-end and integration test suites using Jest and Playwright, raising test coverage from 62% to 91% and reducing production bugs by 35%.',
        'Optimized SQL queries and database indexing strategies across multi-tenant database clusters, slashing p95 query latency by 48%.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science in Computer Science',
      location: 'Berkeley, CA',
      graduationYear: '2019',
      gpa: '3.85 / 4.0',
      honors: 'Magna Cum Laude',
    },
  ],
  skills: {
    languages: ['TypeScript', 'JavaScript (ES6+)', 'Python', 'Go', 'SQL', 'HTML5/CSS3'],
    frontend: ['React', 'Next.js', 'Tailwind CSS', 'Redux Toolkit', 'Vite', 'Vue.js'],
    backend: ['Node.js', 'Express', 'FastAPI', 'GraphQL', 'REST APIs', 'gRPC'],
    databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB'],
    cloudDevops: ['AWS (ECS, Lambda, S3)', 'Docker', 'Kubernetes', 'CI/CD (GitHub Actions)', 'Terraform'],
    tools: ['Git', 'Jest', 'Playwright', 'Kafka', 'Webpack', 'Postman', 'Linux'],
    custom: ['Distributed Systems', 'System Design', 'Microservices Architecture', 'Agile / Scrum'],
  },
  projects: [
    {
      id: 'proj-1',
      name: 'CloudPulse — Real-Time Infrastructure Monitoring Platform',
      techStack: ['TypeScript', 'React', 'Go', 'Kafka', 'PostgreSQL', 'Docker'],
      url: 'https://cloudpulse-demo.io',
      gitHub: 'https://github.com/alexvance-dev/cloudpulse',
      bullets: [
        'Built an open-source distributed observability platform streaming telemetry metrics and alerting for 500+ cluster nodes.',
        'Implemented real-time WebSocket dashboard visualizing sub-second metric anomalies with zero UI frame drops.',
      ],
    },
    {
      id: 'proj-2',
      name: 'AI Resume & Semantic Career Copilot',
      techStack: ['Next.js', 'Python', 'FastAPI', 'OpenAI API', 'Vector DB', 'TailwindCSS'],
      url: 'https://career-copilot-ai.dev',
      gitHub: 'https://github.com/alexvance-dev/career-copilot',
      bullets: [
        'Engineered an AI-powered resume analyzer matching job descriptions with candidate resumes using semantic vector embeddings.',
        'Achieved 94% precision in extracting key domain competencies and ATS keyword optimization suggestions.',
      ],
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Solutions Architect – Professional',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
    {
      id: 'cert-2',
      name: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation (CNCF)',
      date: '2022',
    },
  ],
  settings: {
    templateId: 'harvard',
    fontFamily: 'serif',
    fontSize: 'standard',
    accentColor: '#0891b2',
    showIcons: false,
    showSectionDividers: true,
  },
};

/**
 * Converts a structured ResumeDocument into ATS-compliant plain text
 * formatted for direct parsing or raw clipboard pasting.
 */
export function resumeToPlainText(doc: ResumeDocument): string {
  const lines: string[] = [];

  // 1. Header & Contact Info
  lines.push(doc.contact.fullName.toUpperCase());
  if (doc.contact.jobTitle) lines.push(doc.contact.jobTitle);
  
  const contactDetails: string[] = [];
  if (doc.contact.email) contactDetails.push(doc.contact.email);
  if (doc.contact.phone) contactDetails.push(doc.contact.phone);
  if (doc.contact.location) contactDetails.push(doc.contact.location);
  if (doc.contact.linkedIn) contactDetails.push(doc.contact.linkedIn.replace(/^https?:\/\/(www\.)?/, ''));
  if (doc.contact.gitHub) contactDetails.push(doc.contact.gitHub.replace(/^https?:\/\/(www\.)?/, ''));
  if (doc.contact.portfolio) contactDetails.push(doc.contact.portfolio.replace(/^https?:\/\/(www\.)?/, ''));
  
  lines.push(contactDetails.join(' | '));
  lines.push('');

  // 2. Executive Summary
  if (doc.summary && doc.summary.trim()) {
    lines.push('EXECUTIVE SUMMARY');
    lines.push('-----------------');
    lines.push(doc.summary.trim());
    lines.push('');
  }

  // 3. Work Experience
  if (doc.experience && doc.experience.length > 0) {
    lines.push('WORK EXPERIENCE');
    lines.push('---------------');
    doc.experience.forEach((exp) => {
      const dateStr = `${exp.startDate} – ${exp.current ? 'Present' : exp.endDate}`;
      lines.push(`${exp.company} | ${exp.role} | ${exp.location} | ${dateStr}`);
      exp.bullets.forEach((b) => {
        if (b.trim()) lines.push(`• ${b.trim()}`);
      });
      lines.push('');
    });
  }

  // 4. Technical Skills
  const allSkills = [
    ...(doc.skills.languages.length ? [`Languages: ${doc.skills.languages.join(', ')}`] : []),
    ...(doc.skills.frontend.length ? [`Frontend: ${doc.skills.frontend.join(', ')}`] : []),
    ...(doc.skills.backend.length ? [`Backend: ${doc.skills.backend.join(', ')}`] : []),
    ...(doc.skills.databases.length ? [`Databases: ${doc.skills.databases.join(', ')}`] : []),
    ...(doc.skills.cloudDevops.length ? [`Cloud & DevOps: ${doc.skills.cloudDevops.join(', ')}`] : []),
    ...(doc.skills.tools.length ? [`Tools & Frameworks: ${doc.skills.tools.join(', ')}`] : []),
    ...(doc.skills.custom.length ? [`Core Competencies: ${doc.skills.custom.join(', ')}`] : []),
  ];

  if (allSkills.length > 0) {
    lines.push('TECHNICAL SKILLS & COMPETENCIES');
    lines.push('-------------------------------');
    allSkills.forEach((s) => lines.push(`• ${s}`));
    lines.push('');
  }

  // 5. Featured Projects
  if (doc.projects && doc.projects.length > 0) {
    lines.push('FEATURED PROJECTS');
    lines.push('-----------------');
    doc.projects.forEach((proj) => {
      const techStr = proj.techStack.length ? ` (${proj.techStack.join(', ')})` : '';
      lines.push(`${proj.name}${techStr}`);
      if (proj.url || proj.gitHub) {
        lines.push(`Links: ${[proj.url, proj.gitHub].filter(Boolean).join(' | ')}`);
      }
      proj.bullets.forEach((b) => {
        if (b.trim()) lines.push(`• ${b.trim()}`);
      });
      lines.push('');
    });
  }

  // 6. Education
  if (doc.education && doc.education.length > 0) {
    lines.push('EDUCATION');
    lines.push('---------');
    doc.education.forEach((edu) => {
      lines.push(`${edu.institution} | ${edu.degree} | ${edu.location} | ${edu.graduationYear}`);
      if (edu.gpa || edu.honors) {
        lines.push(`Honors/GPA: ${[edu.honors, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' - ')}`);
      }
      lines.push('');
    });
  }

  // 7. Certifications
  if (doc.certifications && doc.certifications.length > 0) {
    lines.push('CERTIFICATIONS & CREDENTIALS');
    lines.push('----------------------------');
    doc.certifications.forEach((cert) => {
      lines.push(`• ${cert.name} — ${cert.issuer} (${cert.date})`);
    });
    lines.push('');
  }

  // 8. Custom Sections
  if (doc.customSections && doc.customSections.length > 0) {
    doc.customSections.forEach((sec) => {
      if (sec.title && sec.items && sec.items.length > 0) {
        lines.push(sec.title.toUpperCase());
        lines.push('-'.repeat(Math.max(sec.title.length, 12)));
        sec.items.forEach((item) => {
          const header = [item.title, item.subtitle, item.location, item.date].filter(Boolean).join(' | ');
          if (header) lines.push(header);
          if (item.description && item.description.trim()) {
            lines.push(item.description.trim());
          }
          item.bullets.forEach((b) => {
            if (b.trim()) lines.push(`• ${b.trim()}`);
          });
          lines.push('');
        });
      }
    });
  }

  return lines.join('\n').trim();
}

/**
 * Converts a ResumeDocument into a PersonaData update payload for 2-way synchronization
 */
export function resumeToPersona(doc: ResumeDocument): Partial<PersonaData> {
  const plainText = resumeToPlainText(doc);
  
  // Aggregate all skills into a flat tech stack array
  const flatTechStack = Array.from(
    new Set([
      ...doc.skills.languages,
      ...doc.skills.frontend,
      ...doc.skills.backend,
      ...doc.skills.databases,
      ...doc.skills.cloudDevops,
      ...doc.skills.tools,
      ...doc.skills.custom,
    ])
  );

  const expSummary = doc.experience
    .map((e) => `${e.role} at ${e.company} (${e.startDate}-${e.current ? 'Present' : e.endDate}): ${e.bullets.join(' ')}`)
    .join('\n\n');

  const eduSummary = doc.education
    .map((ed) => `${ed.degree} from ${ed.institution} (${ed.graduationYear})`)
    .join('\n');

  const projSummary = doc.projects
    .map((p) => `${p.name}: ${p.bullets.join(' ')} [Tech: ${p.techStack.join(', ')}]`)
    .join('\n\n');

  const certSummary = doc.certifications
    .map((c) => `${c.name} (${c.issuer}, ${c.date})`)
    .join(', ');

  return {
    fullName: doc.contact.fullName,
    email: doc.contact.email,
    phone: doc.contact.phone,
    location: doc.contact.location,
    linkedIn: doc.contact.linkedIn,
    gitHub: doc.contact.gitHub,
    portfolio: doc.contact.portfolio,
    techStack: flatTechStack,
    targetRoles: doc.contact.jobTitle ? [doc.contact.jobTitle] : undefined,
    resumeText: plainText,
    experienceSummary: doc.summary,
    education: eduSummary,
    resumeChunks: {
      summary: doc.summary,
      experience: expSummary,
      education: eduSummary,
      skills: flatTechStack.join(', '),
      projects: projSummary,
      certifications: certSummary,
      languages: 'English (Professional)',
    },
    verified: true,
  };
}

/**
 * Converts candidate PersonaData into a populated ResumeDocument
 */
export function personaToResume(persona: PersonaData, existing?: ResumeDocument): ResumeDocument {
  const base: ResumeDocument = existing ? structuredClone(existing) : {
    ...structuredClone(DEFAULT_RESUME_DOCUMENT),
    title: 'My Resume',
    contact: { fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedIn: '', gitHub: '', portfolio: '' },
    summary: '',
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    skills: { languages: [], frontend: [], backend: [], databases: [], cloudDevops: [], tools: [], custom: [] },
  };
  const hasPersonaName = Boolean(persona.fullName && persona.fullName.trim());
  const hasPersonaEmail = Boolean(persona.email && persona.email.trim());
  const hasTechStack = Boolean(persona.techStack && persona.techStack.length > 0);
  const hasSummary = Boolean(persona.resumeChunks?.summary?.trim() || persona.experienceSummary?.trim());

  const filterSkills = (keywords: string[]) => {
    if (!hasTechStack) return [];
    return persona.techStack.filter((s) =>
      keywords.some((k) => s.toLowerCase().includes(k.toLowerCase()))
    );
  };

  const extractedLanguages = filterSkills(['TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'SQL', 'HTML', 'CSS']);
  const extractedFrontend = filterSkills(['React', 'Next', 'Vue', 'Angular', 'Tailwind', 'Vite', 'Redux', 'Svelte']);
  const extractedBackend = filterSkills(['Node', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'GraphQL', 'REST']);
  const extractedDatabases = filterSkills(['Postgres', 'Mongo', 'Redis', 'SQL', 'Firebase', 'Supabase', 'Dynamo']);
  const extractedCloud = filterSkills(['AWS', 'Docker', 'K8s', 'Kubernetes', 'GCP', 'Azure', 'CI/CD', 'Linux', 'Terraform']);

  return {
    ...base,
    updatedAt: Date.now(),
    contact: {
      fullName: hasPersonaName ? persona.fullName : base.contact.fullName,
      jobTitle: (persona.targetRoles && persona.targetRoles.length > 0 && persona.targetRoles[0].trim()) ? persona.targetRoles[0] : base.contact.jobTitle,
      email: hasPersonaEmail ? persona.email : base.contact.email,
      phone: persona.phone?.trim() ? persona.phone : base.contact.phone,
      location: persona.location?.trim() ? persona.location : base.contact.location,
      linkedIn: persona.linkedIn?.trim() ? persona.linkedIn : base.contact.linkedIn,
      gitHub: persona.gitHub?.trim() ? persona.gitHub : base.contact.gitHub,
      portfolio: persona.portfolio?.trim() ? persona.portfolio : base.contact.portfolio,
    },
    summary: hasSummary ? (persona.resumeChunks?.summary || persona.experienceSummary || '') : base.summary,
    skills: {
      ...base.skills,
      languages: (hasTechStack && extractedLanguages.length > 0) ? extractedLanguages : base.skills.languages,
      frontend: (hasTechStack && extractedFrontend.length > 0) ? extractedFrontend : base.skills.frontend,
      backend: (hasTechStack && extractedBackend.length > 0) ? extractedBackend : base.skills.backend,
      databases: (hasTechStack && extractedDatabases.length > 0) ? extractedDatabases : base.skills.databases,
      cloudDevops: (hasTechStack && extractedCloud.length > 0) ? extractedCloud : base.skills.cloudDevops,
    },
  };
}

/**
 * Downloads a resume document as a clean JSON backup file
 */
export function exportResumeJson(doc: ResumeDocument): void {
  const jsonStr = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(doc.contact.fullName || 'Resume').replace(/\s+/g, '_')}_ATS_Resume.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads a JSON resume backup
 */
export function importResumeJson(jsonStr: string): ResumeDocument | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.contact && parsed.experience) {
      return parsed as ResumeDocument;
    }
  } catch (err) {
    console.error('Failed to parse resume JSON backup:', err);
  }
  return null;
}
