import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildSyntheticEventScript } from '../src/agent/formFiller/syntheticEventDispatcher';
import { matchSelectOption } from '../src/agent/formFiller/optionMatching';
import { isFieldAlreadySatisfied } from '../src/agent/formFiller/formAuditor';

assert.equal(matchSelectOption('No', ['Option auswählen', 'Ja', 'Nein']), 'Nein');
assert.equal(matchSelectOption('Yes', ['Option auswählen', 'Ja', 'Nein']), 'Ja');
assert.equal(matchSelectOption('Unknown', ['Option auswählen', 'Ja', 'Nein']), null);
assert.equal(matchSelectOption('1', ['Select an option', '10', '1']), '1');
assert.equal(matchSelectOption('0', ['Select an option', '0', '1']), '0');
assert.equal(isFieldAlreadySatisfied({ currentValue: 'Option auswählen' }, 'Yes'), false);
assert.equal(isFieldAlreadySatisfied({ currentValue: 'Nein' }, 'No'), true);
assert.equal(isFieldAlreadySatisfied({ currentValue: 'Ja', hasError: true }, 'Yes'), false);

class TestEvent { constructor(public type: string) {} }
async function select(answer: string, disableNegative = false): Promise<{ result: boolean; value: string; events: string[] }> {
  const events: string[] = [];
  const options = [
    { value: '', textContent: 'Option auswählen', disabled: false, selected: true },
    { value: 'y', textContent: 'Ja', disabled: false, selected: false },
    { value: 'n', textContent: 'Nein', disabled: disableNegative, selected: false },
  ];
  const field = {
    tagName: 'SELECT', value: '', selectedIndex: 0, options,
    dispatchEvent: (event: TestEvent): void => { events.push(event.type); },
    getAttribute: (): null => null,
    scrollIntoView: (): void => {}, focus: (): void => {},
  };
  const document = { querySelector: (selector: string): typeof field | null => selector === '#question' ? field : null };
  const context = vm.createContext({ document, window: { HTMLSelectElement: { prototype: {} } },
    PointerEvent: TestEvent, MouseEvent: TestEvent, Event: TestEvent, FocusEvent: TestEvent, setTimeout });
  const result = await vm.runInContext(buildSyntheticEventScript('#question', answer, 'select'), context) as boolean;
  return { result, value: field.value, events };
}
const negative = await select('No');
assert.equal(negative.result, true);
assert.equal(negative.value, 'n');
assert.ok(negative.events.includes('input') && negative.events.includes('change'));
assert.equal((await select('Yes')).value, 'y');
assert.equal((await select('Unknown')).result, false);
assert.equal((await select('No', true)).result, false);
console.log('Multilingual native selection, unknown/disabled answers, numeric options, events, and satisfaction regression checks passed.');
