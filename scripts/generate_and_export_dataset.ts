/**
 * ZeroApply Neural Dataset Generator
 * Generates 5,000+ domain-specific browser DOM + recruiter QA training samples
 * Formatted for direct fine-tuning with Apple MLX, Unsloth, or Llama-Factory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../artifacts/dataset');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface TrainingExample {
  system: string;
  prompt: string;
  response: string;
}

const SYSTEM_PROMPT = `You are ZeroApply Neural Core: an expert, specialized on-device AI system designed for real-time web application forms, interactive DOM comprehension, and candidate application answering. Represent the candidate directly in the first person ("I", "my"). Output exact answers with zero disqualification traps.`;

const WORK_AUTH_QUESTIONS = [
  { q: "Are you legally authorized to work in the United States?", a: "Yes", type: "radio" },
  { q: "Will you now or in the future require employment visa sponsorship?", a: "No", type: "radio" },
  { q: "Do you currently or will you in the future require visa sponsorship to continue working legally?", a: "No", type: "radio" },
  { q: "Are you eligible to work in India without restriction?", a: "Yes", type: "radio" },
  { q: "Will you require H1B or transfer assistance?", a: "No", type: "radio" },
];

const LEGAL_QUESTIONS = [
  { q: "Are you willing to undergo a pre-employment background screening?", a: "Yes", type: "radio" },
  { q: "Have you ever been convicted of a criminal offense or felony?", a: "No", type: "radio" },
  { q: "Are you bound by any non-compete agreements with previous employers?", a: "No", type: "radio" },
  { q: "Are you 18 years of age or older?", a: "Yes", type: "radio" },
  { q: "Can you provide proof of identity and eligibility to work?", a: "Yes", type: "radio" },
];

const ADVANCED_KNOCKOUT_QUESTIONS = [
  { q: "Have you ever been terminated for cause or asked to resign?", a: "No", type: "radio" },
  { q: "Do you have any family members or relatives employed at this organization?", a: "No", type: "radio" },
  { q: "Are you willing to work overtime, weekend shifts, or on-call rotations if needed?", a: "Yes", type: "radio" },
  { q: "Are you comfortable working in a fast-paced environment with ambiguity?", a: "Yes", type: "radio" },
  { q: "Do you have a valid driver's license and clean driving record?", a: "Yes", type: "radio" },
  { q: "Are you willing to travel for business up to 25%?", a: "Yes", type: "radio" },
  { q: "Can you perform all essential job functions with or without accommodation?", a: "Yes", type: "radio" },
  { q: "Are you subject to any active non-disclosure or non-compete agreements?", a: "No", type: "radio" },
  { q: "May we contact your current employer?", a: "Yes", type: "radio" },
  { q: "Are you a U.S. Person as defined by ITAR/EAR export regulations?", a: "Yes", type: "radio" },
];

const COMPENSATION_QUESTIONS = [
  { q: "What is your expected annual salary (CTC in LPA)?", a: "24", type: "number" },
  { q: "Expected compensation (USD annual digits only):", a: "140000", type: "number" },
  { q: "What is your desired hourly rate ($/hr)?", a: "70", type: "number" },
  { q: "Current CTC (Lakhs):", a: "18", type: "number" },
  { q: "Salary Expectation:", a: "$140,000 / year", type: "text" },
];

const AVAILABILITY_QUESTIONS = [
  { q: "What is your notice period?", a: "Immediate", type: "select" },
  { q: "Notice period in days (integer):", a: "15", type: "number" },
  { q: "How soon can you join if offered?", a: "Immediately", type: "text" },
  { q: "Earliest start date:", a: "Immediate", type: "text" },
];

const EEO_QUESTIONS = [
  { q: "Gender identity:", a: "I prefer not to say", type: "select" },
  { q: "Race / Ethnicity:", a: "Decline to self-identify", type: "select" },
  { q: "Veteran status:", a: "I do not wish to answer", type: "select" },
  { q: "Disability status:", a: "I do not wish to disclose", type: "select" },
];

const SKILL_YEARS_QUESTIONS = [
  { skill: "TypeScript", years: "5", q: "How many years of work experience do you have with TypeScript?" },
  { skill: "React.js", years: "5", q: "Years of professional experience with React:" },
  { skill: "Node.js", years: "4", q: "Do you have at least 3 years of Node.js experience?" },
  { skill: "Python", years: "4", q: "How many years of experience do you have with Python?" },
  { skill: "PostgreSQL", years: "4", q: "Total years of database experience (SQL/PostgreSQL):" },
  { skill: "Docker", years: "3", q: "Hands-on experience with Docker / Containerization (Years):" },
  { skill: "AWS", years: "3", q: "How many years of experience with Cloud infrastructure (AWS/GCP)?" },
];

console.log('Generating ZeroApply training dataset...');
const examples: TrainingExample[] = [];

// Generate Work Auth, Legal & Advanced Knockout samples
for (let i = 0; i < 200; i++) {
  for (const item of [...WORK_AUTH_QUESTIONS, ...LEGAL_QUESTIONS, ...ADVANCED_KNOCKOUT_QUESTIONS]) {
    examples.push({
      system: SYSTEM_PROMPT,
      prompt: `DOM Question: "${item.q}"\nWidget Type: ${item.type}\nCandidate Profile: Authorized, No visa needed, Clean legal background, Flexible, Driver license.\nOutput exact answer:`,
      response: item.a,
    });
  }
}

// Generate Compensation & Availability samples
for (let i = 0; i < 150; i++) {
  for (const item of [...COMPENSATION_QUESTIONS, ...AVAILABILITY_QUESTIONS]) {
    examples.push({
      system: SYSTEM_PROMPT,
      prompt: `DOM Question: "${item.q}"\nWidget Type: ${item.type}\nCandidate Profile: 5 YOE, 18 LPA current, 24 LPA expected / $140k USD, Immediate joiner.\nOutput exact answer:`,
      response: item.a,
    });
  }
}

// Generate EEO privacy samples
for (let i = 0; i < 150; i++) {
  for (const item of EEO_QUESTIONS) {
    examples.push({
      system: SYSTEM_PROMPT,
      prompt: `DOM Question: "${item.q}"\nWidget Type: ${item.type}\nCandidate Profile: Privacy-first applicant.\nOutput exact answer:`,
      response: item.a,
    });
  }
}

// Generate Skill Arithmetic samples
for (let i = 0; i < 150; i++) {
  for (const item of SKILL_YEARS_QUESTIONS) {
    const isBool = item.q.toLowerCase().includes('at least');
    const answer = isBool ? "Yes" : item.years;
    examples.push({
      system: SYSTEM_PROMPT,
      prompt: `DOM Question: "${item.q}"\nWidget Type: ${isBool ? 'radio' : 'number'}\nSkill: ${item.skill} (Candidate has ${item.years} years verified experience).\nOutput exact answer:`,
      response: answer,
    });
  }
}

// Write JSONL train and val splits
const splitIndex = Math.floor(examples.length * 0.9);
const trainSet = examples.slice(0, splitIndex);
const valSet = examples.slice(splitIndex);

const trainPath = path.join(outputDir, 'train.jsonl');
const valPath = path.join(outputDir, 'val.jsonl');

fs.writeFileSync(trainPath, trainSet.map((e) => JSON.stringify(e)).join('\n'), 'utf8');
fs.writeFileSync(valPath, valSet.map((e) => JSON.stringify(e)).join('\n'), 'utf8');

console.log(`✓ Training dataset created!`);
console.log(`- Total samples: ${examples.length}`);
console.log(`- Train set: ${trainSet.length} samples -> ${trainPath}`);
console.log(`- Validation set: ${valSet.length} samples -> ${valPath}`);
