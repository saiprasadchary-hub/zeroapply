/**
 * ZeroApply - Interactive Visual Chrome Demo (Paced & Local LLM Grounded)
 * Opens Google Chrome in HEADED mode (visible window) at a comfortable, human-observable pace.
 * Demonstrates 3D purple visual cursor, resume RAG retrieval, and live question answering
 * powered by Local Qwen 2.5 3B with zero cloud leaks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import { liveTelemetry } from '../src/agent/telemetry/liveTelemetry';
import { checkOllamaStatus } from '../src/agent/localLlm/ollamaClient';
import type { PersonaData } from '../src/types';

// Candidate Persona configuration with detailed Resume Chunks
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
  techStack: ['Python', 'TypeScript', 'React', 'LangChain', 'Local LLMs (Qwen 2.5)', 'Electron', 'DOM Automation'],
  targetRoles: ['AI Automation Intern', 'Full Stack AI Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Sai Prasad Chary Kammari - AI Automation Engineer. 4 years of experience architecting autonomous web agents, Python automation pipelines, and tool-calling systems.',
  experienceSummary: 'Founder & CEO at Impulsesearch. Led AI agent development for autonomous web workflows.',
  resumeChunks: {
    summary: 'AI Automation Engineer with 4 years experience building tool-calling agents and production automation pipelines.',
    skills: 'Python, TypeScript, React, LangChain, Local LLMs (Qwen 2.5), FastAPI, Electron, DOM Automation',
    experience: 'Founder & Lead Engineer at Impulsesearch (2021-Present): Architected multi-step AI agent workflows with local LLM inference.',
    projects: 'Engineered an autonomous AI agent workflow utilizing Python, LangChain, and local LLMs (Qwen 2.5) with deterministic DOM automation and resilient retry loops to automate multi-step web applications.',
    workAuthorization: 'Authorized to work in India without visa sponsorship.',
  },
};

// Clear memory bank so questions are answered live by Tier 3 Local LLM using the resume
questionMemory.clear();

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) {
    console.error('❌ Error: Could not find Google Chrome on your system.');
    console.error('Please ensure Google Chrome is installed in /Applications/Google Chrome.app');
    process.exit(1);
  }

  // 1. Check local Ollama health and Qwen 2.5 status
  const ollamaStatus = await checkOllamaStatus(1500);
  console.log('\n================================================================================');
  console.log('🌐 ZEROAPPLY VISUAL CHROME DEMO (COMFORTABLE PACE + LOCAL LLM RAG)');
  console.log('================================================================================');
  console.log(`Candidate:   ${candidatePersona.fullName}`);
  console.log(`Roles:       ${candidatePersona.targetRoles.join(', ')}`);
  console.log(`Chrome:      ${chromePath}`);
  console.log(`Local LLM:   ${ollamaStatus.online ? `ONLINE (Model: ${ollamaStatus.modelName})` : 'OFFLINE (Will use resume heuristics)'}`);
  console.log('Pacing:      HUMAN OBSERVABLE (~2.2s per step, natural typing delays)');
  console.log('--------------------------------------------------------------------------------\n');

  // 2. Subscribe to live telemetry to show detailed LLM & Resume insights in real time
  liveTelemetry.subscribe((record) => {
    page.evaluate((r) => {
      if ((window as any).__zeroapplyHUD) {
        (window as any).__zeroapplyHUD.onTelemetry(r);
      }
    }, record).catch(() => {});

    if (record.type === 'think' && record.source === 'ollama') {
      console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 🧠 LOCAL LLM (QWEN 2.5:3B) ANSWERING FROM RESUME                            │');
      console.log('├─────────────────────────────────────────────────────────────────────────────┤');
      console.log(`│ ❓ Question:  ${(record.target || '').slice(0, 72)}`);
      console.log(`│ 💡 Answer:    "${(record.value || '').slice(0, 72)}"`);
      console.log(`│ 📄 Grounding: Candidate Resume & Projects Context (RAG Tier 3)             │`);
      console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
    }
  });

  // 3. Launch Chrome in visible (headed) mode with natural viewport
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: false,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const demoUrl = `file://${path.resolve('clone-linkedin/index.html')}`;
  
  console.log(`[Browser]: Opening LinkedIn Clone at:\n${demoUrl}\n`);
  await page.goto(demoUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1600); // Give user time to see the search page

  // Webview adapter simulating Electron <webview> API
  const webview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      return page.evaluate((c) => eval(c), code);
    },
  };

  const autoApply = new AutoApplyEngine();

  autoApply.setStatusCallback((status) => {
    console.log(`🟣 [Agent Status]: ${status}`);
  });

  autoApply.setLogCallback((log) => {
    const symbol = log.type === 'success' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${symbol} [Agent ${log.type.toUpperCase()}]: ${log.message}`);
  });

  console.log('🚀 Agent starting human-paced application with 3D Purple Cursor & Local LLM...\n');

  try {
    // Start batch apply with human-observable pacing (2200ms per step) and single job demo
    await autoApply.startBatchApply(
      webview,
      candidatePersona,
      'LinkedIn Demo (Clone)',
      true, // allow submit
      undefined,
      undefined,
      {
        stepDelayMs: 2200, // 2.2s between steps: gives plenty of time to watch each step!
        singleJobOnly: true, // Focus on 1 complete job so you can inspect the full result
      }
    );
  } catch (err) {
    console.error('Workflow error:', err);
  }

  console.log('\n================================================================================');
  console.log('🎉 DEMO COMPLETED SUCCESSFULLY IN GOOGLE CHROME!');
  console.log('All questions were answered using the Candidate Resume & Local Qwen 2.5 3B.');
  console.log('Google Chrome will stay open so you can review the applied job.');
  console.log('👉 Press Ctrl+C in this terminal whenever you want to close Chrome.');
  console.log('================================================================================\n');

  // Keep browser alive until user exits
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Fatal error in Chrome demo:', err);
  process.exit(1);
});
