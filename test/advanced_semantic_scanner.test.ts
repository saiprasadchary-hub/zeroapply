/**
 * Automated Verification Suite: Advanced Semantic Modern Web Component Scanner
 * Tests scanning of standard form controls, custom comboboxes (Radix/React-Select),
 * custom radio cards, file dropzones, and hierarchical context extraction.
 */

import assert from 'node:assert/strict';
import vm from 'node:vm';
import { INJECTED_SCANNER_SCRIPT } from '../src/agent/domScanner/injectedScanner';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

function evaluateScanner(documentMock: any): ScannedField[] {
  const sandbox = {
    window: {
      scrollX: 0,
      scrollY: 0,
    },
    document: documentMock,
    Node: { ELEMENT_NODE: 1 },
    Array,
    Set,
    Math,
    console,
  };
  return vm.runInNewContext(INJECTED_SCANNER_SCRIPT, sandbox);
}

function createMockDocument(childEl: any) {

  return {
    nodeType: 9,
    body: {
      nodeType: 1,
      firstElementChild: childEl,
      nextElementSibling: null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ x: 0, y: 0, width: 1280, height: 800 }),
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  };
}

async function runScannerTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING ADVANCED SEMANTIC SCANNER (MODERN WEB COMPONENTS)');
  console.log('======================================================================\n');

  // Test 1: Modern Custom Combobox (Radix / React-Select)
  console.log('Test 1: Custom Combobox perception...');
  const mockComboboxEl = {
    nodeType: 1,
    tagName: 'DIV',
    id: 'country-combobox',
    className: 'react-select__control',
    getAttribute: (attr: string) => {
      if (attr === 'role') return 'combobox';
      if (attr === 'aria-label') return 'Select your Country';
      if (attr === 'aria-required') return 'true';
      return null;
    },
    getBoundingClientRect: () => ({ x: 100, y: 150, width: 280, height: 40 }),
    textContent: 'United States',
    closest: () => null,
    firstElementChild: null,
    nextElementSibling: null,
  };

  const doc1 = createMockDocument(mockComboboxEl);


  const fields1 = evaluateScanner(doc1);
  console.log('  Scanned fields:', fields1);
  assert.equal(fields1.length, 1);
  assert.equal(fields1[0].inputType, 'combobox');
  assert.equal(fields1[0].label, 'Select your Country');
  assert.equal(fields1[0].required, true);
  assert.equal(fields1[0].rect?.x, 100);
  assert.equal(fields1[0].rect?.y, 150);
  assert.equal(fields1[0].rect?.width, 280);
  assert.equal(fields1[0].rect?.height, 40);
  console.log('  ✓ Custom combobox correctly recognized.\n');


  // Test 2: Custom Radio Group & Cards
  console.log('Test 2: Custom Radio Group & Cards perception...');
  const mockRadioItem1 = {
    nodeType: 1,
    tagName: 'DIV',
    className: 'radio-card',
    getAttribute: (attr: string) => {
      if (attr === 'role') return 'radio';
      if (attr === 'aria-checked') return 'false';
      if (attr === 'data-value') return 'Yes';
      return null;
    },
    textContent: 'Yes, I am authorized',
  };
  const mockRadioItem2 = {
    nodeType: 1,
    tagName: 'DIV',
    className: 'radio-card',
    getAttribute: (attr: string) => {
      if (attr === 'role') return 'radio';
      if (attr === 'aria-checked') return 'true';
      if (attr === 'data-value') return 'No';
      return null;
    },
    textContent: 'No, I need visa sponsorship',
  };

  const mockRadioGroup = {
    nodeType: 1,
    tagName: 'DIV',
    id: 'work-auth-group',
    getAttribute: (attr: string) => {
      if (attr === 'role') return 'radiogroup';
      if (attr === 'aria-label') return 'Are you legally authorized to work?';
      return null;
    },
    getBoundingClientRect: () => ({ x: 50, y: 200, width: 300, height: 80 }),
    querySelectorAll: (sel: string) => {
      if (sel.includes('[role="radio"]')) return [mockRadioItem1, mockRadioItem2];
      return [];
    },
    closest: () => null,
    firstElementChild: null,
    nextElementSibling: null,
  };

  const doc2 = createMockDocument(mockRadioGroup);

  const fields2 = evaluateScanner(doc2);
  console.log('  Scanned fields:', fields2);
  assert.equal(fields2.length, 1);
  assert.equal(fields2[0].inputType, 'radio');
  assert.equal(fields2[0].label, 'Are you legally authorized to work?');
  assert.equal(fields2[0].isCustomComponent, true);
  assert.equal(fields2[0].options?.length, 2);
  assert.equal(fields2[0].currentValue, 'No, I need visa sponsorship');
  console.log('  ✓ Custom radio cards correctly recognized.\n');

  // Test 3: Resume Dropzone Component
  console.log('Test 3: Resume Dropzone Component perception...');
  const mockDropzone = {
    nodeType: 1,
    tagName: 'DIV',
    id: 'resume-dropzone',
    className: 'dropzone custom-file-upload',
    getAttribute: (attr: string) => {
      if (attr === 'data-dropzone') return 'true';
      if (attr === 'aria-label') return 'Upload your Resume or CV (PDF/DOCX)';
      return null;
    },
    getBoundingClientRect: () => ({ x: 80, y: 320, width: 400, height: 120 }),
    closest: () => null,
    firstElementChild: null,
    nextElementSibling: null,
  };

  const doc3 = createMockDocument(mockDropzone);

  const fields3 = evaluateScanner(doc3);
  console.log('  Scanned fields:', fields3);
  assert.equal(fields3.length, 1);
  assert.equal(fields3[0].inputType, 'file');
  assert.equal(fields3[0].label, 'Upload your Resume or CV (PDF/DOCX)');
  assert.equal(fields3[0].isCustomComponent, true);
  console.log('  ✓ Resume dropzone component correctly recognized.\n');

  // Test 4: Fieldset Legend Hierarchical Context
  console.log('Test 4: Fieldset Legend Hierarchical Context...');
  const mockLegend = {
    textContent: 'What is your highest completed level of education? *',
  };
  const mockFieldset = {
    querySelector: (sel: string) => (sel.includes('legend') ? mockLegend : null),
  };
  const mockInput = {
    nodeType: 1,
    tagName: 'INPUT',
    id: 'edu-input',
    getAttribute: (attr: string) => {
      if (attr === 'type') return 'text';
      if (attr === 'name') return 'educationLevel';
      return null;
    },
    getBoundingClientRect: () => ({ x: 20, y: 40, width: 250, height: 35 }),
    closest: (sel: string) => (sel === 'fieldset' ? mockFieldset : null),
    firstElementChild: null,
    nextElementSibling: null,
    value: '',
  };

  const doc4 = createMockDocument(mockInput);


  const fields4 = evaluateScanner(doc4);
  console.log('  Scanned fields:', fields4);
  assert.equal(fields4.length, 1);
  assert.equal(fields4[0].contextHint, 'What is your highest completed level of education? *');
  assert.equal(fields4[0].label, 'What is your highest completed level of education? *');
  assert.equal(fields4[0].required, true);
  console.log('  ✓ Hierarchical fieldset legend successfully bound.\n');

  console.log('🎉 ALL ADVANCED SEMANTIC SCANNER TESTS PASSED SUCCESSFULLY!');
}

runScannerTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
