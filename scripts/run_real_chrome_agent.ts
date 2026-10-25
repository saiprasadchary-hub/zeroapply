/**
 * ZeroApply - Real Live Browser Agent (No Demo / Real LinkedIn)
 * Launches real Google Chrome with a persistent user profile (retaining real logins & cookies),
 * navigates to real LinkedIn (or any real career portal), injects the 3D purple cursor
 * and executive Light-Mode HUD, and executes autonomous auto-apply with local Qwen 2.5 3B.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import { AutoApplyEngine } from '../src/agent/autoApply/autoApplyEngine';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import { getLiveAgentLightHudScript } from '../src/agent/ui/liveAgentLightHUD';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';
import { liveTelemetry } from '../src/agent/telemetry/liveTelemetry';
import { checkOllamaStatus, generateOllamaAnswer } from '../src/agent/localLlm/ollamaClient';
import { buildSearchUrl } from '../src/agent/navigation/searchUrlBuilder';
import type { PersonaData } from '../src/types';

// Ensure default execution mode
process.env.AUTO_START = process.env.AUTO_START || '1';
process.env.SINGLE_JOB = process.env.SINGLE_JOB !== undefined ? process.env.SINGLE_JOB : '0';

// Candidate Persona Configuration
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
  techStack: ['Python', 'TypeScript', 'React', 'LangChain', 'Local LLMs (Qwen 2.5)', 'FastAPI', 'Electron', 'DOM Automation'],
  targetRoles: ['AI Automation Engineer', 'Full Stack AI Engineer', 'Software Engineer'],
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

// Seed Question Memory Bank for deterministic answers
questionMemory.clear();
questionMemory.seedFromPersona(candidatePersona);

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

// Persistent profile directory so real LinkedIn logins & cookies are permanently preserved
const REAL_PROFILE_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'ZeroApply_Real_Chrome_Profile');
if (!fs.existsSync(REAL_PROFILE_DIR)) {
  fs.mkdirSync(REAL_PROFILE_DIR, { recursive: true });
}

// Artifact directory for saving and embedding screenshots
const ARTIFACT_DIR = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
const LOCAL_ARTIFACTS = path.join(process.cwd(), 'artifacts');
for (const dir of [ARTIFACT_DIR, LOCAL_ARTIFACTS]) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}

// Sync existing local screenshots into active session brain artifact directory
try {
  if (fs.existsSync(LOCAL_ARTIFACTS)) {
    for (const f of fs.readdirSync(LOCAL_ARTIFACTS)) {
      if (f.endsWith('.png')) {
        try { fs.copyFileSync(path.join(LOCAL_ARTIFACTS, f), path.join(ARTIFACT_DIR, f)); } catch {}
      }
    }
  }
} catch {}

async function captureScreenshot(name: string, page: Page): Promise<string> {
  try {
    const filename = `${name}.png`;
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    const localPath = path.join(LOCAL_ARTIFACTS, filename);
    await page.screenshot({ path: artifactPath, fullPage: false });
    try { fs.copyFileSync(artifactPath, localPath); } catch {}
    console.log(`📸 [Screenshot Captured]: ${artifactPath}`);
    return artifactPath;
  } catch (err: any) {
    console.warn(`[Screenshot Notice]: ${err?.message || err}`);
    return '';
  }
}

function cleanStaleLocks(dir: string) {
  const files = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      if (fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink()) {
        fs.unlinkSync(p);
      }
    } catch {}
  }
}

function promptEnter(query: string, timeoutMs: number = 8000): Promise<void> {
  if (process.env.AUTO_START === '1' || process.env.CI === '1') {
    console.log(`${query} [AUTO_START: continuing immediately]`);
    return Promise.resolve();
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        rl.close();
        console.log(`\n⏱️ [Timer elapsed ${timeoutMs / 1000}s: Proceeding automatically...]`);
        resolve();
      }, timeoutMs);
    }
    rl.question(query, () => {
      if (timer) clearTimeout(timer);
      rl.close();
      resolve();
    });
  });
}

async function launchContextWithRetry(dir: string, binary: string): Promise<BrowserContext> {
  cleanStaleLocks(dir);
  try {
    return await chromium.launchPersistentContext(dir, {
      executablePath: binary,
      headless: false,
      viewport: { width: 1440, height: 920 },
      deviceScaleFactor: 2,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=MediaRouter,OptimizationHints',
        '--disable-extensions',
      ],
    });
  } catch (err: any) {
    if (err.message.includes('SingletonLock') || err.message.includes('closed')) {
      console.log('🔄 Cleaning previous stale browser lock and retrying launch...');
      cleanStaleLocks(dir);
      await new Promise((r) => setTimeout(r, 1000));
      return await chromium.launchPersistentContext(dir, {
        executablePath: binary,
        headless: false,
        viewport: { width: 1440, height: 920 },
        deviceScaleFactor: 2,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=MediaRouter,OptimizationHints',
          '--disable-extensions',
        ],
      });
    }
    throw err;
  }
}

async function main() {
  if (!chromePath) {
    console.error('❌ Error: Could not find Google Chrome on your system.');
    console.error('Please make sure Google Chrome is installed in /Applications/Google Chrome.app');
    process.exit(1);
  }

  const defaultSearchUrl = buildSearchUrl('linkedin', candidatePersona.targetRoles, candidatePersona.location, candidatePersona.workPreference);
  const targetStartUrl = process.argv[2] || defaultSearchUrl;

  // 1. Verify and Test Local Ollama LLM
  console.log('\n[1/5] 🧠 Verifying Ollama Local LLM Engine...');
  const ollama = await checkOllamaStatus(2000);
  let ollamaTestOutput = '';
  if (ollama.online) {
    try {
      ollamaTestOutput = await generateOllamaAnswer(
        'Answer in 5 words or less: What is your primary mission for candidate Sai Prasad Chary?',
        'Sai Prasad Chary - AI Automation Engineer candidate.'
      );
      console.log(`✅ Ollama (${ollama.modelName}) is LIVE! Test Response: "${ollamaTestOutput.trim()}"`);
    } catch {
      console.log(`✅ Ollama (${ollama.modelName}) is ONLINE.`);
    }
  } else {
    console.warn('⚠️ Ollama is offline. The agent will rely on candidate persona heuristics.');
  }

  console.log('\n================================================================================');
  console.log('🚀 ZEROAPPLY - REAL LIVE BROWSER AGENT (REAL LINKEDIN / REAL WEBSITES)');
  console.log('================================================================================');
  console.log(`Candidate:    ${candidatePersona.fullName}`);
  console.log(`Target Roles: ${candidatePersona.targetRoles.join(', ')}`);
  console.log(`Chrome Path:  ${chromePath}`);
  console.log(`User Profile: ${REAL_PROFILE_DIR} (Logins preserved)`);
  console.log(`Local LLM:    ${ollama.online ? `ONLINE (${ollama.modelName})` : 'OFFLINE'}`);
  console.log(`Starting URL: ${targetStartUrl}`);
  console.log('================================================================================\n');

  console.log('🌐 Launching real Google Chrome with persistent session profile...');

  // 2. Launch real Chrome with persistent context (cookies & logins saved)
  const context = await launchContextWithRetry(REAL_PROFILE_DIR, chromePath);
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // Permanently register Dark Glass Visual Cursor & Light HUD across all page navigations
  await page.addInitScript(getVisualCursorScript()).catch(() => {});
  await page.addInitScript(getLiveAgentLightHudScript()).catch(() => {});

  // Monitor Chrome browser console and page errors
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const time = new Date().toISOString().substring(11, 19);

    // Suppress high-frequency tracking/CSP noise and extension probe errors
    if (
      text.includes('li/track') ||
      text.includes('li_fat_id') ||
      text.includes('csp') ||
      text.includes('beacon') ||
      text.includes('favicon.ico') ||
      text.includes('chrome-extension://') ||
      text.includes('chrome-extension') ||
      text.includes('go/TrustedHTML') ||
      text.includes('HTML sanitized') ||
      text.includes('Content contains tags or attributes') ||
      (text.includes('net::ERR_FAILED') && text.includes('Failed to load resource'))
    ) {
      return;
    }

    if (type === 'error') {
      console.log(`🔴 [Chrome Console Error ${time}]: ${text}`);
    } else if (type === 'warning') {
      if (text.includes('deprecated') || text.includes('DevTools') || text.includes('Third-party cookie')) return;
      console.log(`⚠️  [Chrome Console Warning ${time}]: ${text}`);
    } else if (text.includes('ZeroApply') || text.includes('Codex') || text.includes('AI:') || text.includes('HUD')) {
      console.log(`🟣 [Chrome Console Info ${time}]: ${text}`);
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (
      url.includes('chrome-extension://') ||
      url.includes('li/track') ||
      url.includes('analytics') ||
      url.includes('telemetry') ||
      url.includes('favicon.ico')
    ) {
      return;
    }
    console.log(`⚠️  [Network Request Failed]: ${req.method()} ${url.substring(0, 90)} (${req.failure()?.errorText || 'failed'})`);
  });

  page.on('pageerror', (err) => {
    console.log(`🔴 [Chrome Uncaught Page Exception]: ${err.message}`);
  });

  // 3. Connect real-time telemetry to terminal, HUD, and screenshot capture
  let lastScreenshotTime = 0;
  liveTelemetry.subscribe((record) => {
    page.evaluate((rec) => {
      if ((window as any).__zeroapplyHUD) {
        (window as any).__zeroapplyHUD.onTelemetry(rec);
      }
    }, record).catch(() => {});

    if (record.type === 'think' && record.source === 'ollama') {
      console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 🧠 LOCAL LLM (QWEN 2.5:3B) ANSWERING FROM RESUME                            │');
      console.log('├─────────────────────────────────────────────────────────────────────────────┤');
      console.log(`│ ❓ Real Question: ${(record.target || '').slice(0, 72)}`);
      console.log(`│ 💡 AI Answer:     "${(record.value || '').slice(0, 72)}"`);
      console.log(`│ 📄 Grounding:     Candidate Resume Excerpts (RAG Tier 3)                    │`);
      console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
      setTimeout(() => {
        captureScreenshot('screenshot_real_agent_llm_reasoning', page).catch(() => {});
      }, 400);
    }

    // Capture screenshots on important actions (debounced to avoid thrashing)
    const now = Date.now();
    if (now - lastScreenshotTime > 1200) {
      if (record.title?.toLowerCase().includes('easy apply')) {
        lastScreenshotTime = now;
        captureScreenshot('screenshot_real_agent_easy_apply_clicked', page).catch(() => {});
      } else if (record.type === 'fill' || record.type === 'type' || (record.type === 'click' && record.title?.toLowerCase().includes('next'))) {
        lastScreenshotTime = now;
        captureScreenshot('screenshot_real_agent_modal_filling', page).catch(() => {});
      } else if (record.title?.toLowerCase().includes('submit') || record.title?.toLowerCase().includes('review') || record.type === 'submit') {
        lastScreenshotTime = now;
        captureScreenshot('screenshot_real_agent_review_submit', page).catch(() => {});
      }
    }
  });

  console.log(`[Browser]: Navigating to: ${targetStartUrl}`);
  await page.goto(targetStartUrl, { waitUntil: 'load' }).catch(() => {});
  await page.waitForSelector('li.jobs-search-results__list-item, .job-card-container, [data-job-id], .global-nav', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Take initial screenshot
  await captureScreenshot('screenshot_real_agent_initial', page);

  // Function to inject Live Agent Light HUD & Dark Glass Visual Cursor
  async function injectLiveHUD() {
    try {
      await page.evaluate(getVisualCursorScript());
      await page.evaluate(getLiveAgentLightHudScript());
      await page.evaluate((persona) => {
        if ((window as any).__zeroapplyHUD) {
          (window as any).__zeroapplyHUD.setJob(persona.targetRoles[0] || 'AI Automation Engineer', 'LinkedIn (Live)');
          (window as any).__zeroapplyHUD.setStep(1, 5, 'Live Portal Navigation');
          (window as any).__zeroapplyHUD.setQuestion('Real Browser Agent Active. Standing by...', 'READY');
        }
        if ((window as any).__zeroapplyCursor && typeof (window as any).__zeroapplyCursor.glideTo === 'function') {
          (window as any).__zeroapplyCursor.glideTo(560, 240, '✦ AI Agent Ready');
        }
      }, candidatePersona);
    } catch {}
  }

  await injectLiveHUD();
  await captureScreenshot('screenshot_real_agent_hud', page);

  // 4. Check if user is logged into real LinkedIn
  const isLoggedIn = await page.evaluate(() => {
    const isLoginScreen = !!document.querySelector('form.login__form, input#session_key, #username, [data-id="sign-in-form"]');
    const hasNav = !!document.querySelector('.global-nav, #global-nav, .feed-identity-module, .jobs-search-box, [data-view-name="feed-full-user-profile"]');
    return hasNav && !isLoginScreen;
  }).catch(() => false);

  if (!isLoggedIn) {
    console.log('\n⚠️  ACTION REQUIRED IN CHROME:');
    console.log('👉 If you are not yet logged in, please sign into LinkedIn in the Google Chrome window.');
    console.log('   (Your login and cookies will be permanently remembered!)\n');
    
    await page.evaluate(() => {
      if ((window as any).__zeroapplyHUD) {
        (window as any).__zeroapplyHUD.setQuestion('Standing by: Please log in or browse to jobs...', 'AUTH');
      }
    }).catch(() => {});

    await captureScreenshot('screenshot_real_agent_auth_state', page);

    // Wait up to 15 seconds or until logged in
    let waitCount = 0;
    while (waitCount < 6) {
      await page.waitForTimeout(2000);
      waitCount++;
      const ready = await page.evaluate(() => {
        return !!document.querySelector('.global-nav, #global-nav, .jobs-search-box, li.jobs-search-results__list-item, .job-card-container');
      }).catch(() => false);
      if (ready) {
        console.log('✅ Logged in / Job navigation detected!');
        break;
      }
    }
  }

  // Ensure on jobs search page with Easy Apply filter
  const currentUrl = page.url();
  if (!currentUrl.includes('/jobs/search') || !currentUrl.includes('f_AL')) {
    console.log(`[Browser]: Navigating to targeted Easy Apply search feed: ${targetStartUrl}`);
    await page.goto(targetStartUrl, { waitUntil: 'load' }).catch(() => {});
    await page.waitForSelector('li.jobs-search-results__list-item, .job-card-container, [data-job-id]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  await injectLiveHUD();
  await captureScreenshot('screenshot_real_agent_jobs_feed', page);

  console.log('\n================================================================================');
  console.log('🟢 REAL AGENT READY ON LIVE LINKEDIN!');
  console.log('--------------------------------------------------------------------------------');
  console.log('Candidate: Sai Prasad Chary Kammari');
  console.log('Targeting: AI Automation Engineer | Easy Apply Jobs');
  console.log('Ollama:    Qwen 2.5:3B RAG Engine Active');
  console.log('HUD:       Executive Light-Mode Overlay Injected');
  console.log('================================================================================\n');

  await promptEnter('👉 Press [ENTER] to execute autonomous job application pass (or waiting 8s): ', 8000);

  await injectLiveHUD();

  // Webview adapter simulating Electron <webview> API on top of real Chrome page
  const webview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      return page.evaluate<T>(code);
    },
  };

  const autoApply = new AutoApplyEngine();

  autoApply.setStatusCallback((status) => {
    console.log(`🟣 [Real Agent Status]: ${status}`);
    if (status.includes('Going to job') || status.includes('details') || status.includes('modal') || status.includes('complete')) {
      captureScreenshot('screenshot_real_agent_active_step', page).catch(() => {});
    }
  });

  autoApply.setLogCallback((log) => {
    const symbol = log.type === 'success' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${symbol} [Real Agent ${log.type.toUpperCase()}]: ${log.message}`);
    if (log.message.includes('Easy Apply modal opened')) {
      setTimeout(() => {
        captureScreenshot('screenshot_real_agent_modal_open', page).catch(() => {});
      }, 700);
    }
  });

  console.log('\n🚀 Real Agent executing autonomous workflow on live LinkedIn...\n');

  // Handle opening secondary tabs if a job opens in a new tab
  const openTab = async (url?: string) => {
    const newPage = await context.newPage();
    await newPage.addInitScript(getVisualCursorScript()).catch(() => {});
    await newPage.addInitScript(getLiveAgentLightHudScript()).catch(() => {});
    if (url) await newPage.goto(url, { waitUntil: 'domcontentloaded' });
    return {
      executeJavaScript: async <T>(code: string): Promise<T> => {
        return newPage.evaluate<T>(code);
      },
    };
  };

  const closeTabAndReturn = async (tabView?: any) => {
    const pages = context.pages();
    if (pages.length > 1) {
      await pages[pages.length - 1].close();
    }
    await page.bringToFront();
  };

  const rawSingle = process.env.SINGLE_JOB;
  const parsedLimit = rawSingle ? parseInt(rawSingle, 10) : 0;
  const isSingle = parsedLimit === 1;
  const maxJobs = parsedLimit > 0 ? parsedLimit : undefined;

  try {
    await autoApply.startBatchApply(
      webview,
      candidatePersona,
      'LinkedIn (Live)',
      true, // allow submit
      openTab,
      closeTabAndReturn,
      {
        stepDelayMs: 2500, // Human observable pacing
        singleJobOnly: isSingle,
        maxJobs,
      }
    );
  } catch (err: any) {
    console.log(`[AutoApply Status]: Completed application pass cycle (${err?.message || 'Done'})`);
  }

  try {
    await page.evaluate(() => {
      const discard = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim().toLowerCase() === 'discard');
      if (discard) discard.click();
    }).catch(() => {});
    await page.waitForTimeout(1000);
    await captureScreenshot('screenshot_real_agent_applied', page);
  } catch {}

  console.log('\n================================================================================');
  console.log('🎉 REAL AGENT PASS COMPLETE!');
  console.log('📸 Live screenshots captured and saved to artifacts.');
  console.log('Google Chrome remains open so you can review your live applied jobs.');
  console.log('================================================================================\n');

  if (process.env.AUTO_START === '1') {
    console.log('⏱️ Chrome will remain open for 8s to preserve final view...');
    await new Promise((r) => setTimeout(r, 8000));
  } else {
    await promptEnter('👉 Press [ENTER] in this terminal whenever you want to close Chrome: ');
  }

  try {
    await context.close();
  } catch {}
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in real Chrome agent:', err);
  process.exit(1);
});
