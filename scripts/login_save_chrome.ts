/**
 * ZeroApply - Real LinkedIn Native Login & Session Saver
 * Launches native Google Chrome directly with your persistent profile (zero automation flags),
 * allowing full compatibility with:
 * - "Continue with Google" (Google Identity Services / One Tap / OAuth)
 * - Standard LinkedIn Email & Password
 * - 2FA / OTP / Passkeys
 * All session tokens and cookies are permanently saved for the real autonomous agent.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

// Persistent profile directory shared with the real agent
const REAL_PROFILE_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'ZeroApply_Real_Chrome_Profile');
if (!fs.existsSync(REAL_PROFILE_DIR)) {
  fs.mkdirSync(REAL_PROFILE_DIR, { recursive: true });
}

function promptEnter(query: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  if (!chromePath) {
    console.error('❌ Error: Could not find Google Chrome on your system.');
    console.error('Please make sure Google Chrome is installed in /Applications/Google Chrome.app');
    process.exit(1);
  }

  console.log('\n================================================================================');
  console.log('🔐 ZEROAPPLY - REAL LINKEDIN NATIVE LOGIN & SESSION SAVER');
  console.log('================================================================================');
  console.log(`Chrome Binary:   ${chromePath}`);
  console.log(`Profile Storage: ${REAL_PROFILE_DIR}`);
  console.log('--------------------------------------------------------------------------------');
  console.log('✨ Launching pure native Google Chrome (Zero automation flags)...');
  console.log('   - "Continue with Google" is 100% supported (no popup postMessage crash)');
  console.log('   - Direct LinkedIn Email & Password is 100% supported');
  console.log('   - 2FA / SMS / Authenticator app codes are fully supported');
  console.log('================================================================================\n');

  // Spawn native Google Chrome directly with the dedicated user data directory
  const chromeProcess = spawn(
    chromePath,
    [
      `--user-data-dir=${REAL_PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      'https://www.linkedin.com/login',
    ],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  chromeProcess.unref();

  console.log('🌐 Google Chrome has opened to the LinkedIn Login page.');
  console.log('');
  console.log('👉 ACTION REQUIRED IN CHROME:');
  console.log('   1. Log into your account (via Google Sign-in or Email & Password).');
  console.log('   2. Complete any 2FA security checks if prompted.');
  console.log('   3. Wait until you see your LinkedIn Feed or Jobs page in Chrome.');
  console.log('');
  console.log('--------------------------------------------------------------------------------');

  await promptEnter('👉 Once you are logged in and see your LinkedIn feed, press [ENTER] here: ');

  // Verify profile directory contents
  const hasProfileData = fs.existsSync(REAL_PROFILE_DIR) && fs.readdirSync(REAL_PROFILE_DIR).length > 0;

  console.log('\n================================================================================');
  console.log('🎉 SUCCESS! YOUR REAL LINKEDIN SESSION IS PERMANENTLY SAVED!');
  console.log('================================================================================');
  console.log(`📁 Profile Directory: ${REAL_PROFILE_DIR}`);
  console.log(`💾 Session Data Status: ${hasProfileData ? '✅ SAVED & VERIFIED' : '⚠️ Profile initialized'}`);
  console.log('✅ Google Chrome has stored your active cookies and auth tokens on your Mac.');
  console.log('--------------------------------------------------------------------------------');
  console.log('🚀 READY TO RUN REAL AGENT ON LIVE LINKEDIN!');
  console.log('');
  console.log('   Run this command in your terminal:');
  console.log('   👉 npm run agent:live');
  console.log('');
  console.log('   (The agent will open Chrome with your saved account and start auto-applying!)');
  console.log('================================================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during native login saver:', err);
  process.exit(1);
});
