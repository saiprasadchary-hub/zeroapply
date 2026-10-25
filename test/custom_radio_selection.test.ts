import assert from 'node:assert/strict';
import vm from 'node:vm';
import { SYNTHETIC_INJECTION_SCRIPT, executeSyntheticInteraction } from '../src/agent/domScanner/syntheticInteraction';

let clicks = 0;
function makeRadio(label: string) {
  let selected = false;
  return {
    id: '', textContent: '',
    getAttribute: (name: string) => name === 'aria-label' || name === 'data-value' ? label : name === 'aria-checked' ? String(selected) : null,
    closest: () => null,
    matches: (selector: string) => selector !== 'input[type="radio"]',
    click: () => { clicks++; selected = true; },
  };
}
const female = makeRadio('Female');
const male = makeRadio('Male');
const group = { matches: () => false, querySelectorAll: () => [female, male] };
const context = vm.createContext({ setTimeout, window: {}, document: { querySelectorAll: () => [group], querySelector: () => null }, CSS: { escape: (value: string) => value } });
vm.runInContext(SYNTHETIC_INJECTION_SCRIPT, context);
const select = async (answer: string): Promise<{ success: boolean }> => vm.runInContext(`window.__zeroapplySynthetic.selectRadio('#gender', ${JSON.stringify(answer)})`, context);
assert.equal((await select('Male')).success, true);
assert.equal(male.getAttribute('aria-checked'), 'true');
assert.equal(female.getAttribute('aria-checked'), 'false');
assert.equal((await select('Decline to self-identify')).success, false);
assert.equal((await select('')).success, false);
assert.equal(clicks, 1);
console.log('Custom radio selection checks passed');

const bridge = {
  executeJavaScript: async (script: string): Promise<unknown> => structuredClone(await vm.runInContext(script, context)),
};
assert.equal((await executeSyntheticInteraction(bridge, 'radiogroup', '#gender', 'Male')).success, true);
