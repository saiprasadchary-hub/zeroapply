/**
 * Test Suite: LinkedIn Top Choice & Premium Upsell Bypass
 * Verifies that ZeroApply strictly avoids paid actions, unchecks top choice options,
 * resolves screening questions to 'No', and selects Skip/No thanks buttons during wizard navigation.
 */

import { describe, it, expect } from 'vitest';
import { classifySingleField, classifyFields, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { buildSyntheticEventScript } from '../src/agent/formFiller/syntheticEventDispatcher';
import { DETECT_FORWARD_BUTTON_SCRIPT } from '../src/agent/navigation/wizardStepNavigator';
import type { PersonaData } from '../src/types';

const mockPersona: PersonaData = {
  fullName: 'Sai Prasad Chary Kammari',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['React', 'TypeScript', 'Node.js', 'Python'],
  targetRoles: ['Full Stack Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Full Stack Engineer with 4 years experience.',
};

describe('LinkedIn Top Choice & Premium Upsell Bypass', () => {
  it('TEST 1: Field Classifier maps all LinkedIn Top Choice checkboxes to "No"', () => {
    const topChoiceFields: ScannedField[] = [
      {
        id: 'top-choice-checkbox',
        selector: '#top-choice-checkbox',
        tagName: 'input',
        inputType: 'checkbox',
        label: 'Mark this job as a top choice',
        placeholder: '',
        name: 'topChoice',
        currentValue: '',
        required: false,
      },
      {
        id: 'premium-badge-checkbox',
        selector: '#premium-badge-checkbox',
        tagName: 'input',
        inputType: 'checkbox',
        label: 'Stand out as a top applicant with LinkedIn Premium',
        placeholder: '',
        name: 'premiumUpsell',
        currentValue: '',
        required: false,
      },
      {
        id: 'try-premium-toggle',
        selector: '#try-premium-toggle',
        tagName: 'input',
        inputType: 'checkbox',
        label: 'Try Premium to mark as a top choice',
        placeholder: '',
        name: 'tryPremium',
        currentValue: '',
        required: false,
      },
    ];

    for (const f of topChoiceFields) {
      const classified = classifySingleField(f, mockPersona);
      expect(classified.mappedValue).toBe('No');
      expect(classified.standardKey).toBe('top_choice_upsell');
    }

    const batchClassified = classifyFields(topChoiceFields, mockPersona);
    for (const bf of batchClassified) {
      expect(bf.mappedValue).toBe('No');
    }
  });

  it('TEST 2: Question Resolver deterministically answers "No" to all Top Choice queries', async () => {
    const topChoiceQuestions = [
      { label: 'Would you like to mark this job as a top choice?' },
      { label: 'Mark as a top choice to stand out to the hiring team' },
      { label: 'Try Premium for $0 to unlock top choice badges' },
      { label: 'Stand out as a top applicant' },
    ];

    for (const q of topChoiceQuestions) {
      const res = await resolveQuestion({ label: q.label, inputType: 'radio', options: ['Yes', 'No'] }, mockPersona);
      expect(res.answer).toBe('No');
      expect(['persona', 'memory']).toContain(res.source);
    }
  });

  it('TEST 3: Synthetic Event Dispatcher generates script unchecking when value is "No"', () => {
    const scriptNo = buildSyntheticEventScript('#my-checkbox', 'No', 'checkbox');
    expect(scriptNo).toContain('shouldBeChecked = !/^(no|false|0|off|skip|uncheck|unchecked)$/i.test(targetVal)');
  });

  it('TEST 4: Wizard Step Navigator targets "No thanks" / "Skip" and strictly ignores paid action', () => {
    const paidBtnMock = {
      tagName: 'BUTTON',
      textContent: 'Mark as top choice',
      getAttribute: (attr: string) => attr === 'aria-label' ? 'Mark as top choice' : null,
      setAttribute: () => {},
      removeAttribute: () => {},
      disabled: false,
      style: { display: 'block' },
      offsetParent: {},
    };

    const skipBtnMock = {
      tagName: 'BUTTON',
      textContent: 'No thanks',
      getAttribute: (attr: string) => attr === 'aria-label' ? 'No thanks' : null,
      setAttribute: (k: string, v: string) => { (skipBtnMock as any)[k] = v; },
      removeAttribute: (k: string) => { delete (skipBtnMock as any)[k]; },
      disabled: false,
      style: { display: 'block' },
      offsetParent: {},
    };

    const mockDoc = {
      body: {
        innerText: 'Mark this job as a top choice. Tell the recruiter why you are interested. Try Premium for $0.',
      },
      querySelector: (sel: string) => {
        if (sel.includes('modal') || sel.includes('dialog')) {
          return {
            innerText: 'Mark this job as a top choice. Stand out as a top applicant.',
            contains: () => true,
          };
        }
        if (sel.includes('data-za-action-target')) {
          return skipBtnMock;
        }
        return null;
      },
      querySelectorAll: (sel: string) => {
        if (sel.includes('button') || sel.includes('submit')) {
          return [paidBtnMock, skipBtnMock];
        }
        if (sel.includes('data-za-action-target')) {
          return [];
        }
        return [];
      },
    };

    const mockWindow = {
      getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    };

    const runSim = new Function('document', 'window', `return (${DETECT_FORWARD_BUTTON_SCRIPT});`);
    const detected = runSim(mockDoc, mockWindow);

    expect(detected.exists).toBe(true);
    expect(/no thanks|skip/i.test(detected.text)).toBe(true);
    expect(/mark.*top.*choice/i.test(detected.text)).toBe(false);
  });
});
