import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';
import { FORM_AUDITOR_SCRIPT } from '../src/agent/formFiller/formAuditor';
import { stepNavigator } from '../src/agent/navigation/wizardStepNavigator';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 await page.setContent('<input required aria-label="Background search"><dialog style="width:700px;height:450px"><h2>Apply to DVK Analytics</h2><p>3/5 pages</p><h3>Mark this job as a top choice (Optional)</h3><input type="checkbox" id="choice"><label for="choice">Mark job as a top choice</label><button id="next" style="position:absolute;bottom:30px;right:30px">Next</button></dialog>');
 await page.evaluate(getVisualCursorScript());
 await page.evaluate(()=>{document.querySelector('dialog')!.showModal();document.querySelector('#next')!.addEventListener('click',()=>{document.querySelector('h3')!.textContent='Work experience';document.querySelector('p')!.textContent='4/5 pages';});});
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate("document.querySelector('#zeroapply-codex-cursor-root').matches(':popover-open')"),true);
 const audit=await page.evaluate<{ready:boolean}>(FORM_AUDITOR_SCRIPT);
 assert.equal(audit.ready,true);
 const view={executeJavaScript:<T>(code:string):Promise<T>=>page.evaluate(code)};
 assert.equal((await stepNavigator.advance(view)).success,true);
 assert.equal(await page.evaluate("getComputedStyle(document.querySelector('#zeroapply-codex-cursor-root')).backgroundColor"),'rgba(0, 0, 0, 0)');
 assert.equal(await page.locator('#choice').isChecked(),false);
 assert.equal(await page.locator('h3').innerText(),'Work experience');
 await page.screenshot({path:'output/live-check/top-choice-cursor-test.png'});
 console.log('Native popup: optional choice skipped, Next advanced, cursor popover remains above dialog.');
} finally {await browser.close();}
