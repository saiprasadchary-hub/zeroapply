/**
 * ZeroApply DOM Scanner - Ultimate Injected Scanner Engine
 * World-class zero-dependency DOM perception IIFE that traverses live webview DOMs
 * to extract all interactive form controls (standard HTML, shadow DOM roots, accessible iframes,
 * and modern headless web components) with multi-fallback CSS selectors, 9-tier label intelligence,
 * error state diagnostics, and pixel-precise cursor coordinates.
 */

import type { ScannedField } from './fieldClassifier';

export interface WebviewTarget {
  executeJavaScript: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
}

export const INJECTED_SCANNER_SCRIPT = `
(() => {
  try {
    // input:not([type="hidden"])
    const fields = [];
    const processedElements = new Set();
    const processedRadioGroups = new Set();
    let zaFieldCounter = 0;

    // Defensive attribute and class helpers
    function getAttr(el, name) {
      if (!el || typeof el.getAttribute !== 'function') return null;
      return el.getAttribute(name);
    }

    function hasClass(el, name) {
      if (!el || !el.classList || typeof el.classList.contains !== 'function') return false;
      return el.classList.contains(name);
    }

    // Helper: Find active modal / form container to scope search
    function getActiveScope() {
      // 1. Direct priority check: Active LinkedIn Easy Apply modal / testbed overlay
      const primaryEasyApply = document.querySelector(
        '.jobs-easy-apply-modal, #easy-apply-modal-overlay.active, [data-easy-apply-modal], [data-qa="application-modal"]'
      );
      if (primaryEasyApply && typeof primaryEasyApply.getBoundingClientRect === 'function') {
        const r = primaryEasyApply.getBoundingClientRect();
        if (r.width > 80 && r.height > 80) {
          const activeStep = primaryEasyApply.querySelector('.modal-step.active, .step-container.active, [data-step-container].active');
          return activeStep || primaryEasyApply;
        }
      }

      // 2. Visible modal dialogs, strictly ignoring messaging overlays and chat docks
      const modalCandidates = Array.from(document.querySelectorAll(
        '#artdeco-modal-outlet .artdeco-modal, .artdeco-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .modal-dialog'
      )).filter(m => {
        if (!m) return false;
        if (typeof m.closest === 'function' && m.closest('.msg-overlay-container, #msg-overlay, #messaging-widget, .msg-overlay-bubble-header')) return false;
        if (m.style && m.style.display === 'none') return false;
        if (m.hidden || m.getAttribute('aria-hidden') === 'true') return false;
        const r = typeof m.getBoundingClientRect === 'function' ? m.getBoundingClientRect() : { width: 0, height: 0 };
        return r.width > 80 && r.height > 80;
      });

      const activeModal = modalCandidates[modalCandidates.length - 1] || null;
      if (activeModal) {
        const activeStep = activeModal.querySelector('.modal-step.active, .step-container.active, [data-step-container].active');
        return activeStep || activeModal;
      }

      const activeForm = document.querySelector(
        '#application_form, #application-form, form[data-cy="application-form"], .application-form, form[data-qa="apply-form"], .jobs-easy-apply-content, .job-view-layout form'
      );
      if (activeForm && !activeForm.closest('.global-nav, header, nav, .jobs-search-box, [role="search"]')) {
        return activeForm;
      }
      return document.body || document.documentElement || document;
    }

    const scopeRoot = getActiveScope();

    // Helper: Traverse DOM recursively including open Shadow Roots and accessible iframes
    function getAllElementsInScope(root, list) {
      if (!root) return;
      const isElement = root.nodeType === 1 || (typeof Node !== 'undefined' && root.nodeType === Node.ELEMENT_NODE);
      if (isElement) {
        // Never traverse into global header navigation, job search boxes, or job alert/newsletter widgets!
        if (typeof root.matches === 'function' && root.matches(
          '.jobs-search-box, .global-nav, header, nav, [role="search"], .search-global-typeahead, [data-view-name*="search-box"], .keywordsearch, .jobsearch, form[action*="jobalert"], .jobs-alert-form, .jobs-search-create-alert, [data-test-job-alert-modal], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield'
        )) {
          return;
        }
        list.push(root);

        // Traverse Open Shadow DOM Root
        if (root.shadowRoot) {
          getAllElementsInScope(root.shadowRoot, list);
        }

        // Traverse Accessible IFrame Document (strictly ignoring third-party tracking/ad iframes like ns1p, demdex, visitor API)
        if (root.tagName && root.tagName.toLowerCase() === 'iframe') {
          try {
            const src = (root.src || (root.getAttribute && root.getAttribute('src')) || '').toLowerCase();
            if (
              !src ||
              src === 'about:blank' ||
              /ns1p\.net|demdex|rubicon|doubleclick|adnxs|adsystem|visitor|analytics|pixel|ads\./i.test(src)
            ) {
              return;
            }
            const frameDoc = root.contentDocument;
            if (frameDoc && frameDoc.body) {
              getAllElementsInScope(frameDoc.body, list);
            }
          } catch (e) {
            // Cross-origin iframe restrictions - ignore
          }
        }
      }

      let child = root.firstElementChild;
      while (child) {
        getAllElementsInScope(child, list);
        child = child.nextElementSibling;
      }
    }

    // Helper: Determine visibility
    function isElementVisible(el) {
      if (!el) return false;
      const isElement = el.nodeType === 1 || (typeof Node !== 'undefined' && el.nodeType === Node.ELEMENT_NODE);
      if (!isElement) return false;

      if (getAttr(el, 'type') === 'hidden') return false;
      if (getAttr(el, 'aria-hidden') === 'true') return false;

      // Modal Step scoping: If inside an explicit step-based wizard, ensure step is active
      const stepParent = typeof el.closest === 'function' ? el.closest('.modal-step, .step-container, [data-step-container]') : null;
      if (stepParent) {
        if (stepParent.style && stepParent.style.display === 'none') return false;
        const activeStepEl = document.querySelector('.modal-step.active, .step-container.active, [data-step-container].active');
        if (activeStepEl && !stepParent.classList.contains('active')) return false;
      }

      // Check inline and parent style display
      let curr = el;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.style && curr.style.display === 'none') return false;
        if (curr.hidden || (curr.getAttribute && curr.getAttribute('aria-hidden') === 'true')) return false;
        curr = curr.parentElement;
      }

      const isInsideModal = typeof el.closest === 'function' && Boolean(
        el.closest('.jobs-easy-apply-modal, .artdeco-modal, [role="dialog"], #easy-apply-modal-overlay, .jobs-easy-apply-content')
      );

      if (typeof window !== 'undefined' && window.getComputedStyle) {
        try {
          const cs = window.getComputedStyle(el);
          const type = (getAttr(el, 'type') || '').toLowerCase();
          const isCheckOrRadioOrFile = type === 'radio' || type === 'checkbox' || type === 'file';
          // In modal steps, do not prematurely reject elements during CSS fade-in transitions if modal itself is active
          if (!isCheckOrRadioOrFile && cs && (cs.display === 'none' || cs.visibility === 'hidden' || (!isInsideModal && cs.opacity === '0'))) {
            return false;
          }
          if (isCheckOrRadioOrFile && cs && (cs.display === 'none' || cs.visibility === 'hidden')) {
            const parentLabel = typeof el.closest === 'function' ? el.closest('label, fieldset, .fb-form-element, [role="radiogroup"], div') : null;
            if (!parentLabel || (parentLabel.offsetWidth === 0 && parentLabel.offsetHeight === 0)) {
              return false;
            }
          }
        } catch (e) {}
      }

      if (typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect && rect.width === 0 && rect.height === 0 && el.offsetParent === null) {
          const inputType = (getAttr(el, 'type') || '').toLowerCase();
          if (inputType === 'file' || inputType === 'radio' || inputType === 'checkbox' || el.tagName === 'SELECT' || getAttr(el, 'role') === 'combobox') {
            return true;
          }
          return false;
        }
      }

      return true;
    }

    // Helper: Multi-fallback CSS selector generator
    function getSelectorBundle(el) {
      // Ensure unique deterministic attribute stamped onto the DOM element
      let uniqueFieldId = getAttr(el, 'data-za-field-id');
      if (!uniqueFieldId) {
        zaFieldCounter++;
        uniqueFieldId = 'za-field-' + zaFieldCounter;
        try { el.setAttribute('data-za-field-id', uniqueFieldId); } catch(e) {}
      }

      const fallbacks = [];
      const tag = (el.tagName || 'div').toLowerCase();

      // 1. Clean ID selector (ignoring dynamic ember / random IDs)
      if (el.id && !el.id.includes(':') && !el.id.startsWith('ember') && !el.id.startsWith('__')) {
        fallbacks.push('#' + el.id.replace(/"/g, '\\\\\\"'));
      }

      // 2. Stable Enterprise Automation IDs (Workday, Lever, Greenhouse, Taleo)
      const autoId = getAttr(el, 'data-automation-id');
      if (autoId) fallbacks.push('[data-automation-id="' + autoId.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      const testId = getAttr(el, 'data-testid');
      if (testId) fallbacks.push('[data-testid="' + testId.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      const dataQa = getAttr(el, 'data-qa');
      if (dataQa) fallbacks.push('[data-qa="' + dataQa.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      const dataCy = getAttr(el, 'data-cy');
      if (dataCy) fallbacks.push('[data-cy="' + dataCy.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      // 3. Name attribute
      const name = getAttr(el, 'name') || el.name;
      if (name) fallbacks.push(tag + '[name="' + name.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      // 4. Placeholder
      const placeholder = getAttr(el, 'placeholder');
      if (placeholder) fallbacks.push(tag + '[placeholder="' + placeholder.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');

      // 5. LinkedIn ComponentKey container
      const compContainer = typeof el.closest === 'function' ? el.closest('[componentkey]') : null;
      if (compContainer) {
        const compKey = getAttr(compContainer, 'componentkey');
        if (compKey) {
          fallbacks.push('[componentkey="' + compKey.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"] ' + tag);
        }
      }

      // 6. ARIA Label
      const ariaLabel = getAttr(el, 'aria-label');
      if (ariaLabel && ariaLabel.length < 60) {
        fallbacks.push(tag + '[aria-label="' + ariaLabel.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');
      }

      // Unique guaranteed selector for this exact DOM node
      const primary = '[data-za-field-id="' + uniqueFieldId + '"]';
      return {
        selector: primary,
        fallbackSelectors: fallbacks,
      };
    }

    // Helper: Error state diagnostics
    function checkErrorState(el) {
      const isInvalid = getAttr(el, 'aria-invalid') === 'true';
      const hasErrClass = hasClass(el, 'error') || hasClass(el, 'has-error') || hasClass(el, 'is-invalid') || hasClass(el, 'artdeco-inline-feedback--error');

      let errorMsg = getAttr(el, 'data-za-validation-error') || '';

      // 1. Check aria-describedby / aria-errormessage
      if (!errorMsg) {
        const descBy = getAttr(el, 'aria-describedby') || getAttr(el, 'aria-errormessage');
        if (descBy) {
          const ids = descBy.split(/\\s+/);
          for (const id of ids) {
            const errEl = document.getElementById(id);
            if (errEl && (errEl.offsetParent !== null || errEl.getBoundingClientRect().height > 0)) {
              const text = (errEl.textContent || '').trim();
              if (text) {
                errorMsg = text;
                break;
              }
            }
          }
        }
      }

      // 2. Check enclosing form container
      if (!errorMsg) {
        const container = typeof el.closest === 'function' ? el.closest(
          '.fb-form-element, .jobs-easy-apply-form-section__grouping, .jobs-easy-apply-form-element, .form-group, [data-test-form-element], .form-item, fieldset, div'
        ) : null;
        if (container && typeof container.querySelector === 'function') {
          const errEl = container.querySelector(
            '.artdeco-inline-feedback--error, [data-test-form-builder-inline-feedback], [data-test-form-element-error-messages], .fb-form-element--error, [role="alert"], .field-error, .invalid-feedback, .error-message, [class*="inline-feedback--error"], [class*="error-text"], [class*="feedback--error"], [class*="errorMessage"], [data-automation-id*="error"]'
          );
          if (errEl && (errEl.offsetParent !== null || errEl.getBoundingClientRect().height > 0)) {
            const text = (errEl.textContent || '').trim();
            if (text) errorMsg = text;
          }
        }
      }

      // 3. Check immediate parent siblings
      if (!errorMsg && el.parentElement) {
        const siblingErr = el.parentElement.querySelector(
          '.artdeco-inline-feedback--error, [role="alert"], .error-message, .invalid-feedback, [class*="error-text"], [class*="feedback--error"], [class*="errorMessage"]'
        );
        if (siblingErr && (siblingErr.offsetParent !== null || siblingErr.getBoundingClientRect().height > 0)) {
          errorMsg = (siblingErr.textContent || '').trim();
        }
      }

      return {
        hasError: isInvalid || hasErrClass || Boolean(errorMsg),
        errorMessage: errorMsg || undefined,
      };
    }

    // Helper: Precise geometry with center coordinates
    function getGeometry(el) {
      if (typeof el.getBoundingClientRect !== 'function') return undefined;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round((rect.x || 0) + (window.scrollX || 0)),
        y: Math.round((rect.y || 0) + (window.scrollY || 0)),
        width: Math.round(rect.width || 0),
        height: Math.round(rect.height || 0),
        clientX: Math.round(rect.left + rect.width / 2),
        clientY: Math.round(rect.top + rect.height / 2),
      };
    }

    // Helper: Extract contextual legend / heading
    function getContextHint(el) {
      if (!el) return '';
      // 1. Check enclosing fieldset legend
      const fieldset = typeof el.closest === 'function' ? el.closest('fieldset') : null;
      if (fieldset && typeof fieldset.querySelector === 'function') {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent?.trim()) {
          return legend.textContent.trim();
        }
      }

      // 2. Check preceding heading
      let prev = el.previousElementSibling;
      while (prev) {
        if (prev.tagName && (/^h[1-6]$/i.test(prev.tagName) || hasClass(prev, 'question-title') || hasClass(prev, 'section-title'))) {
          const t = prev.textContent?.trim();
          if (t) return t;
        }
        prev = prev.previousElementSibling;
      }

      // 3. Check enclosing card or form group header
      const container = typeof el.closest === 'function' ? el.closest('.fb-form-element, [data-test-form-element], .form-group, .question-card, [class*="group"], [class*="section"]') : null;
      if (container && typeof container.querySelector === 'function') {
        const titleEl = container.querySelector('.question-title, legend, [class*="title"], [class*="header"]');
        if (titleEl && titleEl !== el && titleEl.textContent?.trim()) {
          return titleEl.textContent.trim();
        }
      }

      return '';
    }

    // Helper: Extract contextual helper text / description
    function getHelperText(el) {
      if (!el) return '';
      const container = typeof el.closest === 'function' ? el.closest(
        '.fb-form-element, .jobs-easy-apply-form-element, .jobs-easy-apply-form-section__grouping, [data-test-form-element], .form-group, fieldset, [class*="group"], [class*="section"]'
      ) : null;
      const roots = [container, el.parentElement].filter(Boolean);
      for (const root of roots) {
        if (!root || typeof root.querySelector !== 'function') continue;
        const helpEl = root.querySelector(
          '.jobs-easy-apply-form-element__help-text, [data-test-form-builder-help-text], .fb-form-element-sub-label, [data-test-form-element-sub-label], p[class*="help"], p[class*="sub-label"], .artdeco-inline-feedback--hint, [class*="helper-text"], p.t-12'
        );
        if (helpEl && helpEl !== el) {
          const t = (helpEl.textContent || '').trim();
          if (t) return t;
        }
      }
      return '';
    }

    // Helper: 9-Tier Label Intelligence
    function getLabel(el) {
      // Tier 0: Google Forms / Modern Survey Item Title
      const gItem = typeof el.closest === 'function' ? el.closest('[role="listitem"], .Qr7Oae, .geS5n, [jsmodel]') : null;
      if (gItem) {
        const titleEl = gItem.querySelector('.M7eMe, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle');
        if (titleEl && titleEl.textContent?.trim()) {
          const cleanTitle = titleEl.textContent.replace(/\\s*\\*.*$/, '').trim();
          if (cleanTitle) return cleanTitle;
        }
      }

      // Tier 1: Explicit aria-label
      const ariaLabel = getAttr(el, 'aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

      // Tier 2: aria-labelledby (resolves multi-ID lists)
      const labelledBy = getAttr(el, 'aria-labelledby');
      if (labelledBy && typeof document.getElementById === 'function') {
        const parts = labelledBy.split(/\\s+/).map(id => {
          try {
            return (document.getElementById(id) || document.querySelector('[id="' + id.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]'))?.textContent?.trim();
          } catch (e) { return null; }
        }).filter(Boolean);
        if (parts.length > 0) return parts.join(' ');
      }

      // Tier 3: Parent label wrapper
      const parentLabel = typeof el.closest === 'function' ? el.closest('label') : null;
      if (parentLabel && parentLabel.textContent?.trim()) return parentLabel.textContent.trim();

      // Tier 4: Enclosing container with componentkey or form group
      const compContainer = typeof el.closest === 'function' ? el.closest('[componentkey], .fb-form-element, [data-test-form-element], fieldset, [class*="group"], [class*="section"], .form-item') : null;
      if (compContainer && typeof compContainer.querySelector === 'function') {
        const titleEl = compContainer.querySelector('.fb-form-element-label, [data-test-form-element-label], .question-title, legend, label, [class*="title"], [class*="label"]');
        if (titleEl && titleEl !== el && titleEl.textContent?.trim()) return titleEl.textContent.trim();
      }

      // Tier 5: Explicit label[for="..."]
      const id = el.id || getAttr(el, 'id');
      if (id && typeof document.querySelector === 'function') {
        try {
          const lbl = document.querySelector('label[for="' + id.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\\\'") + '"]');
          if (lbl && lbl.textContent?.trim()) return lbl.textContent.trim();
        } catch (e) {}
      }

      // Tier 6: Context hint / Legend
      const contextHint = getContextHint(el);
      if (contextHint) return contextHint;

      // Tier 7: Proximity scanning: Look for question text ending in '?' or ':' in upward ancestors
      let ancestor = el.parentElement;
      let depth = 0;
      while (ancestor && depth < 4) {
        const text = ancestor.textContent || '';
        const questionMatch = text.match(/([A-Z][^.?!\\n]{4,150}\\?)/);
        if (questionMatch && questionMatch[1]) {
          return questionMatch[1].trim();
        }
        ancestor = ancestor.parentElement;
        depth++;
      }

      // Tier 8: Placeholder or title
      return getAttr(el, 'placeholder') || getAttr(el, 'title') || getAttr(el, 'name') || el.name || '';
    }

    // Helper: Extract combobox options ahead of time
    function extractComboboxOptions(el) {
      const options = new Set();

      // Check aria-controls or aria-owns listbox
      const controlsId = getAttr(el, 'aria-controls') || getAttr(el, 'aria-owns');
      if (controlsId) {
        const listbox = document.getElementById(controlsId);
        if (listbox) {
          listbox.querySelectorAll('[role="option"]').forEach(opt => {
            const txt = opt.textContent?.trim();
            if (txt) options.add(txt);
          });
        }
      }

      // Check datalist
      const listId = getAttr(el, 'list');
      if (listId) {
        const dl = document.getElementById(listId);
        if (dl) {
          dl.querySelectorAll('option').forEach(opt => {
            const val = opt.value || opt.textContent?.trim();
            if (val) options.add(val);
          });
        }
      }

      // Sibling hidden select
      const parent = el.parentElement;
      if (parent) {
        const siblingSelect = parent.querySelector('select');
        if (siblingSelect) {
          siblingSelect.querySelectorAll('option').forEach(opt => {
            const val = opt.textContent?.trim() || opt.value;
            if (val) options.add(val);
          });
        }
      }

      // Google Forms / Question container options
      const gItem = typeof el.closest === 'function' ? el.closest('[role="listitem"], .Qr7Oae, .geS5n, [jsmodel]') : null;
      if (gItem) {
        gItem.querySelectorAll('[role="option"], .quantumWizMenuPaperselectOption').forEach(opt => {
          const txt = (opt.getAttribute('data-value') || opt.textContent || '').trim();
          if (txt && !/^(choose|select|select an option|please select|--)$/i.test(txt)) options.add(txt);
        });
      }

      // Check for detached or sibling popup containers
      try {
        const popups = document.querySelectorAll('.exportSelectPopup, .OA0qNb, [role="listbox"].quantumWizMenuPaperselectOptionList');
        popups.forEach(pop => {
          pop.querySelectorAll('[role="option"], .quantumWizMenuPaperselectOption').forEach(opt => {
            const txt = (opt.getAttribute('data-value') || opt.textContent || '').trim();
            if (txt && !/^(choose|select|select an option|please select|--)$/i.test(txt)) options.add(txt);
          });
        });
      } catch(e) {}

      return options.size > 0 ? Array.from(options) : undefined;
    }

    // Collect all DOM elements within the active scope
    const allElements = [];
    getAllElementsInScope(scopeRoot, allElements);

    // =========================================================================
    // 1. STANDARD INPUTS, TEXTAREAS, SELECTS, AND CHECKBOXES
    // =========================================================================
    for (const el of allElements) {
      if (!el.tagName) continue;
      const tag = el.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') continue;
      if (!isElementVisible(el)) continue;

      // Safety Guard: NEVER scan inputs inside global header navigation, job search boxes, or job alert/newsletter widgets!
      if (typeof el.closest === 'function' && el.closest('.jobs-search-box, .global-nav, header, nav, [role="search"], .search-global-typeahead, [data-view-name*="search-box"], .keywordsearch, .jobsearch, form[action*="jobalert"], .jobs-alert-form, .jobs-search-create-alert, [data-test-job-alert-modal], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield')) {
        continue;
      }

      // Semantic label guard: Exclude job alert frequency & search keyword inputs
      const semanticDesc = ((el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '') + ' ' + (el.name || '') + ' ' + (el.id || '') + ' ' + (getLabel(el) || '')).toLowerCase();
      if (/(?:receive|create|get)\s*(?:an?\s*)?alert|alert\s*frequency|job\s*alert|search\s*by\s*keyword|search\s*by\s*location|search\s*by\s*postal/i.test(semanticDesc)) {
        continue;
      }

      let inputType = (getAttr(el, 'type') || (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text')).toLowerCase();
      if (inputType === 'hidden' || inputType === 'submit' || inputType === 'button') continue;

      // Detect custom combobox or typeahead controls
      const isCombobox = getAttr(el, 'role') === 'combobox' ||
        getAttr(el, 'aria-autocomplete') !== null ||
        hasClass(el, 'basic-typeahead__input') ||
        hasClass(el, 'artdeco-typeahead__input') ||
        (typeof el.closest === 'function' && Boolean(el.closest('.basic-typeahead, .artdeco-typeahead, [data-view-name*="typeahead"]')));

      if (isCombobox && inputType !== 'select') {
        inputType = 'combobox';
      }

      // Radios handled in dedicated group section
      if (inputType === 'radio') continue;

      processedElements.add(el);

      const compContainer = typeof el.closest === 'function' ? el.closest('[componentkey]') : null;
      const componentKey = compContainer ? (getAttr(compContainer, 'componentkey') || '') : '';

      let label = getLabel(el);
      if (!label || label.length < 2 || /^\\s*\\*?\\s*$/.test(label)) {
        if (/PHONE_MOBILE|phoneNumber/i.test(componentKey)) label = 'Mobile phone number';
        else if (/EMAIL/i.test(componentKey)) label = 'Email address';
        else if (/PHONE_COUNTRY/i.test(componentKey)) label = 'Phone country code';
      }

      const contextHint = getContextHint(el);
      const isRequired = el.required || getAttr(el, 'aria-required') === 'true' || /\\*/.test(label) || /\\*/.test(contextHint);
      const autocomplete = getAttr(el, 'autocomplete') || undefined;

      let options = undefined;
      if (tag === 'select' && typeof el.querySelectorAll === 'function') {
        options = Array.from(el.querySelectorAll('option')).map(o => o.textContent?.trim() || o.value).filter(Boolean);
      } else if (inputType === 'combobox' || getAttr(el, 'role') === 'combobox') {
        options = extractComboboxOptions(el);
      }

      const { selector, fallbackSelectors } = getSelectorBundle(el);
      const { hasError, errorMessage } = checkErrorState(el);
      const rectData = getGeometry(el);

      fields.push({
        id: el.id || '',
        selector,
        fallbackSelectors,
        tagName: tag,
        inputType,
        label,
        placeholder: getAttr(el, 'placeholder') || '',
        name: getAttr(el, 'name') || el.name || (componentKey ? componentKey.split('::').pop() : ''),
        autocomplete,
        options: options && options.length > 0 ? options : undefined,
        required: isRequired,
        currentValue: inputType === 'checkbox' ? (el.checked ? 'true' : 'false') : (el.value || ''),
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        helperText: getHelperText(el) || undefined,
        isCustomComponent: isCombobox || tag === 'select',
      });
    }

    // =========================================================================
    // 2. RADIO BUTTON GROUPS (NATIVE & CUSTOM RADIO CARDS)
    // =========================================================================
    const radios = allElements.filter(el => {
      if (!el.tagName || el.tagName.toLowerCase() !== 'input' || (getAttr(el, 'type') || '').toLowerCase() !== 'radio') return false;
      const name = (getAttr(el, 'name') || el.name || el.id || '').toLowerCase();
      const ariaLabel = (getAttr(el, 'aria-label') || '').toLowerCase();
      if (
        name.includes('resume') ||
        ariaLabel.includes('resume') ||
        name.includes('jobs-resume-picker') ||
        (typeof el.closest === 'function' && el.closest('.jobs-resume-picker, .jobs-document-upload, #resume-selector-list, .resume-list'))
      ) {
        return false;
      }
      return true;
    });
    for (const radio of radios) {
      if (!isElementVisible(radio)) continue;
      const name = getAttr(radio, 'name') || radio.name || radio.id || '';
      if (!name || processedRadioGroups.has(name)) continue;
      processedRadioGroups.add(name);

      const groupRadios = allElements.filter(el =>
        el.tagName && el.tagName.toLowerCase() === 'input' &&
        (getAttr(el, 'type') || '').toLowerCase() === 'radio' &&
        (radio.name ? (getAttr(el, 'name') === radio.name || el.name === radio.name) : el.id === radio.id)
      );

      const options = groupRadios.map(r => {
        let labelText = '';
        if (r.id) {
          try {
            const lbl = (window.CSS && CSS.escape)
              ? document.querySelector('label[for="' + CSS.escape(r.id) + '"]')
              : document.querySelector('label[for="' + r.id.replace(/(["\\:])+/g, '\\\\$1') + '"]');
            if (lbl && lbl.textContent?.trim()) labelText = lbl.textContent.trim();
          } catch(e) {}
        }
        if (!labelText) {
          const parent = typeof r.closest === 'function' ? r.closest('label') : null;
          if (parent && parent.textContent?.trim()) labelText = parent.textContent.trim();
        }
        if (!labelText && r.parentElement) {
          const siblingLabel = r.parentElement.querySelector('label');
          if (siblingLabel && siblingLabel.textContent?.trim()) labelText = siblingLabel.textContent.trim();
        }
        return (labelText || r.value || '').replace(/^[\\s\\r\\n]+|[\\s\\r\\n]+$/g, '');
      }).filter(Boolean);

      const contextHint = getContextHint(radio);
      let questionTitle = contextHint;
      if (!questionTitle) {
        const fieldset = typeof radio.closest === 'function' ? radio.closest('fieldset, .fb-form-element, [data-test-form-element]') : null;
        if (fieldset) {
          const titleEl = fieldset.querySelector('legend, .fb-form-element-label, [data-test-form-element-label], .question-title, span[class*="title"], span[class*="header"]');
          if (titleEl && titleEl.textContent?.trim()) {
            questionTitle = titleEl.textContent.trim();
          }
        }
      }
      const label = questionTitle || getLabel(radio);
      const checkedRadio = groupRadios.find(r => r.checked);

      const { selector, fallbackSelectors } = getSelectorBundle(radio);
      const { hasError, errorMessage } = checkErrorState(radio);
      const rectData = getGeometry(radio);

      // Collect specific selectors for all individual radios in this group
      const groupSelectors = groupRadios.map(r => {
        if (r.id) {
          if (window.CSS && CSS.escape) return '#' + CSS.escape(r.id);
          return '[id="' + r.id.replace(/"/g, '\\\\"') + '"]';
        }
        if (r.value) return 'input[type="radio"][value="' + r.value.replace(/"/g, '\\\\"') + '"]';
        return '';
      }).filter(Boolean);
      const combinedFallbacks = Array.from(new Set([...fallbackSelectors, ...groupSelectors]));

      fields.push({
        id: radio.id || name,
        selector: radio.name ? 'input[type="radio"][name="' + radio.name + '"]' : selector,
        fallbackSelectors: combinedFallbacks,
        tagName: 'input',
        inputType: 'radio',
        label,
        placeholder: '',
        name: radio.name || name,
        options,
        required: true,
        currentValue: checkedRadio ? checkedRadio.value : '',
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        helperText: getHelperText(fieldset || radio) || undefined,
        isCustomComponent: false,
      });
    }

    // Custom Radio Groups ([role="radiogroup"])
    const customRadioGroups = allElements.filter(el => getAttr(el, 'role') === 'radiogroup' || getAttr(el, 'data-radix-radio-group') !== null);
    for (const rg of customRadioGroups) {
      if (processedElements.has(rg) || !isElementVisible(rg)) continue;
      processedElements.add(rg);

      const customRadios = typeof rg.querySelectorAll === 'function'
        ? Array.from(rg.querySelectorAll('[role="radio"], [data-radix-radio-item], .radio-pill, .radio-card'))
        : [];
      if (customRadios.length === 0) continue;

      // Exclude dedicated resume pickers from generic question scanning (handled by dedicated resume pipeline)
      const rgLabel = (getLabel(rg) || '').toLowerCase();
      const rgClass = (rg.className && typeof rg.className === 'string' ? rg.className : '').toLowerCase();
      const isResumePicker = rg.id === 'resume-selector-list' ||
        rgClass.includes('resume-picker') ||
        rgClass.includes('resume-list') ||
        /select a resume|choose a resume|resume picker/i.test(rgLabel) ||
        customRadios.some(cr => {
          const crClass = (cr.className && typeof cr.className === 'string' ? cr.className : '').toLowerCase();
          return crClass.includes('resume') || cr.getAttribute('data-resume-name') !== null;
        });
      if (isResumePicker) continue;

      const options = customRadios.map(cr => cr.textContent?.trim() || getAttr(cr, 'aria-label') || getAttr(cr, 'data-value') || '').filter(Boolean);
      const checked = customRadios.find(cr => getAttr(cr, 'aria-checked') === 'true' || getAttr(cr, 'data-state') === 'checked');

      const label = getLabel(rg);
      const contextHint = getContextHint(rg);
      const { selector, fallbackSelectors } = getSelectorBundle(rg);
      const { hasError, errorMessage } = checkErrorState(rg);
      const rectData = getGeometry(rg);

      fields.push({
        id: rg.id || '',
        selector,
        fallbackSelectors,
        tagName: rg.tagName ? rg.tagName.toLowerCase() : 'div',
        inputType: 'radio',
        label,
        placeholder: '',
        name: getAttr(rg, 'name') || rg.id || '',
        options,
        required: getAttr(rg, 'aria-required') === 'true' || true,
        currentValue: checked ? (checked.textContent?.trim() || getAttr(checked, 'data-value') || '') : '',
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        helperText: getHelperText(rg) || undefined,
        isCustomComponent: true,
      });
    }

    // =========================================================================
    // 3. CUSTOM COMBOBOXES & MODERN SELECTS (Radix, Select2, React-Select, AntD)
    // =========================================================================
    const customComboboxes = allElements.filter(el => {
      const role = getAttr(el, 'role');
      const isCombobox = role === 'combobox' || role === 'listbox' || getAttr(el, 'aria-autocomplete') !== null;
      const isSelectWrapper = hasClass(el, 'select2-selection') ||
        hasClass(el, 'react-select__control') ||
        hasClass(el, 'ant-select-selector') ||
        hasClass(el, 'quantumWizMenuPaperselectOptionList') ||
        getAttr(el, 'data-baseweb') === 'select' ||
        getAttr(el, 'aria-haspopup') === 'listbox';
      return isCombobox || isSelectWrapper;
    });

    for (const cb of customComboboxes) {
      if (processedElements.has(cb) || !isElementVisible(cb)) continue;
      // Skip if nested inside another custom combobox trigger
      if (cb.parentElement && cb.parentElement.closest('[role="combobox"], [role="listbox"], .select2-selection, .react-select__control, .ant-select-selector, .quantumWizMenuPaperselectOptionList')) {
        continue;
      }
      const tag = cb.tagName ? cb.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select') continue;
      processedElements.add(cb);

      const label = getLabel(cb);
      const contextHint = getContextHint(cb);
      const isRequired = getAttr(cb, 'aria-required') === 'true' || /\\*/.test(label) || /\\*/.test(contextHint);
      const currentValue = cb.textContent?.trim() || getAttr(cb, 'aria-valuenow') || '';

      const { selector, fallbackSelectors } = getSelectorBundle(cb);
      const { hasError, errorMessage } = checkErrorState(cb);
      const rectData = getGeometry(cb);
      const options = extractComboboxOptions(cb);

      fields.push({
        id: cb.id || '',
        selector,
        fallbackSelectors,
        tagName: tag || 'div',
        inputType: 'combobox',
        label,
        placeholder: getAttr(cb, 'placeholder') || getAttr(cb, 'aria-placeholder') || '',
        name: getAttr(cb, 'name') || cb.id || '',
        options,
        required: isRequired,
        currentValue,
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        helperText: getHelperText(cb) || undefined,
        isCustomComponent: true,
      });
    }

    // =========================================================================
    // 4. CUSTOM SWITCHES & CHECKBOXES ([role="switch"], [role="checkbox"], Tailwind/Custom Checkboxes)
    // =========================================================================
    const customSwitches = allElements.filter(el => {
      if (!el.tagName) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input') return false;

      // Exclude dedicated resume cards, pickers, and documents (handled exclusively by dedicated resume pipeline)
      const name = (getAttr(el, 'name') || el.id || '').toLowerCase();
      const ariaLabel = (getAttr(el, 'aria-label') || '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();
      if (
        name.includes('resume') ||
        ariaLabel.includes('resume') ||
        ariaLabel.includes('.pdf') ||
        ariaLabel.includes('.doc') ||
        text.includes('.pdf') ||
        text.includes('.doc') ||
        name.includes('jobs-resume-picker') ||
        (typeof el.closest === 'function' && el.closest('.jobs-resume-picker, .jobs-document-upload, #resume-selector-list, .resume-list, [data-test-resume-item], [data-test-document-card]'))
      ) {
        return false;
      }

      const role = getAttr(el, 'role');
      if (role === 'switch' || role === 'checkbox') return true;

      // Detect styled custom checkboxes (e.g. Tailwind <label class="... cursor-pointer"> with inner styled div box)
      if (tag === 'label') {
        // Must not contain a native input (already handled in Section 1 or 2)
        if (el.querySelector('input')) return false;

        const hasBoxChild = el.querySelector('div[class*="border"], div[class*="rounded"], span[class*="border"], span[class*="rounded"], [class*="checkbox"], [class*="box"]') !== null;
        const text = (el.textContent || '').trim();
        const hasConsentOrActionText = /verify|accurate|agree|terms|consent|policy|declaration|certify|communications|whatsapp|joined|community|receive|updates|subscribe/i.test(text);

        if (hasBoxChild || hasConsentOrActionText) {
          return true;
        }
      }

      // Non-label custom checkbox wrappers (e.g. div.cursor-pointer or div[data-checkbox])
      const cls = (el.className && typeof el.className === 'string') ? el.className : '';
      if (cls.includes('cursor-pointer') || cls.includes('checkbox') || getAttr(el, 'data-checkbox') !== null) {
        if (!el.querySelector('input') && el.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]')) {
          const text = (el.textContent || '').trim();
          if (/verify|accurate|agree|terms|consent|policy|declaration|certify|communications|whatsapp|joined|community/i.test(text)) {
            return true;
          }
        }
      }

      return false;
    });

    for (const sw of customSwitches) {
      if (processedElements.has(sw) || !isElementVisible(sw)) continue;

      // Avoid nested duplicates if a parent label/wrapper was already processed
      if (typeof sw.closest === 'function') {
        const parentSw = sw.closest('[role="switch"], [role="checkbox"], label');
        if (parentSw && parentSw !== sw && processedElements.has(parentSw)) continue;
      }

      processedElements.add(sw);

      const label = getLabel(sw);
      const contextHint = getContextHint(sw);

      // Multi-state check detection: ARIA, data attributes, SVG checkmark icon, or active Tailwind background
      const hasCheckSvg = sw.querySelector('svg') !== null;
      const isAriaChecked = getAttr(sw, 'aria-checked') === 'true' || getAttr(sw, 'data-state') === 'checked';
      const box = sw.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]') || sw;
      const boxClass = (box.className && typeof box.className === 'string') ? box.className : '';
      const isBoxActive = (boxClass.includes('border-purple') || boxClass.includes('border-emerald') || boxClass.includes('border-indigo') || boxClass.includes('bg-purple') || boxClass.includes('bg-indigo') || boxClass.includes('bg-emerald') || boxClass.includes('bg-[#') || boxClass.includes('bg-')) && !boxClass.includes('bg-transparent') && !boxClass.includes('border-slate-300');
      const isChecked = isAriaChecked || hasCheckSvg || isBoxActive;

      const { selector, fallbackSelectors } = getSelectorBundle(sw);
      const { hasError, errorMessage } = checkErrorState(sw);
      const rectData = getGeometry(sw);

      const isRequired = getAttr(sw, 'aria-required') === 'true' ||
        label.indexOf('*') !== -1 ||
        (contextHint && contextHint.indexOf('*') !== -1) ||
        /verify|accurate|agree|required|must/i.test(label);

      fields.push({
        id: sw.id || '',
        selector,
        fallbackSelectors,
        tagName: sw.tagName ? sw.tagName.toLowerCase() : 'label',
        inputType: 'checkbox',
        label,
        placeholder: '',
        name: getAttr(sw, 'name') || sw.id || '',
        required: isRequired,
        currentValue: isChecked ? 'true' : 'false',
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        helperText: getHelperText(sw) || undefined,
        isCustomComponent: true,
      });
    }

    // =========================================================================
    // 5. RESUME / FILE UPLOAD DROPZONES
    // =========================================================================
    const dropzones = allElements.filter(el => {
      const isDrop = hasClass(el, 'dropzone') ||
        getAttr(el, 'data-dropzone') !== null ||
        getAttr(el, 'data-qa') === 'upload-resume' ||
        getAttr(el, 'data-automation-id')?.includes('file-upload') ||
        (el.className && typeof el.className === 'string' && (el.className.includes('file-upload') || el.className.includes('resume-upload')));
      return isDrop && el.tagName && el.tagName.toLowerCase() !== 'input';
    });

    for (const dz of dropzones) {
      if (processedElements.has(dz) || !isElementVisible(dz)) continue;
      processedElements.add(dz);

      const label = getLabel(dz) || 'Resume / CV Upload';
      const contextHint = getContextHint(dz);

      const { selector, fallbackSelectors } = getSelectorBundle(dz);
      const { hasError, errorMessage } = checkErrorState(dz);
      const rectData = getGeometry(dz);

      fields.push({
        id: dz.id || '',
        selector,
        fallbackSelectors,
        tagName: dz.tagName ? dz.tagName.toLowerCase() : 'div',
        inputType: 'file',
        label,
        placeholder: 'Drag and drop resume here',
        name: getAttr(dz, 'name') || 'resume',
        required: true,
        currentValue: '',
        hasError,
        errorMessage,
        rect: rectData,
        contextHint: contextHint || undefined,
        isCustomComponent: true,
      });
    }

    return fields;
  } catch (err) {
    return [];
  }
})()
`;

export async function scanFormFields(webview: WebviewTarget): Promise<ScannedField[]> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return [];
  }

  try {
    const fields = await webview.executeJavaScript<ScannedField[]>(INJECTED_SCANNER_SCRIPT);
    return Array.isArray(fields) ? fields : [];
  } catch (error) {
    console.error('[InjectedScanner] DOM scan error:', error);
    return [];
  }
}

export const DOM_SCANNER_SCRIPT = INJECTED_SCANNER_SCRIPT;

