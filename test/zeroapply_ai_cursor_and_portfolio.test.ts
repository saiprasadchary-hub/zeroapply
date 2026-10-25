import assert from 'node:assert/strict';
import {
  loadStoredSettings,
  saveStoredSettings,
  isCursorBadgeEnabled,
  DEFAULT_SETTINGS,
} from '../src/settings/settingsManager';
import {
  getVisualCursorScript,
  ensureVisualCursor,
  cursorGlideTo,
  cursorMoveAndClick,
  cursorMoveAndType,
  cursorSetBadgeVisible,
} from '../src/agent/stealth/agentCursor';
import { classifySingleField } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveQuestionCognitively } from '../src/agent/localLlm/ultraQuestionResolver';
import { questionMemory } from '../src/agent/memory/questionMemory';
import { QuestionMemoryBank } from '../src/agent/memory/questionMemoryBank';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/domScanner';

async function runTests() {
  console.log('=== ZEROAPPLY AI CURSOR BADGE & PORTFOLIO GUARD TESTS ===\n');

  // --- TEST 1: Settings Manager Toggle & Persistence ---
  console.log('--- TEST 1: Settings Manager cursorBadgeVisible Toggle ---');
  assert.equal(DEFAULT_SETTINGS.cursorBadgeVisible, true, 'Default cursorBadgeVisible must be true');

  saveStoredSettings({ ...loadStoredSettings(), cursorBadgeVisible: false });
  assert.equal(isCursorBadgeEnabled(), false, 'isCursorBadgeEnabled must return false when toggled off');

  saveStoredSettings({ ...loadStoredSettings(), cursorBadgeVisible: true });
  assert.equal(isCursorBadgeEnabled(), true, 'isCursorBadgeEnabled must return true when toggled on');
  console.log('✅ Settings correctly controls cursor badge visibility.');

  // --- TEST 2: Injected Script ZeroApply AI Normalization & Badge Toggle ---
  console.log('\n--- TEST 2: Injected Script ZeroApply AI & setBadgeVisible ---');
  const scriptBadgeOn = getVisualCursorScript('ai-companion-bot', true);
  assert.ok(scriptBadgeOn.includes('ZeroApply AI'), 'Injected script must normalize to ZeroApply AI');
  assert.ok(scriptBadgeOn.includes('setBadgeVisible:'), 'Script must expose setBadgeVisible API');
  assert.ok(scriptBadgeOn.includes('isBadgeVisible:'), 'Script must expose isBadgeVisible API');

  const executedInMockWebview: string[] = [];
  const mockWebview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      executedInMockWebview.push(code);
      if (code.includes('clickElement') || code.includes('typeElement') || code.includes('setBadgeVisible')) {
        return true as unknown as T;
      }
      return undefined as unknown as T;
    },
  };

  // Test cursorSetBadgeVisible
  await cursorSetBadgeVisible(mockWebview, false);
  assert.ok(
    executedInMockWebview.some((s) => s.includes('window.__zeroapplyCursor.setBadgeVisible(false)')),
    'cursorSetBadgeVisible should dispatch false to webview'
  );

  // Test label normalization in high-level cursor operations
  await cursorMoveAndClick(mockWebview, '#submit-btn', 'Codex AI: Click Submit');
  assert.ok(
    executedInMockWebview.some((s) => s.includes('ZeroApply AI: Click Submit') && !s.includes('Codex AI: Click Submit')),
    'cursorMoveAndClick must replace "Codex AI" with "ZeroApply AI"'
  );
  console.log('✅ Injected script and high-level controllers cleanly normalize to ZeroApply AI.');

  // --- TEST 3: Portfolio Classification Defaults to N/A ---
  console.log('\n--- TEST 3: Field Classifier Portfolio Handling ---');
  const personaWithoutPortfolio: PersonaData = {
    fullName: 'Jane Developer',
    email: 'jane@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    portfolio: '',
    workPreference: 'Remote',
  };

  const portfolioField: ScannedField = {
    id: 'portfolio-input',
    name: 'portfolio_url',
    label: 'Portfolio Website',
    type: 'text',
    tagName: 'input',
    selector: 'input[name="portfolio_url"]',
    allSelectors: ['input[name="portfolio_url"]'],
    isRequired: false,
    value: '',
    rect: { top: 100, left: 100, width: 200, height: 40 },
    computedStyle: { display: 'block', visibility: 'visible', opacity: '1' },
    isClickable: true,
    isAttachedToDom: true,
  };

  const classifiedNA = classifySingleField(portfolioField, personaWithoutPortfolio);
  assert.equal(classifiedNA.mappedValue, 'N/A', 'Must return "N/A" when candidate did not mention portfolio');
  assert.equal(classifiedNA.fieldType, 'portfolio_url');

  const personaWithPortfolio: PersonaData = {
    ...personaWithoutPortfolio,
    portfolio: 'https://janedev.io',
  };
  const classifiedWithPortfolio = classifySingleField(portfolioField, personaWithPortfolio);
  assert.equal(classifiedWithPortfolio.mappedValue, 'https://janedev.io', 'Must return candidate portfolio when provided');
  console.log('✅ Field Classifier correctly defaults to "N/A" when no portfolio is provided.');

  // --- TEST 4: Tier 2 Question Resolver Portfolio Resolution ---
  console.log('\n--- TEST 4: Tier 2 Question Resolver Portfolio Resolution ---');
  const qResolverResNA = await resolveQuestion(portfolioField, personaWithoutPortfolio);
  assert.equal(qResolverResNA.answer, 'N/A', 'Question Resolver must answer "N/A" without LLM hallucination');
  assert.equal(qResolverResNA.source, 'persona');

  questionMemory.clear();
  const qResolverResProvided = await resolveQuestion(portfolioField, personaWithPortfolio);
  assert.equal(qResolverResProvided.answer, 'https://janedev.io', 'Question Resolver must answer candidate portfolio when present');
  console.log('✅ Question Resolver correctly returns "N/A" for portfolio without hallucination.');

  // --- TEST 5: Ultra Question Resolver Portfolio Resolution ---
  console.log('\n--- TEST 5: Ultra Question Resolver Portfolio Resolution ---');
  questionMemory.clear();
  const ultraResNA = await resolveQuestionCognitively({ label: 'Personal Website URL' }, personaWithoutPortfolio);
  assert.equal(ultraResNA.answer, 'N/A', 'Ultra resolver must return "N/A" when candidate has no portfolio');

  questionMemory.clear();
  const ultraResProvided = await resolveQuestionCognitively({ label: 'Personal Website URL' }, personaWithPortfolio);
  assert.equal(ultraResProvided.answer, 'https://janedev.io', 'Ultra resolver must return provided portfolio');
  console.log('✅ Ultra Question Resolver correctly returns "N/A" for unprovided portfolios.');

  // --- TEST 6: Question Memory & Memory Bank Seeds ---
  console.log('\n--- TEST 6: Question Memory & Memory Bank Portfolio Defaults ---');
  questionMemory.clear();
  questionMemory.seedFromPersona(personaWithoutPortfolio);
  assert.equal(questionMemory.get('portfolio website url'), 'N/A', 'Memory must be seeded with N/A for portfolio');
  assert.equal(questionMemory.get('portfolio'), 'N/A', 'Memory must be seeded with N/A for portfolio');

  const qmb = new QuestionMemoryBank();
  qmb.seedFromPersona(personaWithoutPortfolio);
  assert.equal(qmb.get('portfolio website')?.answer, 'N/A', 'Memory bank must seed N/A for portfolio');
  console.log('✅ Question Memory and Memory Bank correctly record "N/A" for portfolios.');

  console.log('\n🎉 ALL ZEROAPPLY AI CURSOR & PORTFOLIO TESTS PASSED! 🎉\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
