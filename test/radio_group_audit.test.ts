import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { auditFormFields } from '../src/agent/formFiller/formAuditor';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const view = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) } as WebviewTarget;
  await page.setContent(`<dialog open><section class="jobs-easy-apply-form-section">
    <input type="radio" name="OtherQuestion" checked aria-label="Other question">
    <input id="consent" type="radio" name="PrivacyChoice" required aria-label="Privacy consent">
    <label for="consent">Yes</label><input type="radio" name="PrivacyChoice"><button>Review</button>
  </section></dialog>`);
  await page.locator('#consent').focus();
  assert.equal((await auditFormFields(view)).ready, false, 'Focus and a neighboring answer do not satisfy consent');
  await page.locator('#consent').check();
  assert.equal((await auditFormFields(view)).ready, true, 'An actual selection satisfies the group');
  await page.setContent(`<dialog open><div role="radiogroup" aria-label="Privacy consent" aria-required="true">
    <button role="radio" aria-checked="false">Yes</button><button role="radio" aria-checked="false">No</button>
  </div></dialog>`);
  await page.getByRole('radio', { name: 'Yes' }).focus();
  assert.equal((await auditFormFields(view)).ready, false, 'Custom radio focus is not selection');
  await page.getByRole('radio', { name: 'Yes' }).evaluate(el => el.setAttribute('aria-checked', 'true'));
  assert.equal((await auditFormFields(view)).ready, true);
  await page.setContent(`<dialog open><h2>Apply to Turing</h2><div>
    <p>By clicking &quot;Yes&quot; you agree to our Privacy Policy and data processing. Providing accurate information is essential, as any dishonesty may lead to rejection of an application or termination*</p>
    <div><input id="privacyYes" type="radio" name="consentChoice"><label for="privacyYes">Yes</label></div>
    <div><input id="privacyNo" type="radio" name="consentChoice"><label for="privacyNo">No</label></div>
    <p>This field is required</p></div><button>Review</button></dialog>`);
  const consentAudit = await auditFormFields(view);
  assert.equal(consentAudit.ready, false, 'Starred question in plain div must block navigation without HTML required');
  assert.ok(consentAudit.missingRequired.some(label => label.includes('Privacy Policy')), JSON.stringify(consentAudit));
  console.log('Radio audit passed: native/custom selection, focus-only and neighboring-group isolation.');
} finally { await browser.close(); }
