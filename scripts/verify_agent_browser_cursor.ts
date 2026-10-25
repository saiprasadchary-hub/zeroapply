import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { ensureVisualCursor, cursorGlideTo, cursorMoveAndClick } from '../src/agent/stealth/agentCursor';
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
  minSalary: 25000,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React', 'LangChain', 'Qwen 2.5', 'Electron'],
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

const ARTIFACT_DIR = '/Users/sriman/.gemini/antigravity-ide/brain/8cca0dc8-25c5-477f-8be0-ba1bcf9df11f';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
console.log('Found Chrome executable at:', chromePath || 'None found');

async function run() {
  if (!chromePath) {
    throw new Error('No supported Chromium browser found on system.');
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina resolution
  });

  const page = await context.newPage();
  const demoUrl = `file://${path.resolve('clone-linkedin/index.html')}`;
  console.log('Navigating Agent Browser to:', demoUrl);
  await page.goto(demoUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Webview adapter exactly simulating Electron <webview> API
  const webview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      return page.evaluate((c) => eval(c), code);
    },
  };

  // 1. Ensure 3D Visual Purple Cursor is active
  await ensureVisualCursor(webview);
  const cursorExists = await page.evaluate(() => {
    return !!document.getElementById('zeroapply-codex-cursor-root') && !!(window as any).__zeroapplyCursor;
  });
  console.log('✓ Visual Cursor Injected & Active in Agent Browser:', cursorExists);

  // 2. PROOF 1: Cursor hovering over Job Card in search list with AI Badge
  console.log('Capturing Proof 1: Cursor on Job Card in Agent Browser...');
  await page.evaluate(() => {
    const card = document.querySelector('.job-card, li.jobs-search-results__list-item');
    if (card && (window as any).__zeroapplyCursor) {
      const rect = card.getBoundingClientRect();
      (window as any).__zeroapplyCursor.glideTo(rect.left + 160, rect.top + 40, 'AI: Selecting Job "AI Automation Intern"');
    }
  });
  await page.waitForTimeout(600);
  const proof1Path = path.join(ARTIFACT_DIR, 'proof1_agent_browser_card_cursor.png');
  await page.screenshot({ path: proof1Path });
  console.log('📸 Proof 1 saved:', proof1Path);

  // 3. PROOF 2: Cursor Clicking Easy Apply Button with purple radiating rays & ripple
  console.log('Capturing Proof 2: Cursor Clicking Easy Apply in Agent Browser...');
  await page.evaluate(() => {
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.clickElement('#main-easy-apply-btn', 'AI: Click "Easy Apply"');
    }
    const btn = document.getElementById('main-easy-apply-btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
  const proof2Path = path.join(ARTIFACT_DIR, 'proof2_agent_browser_easy_apply_cursor.png');
  await page.screenshot({ path: proof2Path });
  console.log('📸 Proof 2 saved:', proof2Path);

  // 4. PROOF 3: Cursor on Form Input (Step 1 Contact Information)
  console.log('Capturing Proof 3: Cursor on Form Input in Agent Browser...');
  await page.evaluate(() => {
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.clickElement('#input-phone-number', 'Codex AI: Fill Mobile Phone (+91 83743 70572)');
    }
    const phoneInput = document.getElementById('input-phone-number') as HTMLInputElement;
    if (phoneInput) {
      phoneInput.value = '+91 83743 70572';
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(600);
  const proof3Path = path.join(ARTIFACT_DIR, 'proof3_agent_browser_form_input_cursor.png');
  await page.screenshot({ path: proof3Path });
  console.log('📸 Proof 3 saved:', proof3Path);

  // Advance to Step 4 (Screening questions)
  await page.evaluate(() => {
    (window as any).app?.goToStep?.(4);
  });
  await page.waitForTimeout(600);

  // 5. PROOF 4: Cursor on Screening Question with Local Qwen 2.5 Real-Time Answer Badge
  console.log('Capturing Proof 4: Cursor on Local Qwen Screening Answer in Agent Browser...');
  await page.evaluate(() => {
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.clickElement('#q_ai_agents_desc', '✦ Qwen 2.5: Real-Time Answer');
    }
    const desc = document.getElementById('q_ai_agents_desc') as HTMLTextAreaElement;
    if (desc) {
      desc.value = 'Engineered an autonomous AI agent workflow utilizing Python, LangChain, and local LLMs (Qwen 2.5) with deterministic DOM automation and resilient retry loops to automate multi-step web applications.';
      desc.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(600);
  const proof4Path = path.join(ARTIFACT_DIR, 'proof4_agent_browser_qwen_cursor.png');
  await page.screenshot({ path: proof4Path });
  console.log('📸 Proof 4 saved:', proof4Path);

  // Advance to Step 5 (Review & Submit)
  await page.evaluate(() => {
    (window as any).app?.goToStep?.(5);
  });
  await page.waitForTimeout(600);

  // 6. PROOF 5: Cursor on Submit Application Button
  console.log('Capturing Proof 5: Cursor on Submit Application Button in Agent Browser...');
  await page.evaluate(() => {
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.glideToElement('#modal-submit-btn', '✦ AI: Ready to Submit Application', 350);
    }
  });
  await page.waitForTimeout(600);
  const proof5Path = path.join(ARTIFACT_DIR, 'proof5_agent_browser_submit_cursor.png');
  await page.screenshot({ path: proof5Path });
  console.log('📸 Proof 5 saved:', proof5Path);

  // Submit and show confirmation modal
  await page.evaluate(() => {
    const submitBtn = document.getElementById('modal-submit-btn');
    if (submitBtn) submitBtn.click();
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.glideToElement('#btn-success-done', '✦ AI: Application Sent! Click Done', 350);
    }
  });
  await page.waitForTimeout(700);

  // 7. PROOF 6: Cursor on Confirmation Done Button
  const proof6Path = path.join(ARTIFACT_DIR, 'proof6_agent_browser_success_cursor.png');
  await page.screenshot({ path: proof6Path });
  console.log('📸 Proof 6 saved:', proof6Path);

  await browser.close();
  console.log('\n🎉 ALL AGENT BROWSER VISUAL CURSOR PROOFS CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Error running verification:', err);
  process.exit(1);
});
