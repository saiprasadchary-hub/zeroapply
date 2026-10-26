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
 const selectorsLiteral = source.match(/const UNIVERSAL_JOB_CARD_SELECTORS = (\[[\s\S]*?\])\.join/)?.[1];
 assert.ok(selectorsLiteral);
 const selectors = new Function(`return ${selectorsLiteral}.join(', ')`)() as string;
 const detectLiteral = source.match(/const detectCardsScript = (`[\s\S]*?`);/)?.[1];
 const clickLiteral = source.match(/const clickCardScript = (`[\s\S]*?`);/)?.[1];
 assert.ok(detectLiteral && clickLiteral);
 const detectScript = new Function('UNIVERSAL_JOB_CARD_SELECTORS', `return ${detectLiteral}`)(selectors) as string;
 const clickScript = new Function('UNIVERSAL_JOB_CARD_SELECTORS', 'cardIndex', `return ${clickLiteral}`)(selectors, 1) as string;
 await page.setContent('<div id="host"></div>');
 await page.evaluate(() => {
   const root = document.querySelector('#host')!.attachShadow({ mode: 'open' });
   root.innerHTML = '<div role="toolbar"><button aria-label="Filter by Easy Apply" id="filter">Easy Apply</button></div><div role="button" componentkey="job-card-component-ref-111"><h3>Previous role</h3><p>Company</p><p>Applied · Easy Apply</p></div><div role="button" componentkey="job-card-component-ref-222" id="card"><h3>New role</h3><p>Company</p><p>Easy Apply</p></div><button id="apply">Easy Apply</button>';
   document.body.dataset.cardClicks = '0'; document.body.dataset.applyClicks = '0'; document.body.dataset.filterClicks = '0';
   root.querySelector('#card')!.addEventListener('click', () => document.body.dataset.cardClicks = String(Number(document.body.dataset.cardClicks) + 1));
   root.querySelector('#apply')!.addEventListener('click', () => document.body.dataset.applyClicks = String(Number(document.body.dataset.applyClicks) + 1));
   root.querySelector('#filter')!.addEventListener('click', () => document.body.dataset.filterClicks = String(Number(document.body.dataset.filterClicks) + 1));
 });
 const cards = await page.evaluate<Array<{ title: string; isApplied: boolean; url: string }>>(detectScript);
 assert.equal(cards.length, 2);
 assert.equal(cards[0].isApplied, true);
 assert.equal(cards[1].isApplied, false);
 assert.equal(cards[1].title, 'New role');
 assert.equal(cards[1].url, 'https://www.linkedin.com/jobs/view/222/');
 assert.equal(await page.evaluate(clickScript), true);
 assert.equal(await page.evaluate(() => document.body.dataset.cardClicks), '1');
 assert.equal((await page.evaluate<{ status: string }>(script)).status, 'easy_apply_triggered');
 assert.equal(await page.evaluate(() => document.body.dataset.applyClicks), '1');
 assert.equal(await page.evaluate(() => document.body.dataset.filterClicks), '0');
 // Modern cards may omit role=button; anchor-only cards still retain identity.
 await page.setContent('<div componentkey="job-card-component-ref-333"><h3>Role without ARIA</h3><p>Applied</p></div><a href="https://www.linkedin.com/jobs/view/444/">Anchor role</a>');
 const variants = await page.evaluate<Array<{ title: string; url: string; isApplied: boolean }>>(detectScript);
 assert.equal(variants.length, 2);
 assert.equal(variants[0].isApplied, true);
 assert.equal(variants[1].url, 'https://www.linkedin.com/jobs/view/444/');
 console.log('Job discovery and Apply targeting passed for ordinary DOM and shadow DOM, including applied-job detection and filter exclusion.');
} finally { await browser.close(); }
