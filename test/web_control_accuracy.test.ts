import assert from 'node:assert/strict';
import { classifyAllFields } from '../src/agent/detector/fieldClassifier';
import { DOM_SCANNER_SCRIPT, type ScannedField } from '../src/agent/detector/fieldScanner';
import {
  generateHumanBypassScript,
  normalizeChoiceText,
  resolveBestChoice,
  scoreOptionMatch,
} from '../src/agent/autofill/humanSimulator';

assert.equal(normalizeChoiceText('  On-site / In Office  '), 'on site in office');
assert.equal(scoreOptionMatch('No', 'false', 'No'), 100);
assert.equal(scoreOptionMatch('Not applicable', 'na', 'No'), -1);
assert.equal(scoreOptionMatch('India (+91)', 'IN', '+91'), 100);
assert.ok(scoreOptionMatch('Work from home', 'remote', 'Remote') >= 90);

assert.deepEqual(resolveBestChoice([
  { text: 'Select an option', value: '' },
  { text: 'Yes', value: 'yes' },
  { text: 'No', value: 'no' },
], 'No'), { index: 2, score: 100, margin: 101, ambiguous: false });

assert.equal(resolveBestChoice([
  { text: 'Remote - India' },
  { text: 'Remote - United States' },
], 'Remote'), null, 'ambiguous choices must pause instead of guessing');

assert.equal(resolveBestChoice([
  { text: 'India', disabled: true },
  { text: 'Indonesia' },
], 'India'), null, 'disabled exact options must never be selected');

const checkboxes: ScannedField[] = [
  {
    id: 'attest', elementSelector: '#attest', type: 'checkbox',
    label: 'I verify that the information provided is accurate', name: 'attest', placeholder: '', required: true,
  },
  {
    id: 'community', elementSelector: '#community', type: 'checkbox',
    label: 'I have joined the WhatsApp community group', name: 'community', placeholder: '', required: true,
  },
  {
    id: 'follow', elementSelector: '#follow', type: 'checkbox',
    label: 'Follow company for updates (optional)', name: 'follow', placeholder: '', required: false,
  },
];
assert.deepEqual(classifyAllFields(checkboxes).map((field) => field.category), [
  'manualConfirmation',
  'manualConfirmation',
  'ignore',
]);

assert.match(DOM_SCANNER_SCRIPT, /\[role="radio"\]/);
assert.match(DOM_SCANNER_SCRIPT, /\[role="checkbox"\]/);
assert.match(DOM_SCANNER_SCRIPT, /aria-controls/);
assert.match(DOM_SCANNER_SCRIPT, /aria-checked/);
assert.doesNotThrow(() => new Function(DOM_SCANNER_SCRIPT));

const fillScript = generateHumanBypassScript(JSON.stringify([
  { selector: '#country', type: 'select', value: 'India', category: 'country', field: { label: 'Country' } },
]));
assert.match(fillScript, /dispatchSingleClick/);
assert.match(fillScript, /no confident dropdown match/);
assert.match(fillScript, /custom dropdown selection was not verified/);
assert.doesNotMatch(fillScript, /simulateMouse\(/);
assert.doesNotThrow(() => new Function(fillScript));

console.log('Web control accuracy tests passed (20/20).');
