import { calculateAtsScore, TECH_CATALOG, ACTION_VERB_CATEGORIES, TARGET_ROLE_BENCHMARKS } from '../src/ats';
import type { PersonaData } from '../src/types';

async function runAtsTests() {
  console.log('====================================================');
  console.log('[SUITE] RUNNING ULTRA-ADVANCED ATS ALL-ROUNDER TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log('   [PASS] TEST ' + total + ': ' + msg);
      passed++;
    } else {
      console.error('   [FAIL] TEST ' + total + ': ' + msg);
      throw new Error('Assertion failed: ' + msg);
    }
  }

  // TEST 1: 14 Skill Categories Coverage
  console.log('>> TEST 1: Verifying 14 Skill Categories in Taxonomy...');
  const categories = Object.keys(TECH_CATALOG);
  assert(categories.length === 14, 'Expected 14 skill categories, found ' + categories.length);
  assert(
    categories.includes('languages') &&
    categories.includes('frontend') &&
    categories.includes('backend') &&
    categories.includes('databases') &&
    categories.includes('cloud') &&
    categories.includes('devops') &&
    categories.includes('ai_ml') &&
    categories.includes('core_cs') &&
    categories.includes('data_science') &&
    categories.includes('mobile') &&
    categories.includes('testing') &&
    categories.includes('security') &&
    categories.includes('architecture') &&
    categories.includes('tools'),
    'All 14 skill categories present'
  );

  // TEST 2: Action Verbs Taxonomy
  console.log('\n>> TEST 2: Verifying 6 Action Verb Categories & Power Verbs...');
  const verbCategories = Object.keys(ACTION_VERB_CATEGORIES);
  assert(verbCategories.length === 6, '6 functional verb categories defined');
  const totalVerbs = Object.values(ACTION_VERB_CATEGORIES).reduce((acc, v) => acc + v.length, 0);
  assert(totalVerbs >= 100, 'Expected 100+ power verbs, found ' + totalVerbs);

  // TEST 3: Multi-Domain Role Benchmarks
  console.log('\n>> TEST 3: Verifying Target Role Compatibility Benchmarks...');
  const roles = Object.keys(TARGET_ROLE_BENCHMARKS);
  assert(roles.length >= 8, 'Expected 8+ role benchmarks, found ' + roles.length);

  // TEST 4: Comprehensive Real-World Resume Analysis
  console.log('\n>> TEST 4: Evaluating Comprehensive Software Engineer Profile...');
  const samplePersona: PersonaData = {
    fullName: 'Alex Vance',
    email: 'alex.vance@example.com',
    phone: '+1-555-019-9832',
    location: 'San Francisco, CA',
    linkedIn: 'https://linkedin.com/in/alexvance',
    gitHub: 'https://github.com/alexvance',
    portfolio: 'https://alexvance.dev',
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Python', 'PyTorch', 'Kafka', 'Redis', 'TailwindCSS', 'Jest', 'Git', 'System Design'],
    targetRoles: ['Full Stack Engineer', 'Backend Engineer'],
    resumeText: `Alex Vance
alex.vance@example.com | +1-555-0199 | San Francisco, CA | linkedin.com/in/alexvance | github.com/alexvance

EXECUTIVE SUMMARY
Senior Full Stack and Systems Engineer with over 6 years of proven track record architecting high-availability distributed cloud applications, resilient event-driven architectures, and modern web systems. Demonstrated expertise across TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Kafka, and Amazon Web Services. Experienced in leading agile cross-functional engineering teams, optimizing complex database performance, and driving developer velocity.

WORK EXPERIENCE
Apex Cloud Systems | Senior Software Engineer | 2021 – Present
• Architected and deployed scalable event-driven microservices processing over 50M+ requests per day with 99.99% uptime using Node.js, TypeScript, Kafka, and PostgreSQL.
• Reduced end-to-end API system latency by 45% and improved database query throughput by 3.5x across 12 distributed database clusters through query optimization and Redis caching.
• Spearheaded migration of a legacy monolithic infrastructure to Kubernetes container orchestration on AWS, reducing annual cloud infrastructure hosting expenses by $180,000.
• Led and mentored a high-performing agile engineering team of 8 full stack developers, increasing bi-weekly sprint delivery velocity by 30%.
• Implemented robust OAuth2, JWT authentication, and zero-trust role-based access control compliance across all external client-facing REST and GraphQL APIs.
• Established automated end-to-end integration test suites with Jest and Playwright, elevating automated test coverage to 92%.

NextGen Dynamics | Software Engineer | 2018 – 2021
• Developed real-time customer analytics and visualization dashboard with React, Next.js, TailwindCSS, and WebSockets serving 250k active daily users.
• Automated continuous integration and continuous deployment pipelines using GitHub Actions and Docker, reducing release cycle time from 2 hours to 8 minutes.
• Optimized PostgreSQL indexing strategy and relational schema design, saving 40% memory overhead and eliminating connection bottlenecks.
• Collaborated closely with product management and UX design teams to construct reusable design system component libraries.

EDUCATION
University of California, Berkeley
Bachelor of Science in Computer Science | 2014 – 2018

TECHNICAL SKILLS & COMPETENCIES
• Programming Languages: TypeScript, JavaScript, Python, Go, Java, SQL, HTML5, CSS3, Bash
• Frontend Technologies: React, Next.js, TailwindCSS, Redux, Vite, WebSockets, Responsive Design
• Backend & Cloud: Node.js, Express, FastAPI, PostgreSQL, Redis, MongoDB, AWS, Docker, Kubernetes, Kafka, CI/CD
• Systems & Methodologies: Distributed Systems, System Design, Data Structures & Algorithms, OOP, Agile, Scrum, Jest`,
    resumeChunks: {
      summary: 'Senior Full Stack and Systems Engineer with over 6 years of proven track record architecting high-availability distributed cloud applications.',
      experience: 'Apex Cloud Systems: Architected microservices with 50M+ requests/day. Reduced latency by 45%. Led team of 8.',
      skills: 'TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Python, Kafka, Redis',
      education: 'UC Berkeley - BS Computer Science',
      projects: 'Autonomous AI Cloud Engine, Distributed Event Broker',
      certifications: 'AWS Certified Solutions Architect',
      languages: 'English (Fluent), Spanish'
    },
    verified: true
  };

  const result = calculateAtsScore(samplePersona);

  if (result.overallScore < 85) {
    console.log('Violations for samplePersona:', result.ruleViolations);
    console.log('DealBreakers count:', result.dealBreakersCount);
    console.log('Word count:', result.wordCount);
  }

  assert(result.overallScore >= 85, 'Expected High ATS score >= 85, got ' + result.overallScore);
  assert(result.dealBreakersCount === 0, 'Zero dealbreakers on complete profile');
  assert(result.hardSkillsCount >= 14, 'Extracted ' + result.hardSkillsCount + ' technical hard skills');
  assert(result.metricsCount >= 5, 'Extracted ' + result.metricsCount + ' quantified metrics');
  assert(result.actionVerbsCount >= 4, 'Extracted ' + result.actionVerbsCount + ' power verbs');
  assert(result.roleMatches.length >= 8, 'Generated role match evaluations for 8 roles');

  const fullstackMatch = result.roleMatches.find(r => r.role.includes('Full Stack'));
  assert(Boolean(fullstackMatch && fullstackMatch.matchScore >= 70), 'Full stack match score: ' + fullstackMatch?.matchScore + '%');

  // TEST 5: Deal-Breaker Detection on Incomplete Profile
  console.log('\n>> TEST 5: Evaluating Deal-Breaker Detection on Incomplete Profile...');
  const brokenPersona: PersonaData = {
    fullName: 'John',
    email: '',
    phone: '',
    techStack: [],
    targetRoles: []
  };

  const brokenResult = calculateAtsScore(brokenPersona, 'Simple incomplete resume snippet with few words');
  assert(brokenResult.dealBreakersCount >= 2, 'Detected ' + brokenResult.dealBreakersCount + ' deal-breakers');
  assert(brokenResult.overallScore <= 68, 'Score capped below 68 due to deal-breakers (' + brokenResult.overallScore + ')');
  assert(brokenResult.actionPlan.length >= 3, 'Generated ' + brokenResult.actionPlan.length + ' prioritized action steps');

  console.log('\n====================================================');
  console.log('ALL ATS INSTITUTIONAL TESTS PASSED (' + passed + ' / ' + total + ')');
  console.log('====================================================\n');
}

runAtsTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
