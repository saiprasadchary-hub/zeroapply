import type { PersonaData } from '../types';
import type {
  AtsScoreResult,
  AtsIssue,
  AtsSkillMatch,
  AtsSkillCategory,
  AtsRuleViolation,
  AtsQuantifiedMetric,
  AtsVerbMatch,
  AtsReadabilityMetrics,
  AtsRoleMatch
} from './types';

// ==========================================
// 1. INSTITUTIONAL LINGUISTIC & ATS TAXONOMY
// ==========================================

export const ACTION_VERB_CATEGORIES: Record<AtsVerbMatch['category'], string[]> = {
  leadership: [
    'spearheaded', 'orchestrated', 'led', 'directed', 'mentored', 'championed',
    'governed', 'empowered', 'established', 'managed', 'founded', 'oversaw',
    'guided', 'delegated', 'steered', 'mobilized', 'pioneered', 'headed',
    'coached', 'cultivated', 'negotiated', 'advised', 'facilitated', 'fostered'
  ],
  architecture: [
    'architected', 'engineered', 'designed', 'conceptualized', 'standardized',
    'formulated', 'structured', 'modeled', 'authored', 'pioneered', 'devised',
    're-architected', 'configured', 'composed', 'envisioned', 'drafted',
    'specified', 'modularized', 'systematized', 'unified', 'decoupled'
  ],
  engineering: [
    'developed', 'built', 'programmed', 'implemented', 'constructed',
    'refactored', 'integrated', 'modernized', 'created', 'assembled',
    'coded', 'fabricated', 'shipped', 'overhauled', 'prototyped', 'rebuilt',
    'executed', 'synthesized', 'instantiated', 'maintained', 'authored'
  ],
  optimization: [
    'optimized', 'scaled', 'accelerated', 'streamlined', 'maximized',
    'elevated', 'enhanced', 'consolidated', 'boosted', 'upgraded',
    'refined', 'expedited', 'reduced', 'cut', 'minimized', 'leveraged',
    'hardened', 'fine-tuned', 'compressed', 'tuned', 'amplified'
  ],
  automation: [
    'automated', 'deployed', 'provisioned', 'containerized', 'instrumented',
    'migrated', 'maintained', 'secured', 'audited', 'scripted', 'orchestrated',
    'centralized', 'monitored', 'dockerized', 'benchmarked', 'profiled',
    'synchronized', 'provisioned', 'isolated', 'virtualized'
  ],
  delivery: [
    'delivered', 'generated', 'transformed', 'resolved', 'saved',
    'published', 'awarded', 'eliminated', 'launched', 'exceeded',
    'reached', 'outperformed', 'accomplished', 'produced', 'yielded',
    'achieved', 'attained', 'completed', 'dispatched', 'realized'
  ]
};

export const PASSIVE_WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'assisted with',
  'duties included', 'tasked with', 'handled the', 'part of a team',
  'served as', 'helped to', 'attempted to', 'participated in',
  'involved in', 'supported the', 'daily tasks included', 'assigned to',
  'worked closely with', 'was involved in', 'took part in', 'contributed to'
];

export const FIRST_PERSON_PRONOUNS = [
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves'
];

export const EMPTY_BUZZWORDS = [
  'hard worker', 'team player', 'go-getter', 'detail-oriented',
  'self-starter', 'dynamic professional', 'results-driven', 'think outside the box',
  'synergy', 'fast learner', 'hard-working', 'people person',
  'passionate professional', 'guru', 'ninja', 'rockstar', 'visionary',
  'strategic thinker', 'workaholic', 'thought leader', 'game changer'
];

export const TECH_CATALOG: Record<AtsSkillCategory, string[]> = {
  languages: [
    'typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'golang', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'html5', 'css',
    'css3', 'bash', 'shell', 'scala', 'r', 'dart', 'c', 'perl', 'lua',
    'haskell', 'elixir', 'clojure', 'zig', 'assembly'
  ],
  frontend: [
    'react', 'react.js', 'next.js', 'nextjs', 'vite', 'vue', 'vue.js', 'angular',
    'svelte', 'sveltekit', 'remix', 'nuxt', 'astro', 'tailwind', 'tailwindcss',
    'bootstrap', 'material-ui', 'mui', 'styled-components', 'sass', 'scss',
    'less', 'redux', 'zustand', 'mobx', 'recoil', 'react-query', 'tanstack query',
    'webpack', 'rollup', 'esbuild', 'turbopack', 'parcel', 'pwa', 'webgl',
    'three.js', 'canvas', 'responsive design', 'micro-frontends', 'shadow dom'
  ],
  backend: [
    'node.js', 'nodejs', 'express', 'express.js', 'fastify', 'nestjs', 'fastapi',
    'django', 'flask', 'spring', 'spring boot', 'asp.net', '.net core', 'rails',
    'ruby on rails', 'laravel', 'gin', 'fiber', 'actix', 'axum', 'grpc',
    'graphql', 'rest api', 'restful api', 'websockets', 'trpc', 'serverless',
    'koa', 'ktor', 'celery', 'gunicorn', 'uvicorn'
  ],
  databases: [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'firebase',
    'supabase', 'dynamodb', 'elasticsearch', 'snowflake', 'cassandra', 'prisma',
    'typeorm', 'drizzle', 'sqlalchemy', 'hibernate', 'mariadb', 'neo4j',
    'couchdb', 'mssql', 'oracle', 'clickhouse', 'bigquery', 'cockroachdb',
    'timescaledb', 'memcached', 'indexing', 'sharding', 'replication', 'acid'
  ],
  cloud: [
    'aws', 'amazon web services', 's3', 'ec2', 'lambda', 'ecs', 'eks',
    'cloudfront', 'rds', 'iam', 'sqs', 'sns', 'cloudwatch', 'gcp',
    'google cloud', 'gcs', 'cloud run', 'gke', 'cloud functions', 'azure',
    'azure devops', 'blob storage', 'aks', 'app service', 'vercel', 'netlify',
    'cloudflare', 'digitalocean'
  ],
  devops: [
    'docker', 'podman', 'kubernetes', 'k8s', 'helm', 'terraform', 'terragrunt',
    'pulumi', 'ansible', 'cloudformation', 'ci/cd', 'github actions', 'gitlab ci',
    'jenkins', 'circleci', 'argocd', 'linux', 'ubuntu', 'debian', 'centos',
    'bash scripting', 'nginx', 'caddy', 'envoy', 'traefik', 'prometheus',
    'grafana', 'datadog', 'new relic', 'elk stack', 'fluentd', 'opentelemetry'
  ],
  ai_ml: [
    'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'sklearn', 'pandas',
    'numpy', 'scipy', 'matplotlib', 'seaborn', 'opencv', 'huggingface',
    'transformers', 'bert', 'gpt', 'llm', 'large language models', 'nlp',
    'natural language processing', 'computer vision', 'deep learning',
    'neural networks', 'machine learning', 'rag', 'retrieval augmented generation',
    'langchain', 'llamaindex', 'ollama', 'onnx', 'vllm', 'tensorrt',
    'pinecone', 'qdrant', 'chromadb', 'milvus', 'weaviate', 'vector search',
    'embeddings', 'fine-tuning', 'lora', 'qlora', 'prompt engineering',
    'mlflow', 'ray', 'yolo', 'beautifulsoup', 'scrapy'
  ],
  core_cs: [
    'data structures', 'algorithms', 'dsa', 'system design', 'distributed systems',
    'oop', 'object-oriented programming', 'functional programming', 'design patterns',
    'solid principles', 'clean architecture', 'domain driven design', 'ddd',
    'concurrency', 'multithreading', 'asynchronous programming', 'memory management',
    'networking', 'tcp/ip', 'http/https', 'time complexity', 'space complexity'
  ],
  data_science: [
    'etl', 'elt', 'data pipeline', 'data warehousing', 'data lake',
    'apache spark', 'pyspark', 'hadoop', 'flink', 'airflow', 'dbt',
    'kafka', 'databricks', 'tableau', 'power bi', 'looker', 'polars',
    'exploratory data analysis', 'statistical modeling', 'predictive modeling',
    'regression', 'classification', 'clustering'
  ],
  mobile: [
    'react native', 'flutter', 'ios', 'swift', 'swiftui', 'android',
    'kotlin', 'jetpack compose', 'expo', 'ionic', 'capacitor',
    'mobile development', 'push notifications', 'offline sync'
  ],
  testing: [
    'jest', 'vitest', 'mocha', 'chai', 'jasmine', 'react testing library',
    'cypress', 'playwright', 'selenium', 'puppeteer', 'pytest', 'unittest',
    'junit', 'mockito', 'testng', 'postman', 'k6', 'jmeter', 'tdd',
    'test-driven development', 'bdd', 'e2e testing', 'integration testing',
    'unit testing', 'load testing', 'performance testing'
  ],
  security: [
    'oauth', 'oauth2', 'openid connect', 'oidc', 'jwt', 'json web token',
    'saml', 'rbac', 'role-based access control', 'abac', 'zero-trust',
    'cryptography', 'ssl/tls', 'encryption', 'https', 'cors', 'csrf',
    'xss', 'sql injection', 'owasp', 'owasp top 10', 'penetration testing',
    'security audit', 'vulnerability scanning', 'snyk', 'sonarqube'
  ],
  architecture: [
    'microservices', 'monolithic', 'event-driven', 'pub/sub', 'message queue',
    'kafka', 'rabbitmq', 'aws sqs', 'redis pub/sub', 'api gateway',
    'load balancing', 'reverse proxy', 'caching strategies', 'cdn',
    'database sharding', 'connection pooling', 'high availability',
    'fault tolerance', 'circuit breaker', 'rate limiting', 'idempotency',
    'horizontal scaling', 'vertical scaling', 'cqrs', 'event sourcing'
  ],
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'postman', 'insomnia', 'swagger', 'openapi', 'npm', 'yarn', 'pnpm',
    'bun', 'pip', 'poetry', 'maven', 'gradle', 'cargo', 'vscode',
    'docker compose', 'linux cli', 'agile', 'scrum', 'kanban',
    'code review', 'pair programming', 'technical documentation'
  ]
};

// ==========================================
// 2. TARGET ROLE BENCHMARK DEFINITIONS
// ==========================================

export const TARGET_ROLE_BENCHMARKS: Record<string, { title: string; requiredSkills: string[]; coreKeywords: string[] }> = {
  fullstack: {
    title: 'Full Stack Engineer',
    requiredSkills: ['react', 'typescript', 'javascript', 'node.js', 'sql', 'postgresql', 'mongodb', 'rest api', 'git', 'docker', 'tailwind', 'html', 'css', 'next.js'],
    coreKeywords: ['frontend', 'backend', 'api', 'database', 'full stack', 'responsive', 'integration', 'system design']
  },
  frontend: {
    title: 'Frontend Engineer',
    requiredSkills: ['react', 'typescript', 'javascript', 'next.js', 'html5', 'css3', 'tailwind', 'redux', 'vite', 'responsive design', 'testing', 'webgl'],
    coreKeywords: ['ui', 'ux', 'components', 'dom', 'browser', 'state management', 'css', 'client-side']
  },
  backend: {
    title: 'Backend / Systems Engineer',
    requiredSkills: ['node.js', 'python', 'java', 'go', 'postgresql', 'mysql', 'mongodb', 'redis', 'rest api', 'graphql', 'docker', 'microservices', 'distributed systems', 'kafka'],
    coreKeywords: ['api', 'database', 'architecture', 'scalability', 'performance', 'indexing', 'caching', 'concurrency']
  },
  ai_ml: {
    title: 'AI / Machine Learning Engineer',
    requiredSkills: ['python', 'pytorch', 'tensorflow', 'scikit-learn', 'llm', 'rag', 'pandas', 'numpy', 'transformers', 'vector search', 'langchain', 'ollama', 'opencv'],
    coreKeywords: ['machine learning', 'deep learning', 'neural network', 'nlp', 'model', 'embeddings', 'inference', 'ai']
  },
  devops: {
    title: 'DevOps / Cloud Platform Engineer',
    requiredSkills: ['aws', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'github actions', 'linux', 'bash', 'nginx', 'prometheus', 'grafana', 'helm', 'ansible'],
    coreKeywords: ['infrastructure', 'cloud', 'automation', 'pipeline', 'deployment', 'monitoring', 'reliability', 'k8s']
  },
  data_eng: {
    title: 'Data Engineer / Scientist',
    requiredSkills: ['python', 'sql', 'pandas', 'numpy', 'apache spark', 'airflow', 'dbt', 'kafka', 'data pipeline', 'etl', 'postgresql', 'snowflake', 'bigquery'],
    coreKeywords: ['data pipeline', 'analytics', 'data warehouse', 'etl', 'modeling', 'visualization', 'lake']
  },
  mobile: {
    title: 'Mobile App Engineer',
    requiredSkills: ['react native', 'flutter', 'swift', 'kotlin', 'ios', 'android', 'typescript', 'rest api', 'git', 'mobile development'],
    coreKeywords: ['mobile', 'ios', 'android', 'app', 'ui', 'offline', 'push notifications']
  },
  security: {
    title: 'Cybersecurity / AppSec Engineer',
    requiredSkills: ['oauth', 'jwt', 'rbac', 'owasp', 'penetration testing', 'ssl/tls', 'encryption', 'snyk', 'sonarqube', 'security audit', 'linux', 'python'],
    coreKeywords: ['security', 'vulnerability', 'compliance', 'auth', 'threat', 'audit', 'zero-trust']
  }
};

// ==========================================
// 3. CORE COMPREHENSIVE SCORING ENGINE
// ==========================================

export function calculateAtsScore(
  persona: PersonaData,
  rawResumeText?: string,
  chunks?: PersonaData['resumeChunks']
): AtsScoreResult {
  const fullText = (
    (rawResumeText || '') + ' ' +
    (persona.resumeText || '') + ' ' +
    Object.values(chunks || persona.resumeChunks || {}).filter(Boolean).join(' ') + ' ' +
    (persona.techStack || []).join(' ') + ' ' +
    (persona.fullName || '') + ' ' +
    (persona.location || '') + ' ' +
    (persona.email || '')
  ).trim();

  const textLower = fullText.toLowerCase();
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));

  // Split lines & bullets for deep structural parsing
  const rawLines = fullText.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l.length > 0);
  const bulletLines = rawLines.filter((l) => /^[-•*–—]|\d+\.\s+/i.test(l) || l.length > 30);
  const bulletCount = Math.max(1, bulletLines.length);

  const ruleViolations: AtsRuleViolation[] = [];
  const issues: AtsIssue[] = [];
  const strengths: string[] = [];

  // ==========================================
  // PILLAR 1: Contact & Identity (15%)
  // ==========================================
  const hasName = Boolean(persona.fullName && persona.fullName.trim().length >= 3);
  const hasEmail = Boolean(persona.email && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(persona.email.trim()));
  const hasPhone = Boolean((persona.phone && persona.phone.replace(/\D/g, '').length >= 10) || /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(fullText));
  const hasLocation = Boolean(persona.location && persona.location.trim().length >= 2);
  const hasLinkedIn = Boolean(persona.linkedIn && /linkedin\.com\/in\//i.test(persona.linkedIn));
  const hasPortfolio = Boolean(persona.gitHub || persona.portfolio || /github\.com\//i.test(textLower));

  // Deal-breakers in Contact
  if (!hasEmail) {
    ruleViolations.push({
      id: 'db_missing_email',
      severity: 'dealbreaker',
      category: 'contact',
      title: 'Deal-Breaker: Missing Contact Email',
      description: 'Greenhouse and Workday automated workflows immediately drop applicants without a valid email.',
      ruleCode: 'RULE_DB_01',
      penaltyPoints: 20,
      recommendation: 'Add your primary professional email directly in the header.'
    });
  }
  if (!hasPhone) {
    ruleViolations.push({
      id: 'db_missing_phone',
      severity: 'dealbreaker',
      category: 'contact',
      title: 'Deal-Breaker: Missing Phone Number',
      description: 'Recruiter dialer systems cannot route candidates without a verified 10+ digit contact number.',
      ruleCode: 'RULE_DB_02',
      penaltyPoints: 15,
      recommendation: 'Include a clean phone number with country/area code.'
    });
  }
  if (!hasName) {
    ruleViolations.push({
      id: 'db_missing_name',
      severity: 'dealbreaker',
      category: 'contact',
      title: 'Deal-Breaker: Missing Full Candidate Name',
      description: 'ATS parsers require an identifiable name header to create the applicant profile.',
      ruleCode: 'RULE_DB_03',
      penaltyPoints: 20,
      recommendation: 'Place your full name in prominent text at the very top.'
    });
  }
  if (!hasLinkedIn) {
    ruleViolations.push({
      id: 'warn_missing_linkedin',
      severity: 'warning',
      category: 'contact',
      title: 'Missing LinkedIn Profile URL',
      description: 'Over 85% of technical recruiters cross-verify candidates via LinkedIn profiles.',
      ruleCode: 'RULE_FMT_03',
      penaltyPoints: 6,
      recommendation: 'Add your customized LinkedIn link (e.g. linkedin.com/in/yourname).'
    });
  }

  const contactItems = [
    { title: 'Full Legal Name', passed: hasName, detail: hasName ? persona.fullName : 'Missing clear full name header', impact: 'critical' as const, scoreGain: 5 },
    { title: 'Validated Email Address', passed: hasEmail, detail: hasEmail ? persona.email : 'Missing valid direct contact email', impact: 'critical' as const, scoreGain: 5 },
    { title: 'Direct Phone Number', passed: hasPhone, detail: hasPhone ? persona.phone : 'Missing phone number with area code', impact: 'critical' as const, scoreGain: 5 },
    { title: 'Geographic City/Location', passed: hasLocation, detail: hasLocation ? persona.location : 'Missing location/city', impact: 'moderate' as const, scoreGain: 3 },
    { title: 'Custom LinkedIn Profile', passed: hasLinkedIn, detail: hasLinkedIn ? 'Verified LinkedIn profile link detected' : 'Add custom LinkedIn URL for recruiter verification', impact: 'moderate' as const, scoreGain: 4 },
    { title: 'Engineering GitHub/Portfolio', passed: hasPortfolio, detail: hasPortfolio ? 'Engineering repository detected' : 'Include GitHub repository or portfolio link', impact: 'minor' as const, scoreGain: 3 },
  ];

  const contactPassedCount = contactItems.filter((i) => i.passed).length;
  let contactScore = Math.round((contactPassedCount / contactItems.length) * 100);
  if (!hasEmail || !hasPhone || !hasName) contactScore = Math.min(50, contactScore);

  if (hasEmail && hasPhone && hasName && hasLinkedIn) {
    strengths.push('Complete, verified contact identity profile with direct recruiter verification channels.');
  }

  // ==========================================
  // PILLAR 2: Section Architecture (20%)
  // ==========================================
  const summaryChunk = chunks?.summary || persona.resumeChunks?.summary || '';
  const expChunk = chunks?.experience || persona.resumeChunks?.experience || '';
  const eduChunk = chunks?.education || persona.resumeChunks?.education || '';
  const skillsChunk = chunks?.skills || persona.resumeChunks?.skills || (persona.techStack || []).join(' ');
  const projectsChunk = chunks?.projects || persona.resumeChunks?.projects || '';
  const certsChunk = chunks?.certifications || persona.resumeChunks?.certifications || '';

  const hasSummarySection = summaryChunk.length > 20 || /summary|professional summary|about me|profile|executive summary|overview/i.test(textLower);
  const hasExperienceSection = expChunk.length > 40 || /experience|work history|employment history|career history|professional experience/i.test(textLower);
  const hasEducationSection = eduChunk.length > 15 || /education|academic|university|degree|bachelor|master|b\.tech|bs |ms /i.test(textLower);
  const hasSkillsSection = skillsChunk.length > 10 || /skills|technical skills|technologies|proficiencies|core competencies|tech stack/i.test(textLower);
  const hasProjectsSection = projectsChunk.length > 20 || /projects|key initiatives|built|open source|featured projects/i.test(textLower);
  const hasCertsSection = certsChunk.length > 10 || /certifications|certificates|credentials|licenses|accreditations/i.test(textLower);

  // Check chronological date formats (e.g. 2022 - Present, 05/2020 - 08/2023)
  const hasChronologicalDates = /(?:\b20\d{2}\s*[-–—to]+\s*(?:20\d{2}|present|current)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+20\d{2}\b)/i.test(textLower);

  if (!hasExperienceSection) {
    ruleViolations.push({
      id: 'db_missing_experience',
      severity: 'dealbreaker',
      category: 'architecture',
      title: 'Deal-Breaker: Missing Standard Experience Section',
      description: 'ATS resume indexing models require a dedicated "Work Experience" or "Employment History" section.',
      ruleCode: 'RULE_DB_04',
      penaltyPoints: 25,
      recommendation: 'Add a distinct "Work Experience" section formatted chronologically.'
    });
  }

  const sectionItems = [
    { title: 'Work Experience Section', passed: hasExperienceSection, detail: hasExperienceSection ? 'Standard chronological experience section present' : 'Missing dedicated Work Experience header', impact: 'critical' as const, scoreGain: 6 },
    { title: 'Skills & Competencies Section', passed: hasSkillsSection, detail: hasSkillsSection ? 'Clear technical skills section found' : 'Missing distinct Skills or Tech Stack list', impact: 'critical' as const, scoreGain: 6 },
    { title: 'Education Background Section', passed: hasEducationSection, detail: hasEducationSection ? 'Education credentials clearly articulated' : 'Missing Education background or degree section', impact: 'critical' as const, scoreGain: 5 },
    { title: 'Chronological Work Dates', passed: hasChronologicalDates, detail: hasChronologicalDates ? 'Proper Year/Date ranges detected for roles' : 'Include clear date ranges (e.g. 2021 – Present) for each job', impact: 'moderate' as const, scoreGain: 4 },
    { title: 'Professional Executive Summary', passed: hasSummarySection, detail: hasSummarySection ? 'Executive summary provides fast candidate pitch' : 'Add a brief 2-3 line Professional Summary at the top', impact: 'moderate' as const, scoreGain: 3 },
    { title: 'Projects & Key Initiatives', passed: hasProjectsSection, detail: hasProjectsSection ? 'Key projects demonstrated with technical context' : 'Add a Projects section to showcase hands-on architecture', impact: 'minor' as const, scoreGain: 3 },
    { title: 'Certifications & Credentials', passed: hasCertsSection, detail: hasCertsSection ? 'Industry certifications detected' : 'Certifications section optional but recommended', impact: 'minor' as const, scoreGain: 2 },
  ];

  const sectionPassedCount = sectionItems.filter((i) => i.passed).length;
  let sectionScore = Math.round((sectionPassedCount / sectionItems.length) * 100);
  if (!hasExperienceSection || !hasSkillsSection) sectionScore = Math.min(55, sectionScore);

  if (hasExperienceSection && hasSkillsSection && hasEducationSection && hasChronologicalDates) {
    strengths.push('Strict adherence to standard ATS header hierarchy and chronological dating.');
  }

  // ==========================================
  // PILLAR 3: Action Verbs & Quantified Impact (25%)
  // ==========================================
  const detectedActionVerbs: string[] = [];
  const detailedVerbs: AtsVerbMatch[] = [];

  (Object.keys(ACTION_VERB_CATEGORIES) as Array<AtsVerbMatch['category']>).forEach((category) => {
    ACTION_VERB_CATEGORIES[category].forEach((verb) => {
      const regex = new RegExp(`\\b${verb}(?:ed|ing|s)?\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches && matches.length > 0) {
        const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
        if (!detectedActionVerbs.includes(capitalized)) {
          detectedActionVerbs.push(capitalized);
        }
        detailedVerbs.push({
          verb: capitalized,
          category,
          count: matches.length
        });
      }
    });
  });

  const detailedMetrics: AtsQuantifiedMetric[] = [];
  const detectedMetrics: string[] = [];

  // Match quantifiable impact patterns across 5 deep tiers
  const percentRegex = /(?:[+~-]?\d+(?:\.\d+)?%\s*(?:increase|reduction|improvement|growth|efficiency|faster|boost|decrease|uptime|retention|conversion)?)/gi;
  const financialRegex = /(?:\$\s*\d+[\d,.]*(?:k|m|b)?|\b\d+[\d,.]*\s*(?:million|billion|thousand|lpa|inr|usd|eur|gbp)\b|₹\s*\d+[\d,.]*)/gi;
  const multiplierRegex = /(?:\b\d+(?:\.\d+)?x\s*(?:faster|scale|growth|throughput|speedup)?|\b\d{2,3}(?:k|m)\+?\s*(?:users|dau|mau|requests|qps|downloads|records|pageviews)\b)/gi;
  const performanceRegex = /(?:\b\d+\s*ms\b|\b99\.\d+%\s*uptime\b|\b0\s*downtime\b|\b\d+x\s*performance\b|\b\d+\s*(?:qps|tps|rps)\b)/gi;
  const teamRegex = /(?:\bteam of \d+\b|\b\d+\s*(?:engineers|developers|direct reports|members|clients|squads|microservices)\b)/gi;

  const extractAndPush = (regex: RegExp, category: AtsQuantifiedMetric['category']) => {
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const val = match[0].trim();
      if (!detectedMetrics.includes(val) && detailedMetrics.length < 25) {
        detectedMetrics.push(val);
        const startIdx = Math.max(0, match.index - 30);
        const endIdx = Math.min(fullText.length, match.index + val.length + 35);
        const context = '...' + fullText.substring(startIdx, endIdx).replace(/\s+/g, ' ').trim() + '...';
        detailedMetrics.push({
          value: val,
          category,
          contextSnippet: context
        });
      }
    }
  };

  extractAndPush(percentRegex, 'percentage');
  extractAndPush(financialRegex, 'financial');
  extractAndPush(multiplierRegex, 'multiplier_scale');
  extractAndPush(performanceRegex, 'performance');
  extractAndPush(teamRegex, 'team_scope');

  // Measure Bullets with Metrics Ratio
  let bulletsWithMetricsCount = 0;
  bulletLines.forEach((line) => {
    if (/\d+%\s*|\$\s*\d+|₹\s*\d+|\b\d+x\b|\b\d+\s*ms\b|\b\d{2,}\s*(?:users|projects|clients|records|qps)/i.test(line)) {
      bulletsWithMetricsCount++;
    }
  });
  const bulletsWithMetricsPercent = Math.round((bulletsWithMetricsCount / bulletCount) * 100);

  let actionScore = 0;
  // Action verbs contribution (0 - 45 pts)
  if (detectedActionVerbs.length >= 10) actionScore += 45;
  else if (detectedActionVerbs.length >= 6) actionScore += 35;
  else if (detectedActionVerbs.length >= 3) actionScore += 20;
  else actionScore += 10;

  // Quantified metrics contribution (0 - 45 pts)
  if (detailedMetrics.length >= 6) actionScore += 45;
  else if (detailedMetrics.length >= 4) actionScore += 35;
  else if (detailedMetrics.length >= 2) actionScore += 25;
  else if (detailedMetrics.length >= 1) actionScore += 15;
  else actionScore += 5;

  // Bullet metrics density bonus (0 - 10 pts)
  if (bulletsWithMetricsPercent >= 40) actionScore += 10;
  else if (bulletsWithMetricsPercent >= 20) actionScore += 5;

  actionScore = Math.min(100, actionScore);

  if (detailedMetrics.length < 3) {
    ruleViolations.push({
      id: 'warn_low_metrics',
      severity: 'warning',
      category: 'linguistics',
      title: 'Low Quantification in Experience Bullets',
      description: 'Modern ATS algorithms and hiring managers rank resumes higher when experience has measurable figures (%, $, 10x).',
      ruleCode: 'RULE_LING_04',
      penaltyPoints: 12,
      recommendation: 'Rewrite 3-4 bullet points to include exact percentage improvements, scale numbers, or financial savings.'
    });
  }

  const actionItems = [
    { title: 'High-Impact Power Verbs', passed: detectedActionVerbs.length >= 6, detail: `Found ${detectedActionVerbs.length} power verbs across ${detailedVerbs.length} instances`, impact: 'critical' as const, scoreGain: 8 },
    { title: 'Quantified Impact Metrics (%, $, 10x)', passed: detailedMetrics.length >= 3, detail: detailedMetrics.length > 0 ? `Detected ${detailedMetrics.length} measurable KPI metrics` : 'No quantified metrics found', impact: 'critical' as const, scoreGain: 8 },
    { title: 'Experience Metric Density', passed: bulletsWithMetricsPercent >= 30, detail: `${bulletsWithMetricsPercent}% of experience bullet points contain quantifiable numbers (Target: 40%+)`, impact: 'moderate' as const, scoreGain: 5 },
  ];

  if (detailedMetrics.length >= 4) {
    strengths.push(`High quantified impact: ${detailedMetrics.length} measurable KPI metrics detected across experience.`);
  }

  // ==========================================
  // PILLAR 4: Technical Skills & Keyword Density (20%)
  // ==========================================
  const detectedSkills: AtsSkillMatch[] = [];
  let totalSkillsFound = 0;

  (Object.keys(TECH_CATALOG) as Array<AtsSkillCategory>).forEach((category) => {
    TECH_CATALOG[category].forEach((tech) => {
      const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const techRegex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (techRegex.test(textLower) || (persona.techStack || []).some((s) => s.toLowerCase() === tech)) {
        const inExp = expChunk.length > 0 && techRegex.test(expChunk.toLowerCase());
        const formattedName = tech
          .split(' ')
          .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
          .join(' ');
        
        if (!detectedSkills.some((s) => s.name.toLowerCase() === formattedName.toLowerCase())) {
          detectedSkills.push({
            name: formattedName,
            category,
            count: 1,
            inExperienceBullets: inExp
          });
          totalSkillsFound++;
        }
      }
    });
  });

  let skillScore = 0;
  if (totalSkillsFound >= 16) skillScore = 100;
  else if (totalSkillsFound >= 11) skillScore = 88;
  else if (totalSkillsFound >= 7) skillScore = 75;
  else if (totalSkillsFound >= 4) skillScore = 55;
  else skillScore = 30;

  if (totalSkillsFound < 4) {
    ruleViolations.push({
      id: 'db_keyword_deficit',
      severity: 'dealbreaker',
      category: 'linguistics',
      title: 'Critical Keyword Deficit',
      description: 'Less than 4 standard technical keywords detected. Boolean recruiter filters will fail to match your profile.',
      ruleCode: 'RULE_DB_05',
      penaltyPoints: 20,
      recommendation: 'Explicitly list your programming languages, frameworks, cloud tools, and databases.'
    });
  }

  const keywordItems = [
    { title: 'Core Languages & Frameworks', passed: detectedSkills.filter((s) => s.category === 'languages' || s.category === 'frontend' || s.category === 'backend').length >= 5, detail: `Found ${detectedSkills.filter((s) => s.category === 'languages' || s.category === 'frontend' || s.category === 'backend').length} frontend/backend technologies`, impact: 'critical' as const, scoreGain: 8 },
    { title: 'Databases & Cloud Infrastructure', passed: detectedSkills.filter((s) => s.category === 'databases' || s.category === 'cloud' || s.category === 'devops').length >= 3, detail: `Found ${detectedSkills.filter((s) => s.category === 'databases' || s.category === 'cloud' || s.category === 'devops').length} infrastructure & database tools`, impact: 'critical' as const, scoreGain: 6 },
    { title: 'Modern Architecture & AI Competencies', passed: detectedSkills.filter((s) => s.category === 'ai_ml' || s.category === 'architecture' || s.category === 'core_cs' || s.category === 'security' || s.category === 'testing').length >= 3, detail: `Found ${detectedSkills.filter((s) => s.category === 'ai_ml' || s.category === 'architecture' || s.category === 'core_cs' || s.category === 'security' || s.category === 'testing').length} modern workflow competencies`, impact: 'moderate' as const, scoreGain: 6 },
  ];

  if (totalSkillsFound >= 10) {
    strengths.push(`Extensive technical keyword matrix: ${totalSkillsFound} verified ATS keywords matched.`);
  }

  // ==========================================
  // PILLAR 5: ATS Formatting & Readability (15%)
  // ==========================================
  const isWordCountIdeal = wordCount >= 350 && wordCount <= 900;
  const isWordCountAcceptable = wordCount >= 220 && wordCount <= 1300;
  const hasCleanSpecialChars = !/[^\u0020-\u007E\t\n\r\u2013\u2014\u2022\u2018\u2019\u201C\u201D]/.test(fullText.substring(0, 2000));
  const avgWordsPerBullet = Math.round(wordCount / bulletCount);

  let formatScore = 100;
  if (!isWordCountIdeal) {
    formatScore -= isWordCountAcceptable ? 15 : 35;
    if (wordCount < 200) {
      ruleViolations.push({
        id: 'db_truncated_resume',
        severity: 'dealbreaker',
        category: 'formatting',
        title: 'Deal-Breaker: Truncated Content Length',
        description: `Resume is only ${wordCount} words. ATS parsers treat files under 200 words as corrupted or incomplete.`,
        ruleCode: 'RULE_DB_06',
        penaltyPoints: 20,
        recommendation: 'Expand your experience bullet points with detailed technical scope.'
      });
    }
  }

  if (!hasCleanSpecialChars) {
    formatScore -= 12;
    ruleViolations.push({
      id: 'warn_unicode_chars',
      severity: 'warning',
      category: 'formatting',
      title: 'Non-Standard Unicode Symbols Detected',
      description: 'Special icons, custom arrows (➔, ★), or non-ASCII fonts turn into corrupt text (???) in legacy ATS parsers.',
      ruleCode: 'RULE_FMT_02',
      penaltyPoints: 8,
      recommendation: 'Use standard ASCII hyphens or circular bullet points.'
    });
  }

  formatScore = Math.max(25, formatScore);

  const formatItems = [
    { title: 'Optimal Word Count Range', passed: isWordCountIdeal, detail: `${wordCount} words (Ideal: 400 – 850 words for 1-2 page ATS profile)`, impact: 'critical' as const, scoreGain: 7 },
    { title: 'ATS Character Hygiene', passed: hasCleanSpecialChars, detail: hasCleanSpecialChars ? 'Clean unicode characters parseable across Workday, Greenhouse, Taleo' : 'Contains non-standard characters that can break ATS extractors', impact: 'moderate' as const, scoreGain: 5 },
    { title: 'Bullet Point Structure', passed: avgWordsPerBullet >= 10 && avgWordsPerBullet <= 35, detail: `~${avgWordsPerBullet} words per bullet across ${bulletCount} bullet statements`, impact: 'minor' as const, scoreGain: 3 },
  ];

  // ==========================================
  // PILLAR 6: Linguistic Hygiene & Red Flags (10%)
  // ==========================================
  const foundPassivePhrases: string[] = [];
  PASSIVE_WEAK_PHRASES.forEach((phrase) => {
    if (textLower.includes(phrase)) {
      foundPassivePhrases.push(phrase);
    }
  });

  if (foundPassivePhrases.length > 0) {
    ruleViolations.push({
      id: 'warn_passive_phrases',
      severity: 'warning',
      category: 'linguistics',
      title: 'Weak Passive Responsibility Phrases',
      description: `Detected passive phrasing (${foundPassivePhrases.slice(0, 3).join(', ')}). ATS resumes must convey direct ownership.`,
      ruleCode: 'RULE_LING_02',
      penaltyPoints: Math.min(15, foundPassivePhrases.length * 4),
      recommendation: 'Replace "Responsible for X" with active verbs like "Architected X" or "Streamlined X".'
    });
  }

  const foundPronouns: string[] = [];
  FIRST_PERSON_PRONOUNS.forEach((pronoun) => {
    const pronounRegex = new RegExp(`\\b${pronoun}\\b`, 'gi');
    const m = textLower.match(pronounRegex);
    if (m && m.length > 0) {
      foundPronouns.push(pronoun);
    }
  });

  if (foundPronouns.length > 0) {
    ruleViolations.push({
      id: 'penalty_pronouns',
      severity: 'penalty',
      category: 'pronouns',
      title: 'First-Person Pronouns Detected',
      description: `Found personal pronouns (${foundPronouns.join(', ')}). Formal ATS standard requires telegraphic action phrasing.`,
      ruleCode: 'RULE_LING_01',
      penaltyPoints: 6,
      recommendation: 'Remove "I", "my", "we" and start sentences directly with action verbs.'
    });
  }

  const foundBuzzwords: string[] = [];
  EMPTY_BUZZWORDS.forEach((bw) => {
    if (textLower.includes(bw)) {
      foundBuzzwords.push(bw);
    }
  });

  if (foundBuzzwords.length > 0) {
    ruleViolations.push({
      id: 'penalty_buzzwords',
      severity: 'penalty',
      category: 'linguistics',
      title: 'Vague Subjective Buzzwords',
      description: `Found cliché buzzwords (${foundBuzzwords.join(', ')}). ATS screeners favor concrete technical skills over self-descriptors.`,
      ruleCode: 'RULE_LING_03',
      penaltyPoints: 5,
      recommendation: 'Demonstrate competencies through project outcomes rather than self-appointed labels.'
    });
  }

  let linguisticScore = 100;
  linguisticScore -= (foundPassivePhrases.length * 8);
  linguisticScore -= (foundPronouns.length * 5);
  linguisticScore -= (foundBuzzwords.length * 4);
  linguisticScore = Math.max(20, Math.min(100, linguisticScore));

  const linguisticItems = [
    { title: 'Zero Passive Voice Phrases', passed: foundPassivePhrases.length === 0, detail: foundPassivePhrases.length === 0 ? 'No weak passive phrases found' : `Found ${foundPassivePhrases.length} passive phrases (e.g. "${foundPassivePhrases[0]}")`, impact: 'moderate' as const, scoreGain: 5 },
    { title: 'No First-Person Pronouns', passed: foundPronouns.length === 0, detail: foundPronouns.length === 0 ? 'Strict professional telegraphic voice maintained' : `Found ${foundPronouns.length} personal pronouns (${foundPronouns.join(', ')})`, impact: 'minor' as const, scoreGain: 3 },
    { title: 'Evidence-Based Phrasing', passed: foundBuzzwords.length === 0, detail: foundBuzzwords.length === 0 ? 'Zero cliché fluff buzzwords' : `Found ${foundBuzzwords.length} subjective buzzwords (${foundBuzzwords.join(', ')})`, impact: 'minor' as const, scoreGain: 2 },
  ];

  // ==========================================
  // READABILITY METRICS STRUCT
  // ==========================================
  const readability: AtsReadabilityMetrics = {
    wordCount,
    readingTimeMinutes,
    bulletCount,
    avgWordsPerBullet,
    bulletsWithMetricsPercent,
    fleschKincaidEstimate: wordCount > 0 ? (avgWordsPerBullet < 18 ? 'Professional & Crisp' : 'Detailed & Comprehensive') : 'N/A',
    firstPersonPronounsCount: foundPronouns.length,
    passiveVoicePhrasesCount: foundPassivePhrases.length,
    buzzwordsCount: foundBuzzwords.length
  };

  // ==========================================
  // TARGET ROLE MATCH ANALYSIS (ALL-ROUNDER)
  // ==========================================
  const roleMatches: AtsRoleMatch[] = [];

  Object.entries(TARGET_ROLE_BENCHMARKS).forEach(([, bench]) => {
    const matched = bench.requiredSkills.filter((s) => textLower.includes(s) || (persona.techStack || []).some((ts) => ts.toLowerCase() === s));
    const missing = bench.requiredSkills.filter((s) => !matched.includes(s));
    const matchPct = Math.round((matched.length / bench.requiredSkills.length) * 100);

    const relevance: AtsRoleMatch['relevance'] =
      matchPct >= 70 ? 'High Match' : matchPct >= 45 ? 'Moderate Match' : 'Low Match';

    roleMatches.push({
      role: bench.title,
      matchScore: matchPct,
      matchedSkills: matched.map((s) => s.toUpperCase()),
      missingSkills: missing.map((s) => s.toUpperCase()),
      relevance
    });
  });

  // Sort role matches by highest match first
  roleMatches.sort((a, b) => b.matchScore - a.matchScore);

  // ==========================================
  // COMPOSITE ATS SCORE CALCULATION
  // ==========================================
  const pillars: AtsScoreResult['pillars'] = {
    contactProfile: {
      name: 'Contact & Identity',
      score: contactScore,
      weight: 0.15,
      weightedScore: Math.round(contactScore * 0.15),
      label: `${contactPassedCount}/${contactItems.length} Verified`,
      status: contactScore >= 85 ? 'excellent' : contactScore >= 65 ? 'good' : contactScore >= 45 ? 'average' : 'poor',
      summary: 'Applicant contact channels and web identity footprint.',
      items: contactItems
    },
    sectionArchitecture: {
      name: 'Section Architecture',
      score: sectionScore,
      weight: 0.20,
      weightedScore: Math.round(sectionScore * 0.20),
      label: `${sectionPassedCount}/${sectionItems.length} Standard Sections`,
      status: sectionScore >= 85 ? 'excellent' : sectionScore >= 65 ? 'good' : sectionScore >= 45 ? 'average' : 'poor',
      summary: 'ATS header compatibility and chronological structure.',
      items: sectionItems
    },
    actionImpact: {
      name: 'Impact & Quantification',
      score: actionScore,
      weight: 0.25,
      weightedScore: Math.round(actionScore * 0.25),
      label: `${detailedMetrics.length} Metrics • ${detectedActionVerbs.length} Verbs`,
      status: actionScore >= 85 ? 'excellent' : actionScore >= 65 ? 'good' : actionScore >= 45 ? 'average' : 'poor',
      summary: 'Measurable results, percentage gains, and power verbs.',
      items: actionItems
    },
    keywordsSkills: {
      name: 'Keywords & Tech Stack',
      score: skillScore,
      weight: 0.20,
      weightedScore: Math.round(skillScore * 0.20),
      label: `${totalSkillsFound} Technologies Matched`,
      status: skillScore >= 85 ? 'excellent' : skillScore >= 65 ? 'good' : skillScore >= 45 ? 'average' : 'poor',
      summary: 'Hard skill density across 14 technical categories.',
      items: keywordItems
    },
    formattingReadability: {
      name: 'Format & Readability',
      score: formatScore,
      weight: 0.10,
      weightedScore: Math.round(formatScore * 0.10),
      label: `${wordCount} Words • Clean ASCII`,
      status: formatScore >= 85 ? 'excellent' : formatScore >= 65 ? 'good' : formatScore >= 45 ? 'average' : 'poor',
      summary: 'Length, parsing cleanliness, and reading ease.',
      items: formatItems
    },
    linguisticHygiene: {
      name: 'Linguistic Hygiene & Red Flags',
      score: linguisticScore,
      weight: 0.10,
      weightedScore: Math.round(linguisticScore * 0.10),
      label: `${ruleViolations.length} Violations Detected`,
      status: linguisticScore >= 85 ? 'excellent' : linguisticScore >= 65 ? 'good' : linguisticScore >= 45 ? 'average' : 'poor',
      summary: 'Deductions for passive phrases, pronouns, and buzzwords.',
      items: linguisticItems
    }
  };

  const rawOverall = Math.round(
    pillars.contactProfile.weightedScore +
    pillars.sectionArchitecture.weightedScore +
    pillars.actionImpact.weightedScore +
    pillars.keywordsSkills.weightedScore +
    pillars.formattingReadability.weightedScore +
    pillars.linguisticHygiene.weightedScore
  );

  const dealBreakersCount = ruleViolations.filter((r) => r.severity === 'dealbreaker').length;
  
  // Severe dealbreaker deduction
  let overallScore = Math.min(99, Math.max(20, rawOverall));
  if (dealBreakersCount > 0) {
    overallScore = Math.min(68, overallScore);
  }

  let grade: AtsScoreResult['grade'] = 'C';
  let gradeColor = '#f59e0b';
  let summaryTitle = 'Good ATS Foundation';
  let summaryDescription = 'Your resume has solid foundational sections and will pass standard keyword screeners.';

  if (overallScore >= 92 && dealBreakersCount === 0) {
    grade = 'A+';
    gradeColor = '#10b981';
    summaryTitle = 'Elite ATS Ranking (Top 5%)';
    summaryDescription = 'Flawless ATS parsing architecture. Maximizes recruiter match rate across Greenhouse, Workday, Lever, and Ashby.';
  } else if (overallScore >= 82 && dealBreakersCount === 0) {
    grade = 'A';
    gradeColor = '#059669';
    summaryTitle = 'Strong ATS Compliance';
    summaryDescription = 'Excellent technical density and clear structure. Passes 90%+ of automated parsing filters.';
  } else if (overallScore >= 72) {
    grade = 'B+';
    gradeColor = '#06b6d4';
    summaryTitle = 'Competitive ATS Pass Rate';
    summaryDescription = 'Solid technical keywords. Minor additions in metrics and section headers will push score to 90%+.';
  } else if (overallScore >= 60) {
    grade = 'B';
    gradeColor = '#eab308';
    summaryTitle = 'Moderate ATS Compatibility';
    summaryDescription = 'Contains vital keywords but lacks sufficient quantified metrics or has minor formatting warnings.';
  } else if (overallScore >= 45) {
    grade = 'C';
    gradeColor = '#f97316';
    summaryTitle = 'Needs Critical Optimization';
    summaryDescription = 'Missing key contact links, metrics, or technical headers. High risk of automated ATS rejection.';
  } else {
    grade = 'D';
    gradeColor = '#ef4444';
    summaryTitle = 'High Risk of ATS Filtering';
    summaryDescription = 'Crucial sections or technical details are missing or unparseable by automated engines.';
  }

  // ==========================================
  // DYNAMIC ACTION PLAN & FIX CHECKLIST
  // ==========================================
  const actionPlan: AtsScoreResult['actionPlan'] = [];
  let stepCounter = 1;

  if (dealBreakersCount > 0) {
    ruleViolations.filter((r) => r.severity === 'dealbreaker').forEach((db) => {
      actionPlan.push({
        step: stepCounter++,
        title: db.title,
        impact: 'high',
        pointsBoost: `+${db.penaltyPoints} pts`,
        instruction: db.recommendation
      });
    });
  }

  if (detailedMetrics.length < 4) {
    actionPlan.push({
      step: stepCounter++,
      title: 'Quantify Experience Bullets with Measurable KPIs',
      impact: 'high',
      pointsBoost: '+10 pts',
      instruction: 'Add 3-4 concrete figures (e.g. "improved latency by 35%", "scaled to 50k users", "reduced cloud bill by $40K").'
    });
  }

  if (foundPassivePhrases.length > 0) {
    actionPlan.push({
      step: stepCounter++,
      title: 'Replace Passive Ownership Phrases with Power Verbs',
      impact: 'medium',
      pointsBoost: '+8 pts',
      instruction: `Convert "${foundPassivePhrases[0]}" into decisive active verbs (e.g. "Architected", "Engineered", "Streamlined").`
    });
  }

  if (!hasLinkedIn) {
    actionPlan.push({
      step: stepCounter++,
      title: 'Add Verified LinkedIn Profile Header',
      impact: 'medium',
      pointsBoost: '+6 pts',
      instruction: 'Include your customized LinkedIn profile link (linkedin.com/in/yourname) in the contact header.'
    });
  }

  if (totalSkillsFound < 10) {
    actionPlan.push({
      step: stepCounter++,
      title: 'Expand Technical Competencies & Cloud Keywords',
      impact: 'high',
      pointsBoost: '+12 pts',
      instruction: 'Explicitly list your backend, frontend, database, and cloud tool keywords (e.g. Docker, PostgreSQL, React, AWS).'
    });
  }

  if (!hasSummarySection) {
    actionPlan.push({
      step: stepCounter++,
      title: 'Add a 2-3 Line Professional Executive Summary',
      impact: 'low',
      pointsBoost: '+4 pts',
      instruction: 'Add a brief executive pitch at the top outlining your years of experience, core tech stack, and primary value proposition.'
    });
  }

  if (actionPlan.length === 0) {
    actionPlan.push({
      step: 1,
      title: 'Tailor Keywords to Specific Target Job Descriptions',
      impact: 'high',
      pointsBoost: '+5 pts',
      instruction: 'Your resume meets all institutional ATS benchmarks. Customize keyword frequency for each specific application.'
    });
  }

  const topRecommendations = actionPlan.map((a) => a.instruction).slice(0, 5);

  // Convert violations to legacy issues for backwards compatibility
  ruleViolations.forEach((v) => {
    issues.push({
      id: v.id,
      category: v.category,
      type: v.severity === 'dealbreaker' ? 'critical' : v.severity === 'warning' ? 'warning' : 'info',
      title: v.title,
      description: v.description,
      recommendation: v.recommendation,
      potentialPointsGain: v.penaltyPoints
    });
  });

  return {
    overallScore,
    grade,
    gradeColor,
    summaryTitle,
    summaryDescription,
    dealBreakersCount,
    totalViolationsCount: ruleViolations.length,
    wordCount,
    readingTimeMinutes,
    hardSkillsCount: totalSkillsFound,
    actionVerbsCount: detectedActionVerbs.length,
    metricsCount: detailedMetrics.length,
    readability,
    pillars,
    detectedSkills,
    detectedMetrics,
    detailedMetrics,
    detectedActionVerbs,
    detailedVerbs,
    roleMatches,
    ruleViolations,
    issues,
    strengths,
    topRecommendations,
    actionPlan,
    calculatedAt: Date.now()
  };
}
