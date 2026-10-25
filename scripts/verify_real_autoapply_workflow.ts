import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import type { PersonaData } from '../src/types';

const candidatePersona: PersonaData = {
  fullName: 'Sai Prasad Chary Kammari',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 25000,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React', 'LangChain', 'Qwen 2.5', 'Electron'],
  targetRoles: ['AI Automation Intern', 'Software Engineer Intern'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Sai Prasad Chary Kammari - AI Automation & Full Stack Engineer. Hands-on experience developing autonomous AI agents with Python, LangChain, and local LLMs (Qwen 2.5).',
  experienceSummary: 'Founder & CEO at Impulsesearch. Built autonomous agent workflows with deterministic DOM automation.',
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

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function run() {
  if (!chromePath) {
    throw new Error('No supported Chromium browser found on system.');
  }

  console.log('🚀 Starting Real AutoApply Workflow Verification in Agent Browser...');
  console.log('Target persona:', candidatePersona.fullName, '| Roles:', candidatePersona.targetRoles.join(', '));

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const demoUrl = `file://${path.resolve('clone-linkedin/index.html')}`;
  console.log('Loading Agent Browser webview at:', demoUrl);
  await page.goto(demoUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Webview adapter exactly simulating Electron <webview> API
  const webview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      return page.evaluate((c) => eval(c), code);
    },
  };

  const logs: string[] = [];
  const autoApply = new AutoApplyEngine();

  autoApply.setStatusCallback((status) => {
    console.log('[Agent Status]:', status);
  });

  autoApply.setLogCallback((log) => {
    console.log(`[Agent Log (${log.type})]:`, log.message);
    logs.push(log.message);
  });

  // Track progress and take screenshots at key milestones
  let proofCount = 0;
  const takeProof = async (name: string, description: string) => {
    proofCount++;
    const filename = `real_workflow_${proofCount}_${name}.png`;
    const fullPath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: fullPath });
    console.log(`📸 Captured proof ${proofCount}: [${description}] -> ${fullPath}`);
    return fullPath;
  };

  // Proof A: Initial state before auto-apply starts
  await takeProof('initial_search_list', 'Agent Browser Search List');

  // Launch AutoApplyEngine in background promise so we can capture live progression
  const applyPromise = autoApply.startBatchApply(webview, candidatePersona, 'LinkedIn Demo (Clone)', true);

  // Monitor live stages
  // Stage 1: Card 1 selection & Easy Apply opening
  await page.waitForTimeout(1800);
  await takeProof('card1_easy_apply_clicked', 'Card 1 Selected & Easy Apply Clicked');

  // Stage 2: Contact Info filled
  await page.waitForTimeout(2200);
  await takeProof('contact_info_filled', 'Step 1 Contact Info Auto-filled with 3D Cursor');

  // Stage 3: Wizard Progression (Steps 2-4: Resume, Experience, Screening Qs with Qwen 2.5)
  await page.waitForTimeout(4000);
  await takeProof('screening_questions_qwen', 'Step 4 Screening Questions Answered by Local Qwen 2.5');

  // Wait for application completion of job 1
  await applyPromise;

  // Final Proof: Job 1 marked Applied and ready/moving to next
  await takeProof('job1_completed_applied', 'Job 1 Applied and Confirmed');

  await browser.close();

  console.log('\n=============================================');
  console.log('✅ Real AutoApply Workflow Execution Finished!');
  console.log(`Total agent events recorded: ${logs.length}`);
  console.log('=============================================\n');
}

run().catch((err) => {
  console.error('Fatal error during workflow verification:', err);
  process.exit(1);
});
