import assert from 'node:assert/strict';
import { createOptionMatchers } from '../src/agent/formFiller/optionMatching';
import { OPTION_MATCHERS_SCRIPT } from '../src/agent/formFiller/optionMatchingScript';
const injected = new Function('const __name = fn => fn; return '+OPTION_MATCHERS_SCRIPT)() as ReturnType<typeof createOptionMatchers>;
const local = createOptionMatchers();
for (const target of ['0','1','10','Yes','No','India (+91)','']) {
 for (const option of ['Select an option','0 year','1 year','10 years','0 month','1 month','Yes','No','India (+91)','1-10 years']) {
  assert.equal(injected.optionMatchScore(target,option),local.optionMatchScore(target,option));
 }
}
assert.equal(injected.optionMatchScore('1','10 years'),0);
assert.ok(injected.optionMatchScore('0','0 month')>0);
console.log('Injected option matcher parity and numeric boundaries passed.');
