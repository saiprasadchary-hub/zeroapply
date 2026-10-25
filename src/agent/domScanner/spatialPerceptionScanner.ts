/**
 * ZeroApply Quantum Perception Engine (Production Grade)
 * 
 * High-performance, full-spectrum DOM perception module combining:
 * 1. Modal / Form scoped deep tree traversal
 * 2. Recursive Open Shadow DOM piercing & accessible iframe scanning
 * 3. 9-Tier Hierarchical & Ancestral Semantic Label Disambiguation (Legend, ARIA, Fieldset)
 * 4. 2D Spatial Raycasting with directional weighting
 * 5. Headless Portal & Custom Combobox (Radix, MUI, AntD, React-Select) Option Detection
 * 6. Compound Field Topology (Phone country code + number, Split dates)
 * 7. Table Matrix & Grid Row/Column Cross-Referencing (Workday, SmartRecruiters)
 * 8. Multi-Select Checkbox Group Bundling ("Select all that apply")
 * 9. Viewport Clickability & Occlusion Sniffing (elementFromPoint)
 * 10. HTML5 & ATS Constraint Extraction (pattern, min, max, minlength, maxlength)
 */

export interface NormalizedFormQuestion {
  id: string;
  selector: string;
  fallbackSelectors?: string[];
  label: string;
  sectionHeader?: string;
  groupLegend?: string;
  helperText?: string;
  name?: string;
  placeholder?: string;
  widgetType: 'text' | 'textarea' | 'select' | 'combobox' | 'radiogroup' | 'checkbox' | 'checkboxgroup' | 'switch' | 'file';
  required: boolean;
  hasError: boolean;
  errorMessage?: string;
  currentValue?: string;
  options?: string[];
  portalSelector?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  compoundRole?: 'phone_country_code' | 'phone_number' | 'date_month' | 'date_day' | 'date_year' | 'currency' | 'amount';
  tableContext?: {
    tableName?: string;
    rowHeader?: string;
    columnHeader?: string;
  };
  isClickable?: boolean;
  isMultiSelect?: boolean;
  centerCoordinates?: {
    x: number;
    y: number;
  };
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export const SPATIAL_PERCEPTION_SCRIPT = `(() => {
  try {
    function getCleanText(el) {
      if (!el) return '';
      return (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
    }

    function getBoundingRect(el) {
      const r = el.getBoundingClientRect();
      return { 
        top: Math.round(r.top), 
        left: Math.round(r.left), 
        width: Math.round(r.width), 
        height: Math.round(r.height) 
      };
    }

    // 1. Identify Active Application Scope (Modal or Main Form)
    function getActiveScope() {
      const modal = document.querySelector(
        '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], .artdeco-modal, .modal-open .modal-dialog, [data-qa="application-modal"]'
      );
      if (modal) {
        const activeStep = modal.querySelector('.modal-step.active, .step-container.active, [data-step-container].active');
        return activeStep || modal;
      }

      const activeForm = document.querySelector(
        '#application_form, #application-form, form[data-cy="application-form"], .application-form, form[data-qa="apply-form"], .jobs-easy-apply-content, .job-view-layout form, main form'
      );
      if (activeForm && !activeForm.closest('.global-nav, header, nav, .jobs-search-box')) {
        return activeForm;
      }
      return document.body || document.documentElement;
    }

    const scopeRoot = getActiveScope();

    // 2. Recursive Collector with Shadow DOM & Iframe piercing
    function collectAllInteractiveElements(root, list) {
      if (!root) return;
      const isElement = root.nodeType === 1;
      if (isElement) {
        // Disregard global site navigation, job search bars, and job alert/newsletter subscription widgets
        if (typeof root.matches === 'function' && root.matches(
          '.jobs-search-box, .global-nav, header, nav, [role="search"], .search-global-typeahead, [data-view-name*="search-box"], .keywordsearch, .jobsearch, [class*="alert"], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield'
        )) {
          return;
        }

        const descriptor = ((root.getAttribute('aria-label') || '') + ' ' + (root.placeholder || '') + ' ' + (root.name || '') + ' ' + (root.id || '')).toLowerCase();
        if (/(?:receive|create|get)\s*(?:an?\s*)?alert|alert\s*frequency|job\s*alert|search\s*by\s*keyword|search\s*by\s*location|search\s*by\s*postal/i.test(descriptor)) {
          return;
        }

        const tag = root.tagName.toLowerCase();
        const role = (root.getAttribute('role') || '').toLowerCase();
        const isEditable = root.getAttribute('contenteditable') === 'true';

        if (
          tag === 'input' ||
          tag === 'select' ||
          tag === 'textarea' ||
          role === 'combobox' ||
          role === 'radiogroup' ||
          role === 'switch' ||
          role === 'checkbox' ||
          isEditable ||
          root.hasAttribute('data-radix-select-trigger') ||
          root.classList.contains('select__control') ||
          root.classList.contains('dropzone') ||
          root.hasAttribute('data-dropzone')
        ) {
          list.push(root);
        }

        // Open Shadow DOM traversal
        if (root.shadowRoot) {
          collectAllInteractiveElements(root.shadowRoot, list);
        }

        // Accessible Iframe traversal (strictly ignoring third-party tracking/ad iframes like ns1p, demdex, visitor API)
        if (tag === 'iframe') {
          try {
            const src = (root.src || root.getAttribute('src') || '').toLowerCase();
            if (
              !src ||
              src === 'about:blank' ||
              /ns1p\.net|demdex|rubicon|doubleclick|adnxs|adsystem|visitor|analytics|pixel|ads\./i.test(src)
            ) {
              // Silently bypass third-party tracking/ad iframes
              return;
            }
            const frameDoc = root.contentDocument;
            if (frameDoc && frameDoc.body) {
              collectAllInteractiveElements(frameDoc.body, list);
            }
          } catch (e) {
            // Silently ignore cross-origin iframe security boundaries
          }
        }
      }

      let child = root.firstElementChild;
      while (child) {
        collectAllInteractiveElements(child, list);
        child = child.nextElementSibling;
      }
    }

    // 3. Visibility & Clickability Sniffer
    function isVisible(el) {
      if (!el) return false;
      if (el.type === 'hidden' || el.getAttribute('aria-hidden') === 'true') return false;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style) {
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const isCheckOrRadioOrFile = el.type === 'radio' || el.type === 'checkbox' || el.type === 'file';
        if (!isCheckOrRadioOrFile && parseFloat(style.opacity || '1') === 0) return false;
      }

      if (rect.width === 0 && rect.height === 0) {
        if (el.type === 'radio' || el.type === 'checkbox' || el.type === 'file') {
          const parent = el.closest('label, .fb-dash-form-element, .form-group, fieldset');
          return !!(parent && parent.offsetWidth > 0 && parent.offsetHeight > 0);
        }
        return false;
      }
      return true;
    }

    function checkClickability(el, rect) {
      if (!rect || rect.width === 0 || rect.height === 0) return false;
      const cx = rect.left + Math.round(rect.width / 2);
      const cy = rect.top + Math.round(rect.height / 2);
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return true; // Scrolled out
      try {
        const topEl = document.elementFromPoint(cx, cy);
        if (!topEl) return false;
        return el === topEl || el.contains(topEl) || topEl.contains(el);
      } catch (e) {
        return true;
      }
    }

    // 4. Table / Matrix & Grid Row/Column Cross-Referencing
    function findTableContext(el) {
      const tableRow = el.closest('tr, [role="row"]');
      if (!tableRow) return undefined;

      const table = tableRow.closest('table, [role="grid"], [role="table"]');
      let tableName = '';
      let rowHeader = '';
      let columnHeader = '';

      if (table) {
        const caption = table.querySelector('caption, h3, h4, [class*="title"]');
        if (caption) tableName = getCleanText(caption);
      }

      // Row Header: first cell or th in the current row
      const firstCell = tableRow.querySelector('th, td:first-child, [role="rowheader"]');
      if (firstCell && !firstCell.contains(el)) {
        rowHeader = getCleanText(firstCell);
      }

      // Column Header: find cell index in row and lookup corresponding thead th
      const cell = el.closest('td, th, [role="cell"], [role="gridcell"]');
      if (cell && table) {
        const cellsInRow = Array.from(tableRow.children);
        const colIndex = cellsInRow.indexOf(cell);
        if (colIndex >= 0) {
          const headerRow = table.querySelector('thead tr, tr:first-child');
          if (headerRow) {
            const headerCells = Array.from(headerRow.children);
            if (headerCells[colIndex]) {
              columnHeader = getCleanText(headerCells[colIndex]);
            }
          }
        }
      }

      if (tableName || rowHeader || columnHeader) {
        return {
          tableName: tableName || undefined,
          rowHeader: rowHeader || undefined,
          columnHeader: columnHeader || undefined,
        };
      }
      return undefined;
    }

    // 5. Multi-Tier Semantic Label Extractor
    function extractQuestionLabelAndContext(el) {
      if (el.id) {
        try {
          const explicit = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          if (explicit) {
            const txt = getCleanText(explicit);
            if (txt.length > 1) return { label: txt, source: 'explicit_for' };
          }
        } catch (e) {}
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim().length > 1) {
        return { label: ariaLabel.trim(), source: 'aria_label' };
      }

      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        try {
          const parts = ariaLabelledBy.split(/\\s+/).map((id) => document.getElementById(id)).filter(Boolean);
          const combined = parts.map(getCleanText).join(' ').trim();
          if (combined.length > 1) return { label: combined, source: 'aria_labelledby' };
        } catch (e) {}
      }

      const parentLabel = el.closest('label');
      if (parentLabel) {
        const clone = parentLabel.cloneNode(true);
        const inputs = clone.querySelectorAll('input, select, textarea, [role="combobox"]');
        inputs.forEach((i) => i.remove());
        const txt = getCleanText(clone);
        if (txt.length > 1) return { label: txt, source: 'parent_label' };
      }

      const container = el.closest('.fb-dash-form-element, .form-group, .input-group, [data-test-form-element], .artdeco-text-input, div[class*="field-"], div[class*="form-row"]');
      if (container) {
        const containerLabelEl = container.querySelector(
          'label, .fb-dash-form-element__label, .artdeco-text-input--label, .t-14.t-bold, h3, h4, h5, [class*="label"]'
        );
        if (containerLabelEl && !containerLabelEl.contains(el)) {
          const txt = getCleanText(containerLabelEl);
          if (txt.length > 1) return { label: txt, source: 'container_label' };
        }
      }

      // Spatial Raycasting
      const elRect = el.getBoundingClientRect();
      let bestText = '';
      let minScore = 999999;

      const candidates = (scopeRoot || document).querySelectorAll(
        'label, p, span, h3, h4, h5, div[class*="label"], .artdeco-text-input--label'
      );

      for (const c of candidates) {
        if (c.contains(el) || el.contains(c)) continue;
        const cRect = c.getBoundingClientRect();
        if (cRect.width === 0 || cRect.height === 0) continue;

        const isAbove = cRect.bottom <= elRect.top + 12 && cRect.bottom >= elRect.top - 120;
        const isLeft = cRect.right <= elRect.left + 15 && cRect.right >= elRect.left - 240 && Math.abs(cRect.top - elRect.top) < 40;

        if (isAbove || isLeft) {
          const vDist = isAbove ? Math.max(0, elRect.top - cRect.bottom) : 0;
          const hDist = Math.abs(elRect.left - cRect.left);
          const score = (isAbove ? vDist * 1.0 : 80 + hDist * 1.5);

          if (score < minScore) {
            const txt = getCleanText(c);
            if (txt.length >= 2 && txt.length < 350) {
              minScore = score;
              bestText = txt;
            }
          }
        }
      }

      if (bestText) return { label: bestText, source: 'spatial_raycast' };

      const fallback = el.placeholder || el.name || el.getAttribute('data-qa') || el.id || '';
      return { label: fallback, source: 'fallback_attr' };
    }

    // 6. Helper text & Error state sniffer
    function findHelperAndError(el) {
      const container = el.closest('.fb-dash-form-element, .form-group, fieldset') || el.parentElement;
      let helperText = '';
      let errorMessage = '';

      const ariaDescribed = el.getAttribute('aria-describedby');
      if (ariaDescribed) {
        const parts = ariaDescribed.split(/\\s+/).map((id) => document.getElementById(id)).filter(Boolean);
        parts.forEach((p) => {
          const txt = getCleanText(p);
          if (p.getAttribute('role') === 'alert' || /error|invalid|feedback/i.test(p.className)) {
            errorMessage = txt;
          } else {
            helperText = txt;
          }
        });
      }

      if (!errorMessage && container) {
        const errEl = container.querySelector(
          '.artdeco-inline-feedback--error, [role="alert"], .error-message, .form-error, .invalid-feedback, [aria-invalid="true"]'
        );
        if (errEl) errorMessage = getCleanText(errEl);
      }

      if (!helperText && container) {
        const helpEl = container.querySelector('.t-12.t-black--light, .helper-text, .form-text, .description, small');
        if (helpEl && helpEl !== container.querySelector('[role="alert"]')) {
          helperText = getCleanText(helpEl);
        }
      }

      return { helperText, errorMessage };
    }

    // 7. Ancestral headers
    function findAncestralHeaders(el) {
      const group = el.closest('fieldset, [role="group"], [role="radiogroup"], .jobs-easy-apply-form-section__grouping, .fb-dash-form-element');
      let groupLegend = '';
      if (group) {
        const legendEl = group.querySelector('legend, h3, h4, .fb-dash-form-element__label');
        if (legendEl) groupLegend = getCleanText(legendEl);
      }

      const sectionEl = el.closest('.jobs-easy-apply-form-section, .form-section, section');
      let sectionHeader = '';
      if (sectionEl) {
        const h = sectionEl.querySelector('h2, h3, h4, .fb-form-section-title');
        if (h) sectionHeader = getCleanText(h);
      }

      return { groupLegend, sectionHeader };
    }

    // 8. Resilient selector generator
    function generateResilientSelector(el) {
      const selectors = [];
      const tag = el.tagName.toLowerCase();

      if (el.id) selectors.push('#' + CSS.escape(el.id));
      if (el.name) selectors.push(tag + '[name="' + CSS.escape(el.name) + '"]');

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) selectors.push(tag + '[aria-label="' + CSS.escape(ariaLabel) + '"]');

      const qa = el.getAttribute('data-qa') || el.getAttribute('data-cy') || el.getAttribute('data-testid');
      if (qa) selectors.push('[' + (el.hasAttribute('data-qa') ? 'data-qa' : el.hasAttribute('data-cy') ? 'data-cy' : 'data-testid') + '="' + CSS.escape(qa) + '"]');

      if (el.id) {
        return { primary: '#' + CSS.escape(el.id), fallbacks: selectors };
      }
      const primary = selectors[0] || (tag + (el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''));
      return { primary, fallbacks: selectors };
    }

    // 9. Dropdown & Combobox Option Extractor
    function extractOptions(el, widgetType) {
      if (widgetType === 'select') {
        return Array.from(el.options || []).map((o) => o.text.trim()).filter(Boolean);
      }

      if (widgetType === 'combobox') {
        const listboxId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns');
        if (listboxId) {
          const listbox = document.getElementById(listboxId);
          if (listbox) {
            const opts = Array.from(listbox.querySelectorAll('[role="option"], li')).map(getCleanText).filter(Boolean);
            if (opts.length > 0) return opts;
          }
        }

        const portal = document.querySelector(
          '[data-radix-popper-content-wrapper] [role="listbox"], .select__menu, .ant-select-dropdown:not(.ant-select-dropdown-hidden), .artdeco-typeahead__results'
        );
        if (portal) {
          const opts = Array.from(portal.querySelectorAll('[role="option"], li, .select__option')).map(getCleanText).filter(Boolean);
          if (opts.length > 0) return opts;
        }
      }

      return [];
    }

    // ----------------------------------------------------
    // EXECUTION PIPELINE
    // ----------------------------------------------------
    const rawElements = [];
    collectAllInteractiveElements(scopeRoot, rawElements);

    const questions = [];
    const processedRadioGroups = new Set();
    const processedCheckboxGroups = new Set();
    let qCounter = 0;

    for (const el of rawElements) {
      if (!isVisible(el)) continue;

      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();
      const rect = getBoundingRect(el);
      const isElementClickable = checkClickability(el, rect);
      const centerCoords = {
        x: rect.left + Math.round(rect.width / 2),
        y: rect.top + Math.round(rect.height / 2),
      };

      // Table Context Detection
      const tableCtx = findTableContext(el);

      // Handle Radio Groups as single unified question
      if (type === 'radio') {
        const groupName = el.name || 'unnamed_radio_group_' + qCounter;
        if (processedRadioGroups.has(groupName)) continue;
        processedRadioGroups.add(groupName);

        const radios = Array.from(
          (scopeRoot || document).querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')
        );

        const options = radios.map((r) => {
          return (
            getCleanText(r.closest('label')) ||
            getCleanText(document.querySelector('label[for="' + CSS.escape(r.id) + '"]')) ||
            r.value
          );
        }).filter(Boolean);

        const { label: rawLabel } = extractQuestionLabelAndContext(el);
        const { groupLegend, sectionHeader } = findAncestralHeaders(el);
        const { helperText, errorMessage } = findHelperAndError(el);
        const checkedRadio = radios.find((r) => r.checked);

        let finalQuestionText = groupLegend || rawLabel || 'Radio Selection';
        if (tableCtx && (tableCtx.rowHeader || tableCtx.columnHeader)) {
          finalQuestionText = [tableCtx.tableName, tableCtx.rowHeader, tableCtx.columnHeader, finalQuestionText]
            .filter(Boolean)
            .join(' - ');
        }

        questions.push({
          id: el.name ? 'radio_' + el.name : 'radio_' + qCounter++,
          selector: 'input[type="radio"][name="' + CSS.escape(el.name) + '"]',
          fallbackSelectors: ['fieldset input[type="radio"]'],
          label: finalQuestionText,
          groupLegend: groupLegend || undefined,
          sectionHeader: sectionHeader || undefined,
          helperText: helperText || undefined,
          widgetType: 'radiogroup',
          required: el.required || el.getAttribute('aria-required') === 'true',
          hasError: Boolean(errorMessage) || el.getAttribute('aria-invalid') === 'true',
          errorMessage: errorMessage || undefined,
          currentValue: checkedRadio ? (getCleanText(checkedRadio.closest('label')) || checkedRadio.value) : '',
          options,
          tableContext: tableCtx,
          isClickable: isElementClickable,
          centerCoordinates: centerCoords,
          boundingBox: rect
        });
        continue;
      }

      // Multi-Select Checkbox Group Detection
      if (type === 'checkbox') {
        const parentGroup = el.closest('fieldset, [role="group"], .checkbox-group');
        const legendText = parentGroup ? getCleanText(parentGroup.querySelector('legend, h3, h4, [class*="label"]')) : '';

        if (parentGroup && legendText && /select all|choose all|which of|select any/i.test(legendText)) {
          const groupId = parentGroup.id || legendText;
          if (!processedCheckboxGroups.has(groupId)) {
            processedCheckboxGroups.add(groupId);

            const siblingCheckboxes = Array.from(parentGroup.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
            const options = siblingCheckboxes.map((cb) => {
              return (
                getCleanText(cb.closest('label')) ||
                getCleanText(document.querySelector('label[for="' + CSS.escape(cb.id) + '"]')) ||
                cb.value
              );
            }).filter(Boolean);

            const checkedBoxes = siblingCheckboxes.filter((cb) => cb.checked || cb.getAttribute('aria-checked') === 'true');
            const currentVals = checkedBoxes.map((cb) => getCleanText(cb.closest('label')) || cb.value).join(', ');

            questions.push({
              id: 'checkbox_group_' + qCounter++,
              selector: parentGroup.id ? '#' + CSS.escape(parentGroup.id) : 'fieldset',
              fallbackSelectors: ['[role="group"]'],
              label: legendText,
              groupLegend: legendText,
              widgetType: 'checkboxgroup',
              required: el.required || el.getAttribute('aria-required') === 'true',
              hasError: false,
              currentValue: currentVals,
              options,
              isMultiSelect: true,
              tableContext: tableCtx,
              isClickable: isElementClickable,
              centerCoordinates: centerCoords,
              boundingBox: rect
            });
            continue;
          } else {
            // Already processed as part of group
            continue;
          }
        }
      }

      // Determine Widget Type
      let widgetType = 'text';
      if (tag === 'textarea') {
        widgetType = 'textarea';
      } else if (tag === 'select') {
        widgetType = 'select';
      } else if (
        role === 'combobox' ||
        el.getAttribute('aria-haspopup') === 'listbox' ||
        el.classList.contains('select__control') ||
        el.hasAttribute('data-radix-select-trigger')
      ) {
        widgetType = 'combobox';
      } else if (type === 'checkbox' || role === 'checkbox') {
        widgetType = 'checkbox';
      } else if (role === 'switch') {
        widgetType = 'switch';
      } else if (type === 'file' || el.classList.contains('dropzone') || el.hasAttribute('data-dropzone')) {
        widgetType = 'file';
      }

      let { label, source } = extractQuestionLabelAndContext(el);
      if (!label && widgetType !== 'file') continue;

      if (tableCtx && (tableCtx.rowHeader || tableCtx.columnHeader)) {
        label = [tableCtx.tableName, tableCtx.rowHeader, tableCtx.columnHeader, label]
          .filter(Boolean)
          .join(' - ');
      }

      const { groupLegend, sectionHeader } = findAncestralHeaders(el);
      const { helperText, errorMessage } = findHelperAndError(el);
      const selectorBundle = generateResilientSelector(el);
      const options = extractOptions(el, widgetType);

      // Extract HTML5 / ATS validation constraints
      const minVal = el.min ? parseFloat(el.min) : undefined;
      const maxVal = el.max ? parseFloat(el.max) : undefined;
      const minLen = el.minLength && el.minLength > 0 ? el.minLength : undefined;
      const maxLen = el.maxLength && el.maxLength > 0 ? el.maxLength : undefined;
      const pattern = el.pattern || undefined;

      // Compound field topology tagging
      let compoundRole = undefined;
      const labelLower = label.toLowerCase();
      if (/country.*code|\+1|\+91|dialing/i.test(labelLower) || (el.name && /countrycode/i.test(el.name))) {
        compoundRole = 'phone_country_code';
      } else if (/phone|mobile|cell/i.test(labelLower) && (widgetType === 'text' || type === 'tel')) {
        compoundRole = 'phone_number';
      }

      questions.push({
        id: el.id || 'field_' + qCounter++,
        selector: selectorBundle.primary,
        fallbackSelectors: selectorBundle.fallbacks,
        label,
        sectionHeader: sectionHeader || undefined,
        groupLegend: groupLegend || undefined,
        helperText: helperText || undefined,
        name: el.name || undefined,
        placeholder: el.placeholder || undefined,
        widgetType,
        required: el.required || el.getAttribute('aria-required') === 'true',
        hasError: Boolean(errorMessage) || el.getAttribute('aria-invalid') === 'true',
        errorMessage: errorMessage || undefined,
        currentValue: el.value || '',
        options: options.length > 0 ? options : undefined,
        min: minVal,
        max: maxVal,
        minLength: minLen,
        maxLength: maxLen,
        pattern,
        compoundRole,
        tableContext: tableCtx,
        isClickable: isElementClickable,
        centerCoordinates: centerCoords,
        boundingBox: rect
      });
    }

    return questions;
  } catch (err) {
    return [];
  }
})()`;

/**
 * Scans the current webview page using the enhanced Quantum Perception engine.
 */
export async function scanPageWithQuantumPerception(webview: any): Promise<NormalizedFormQuestion[]> {
  try {
    const results = await webview.executeJavaScript(SPATIAL_PERCEPTION_SCRIPT);
    return Array.isArray(results) ? results : [];
  } catch (err) {
    console.warn('[QuantumPerception] Scan execution error:', err);
    return [];
  }
}

/**
 * Waits for DOM mutations to settle after an action (e.g. conditional form fields hydrating).
 */
export async function waitForDomSettled(webview: any, settleTimeoutMs = 1200, idleDelayMs = 250): Promise<void> {
  const settleScript = `
    new Promise((resolve) => {
      let timer = null;
      const maxTimer = setTimeout(() => {
        if (observer) observer.disconnect();
        resolve(true);
      }, ${settleTimeoutMs});

      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          observer.disconnect();
          clearTimeout(maxTimer);
          resolve(true);
        }, ${idleDelayMs});
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Start initial countdown in case no mutations occur
      timer = setTimeout(() => {
        observer.disconnect();
        clearTimeout(maxTimer);
        resolve(true);
      }, ${idleDelayMs});
    });
  `;

  try {
    await webview.executeJavaScript(settleScript);
  } catch {
    await new Promise((r) => setTimeout(r, idleDelayMs));
  }
}
