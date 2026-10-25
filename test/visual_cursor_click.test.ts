import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';
import { buildSyntheticEventScript } from '../src/agent/formFiller/syntheticEventDispatcher';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
try {
  await page.setContent(`<style>body {margin:0} button {width:120px;height:40px;position:absolute}</style>
    <button id="edge" style="left:0;top:0">Edge</button>
    <button id="moving" style="left:300px;top:200px">Moving</button>
    <button id="removed" style="left:500px;top:300px">Removed</button>
    <button id="disabled" disabled>Disabled</button>
    <div id="host"></div><div style="height:1800px"></div>
    <button id="below" style="top:1600px;left:100px">Below</button>`);
  await page.evaluate(() => {
    const root = document.querySelector('#host')!.attachShadow({ mode: 'open' });
    root.innerHTML = '<button id="shadow" style="position:absolute;left:400px;top:100px;width:120px;height:40px">Shadow</button>';
  });
  await page.evaluate(getVisualCursorScript());
  // Observe the actual DOM activation, including coordinates and the visible ripple at that instant.
  await page.evaluate(`window.clicks = []; document.addEventListener('click', e => {
    const target = e.composedPath()[0];
    if (target.tagName !== 'BUTTON') return;
    const rect = target.getBoundingClientRect();
    const ripple = document.querySelector('.za-click-ripple:not(.za-click-ripple-pulse)');
    window.clicks.push({ id: target.id, x: e.clientX, y: e.clientY,
      expectedX: (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2,
      expectedY: (Math.max(0, rect.top) + Math.min(innerHeight, rect.bottom)) / 2,
      rippleX: ripple ? parseFloat(ripple.style.left) : null,
      rippleY: ripple ? parseFloat(ripple.style.top) : null });
  }, true);`);
  const click = async (selector: string): Promise<boolean> => page.evaluate(`window.__zeroapplyCursor.clickElement(${JSON.stringify(selector)}, 'Test click')`);
  assert.equal(await click('#edge'), true);
  await page.waitForTimeout(650);
  await page.evaluate(`setTimeout(() => document.querySelector('#moving').style.left = '650px', 100)`);
  assert.equal(await click('#moving'), true);
  await page.waitForTimeout(650);
  assert.equal(await click('#shadow'), true);
  await page.waitForTimeout(650);
  assert.equal(await click('#below'), true);
  assert.equal(await click('#disabled'), false);
  assert.equal(await click('#missing'), false);
  await page.evaluate(`setTimeout(() => document.querySelector('#removed').remove(), 100)`);
  assert.equal(await click('#removed'), false);
  const clicks = await page.evaluate<Array<{ id: string; x: number; y: number; expectedX: number; expectedY: number; rippleX: number; rippleY: number }>>('window.clicks');
  assert.deepEqual(clicks.map(item => item.id), ['edge', 'moving', 'shadow', 'below']);
  for (const item of clicks) {
    assert.ok(Math.abs(item.x - item.expectedX) <= 1, JSON.stringify(item));
    assert.ok(Math.abs(item.y - item.expectedY) <= 1, JSON.stringify(item));
    assert.ok(Math.abs(item.rippleX - item.expectedX) <= 1, JSON.stringify(item));
    assert.ok(Math.abs(item.rippleY - item.expectedY) <= 1, JSON.stringify(item));
  }
  assert.deepEqual(await Promise.all([click('#edge'), click('#moving')]), [true, true]);
  assert.deepEqual(await page.evaluate('window.clicks.slice(-2).map(item => item.id)'), ['edge', 'moving']);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<button id="choice" role="combobox" style="top:200px;left:100px">Choose</button><div role="listbox"><button id="option" role="option" style="top:250px;left:100px">Yes</button></div>');
  });
  assert.equal(await page.evaluate(buildSyntheticEventScript('#choice', 'Yes', 'combobox')), true);
  assert.deepEqual(await page.evaluate('window.clicks.slice(-2).map(item => item.id)'), ['choice', 'option']);
  console.log('Cursor browser checks passed: exact click/ripple positions, moving targets, scrolling, shadow DOM, single activation, disabled/missing/detached targets, and queued clicks.');
} finally { await browser.close(); }
