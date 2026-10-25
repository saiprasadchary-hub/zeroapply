import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { checkOllamaStatus, generateOllamaAnswer } from '../src/agent/localLlm/ollamaClient';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import type { PersonaData } from '../src/types';

const candidatePersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React', 'FastAPI', 'LangChain', 'Ollama', 'Electron'],
  targetRoles: ['AI Automation Intern', 'Full Stack AI Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Sai Prasad Chary - Full Stack & AI Agent Developer. 4 years of experience building multi-step agentic workflows, Python automation pipelines, and tool-calling systems.',
  experienceSummary: 'Founder & CEO at Impulsesearch. Led AI agent development for autonomous web workflows.',
  resumeChunks: {
    summary: 'AI Automation Engineer with 4 years experience building tool-calling agents and production automation pipelines.',
    skills: 'Python, TypeScript, React, LangChain, Local LLMs (Qwen 2.5), FastAPI, Electron, DOM Automation',
    experience: 'Founder & Lead Engineer at Impulsesearch (2021-Present): Architected multi-step AI agent workflows with local LLM inference.',
    projects: 'Engineered an autonomous AI agent workflow utilizing Python, LangChain, and local LLMs (Qwen 2.5) with deterministic DOM automation and resilient retry loops to automate multi-step web applications.',
    workAuthorization: 'Authorized to work in India without visa sponsorship.',
  },
};

questionMemory.clear();
questionMemory.seedFromPersona(candidatePersona);

const ARTIFACT_DIR = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
const LOCAL_ARTIFACTS = path.join(process.cwd(), 'artifacts');
for (const dir of [ARTIFACT_DIR, LOCAL_ARTIFACTS]) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}
try {
  if (fs.existsSync(LOCAL_ARTIFACTS)) {
    for (const f of fs.readdirSync(LOCAL_ARTIFACTS)) {
      if (f.endsWith('.png')) {
        try { fs.copyFileSync(path.join(LOCAL_ARTIFACTS, f), path.join(ARTIFACT_DIR, f)); } catch {}
      }
    }
  }
} catch {}

// Possible Chrome binary locations on Mac and standard paths
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
console.log('Found Chrome executable at:', chromePath || 'None found, trying default');

async function run() {
  if (!chromePath) {
    throw new Error('No supported Chromium browser found on system.');
  }

  // 0. Verify Local Qwen 2.5 Model Health via Ollama
  console.log('--- CHECKING LOCAL LLM (QWEN 2.5) HEALTH ---');
  const ollamaStatus = await checkOllamaStatus();
  console.log('Ollama Local LLM Status:', JSON.stringify(ollamaStatus, null, 2));
  if (!ollamaStatus.online || !ollamaStatus.modelAvailable) {
    console.warn('⚠️ Warning: Local Qwen 2.5 is offline or model not found. Starting with fallback.');
  } else {
    console.log(`✅ Qwen 2.5 Local LLM Online! Model: ${ollamaStatus.modelName} (Ping: ${ollamaStatus.latencyMs}ms)`);
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-res retina screenshots
  });

  const page = await context.newPage();
  const htmlPath = `file://${path.resolve(process.cwd(), 'clone-linkedin/index.html')}`;
  console.log('Navigating to:', htmlPath);
  await page.goto(htmlPath, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // 1. Initial page: Glide cursor with arc to Easy Apply button
  console.log('Gliding cursor to Easy Apply button...');
  await page.evaluate(() => {
    window.__zeroapplyCursor?.glideTo(820, 240, 'AI: Click "Easy Apply"', 400);
  });
  await page.waitForTimeout(500);

  // Click Easy Apply
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#main-easy-apply-btn', 'AI: Click "Easy Apply"');
  });
  await page.waitForSelector('#easy-apply-modal-overlay.active', { timeout: 4000 });
  await page.waitForTimeout(700);

  // --- STEP 1: Contact info ---
  console.log('Filling Step 1: Contact Information with animated cursor...');
  await page.selectOption('#input-email-address', 'kspchary077@gmail.com');
  await page.selectOption('#input-phone-country', 'India (+91)');
  await page.fill('#input-phone-number', '+91 83743 70572');

  // Move cursor with fake curve to Mobile phone number field
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#input-phone-number', 'AI: Fill Phone (+91 83743 70572)');
  });
  await page.waitForTimeout(500);

  const step1Path = path.join(ARTIFACT_DIR, 'step1_contact_info.png');
  await page.screenshot({ path: step1Path });
  console.log('📸 Step 1 Screenshot saved to:', step1Path);

  // Click Next to Step 2
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#modal-next-btn', 'AI: Next Step');
  });
  await page.waitForSelector('#step-2.active', { timeout: 5000 });
  await page.waitForTimeout(600);

  // --- STEP 2: Resume selection ---
  console.log('Filling Step 2: Resume Selection with animated cursor...');
  await page.evaluate(() => {
    const swe = document.querySelector('.resume-item[data-resume-name*="SWE"]') || document.querySelector('.resume-item');
    if (swe) swe.click();
    window.__zeroapplyCursor?.clickElement('.resume-item.selected, .resume-item', 'AI: Select "Resume for SWE.pdf"');
  });
  await page.waitForTimeout(550);

  const step2Path = path.join(ARTIFACT_DIR, 'step2_resume_selection.png');
  await page.screenshot({ path: step2Path });
  console.log('📸 Step 2 Screenshot saved to:', step2Path);

  // Click Next to Step 3
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#modal-next-btn', 'AI: Next Step');
  });
  await page.waitForSelector('#step-3.active', { timeout: 5000 });
  await page.waitForTimeout(600);

  // --- STEP 3: Work experience ---
  console.log('Filling Step 3: Work Experience with animated cursor...');
  await page.fill('#input-job-title', 'AI Automation Intern');
  await page.fill('#input-company-name', 'Impulsesearch');
  await page.fill('#input-location', 'Hyderabad, Telangana, India');
  await page.fill('#input-total-experience', '4');

  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#input-total-experience', 'AI: Experience (4 Years)');
  });
  await page.waitForTimeout(550);

  const step3Path = path.join(ARTIFACT_DIR, 'step3_work_experience.png');
  await page.screenshot({ path: step3Path });
  console.log('📸 Step 3 Screenshot saved to:', step3Path);

  // Click Next to Step 4
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#modal-next-btn', 'AI: Screening Questions');
  });
  await page.waitForSelector('#step-4.active', { timeout: 5000 });
  await page.waitForTimeout(600);

  // --- STEP 4: Screening questions ---
  console.log('Filling Step 4: Screening Questions dynamically via local Qwen & QuestionResolver...');
  const officeAns = await resolveQuestion({ label: 'Are you comfortable working on-site in Hyderabad?', options: ['Yes', 'No'] }, candidatePersona);
  const stipendAns = await resolveQuestion({ label: 'The stipend for this internship is ₹20,000–₹25,000/month. Are you comfortable with this?', options: ['Yes', 'No'] }, candidatePersona);
  const aiAgentChoice = await resolveQuestion({ label: 'Have you built AI agents (not just RAG-based Q&A systems)?', options: ['Yes', 'No'] }, candidatePersona);
  const pythonYears = await resolveQuestion({ label: 'How many years of work experience do you have with Python?', inputType: 'number' }, candidatePersona);
  const visaAns = await resolveQuestion({ label: 'Do you require visa sponsorship now or in the future?', options: ['Yes', 'No'] }, candidatePersona);

  // Generate open-ended description using local Qwen 2.5 LLM
  console.log('Prompting Local Qwen 2.5 (qwen2.5:1.5b via Ollama) for AI agent description...');
  const qwenPrompt = `Candidate: ${candidatePersona.fullName}
Experience: 4 years building autonomous AI agent workflows with Python, LangChain, local LLMs (Qwen 2.5), and DOM automation.
Question: Have you built AI agents — e.g., agents that take actions, call tools, or automate multi-step workflows? Please briefly describe one.
Answer in 2 concise professional sentences:`;

  let agentDescription = '';
  try {
    const rawAnswer = await generateOllamaAnswer(qwenPrompt, 'You are an autonomous AI agent expert candidate.');
    agentDescription = rawAnswer.replace(/\n+/g, ' ').trim();
    console.log('🤖 Qwen 2.5 Real-Time Generated Answer:\n', agentDescription);
  } catch (err) {
    console.warn('Ollama generation error, using persona chunk:', err);
    agentDescription = 'Engineered an autonomous AI agent workflow utilizing Python, LangChain, and local LLMs (Qwen 2.5) with deterministic DOM automation, resilient retry loops, and synthetic event dispatching to automate complex multi-step application pipelines.';
  }

  if (agentDescription.length > 280) {
    agentDescription = agentDescription.slice(0, 275).trim() + '...';
  }

  await page.check(`input[name="q_office_hyderabad"][value="${officeAns.answer}"]`);
  await page.check(`input[name="q_stipend_comfort"][value="${stipendAns.answer}"]`);
  await page.check(`input[name="q_ai_agents"][value="${aiAgentChoice.answer}"]`);
  await page.fill('#q_ai_agents_desc', agentDescription);
  await page.fill('#q_python_years', pythonYears.answer);
  await page.check(`input[name="q_visa_sponsorship"][value="${visaAns.answer}"]`);

  // Move cursor with curved path to the AI Agent Description textarea
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#q_ai_agents_desc', '✦ Qwen 2.5: Real-Time Answer');
  });
  await page.waitForTimeout(600);

  const step4Path = path.join(ARTIFACT_DIR, 'step4_screening_questions.png');
  await page.screenshot({ path: step4Path });
  console.log('📸 Step 4 Screenshot saved to:', step4Path);

  // Click Next to reach Step 5
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#modal-next-btn', 'AI: Review Application');
  });
  await page.waitForSelector('#step-5.active', { timeout: 5000 });
  await page.waitForTimeout(600);

  // --- STEP 5: Review application ---
  console.log('Viewing Step 5: Review & Submit with animated cursor...');
  await page.check('#follow-company-chk');

  // Move cursor to Submit button (hovering before submit)
  await page.evaluate(() => {
    window.__zeroapplyCursor?.glideToElement('#modal-submit-btn', '✦ AI: Ready to Submit Application', 350);
  });
  await page.waitForTimeout(600);

  const step5Path = path.join(ARTIFACT_DIR, 'step5_review_submit.png');
  await page.screenshot({ path: step5Path });
  console.log('📸 Step 5 Screenshot saved to:', step5Path);

  // Click Submit application
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#modal-submit-btn', '✦ AI: Submitting Application...');
  });
  await page.waitForSelector('#step-success.active', { timeout: 5000 });
  await page.waitForTimeout(800);

  // --- STEP SUCCESS: Submitted Modal ---
  console.log('Viewing Step Success with animated cursor...');
  await page.evaluate(() => {
    window.__zeroapplyCursor?.glideToElement('#btn-success-done', '✦ AI: Application Sent! Click Done');
  });
  await page.waitForTimeout(600);

  const stepSuccessPath = path.join(ARTIFACT_DIR, 'step6_submitted_success.png');
  await page.screenshot({ path: stepSuccessPath });
  console.log('📸 Success View Screenshot saved to:', stepSuccessPath);

  // Now click Done to dismiss modal and show Applied state
  await page.evaluate(() => {
    window.__zeroapplyCursor?.clickElement('#btn-success-done', '✦ AI: Application Sent! Click Done');
  });
  await page.waitForTimeout(700);

  await browser.close();
  console.log('🎉 ALL SCREENSHOTS WITH VISUAL CURSOR CAPTURED AND SAVED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
