// Mock localStorage for CLI Node testing environment
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  length: 0,
  key: (_index: number) => null,
};

import { classifySingleField, extractCompanyFromResume, extractSchoolFromResume, extractMajorFromResume, extractDegreeFromResume } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { buildResumeChunks, findRelevantResumeContext } from '../src/agent/memory/resumeContextRetriever';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

async function runResumeGroundedAudit() {
  console.log('=== RESUME GROUNDED DATA ANSWERING AUDIT ===\n');

  // Candidate A: John Doe - Senior Mobile & Cloud Architect
  const candidateA: PersonaData = {
    fullName: 'Johnathan Doe',
    location: 'Seattle, WA, USA',
    email: 'jdoe@techcorp.io',
    phone: '+1 206 555 0192',
    linkedIn: 'https://linkedin.com/in/johndoe',
    gitHub: 'https://github.com/johndoe',
    portfolio: 'https://johndoe.dev',
    experienceYears: 7,
    minSalary: 180,
    workPreference: 'Remote',
    tone: 'Confident',
    techStack: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'AWS', 'Node.js'],
    targetRoles: ['Staff Mobile Engineer', 'Lead Mobile Architect'],
    applyMode: 'easy',
    verified: true,
    education: 'M.S. in Software Engineering, University of Washington',
    resumeText: `Johnathan Doe
Staff Mobile Architect with 7+ years of experience leading cross-platform mobile teams.
Experience: Lead Mobile Architect at CloudMobile Systems (2020-Present): Designed high-throughput Flutter and React Native architectures serving 5M+ DAU.
Prior Experience: Senior iOS Engineer at AppVantage Labs (2017-2020): Built native Swift and Kotlin SDKs.
Education: M.S. in Software Engineering, University of Washington (2015-2017). B.S. in Computer Science, Georgia Tech.
Projects: Architected Enterprise Realtime Chat SDK utilizing WebSockets and SQLite offline caching.`,
    resumeChunks: {
      summary: 'Staff Mobile Architect with 7+ years of experience leading cross-platform mobile teams at CloudMobile Systems.',
      skills: 'Flutter, React Native, Swift, Kotlin, AWS, iOS, Android, Node.js, SQLite',
      experience: 'Lead Mobile Architect at CloudMobile Systems (2020-Present): Designed high-throughput Flutter and React Native architectures serving 5M+ DAU.',
      education: 'M.S. in Software Engineering, University of Washington (2015-2017)',
      projects: 'Architected Enterprise Realtime Chat SDK utilizing WebSockets and SQLite offline sync.',
    },
  };

  // Candidate B: Jane Smith - Distributed Systems Engineer
  const candidateB: PersonaData = {
    fullName: 'Jane Smith',
    location: 'London, UK',
    email: 'jane.smith@fintech.co.uk',
    phone: '+44 20 7946 0912',
    linkedIn: 'https://linkedin.com/in/janesmith',
    gitHub: 'https://github.com/janesmith',
    portfolio: '',
    experienceYears: 3,
    minSalary: 95,
    workPreference: 'Hybrid',
    tone: 'Confident',
    techStack: ['Go', 'Kubernetes', 'Docker', 'PostgreSQL', 'Kafka', 'Rust'],
    targetRoles: ['Backend Systems Engineer'],
    applyMode: 'easy',
    verified: true,
    education: 'B.S. in Information Technology, Imperial College London',
    resumeText: `Jane Smith
Backend Systems Engineer at FinScale Technologies.
Experience: Backend Engineer at FinScale Technologies (2023-Present): Developed distributed ledger microservices in Go and Kafka.
Education: B.S. in Information Technology, Imperial College London.`,
    resumeChunks: {
      summary: 'Backend Systems Engineer specializing in Go microservices and event streaming with Kafka.',
      skills: 'Go, Kubernetes, Docker, PostgreSQL, Kafka, Rust',
      experience: 'Backend Engineer at FinScale Technologies (2023-Present): Developed distributed ledger microservices in Go and Kafka.',
      education: 'B.S. in Information Technology, Imperial College London',
    },
  };

  // TEST 1: Dynamic Company Extraction from Resume
  console.log('--- 1. Testing Dynamic Company Extraction ---');
  const compA = extractCompanyFromResume(candidateA);
  console.log('Candidate A extracted company:', compA);
  if (!compA || !compA.includes('CloudMobile Systems')) {
    throw new Error(`Expected CloudMobile Systems, got: "${compA}"`);
  }

  const compB = extractCompanyFromResume(candidateB);
  console.log('Candidate B extracted company:', compB);
  if (!compB || !compB.includes('FinScale Technologies')) {
    throw new Error(`Expected FinScale Technologies, got: "${compB}"`);
  }
  console.log('✅ Passed dynamic company extraction (no hardcoding)!');

  // TEST 2: Dynamic School & Major Extraction from Resume
  console.log('\n--- 2. Testing Dynamic School & Major Extraction ---');
  const schoolA = extractSchoolFromResume(candidateA);
  const majorA = extractMajorFromResume(candidateA);
  const degA = extractDegreeFromResume(candidateA);
  console.log(`Candidate A education: School="${schoolA}", Major="${majorA}", Degree="${degA}"`);
  if (!schoolA || !schoolA.includes('University of Washington')) {
    throw new Error(`Expected University of Washington, got: "${schoolA}"`);
  }
  if (!degA.includes('Master')) {
    throw new Error(`Expected Master's Degree, got: "${degA}"`);
  }

  const schoolB = extractSchoolFromResume(candidateB);
  const majorB = extractMajorFromResume(candidateB);
  console.log(`Candidate B education: School="${schoolB}", Major="${majorB}"`);
  if (!schoolB || !schoolB.includes('Imperial College')) {
    throw new Error(`Expected Imperial College, got: "${schoolB}"`);
  }
  if (!majorB || !majorB.includes('Information Technology')) {
    throw new Error(`Expected Information Technology, got: "${majorB}"`);
  }
  console.log('✅ Passed dynamic school and major extraction!');

  // TEST 3: DOM Field Classification dynamically binds candidate resume data
  console.log('\n--- 3. Testing Field Classification Mapping ---');
  const companyField: ScannedField = {
    id: 'emp',
    selector: '#company',
    tagName: 'input',
    inputType: 'text',
    label: 'Current Company / Employer',
    placeholder: '',
    name: 'company',
    currentValue: '',
    required: true,
  };
  const classifiedA = classifySingleField(companyField, candidateA);
  console.log('Candidate A classified company field mappedValue:', classifiedA.mappedValue);
  if (classifiedA.mappedValue !== 'CloudMobile Systems') {
    throw new Error(`Expected CloudMobile Systems, got: "${classifiedA.mappedValue}"`);
  }

  const classifiedB = classifySingleField(companyField, candidateB);
  console.log('Candidate B classified company field mappedValue:', classifiedB.mappedValue);
  if (classifiedB.mappedValue !== 'FinScale Technologies') {
    throw new Error(`Expected FinScale Technologies, got: "${classifiedB.mappedValue}"`);
  }
  console.log('✅ Field classification dynamically maps candidate company!');

  // TEST 4: Resume Chunker Indexes Structured Chunks & Raw Text
  console.log('\n--- 4. Testing Semantic Resume Chunking & RAG Retrieval ---');
  const chunksA = buildResumeChunks(candidateA);
  console.log(`Built ${chunksA.length} resume chunks for Candidate A`);
  const chunkSections = chunksA.map((c) => c.section);
  console.log('Chunk sections:', chunkSections);
  if (!chunkSections.includes('projects') || !chunkSections.includes('skills')) {
    throw new Error('Expected chunks to include projects and skills');
  }

  const mobileContext = findRelevantResumeContext('What is your experience in mobile application development?', chunksA);
  console.log('Retrieved mobile context for question:', mobileContext.slice(0, 100) + '...');
  if (!mobileContext.toLowerCase().includes('flutter') && !mobileContext.toLowerCase().includes('mobile')) {
    throw new Error('Expected mobile context to contain Flutter or Mobile references from resume');
  }
  console.log('✅ Resume RAG retrieval accurately extracted relevant mobile excerpts!');

  // TEST 5: Question Resolver for Mobile Experience (Textarea & Screening)
  console.log('\n--- 5. Testing Question Resolver Grounded in Resume ---');
  const mobileQ: ScannedField = {
    id: 'mobile_exp',
    selector: '#mobile_q',
    tagName: 'textarea',
    inputType: 'textarea',
    label: 'What is your experience in mobile application development?',
    placeholder: '',
    name: 'mobileExperience',
    currentValue: '',
    required: true,
  };
  const ansA = await resolveQuestion(mobileQ, candidateA);
  console.log('Candidate A mobile question answer:', ansA.answer);
  if (!ansA.answer || !/mobile|flutter|react native/i.test(ansA.answer)) {
    throw new Error(`Expected mobile experience answer to mention resume mobile details, got: "${ansA.answer}"`);
  }
  console.log('✅ Question resolver synthesized answer directly from candidate resume!');

  // TEST 6: Question Resolver for Open-Ended Project Question
  console.log('\n--- 6. Testing Open-Ended Project Question ---');
  const projectQ: ScannedField = {
    id: 'project_desc',
    selector: '#proj',
    tagName: 'textarea',
    inputType: 'textarea',
    label: 'Describe a significant engineering project you built and the impact it delivered',
    placeholder: '',
    name: 'project',
    currentValue: '',
    required: true,
  };
  const projAnsA = await resolveQuestion(projectQ, candidateA);
  console.log('Candidate A project answer:', projAnsA.answer);
  if (!projAnsA.answer || !/chat|real-?time|websockets|sqlite|flutter/i.test(projAnsA.answer)) {
    throw new Error(`Expected project answer to mention candidate project from resume, got: "${projAnsA.answer}"`);
  }
  console.log('✅ Project question synthesized candidate project from resume!');

  console.log('\n🎉 ALL RESUME-GROUNDED DATA AUDIT TESTS PASSED SUCCESSFULLY!');
}

runResumeGroundedAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
