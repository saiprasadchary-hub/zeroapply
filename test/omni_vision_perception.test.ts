import assert from 'node:assert/strict';
import {
  OmniVisionEngine,
  OMNI_PERCEPTION_SCAN_SCRIPT,
  type OmniPagePerception,
} from '../src/agent/vision';

console.log('=== TEST 1: Omni-Perception Scan Script Syntax ===');
assert.ok(OMNI_PERCEPTION_SCAN_SCRIPT.includes('getBoundingClientRect'));
assert.ok(OMNI_PERCEPTION_SCAN_SCRIPT.includes('interactiveElements'));
assert.ok(OMNI_PERCEPTION_SCAN_SCRIPT.includes('modalEl'));
assert.doesNotThrow(() => {
  new Function(OMNI_PERCEPTION_SCAN_SCRIPT);
});
console.log('✓ OMNI_PERCEPTION_SCAN_SCRIPT compiled with zero syntax errors');

console.log('=== TEST 2: Full Webpage Topology & Spatial Perception ===');
const mockWebview = {
  executeJavaScript: async (code: string) => {
    if (code.includes('zeroapply-perception-hud')) {
      return true;
    }
    // Return mock full-spectrum page perception
    return {
      url: 'https://linkedin.com/jobs/view/12345',
      title: 'Senior AI Engineer - TechCorp',
      layout: {
        hasHeader: true,
        hasSidebar: true,
        hasActiveModal: true,
        modalSelector: '#easy-apply-modal-overlay',
        hasFooter: false,
        wizardContainer: '#easy-apply-modal-overlay',
      },
      wizard: {
        stepIndex: 3,
        totalSteps: 5,
        stepTitle: 'Work Experience & Additional Questions',
        progressPercent: 60,
        isSubmissionStage: false,
        errorNotices: [],
      },
      interactiveElements: [
        {
          id: 'phone-input',
          tagName: 'input',
          selector: '#phone-input',
          role: 'input',
          text: 'Mobile Phone',
          rect: { x: 50, y: 120, width: 280, height: 38, top: 120, left: 50 },
          isVisible: true,
          isInModal: true,
          disabled: false,
        },
        {
          id: 'next-step-btn',
          tagName: 'button',
          selector: '#next-step-btn',
          role: 'button',
          text: 'Next',
          rect: { x: 400, y: 550, width: 120, height: 40, top: 550, left: 400 },
          isVisible: true,
          isInModal: true,
          disabled: false,
        },
        {
          id: 'resume-dropzone',
          tagName: 'div',
          selector: '#resume-dropzone',
          role: 'upload',
          text: 'Attach Resume (PDF)',
          rect: { x: 50, y: 200, width: 350, height: 90, top: 200, left: 50 },
          isVisible: true,
          isInModal: true,
          disabled: false,
        },
      ],
      summary: 'Page Perception: #easy-apply-modal-overlay | Step 3/5 | 3 interactive targets mapped.',
    };
  },
};

(async () => {
  const engine = OmniVisionEngine.getInstance();
  const perception = await engine.perceive(mockWebview as any);

  assert.equal(perception.layout.hasActiveModal, true);
  assert.equal(perception.layout.modalSelector, '#easy-apply-modal-overlay');
  assert.equal(perception.wizard.stepIndex, 3);
  assert.equal(perception.wizard.totalSteps, 5);
  assert.equal(perception.wizard.progressPercent, 60);
  assert.equal(perception.interactiveElements.length, 3);

  const uploadEl = perception.interactiveElements.find((e) => e.role === 'upload');
  assert.ok(uploadEl);
  assert.equal(uploadEl?.rect.width, 350);
  assert.equal(uploadEl?.isInModal, true);
  console.log('✓ Spatial element geometry and role mapping verified: ' + perception.interactiveElements.length + ' targets');

  console.log('=== TEST 3: Visual Perception HUD Rendering ===');
  const hudEnabled = await engine.renderPerceptionHUD(mockWebview as any, true);
  assert.equal(hudEnabled, true);
  const hudDisabled = await engine.renderPerceptionHUD(mockWebview as any, false);
  assert.equal(hudDisabled, true);
  console.log('✓ Perception HUD overlay toggled successfully in target context');

  console.log('\n🎉 ALL OMNI-VISION PERCEPTION TESTS PASSED (100%)!');
})();
