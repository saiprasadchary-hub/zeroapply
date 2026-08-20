export interface GoldenExemplar {
  category: 'technical_depth' | 'leadership_teamwork' | 'problem_solving' | 'motivation_fit' | 'experience_years' | 'yes_no' | 'compensation';
  keywords: string[];
  question: string;
  goldenResponse: string;
}

/**
 * Curated Executive & Engineering Golden Exemplars.
 * Small models (0.5B) excel with Few-Shot In-Context Learning: injecting 1-2 exact matching
 * golden exemplars transforms a 0.5B model's output into GPT-4/70B-grade professional answers.
 */
export const GOLDEN_EXEMPLARS: GoldenExemplar[] = [
  {
    category: 'motivation_fit',
    keywords: ['why', 'join', 'interest', 'excite', 'mission', 'company', 'apply', 'team'],
    question: 'Why are you interested in joining our team?',
    goldenResponse: 'I am drawn to your team’s engineering standards, rapid product iteration, and focus on delivering scalable, high-impact software. My extensive background in building resilient web architectures directly aligns with your technical mission.',
  },
  {
    category: 'technical_depth',
    keywords: ['architecture', 'scale', 'system', 'design', 'performance', 'distributed', 'microservice'],
    question: 'Describe your approach to designing scalable systems.',
    goldenResponse: 'I prioritize decoupled microservices, automated CI/CD pipelines, and optimized state synchronization. By implementing structured caching and event-driven queues, I ensure high throughput with minimal latency under peak loads.',
  },
  {
    category: 'problem_solving',
    keywords: ['bug', 'challenge', 'difficult', 'problem', 'troubleshoot', 'incident', 'production'],
    question: 'Tell us about a challenging technical problem you solved.',
    goldenResponse: 'Identified and resolved a critical memory leak in an event-driven worker pool by refactoring resource disposal and profiling heap snapshots, improving application uptime to 99.98% and reducing server costs.',
  },
  {
    category: 'leadership_teamwork',
    keywords: ['leadership', 'lead', 'team', 'mentor', 'collaborate', 'cross-functional', 'stakeholder'],
    question: 'How do you handle collaboration across cross-functional engineering teams?',
    goldenResponse: 'I foster transparent communication through clear design RFCs, structured code reviews, and proactive alignment between product managers and engineers to ensure on-time delivery of resilient software.',
  },
  {
    category: 'experience_years',
    keywords: ['how many years', 'years of experience', 'experience with'],
    question: 'How many years of experience do you have with React and TypeScript?',
    goldenResponse: '6',
  },
  {
    category: 'yes_no',
    keywords: ['comfortable', 'willing', 'authorized', 'hybrid', 'relocate', 'travel', 'background check'],
    question: 'Are you comfortable working in a collaborative hybrid or remote environment?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['laptop', 'desktop', 'computer', 'hardware', 'equipment', 'access to'],
    question: 'Do you have access to a laptop or desktop computer for this work?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['headphones', 'headset', 'quiet', 'workspace', 'home office', 'internet', 'wifi'],
    question: 'Do you have headphones and a consistently quiet place to work?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['enrolled', 'student', 'graduate', 'recent graduate', 'degree program'],
    question: 'Are you currently enrolled in a degree program or a recent graduate?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['full-time upon graduation', 'available full-time', 'upon graduation', 'after graduation'],
    question: 'Are you available for full-time employment upon graduation?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['internship', 'co-op', 'entry-level', 'junior'],
    question: 'Are you looking for an internship, co-op, or entry-level software engineering role?',
    goldenResponse: 'Yes',
  },
  {
    category: 'yes_no',
    keywords: ['40 hours', '40 hrs', 'commit to', 'full time'],
    question: 'Can you commit to 40 hours per week for this role?',
    goldenResponse: 'Yes',
  },
  {
    category: 'motivation_fit',
    keywords: ['tell me about yourself', 'student', 'background', 'walk me through your resume'],
    question: 'Tell me about yourself and your technical background.',
    goldenResponse: 'I am a passionate engineering student with solid computer science fundamentals in data structures, algorithms, and full-stack software development. Through hands-on academic and personal projects, I have built scalable web applications and high-throughput tools, and I am excited to bring my technical drive and rapid learning agility to your team.',
  },
  {
    category: 'technical_depth',
    keywords: ['academic project', 'course project', 'project you built', 'college project'],
    question: 'Tell us about a technical project you built during your studies.',
    goldenResponse: 'Designed and developed a responsive full-stack application featuring modular component architecture, RESTful API integration, and structured database indexing. Emphasized clean code principles, version control with Git, and robust error handling to ensure seamless performance.',
  },
];

/**
 * Finds the top 1-2 most semantically relevant golden exemplars for a given screening question.
 */
export function findBestExemplars(question: string, count: number = 2): GoldenExemplar[] {
  const qLower = question.toLowerCase();
  const qTokens = new Set(qLower.split(/\W+/).filter((t) => t.length > 2));

  const scored = GOLDEN_EXEMPLARS.map((ex) => {
    let score = 0;
    ex.keywords.forEach((kw) => {
      if (qLower.includes(kw.toLowerCase())) score += 3;
    });
    ex.question.toLowerCase().split(/\W+/).forEach((t) => {
      if (t.length > 2 && qTokens.has(t)) score += 1;
    });
    return { exemplar: ex, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.exemplar);
}
