import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const source = fs.readFileSync('src/agent/autoApply/autoApplyEngine.ts', 'utf8');
const literal = source.match(/const openModalScript = (`[\s\S]*?`);/)?.[1];
assert.ok(literal);
const script: string = new Function(`return ${literal}`)() as string;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
 const page = await browser.newPage();
 await page.setContent('<div role="button" aria-label="Filter by Easy Apply" id="filter">Easy Apply</div><button aria-label="Easy Apply to this job" id="apply">Easy Apply</button>');
 await page.evaluate(() => {
  document.body.dataset.filterClicks = '0'; document.body.dataset.applyClicks = '0';
  document.querySelector('#filter')!.addEventListener('click', () => document.body.dataset.filterClicks = String(Number(document.body.dataset.filterClicks) + 1));
  document.querySelector('#apply')!.addEventListener('click', () => document.body.dataset.applyClicks = String(Number(document.body.dataset.applyClicks) + 1));
 });
 assert.equal((await page.evaluate<{status:string}>(script)).status, 'easy_apply_triggered');
 assert.equal(await page.evaluate(() => document.body.dataset.filterClicks), '0');
 assert.equal(await page.evaluate(() => document.body.dataset.applyClicks), '1');
 console.log('Real batch opening script clicks the job button once and never the Easy Apply filter.');
} finally { await browser.close(); }
