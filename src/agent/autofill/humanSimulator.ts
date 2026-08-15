/**
 * Browser-injected script function to simulate realistic human behavior 
 * to bypass advanced ATS bot-detectors with real-time HUD telemetry and visual spotlight.
 * 
 * It runs completely inside the target webview.
 */
export function generateHumanBypassScript(instructionsJson: string): string {
  return `
(async function simulateHumanAutofill() {
  const instructions = ${instructionsJson};
  let filledCount = 0;
  let skippedCount = 0;

  // Helper to sleep for X milliseconds
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Random delay generator between min and max
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

  // Send real-time atomic telemetry back to the host window / webview listener
  function emitTelemetry(action) {
    try {
      console.log('[ZA_ACTION] ' + JSON.stringify(action));
    } catch {}
  }

  // High-Tech In-Page Element Laser Spotlight
  function showElementSpotlight(element, labelText) {
    if (!element) return () => {};
    const prevOutline = element.style.outline;
    const prevBoxShadow = element.style.boxShadow;
    const prevTransition = element.style.transition;

    element.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.outline = '2px solid #06b6d4';
    element.style.boxShadow = '0 0 0 4px rgba(6, 182, 212, 0.25), 0 0 16px rgba(6, 182, 212, 0.4)';

    // Optional floating beacon badge
    let badge = null;
    try {
      const rect = element.getBoundingClientRect();
      badge = document.createElement('div');
      badge.id = 'za_laser_badge';
      badge.style.cssText = 'position:fixed;z-index:999999;background:linear-gradient(135deg,#09090b,#18181b);color:#22d3ee;border:1px solid rgba(6,182,212,0.4);border-radius:6px;padding:3px 8px;font-family:ui-monospace,monospace;font-size:10px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.5);pointer-events:none;display:flex;align-items:center;gap:4px;letter-spacing:0.05em;';
      badge.innerHTML = '<span style="width:6px;height:6px;background:#06b6d4;border-radius:50%;display:inline-block;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></span> ' + (labelText || 'ZeroApply');
      badge.style.left = Math.max(10, rect.left) + 'px';
      badge.style.top = Math.max(10, rect.top - 26) + 'px';
      document.body.appendChild(badge);
    } catch {}

    return () => {
      try {
        element.style.outline = prevOutline;
        element.style.boxShadow = prevBoxShadow;
        element.style.transition = prevTransition;
        if (badge && badge.parentNode) {
          badge.parentNode.removeChild(badge);
        }
      } catch {}
    };
  }

  // Simulates a ghost mouse moving to the element
  function simulateMouse(element) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventNames = ['mousemove', 'mouseenter', 'mouseover', 'mousedown', 'mouseup'];
    eventNames.forEach(type => {
      const e = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: centerX,
        clientY: centerY
      });
      element.dispatchEvent(e);
    });
  }

  function setNativeValue(element, value) {
    let prototype = window.HTMLInputElement.prototype;
    if (element.tagName.toLowerCase() === 'textarea') {
      prototype = window.HTMLTextAreaElement.prototype;
    } else if (element.tagName.toLowerCase() === 'select') {
      prototype = window.HTMLSelectElement.prototype;
    }
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
  }

  // Simulate human typing character by character
  async function simulateTyping(element, text) {
    element.focus();
    
    // Clear existing
    setNativeValue(element, '');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Random keystroke delay: average 35-85ms
      await sleep(randomDelay(30, 90));
      
      // Occasional random pause (reading/thinking)
      if (Math.random() < 0.04) {
        await sleep(randomDelay(150, 400));
      }
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text.slice(-1) }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function scoreOptionMatch(optionText, optionValue, targetValue) {
    if (!targetValue || (!optionText && !optionValue)) return -1;
    const target = String(targetValue).toLowerCase().trim();
    const optText = String(optionText || '').toLowerCase().trim();
    const optVal = String(optionValue || '').toLowerCase().trim();

    // Ignore generic placeholder options
    if (/^(?:select|please select|choose|--|select an option|select one)/i.test(optText)) return -1;

    if (optText === target || optVal === target) return 100;
    if (optText.startsWith(target) || optVal.startsWith(target)) return 85;

    // 1. Phone Country Dial Code Matching (e.g. +91, +1, +44)
    const targetDialMatch = target.match(/\\+(\\d{1,4})/);
    const optDialMatch = optText.match(/\\+(\\d{1,4})/) || optVal.match(/\\+(\\d{1,4})/);
    if (targetDialMatch && optDialMatch && targetDialMatch[1] === optDialMatch[1]) {
      return 100;
    }
    // Country name matching in phone dropdown
    const countries = ['india', 'united states', 'united kingdom', 'canada', 'australia', 'germany', 'singapore', 'uae'];
    for (const c of countries) {
      if (target.includes(c) && optText.includes(c)) return 95;
    }

    // 2. Yes / No / Authorization / Sponsorship Matching
    if (target === 'yes' || target === 'true' || target === '1') {
      if (/^yes|^true|authorized|citizen|permanent resident|agree|acknowledge|certify|confirm|eligible/i.test(optText) || optVal === 'true' || optVal === '1' || optVal === 'yes') return 95;
    }
    if (target === 'no' || target === 'false' || target === '0') {
      if (/^no|^false|will not|do not|none|disagree|not a veteran|no disability/i.test(optText) || optVal === 'false' || optVal === '0' || optVal === 'no') return 95;
    }

    // 3. Experience & Proficiency Levels
    const numTarget = parseInt(target, 10);
    if (!isNaN(numTarget)) {
      if (optText.includes(String(numTarget)) || optVal === String(numTarget)) return 90;
      if (numTarget >= 5 && /expert|advanced|senior|lead|5\\+|5 to/i.test(optText)) return 85;
      if (numTarget >= 2 && numTarget <= 4 && /intermediate|proficient|mid|2 to|2\\+|3\\+/i.test(optText)) return 85;
      if (numTarget <= 1 && /beginner|entry|fresher|junior|0-1|1\\+/i.test(optText)) return 85;
    }

    // 4. Degree & Education Levels
    if (/bachelor/i.test(target) && /bachelor|undergraduate|b\\.?tech|b\\.?e\\.|b\\.?s\\.|b\\.?a\\.|bca/i.test(optText)) return 95;
    if (/master/i.test(target) && /master|postgraduate|m\\.?tech|m\\.?s\\.|m\\.?e\\.|mba|mca/i.test(optText)) return 95;
    if (/ph\\.?d|doctor/i.test(target) && /doctor|ph\\.?d/i.test(optText)) return 95;

    // 5. EEO Demographics & Self-Identification
    if (/decline|not wish|prefer not/i.test(target) && /decline|prefer not|do not wish|choose not|not specified/i.test(optText)) return 95;

    // 6. Work Preference
    if (/remote/i.test(target) && /remote|work from home|virtual/i.test(optText)) return 90;
    if (/hybrid/i.test(target) && /hybrid|flexible/i.test(optText)) return 90;
    if (/on-site/i.test(target) && /on-site|in-office|office/i.test(optText)) return 90;

    if (optText.includes(target) || (target.length > 3 && optText.includes(target.slice(0, Math.floor(target.length * 0.7))))) return 65;

    // Token intersection scoring
    const targetTokens = new Set(target.split(/[^a-z0-9]+/).filter(w => w.length > 2));
    const optTokens = new Set(optText.split(/[^a-z0-9]+/).filter(w => w.length > 2));
    if (targetTokens.size > 0 && optTokens.size > 0) {
      let matches = 0;
      targetTokens.forEach(t => { if (optTokens.has(t)) matches++; });
      const ratio = matches / Math.max(targetTokens.size, optTokens.size);
      if (ratio > 0) return Math.floor(ratio * 50);
    }

    return -1;
  }

  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    const fieldLabel = inst.field?.label || inst.field?.name || inst.category || 'Field #' + (i + 1);

    try {
      const el = document.querySelector(inst.selector);
      if (!el) {
        skippedCount++;
        continue;
      }

      // Broadcast live HUD action
      emitTelemetry({
        type: 'type',
        title: 'Filling ' + fieldLabel,
        detail: 'Injecting: "' + (inst.value.length > 35 ? inst.value.slice(0, 32) + '...' : inst.value) + '"',
        target: fieldLabel,
        value: inst.value,
        category: inst.category,
        progress: { current: i + 1, total: instructions.length },
        status: 'running'
      });

      // Highlight DOM element with laser spotlight
      const removeSpotlight = showElementSpotlight(el, fieldLabel);

      // Simulate mouse finding the element
      simulateMouse(el);
      await sleep(randomDelay(80, 220));
      
      // Scroll element into view smoothly if not visible
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(randomDelay(120, 300));

      if (inst.type === 'select') {
        const options = Array.from(el.options);
        let bestMatch = null;
        let bestScore = -1;
        options.forEach(o => {
          const score = scoreOptionMatch(o.text, o.value, inst.value);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = o;
          }
        });
        
        if (bestMatch && bestScore >= 30) {
          el.focus();
          await sleep(randomDelay(100, 250));
          bestMatch.selected = true;
          el.selectedIndex = options.indexOf(bestMatch);
          el.value = bestMatch.value;
          setNativeValue(el, bestMatch.value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          filledCount++;
          emitTelemetry({
            type: 'click',
            title: 'Selected dropdown: ' + bestMatch.text,
            target: fieldLabel,
            status: 'completed'
          });
        } else {
          skippedCount++;
        }
      } else if (inst.type === 'radio') {
        const radios = Array.from(document.querySelectorAll(inst.selector));
        let bestRadio = null;
        let bestScore = 0;
        for (let j = 0; j < radios.length; j++) {
          const r = radios[j];
          let lbl = '';
          if (r.id) {
            const l = document.querySelector('label[for="' + CSS.escape(r.id) + '"]');
            if (l) lbl = l.innerText.trim();
          }
          if (!lbl && r.closest('label')) lbl = r.closest('label').innerText.trim();
          if (!lbl) lbl = r.value || '';
          
          const score = scoreOptionMatch(lbl, r.value, inst.value);
          if (score > bestScore) {
            bestScore = score;
            bestRadio = r;
          }
        }

        if (bestRadio && bestScore >= 40) {
          simulateMouse(bestRadio);
          await sleep(randomDelay(80, 200));
          bestRadio.click();
          if (bestRadio.id) {
            const l = document.querySelector('label[for="' + CSS.escape(bestRadio.id) + '"]');
            if (l) l.click();
          } else if (bestRadio.closest('label')) {
            bestRadio.closest('label').click();
          }
          bestRadio.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          emitTelemetry({
            type: 'click',
            title: 'Selected radio option',
            target: fieldLabel,
            status: 'completed'
          });
        } else {
          skippedCount++;
        }
      } else if (inst.type === 'checkbox') {
        let lbl = '';
        if (el.id) {
          const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          if (l) lbl = l.innerText.trim();
        }
        if (!lbl && el.closest('label')) lbl = el.closest('label').innerText.trim();
        const labelLower = (lbl || '').toLowerCase();
        
        const shouldCheck = 
          inst.value.toLowerCase() === 'yes' || 
          inst.value.toLowerCase() === 'true' || 
          inst.value === '1' ||
          /agree|acknowledge|certify|terms|privacy|confirm|above 18|authorized/i.test(labelLower);

        const isFollowCompany = /follow\\s+.*to stay up to date|follow company|follow this employer/i.test(labelLower);

        if (isFollowCompany && el.checked) {
          simulateMouse(el);
          await sleep(randomDelay(80, 200));
          el.click();
          if (el.id) {
            const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
            if (l) l.click();
          } else if (el.closest('label')) {
            el.closest('label').click();
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
          emitTelemetry({
            type: 'click',
            title: 'Unchecked Follow Company box',
            target: fieldLabel,
            status: 'completed'
          });
        } else if (shouldCheck && !el.checked) {
          simulateMouse(el);
          await sleep(randomDelay(80, 200));
          el.click();
          if (el.id) {
            const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
            if (l) l.click();
          } else if (el.closest('label')) {
            el.closest('label').click();
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          emitTelemetry({
            type: 'click',
            title: 'Checked agreement box',
            target: fieldLabel,
            status: 'completed'
          });
        } else {
          skippedCount++;
        }
      } else if (inst.type === 'custom_dropdown') {
        const isInput = el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea';
        if (isInput) {
          await simulateTyping(el, inst.value);
          await sleep(350);
        } else {
          simulateMouse(el);
          await sleep(80);
          el.click();
          await sleep(350);
        }

        const dropdownContainers = Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .typeahead-options, .artdeco-dropdown__content, .Select-menu-outer, .MuiAutocomplete-listbox, .ant-select-dropdown'))
          .concat(el.closest('.search-basic-typeahead, [class*="typeahead"], [class*="dropdown"]') || []);
          
        let clickedOption = false;
        for (const container of dropdownContainers) {
          if (!container) continue;
          const options = Array.from(container.querySelectorAll('[role="option"], [role="menuitem"], .artdeco-dropdown__item, li, .option, .item'));
          let bestMatch = null;
          let bestScore = -1;
          for (const opt of options) {
            const text = (opt.innerText || opt.textContent || '').trim();
            const score = scoreOptionMatch(text, '', inst.value);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = opt;
            }
          }
          if (bestMatch && bestScore >= 30) {
            simulateMouse(bestMatch);
            await sleep(80);
            bestMatch.click();
            bestMatch.dispatchEvent(new Event('click', { bubbles: true }));
            clickedOption = true;
            filledCount++;
            emitTelemetry({
              type: 'click',
              title: 'Selected custom dropdown: ' + (bestMatch.innerText || '').trim(),
              target: fieldLabel,
              status: 'completed'
            });
            break;
          }
        }
        if (!clickedOption && isInput) {
          el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 }));
          await sleep(80);
          el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
          filledCount++;
        }
      } else if (inst.type !== 'file' && inst.value !== '[ATTACH_RESUME]') {
        await simulateTyping(el, inst.value);
        filledCount++;
      }
      
      removeSpotlight();
      await sleep(randomDelay(200, 500));

    } catch (e) {
      console.warn('Field fill error for selector ' + inst.selector, e);
      skippedCount++;
    }
  }

  emitTelemetry({
    type: 'status',
    title: 'Autofill step finished',
    detail: 'Filled ' + filledCount + ' / ' + instructions.length + ' fields successfully',
    status: 'completed'
  });

  return { filledCount, skippedCount };
})();
`;
}
