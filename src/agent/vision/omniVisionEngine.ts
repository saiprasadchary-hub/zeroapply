/**
 * ZeroApply Vision - Full-Spectrum OmniVision Perception Engine
 * Scans, maps, and understands the complete visual and semantic topology of any webpage:
 * layout zones, spatial element coordinates, multi-step wizard state, and job context.
 */

import type { WebviewTarget } from './domObserver';
import { extractJobContext, type ExtractedJobContext } from './jobContextExtractor';
import { liveTelemetry } from '../telemetry/liveTelemetry';

export interface SpatialRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface SpatialElement {
  id: string;
  tagName: string;
  selector: string;
  role: 'button' | 'input' | 'combobox' | 'radio' | 'checkbox' | 'upload' | 'tab' | 'alert' | 'link';
  text: string;
  ariaLabel?: string;
  rect: SpatialRect;
  isVisible: boolean;
  isInModal: boolean;
  disabled: boolean;
}

export interface LayoutZones {
  hasHeader: boolean;
  hasSidebar: boolean;
  hasActiveModal: boolean;
  modalSelector?: string;
  hasFooter: boolean;
  wizardContainer?: string;
}

export interface WizardFlowState {
  stepIndex: number;
  totalSteps: number;
  stepTitle: string;
  progressPercent: number;
  isSubmissionStage: boolean;
  errorNotices: string[];
}

export interface OmniPagePerception {
  url: string;
  title: string;
  layout: LayoutZones;
  wizard: WizardFlowState;
  job: ExtractedJobContext;
  interactiveElements: SpatialElement[];
  summary: string;
  timestamp: number;
}

export const OMNI_PERCEPTION_SCAN_SCRIPT = `
(() => {
  try {
    const url = window.location.href;
    const title = document.title;

    // 1. Layout Zones Perception
    const modalEl = document.querySelector(
      '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal, .application-modal'
    );
    const hasActiveModal = !!modalEl && (modalEl.offsetParent !== null || modalEl.classList.contains('active'));
    const modalSelector = hasActiveModal ? (modalEl.id ? '#' + modalEl.id : '.' + modalEl.className.trim().split(/\\s+/).join('.')) : undefined;

    const layout = {
      hasHeader: !!document.querySelector('header, nav, .global-nav, [role="banner"]'),
      hasSidebar: !!document.querySelector('aside, .sidebar, .left-rail, .right-rail'),
      hasActiveModal,
      modalSelector,
      hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
      wizardContainer: hasActiveModal ? modalSelector : (document.querySelector('main, form, article')?.tagName.toLowerCase() || 'body')
    };

    // 2. Wizard Flow & Progress Perception
    const searchScope = modalEl || document.body;
    let stepIndex = 1;
    let totalSteps = 1;
    let stepTitle = '';
    let progressPercent = 0;
    let isSubmissionStage = false;

    // Parse step counters: "2 of 5" or "Step 3/4"
    const stepTextMatch = searchScope.innerText.match(/(?:step|page)?\\s*(\\d+)\\s*(?:of|\\/)\\s*(\\d+)/i);
    if (stepTextMatch) {
      stepIndex = parseInt(stepTextMatch[1], 10);
      totalSteps = parseInt(stepTextMatch[2], 10);
      progressPercent = Math.round((stepIndex / totalSteps) * 100);
    }

    // Step heading title
    const headingEl = searchScope.querySelector('h1, h2, h3, .step-title, .modal-title, [class*="header-title"]');
    if (headingEl) {
      stepTitle = headingEl.textContent.trim();
    }

    // Check if on review / submit / success stage
    if (searchScope.querySelector('.success-view, #step-success.active, [class*="application-submitted"], [data-test-modal-close-btn]')) {
      isSubmissionStage = true;
    }

    // Active validation error notices
    const errorNotices = Array.from(searchScope.querySelectorAll(
      '.artdeco-inline-feedback--error, [role="alert"], .has-error, .input-error, .error-message'
    ))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 2);

    const wizard = {
      stepIndex,
      totalSteps,
      stepTitle,
      progressPercent,
      isSubmissionStage,
      errorNotices
    };

    // 3. Spatial Interactive Elements Mapping
    const rawInteractive = Array.from(searchScope.querySelectorAll(
      'button, a, input, select, textarea, [role="combobox"], [role="radio"], [role="checkbox"], .dropzone, [data-dropzone="true"]'
    ));

    const interactiveElements = [];
    for (const el of rawInteractive) {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      const disabled = !!el.disabled || el.getAttribute('aria-disabled') === 'true';

      let role = 'button';
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const elRole = el.getAttribute('role');

      if (elRole === 'combobox' || el.classList.contains('select2-selection')) role = 'combobox';
      else if (elRole === 'radio' || type === 'radio') role = 'radio';
      else if (elRole === 'checkbox' || type === 'checkbox') role = 'checkbox';
      else if (type === 'file' || el.classList.contains('dropzone') || el.hasAttribute('data-dropzone')) role = 'upload';
      else if (elRole === 'tab') role = 'tab';
      else if (tag === 'input' || tag === 'textarea' || tag === 'select') role = 'input';
      else if (tag === 'a') role = 'link';

      const text = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim();
      const ariaLabel = el.getAttribute('aria-label') || undefined;

      // Deterministic CSS selector
      let selector = '';
      if (el.id) selector = '#' + el.id;
      else if (el.name) selector = tag + '[name="' + el.name + '"]';
      else if (el.className && typeof el.className === 'string') {
        const firstClass = el.className.trim().split(/\\s+/)[0];
        if (firstClass) selector = tag + '.' + firstClass;
      }
      if (!selector) selector = tag;

      interactiveElements.push({
        id: el.id || '',
        tagName: tag,
        selector,
        role,
        text: text.slice(0, 80),
        ariaLabel,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        },
        isVisible,
        isInModal: hasActiveModal && !!modalEl.contains(el),
        disabled
      });
    }

    const summary = 'Page Perception: ' + layout.wizardContainer + ' | Step ' + stepIndex + '/' + totalSteps + ' (' + stepTitle + ') | ' + interactiveElements.length + ' interactive targets mapped.';

    return {
      url,
      title,
      layout,
      wizard,
      interactiveElements,
      summary,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      url: window.location.href,
      title: document.title,
      layout: { hasHeader: false, hasSidebar: false, hasActiveModal: false, hasFooter: false },
      wizard: { stepIndex: 1, totalSteps: 1, stepTitle: '', progressPercent: 0, isSubmissionStage: false, errorNotices: [] },
      interactiveElements: [],
      summary: 'Perception scan error: ' + String(err),
      timestamp: Date.now()
    };
  }
})()
`;

export class OmniVisionEngine {
  private static instance: OmniVisionEngine | null = null;

  public static getInstance(): OmniVisionEngine {
    if (!OmniVisionEngine.instance) {
      OmniVisionEngine.instance = new OmniVisionEngine();
    }
    return OmniVisionEngine.instance;
  }

  /**
   * Executes a full-spectrum visual and semantic scan across the active webview.
   */
  public async perceive(webview: WebviewTarget): Promise<OmniPagePerception> {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      throw new Error('Webview target is unavailable for vision perception');
    }

    // 1. Scan layout, elements, and wizard flow
    const raw = await webview.executeJavaScript<Partial<OmniPagePerception>>(
      OMNI_PERCEPTION_SCAN_SCRIPT
    );

    // 2. Extract deep job description context
    const job = await extractJobContext(webview);

    const perception: OmniPagePerception = {
      url: raw?.url || '',
      title: raw?.title || '',
      layout: raw?.layout || {
        hasHeader: false,
        hasSidebar: false,
        hasActiveModal: false,
        hasFooter: false,
      },
      wizard: raw?.wizard || {
        stepIndex: 1,
        totalSteps: 1,
        stepTitle: '',
        progressPercent: 0,
        isSubmissionStage: false,
        errorNotices: [],
      },
      job,
      interactiveElements: (raw?.interactiveElements as SpatialElement[]) || [],
      summary: raw?.summary || 'Perception scan complete',
      timestamp: Date.now(),
    };

    liveTelemetry.emit({
      type: 'think',
      title: `OmniVision: Mapped ${perception.interactiveElements.length} targets on "${perception.job.jobTitle || perception.title}"`,
      target: perception.job.jobTitle || 'Webpage',
      status: 'completed',
    });

    return perception;
  }

  /**
   * Toggles in-browser visual perception HUD (renders high-tech purple focus halos around targets).
   */
  public async renderPerceptionHUD(webview: WebviewTarget, enabled: boolean): Promise<boolean> {
    const script = `
      (() => {
        let hud = document.getElementById('zeroapply-perception-hud');
        if (!${enabled}) {
          if (hud) hud.remove();
          return false;
        }

        if (!hud) {
          hud = document.createElement('div');
          hud.id = 'zeroapply-perception-hud';
          hud.style.position = 'fixed';
          hud.style.top = '0';
          hud.style.left = '0';
          hud.style.width = '100vw';
          hud.style.height = '100vh';
          hud.style.pointerEvents = 'none';
          hud.style.zIndex = '999998';
          document.body.appendChild(hud);
        }

        hud.innerHTML = '';
        const targets = Array.from(document.querySelectorAll('input, select, textarea, button, [role="combobox"], [role="radio"], .dropzone'));
        for (const t of targets) {
          const r = t.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const box = document.createElement('div');
          box.style.position = 'absolute';
          box.style.left = r.left + 'px';
          box.style.top = r.top + 'px';
          box.style.width = r.width + 'px';
          box.style.height = r.height + 'px';
          box.style.border = '1.5px dashed rgba(168, 85, 247, 0.6)';
          box.style.borderRadius = '4px';
          box.style.boxShadow = '0 0 6px rgba(168, 85, 247, 0.3)';
          hud.appendChild(box);
        }
        return true;
      })()
    `;
    return webview.executeJavaScript<boolean>(script).catch(() => false);
  }
}

export const omniVision = OmniVisionEngine.getInstance();
