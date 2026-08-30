export function normalizePhoneForField(value: string, maxLength = 0, pattern = ''): string {
  const digits = String(value || '').replace(/\D/g, '');
  const quantifiedLengths = Array.from(pattern.matchAll(/\{(\d+)\}/g), (match) => Number(match[1]));
  const patternLength = quantifiedLengths.length > 0 ? quantifiedLengths.reduce((total, length) => total + length, 0) : 0;
  const expectedLength = maxLength > 0 ? maxLength : patternLength;
  if (expectedLength > 0 && digits.length > expectedLength) return digits.slice(-expectedLength);
  return digits;
}

export interface ChoiceCandidate {
  text: string;
  value?: string;
  disabled?: boolean;
}

export interface ChoiceResolution {
  index: number;
  score: number;
  margin: number;
  ambiguous: boolean;
}

export function normalizeChoiceText(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreOptionMatch(optionText: string, optionValue: string, targetValue: string): number {
  const target = normalizeChoiceText(targetValue);
  const optText = normalizeChoiceText(optionText);
  const optVal = normalizeChoiceText(optionValue);
  if (!target || (!optText && !optVal)) return -1;
  if (/^(?:select|please select|choose|select an option|select one|choose an option|options?)$/.test(optText)) return -1;

  if (optText === target || optVal === target) return 100;

  const targetDial = String(targetValue || '').match(/\+(\d{1,4})/);
  const optionDial = String(optionText || optionValue || '').match(/\+(\d{1,4})/);
  if (targetDial && optionDial && targetDial[1] === optionDial[1]) return 100;

  const yesWords = new Set(['yes', 'true', '1']);
  const noWords = new Set(['no', 'false', '0']);
  if (yesWords.has(target) && (yesWords.has(optText) || yesWords.has(optVal))) return 98;
  if (noWords.has(target) && (noWords.has(optText) || noWords.has(optVal))) return 98;

  const aliases: Array<[RegExp, RegExp]> = [
    [/\b(?:india|indian)\b/, /\b(?:india|indian)\b/],
    [/\b(?:united states|usa|us)\b/, /\b(?:united states|usa|us)\b/],
    [/\b(?:united kingdom|uk|great britain)\b/, /\b(?:united kingdom|uk|great britain)\b/],
    [/\b(?:remote|work from home|virtual)\b/, /\b(?:remote|work from home|virtual)\b/],
    [/\b(?:on site|onsite|in office)\b/, /\b(?:on site|onsite|in office)\b/],
    [/\b(?:bachelor|undergraduate|b tech|b e|b s|b a|bca)\b/, /\b(?:bachelor|undergraduate|b tech|b e|b s|b a|bca)\b/],
    [/\b(?:master|postgraduate|m tech|m e|m s|mba|mca)\b/, /\b(?:master|postgraduate|m tech|m e|m s|mba|mca)\b/],
    [/\b(?:doctorate|ph d|phd)\b/, /\b(?:doctorate|ph d|phd)\b/],
    [/\b(?:prefer not|decline|do not wish)\b/, /\b(?:prefer not|decline|do not wish|choose not)\b/],
  ];
  for (const [targetPattern, optionPattern] of aliases) {
    if (targetPattern.test(target) && (optionPattern.test(optText) || optionPattern.test(optVal))) return 94;
  }

  if (target.length >= 4 && (optText.includes(target) || optVal.includes(target))) return 82;
  if (optText.length >= 4 && target.includes(optText)) return 78;

  const targetTokens = new Set(target.split(' ').filter((token) => token.length > 1));
  const optionTokens = new Set(optText.split(' ').filter((token) => token.length > 1));
  let intersection = 0;
  for (const token of targetTokens) if (optionTokens.has(token)) intersection++;
  if (intersection === 0) return -1;
  const union = new Set([...targetTokens, ...optionTokens]).size;
  return Math.round((intersection / Math.max(union, 1)) * 70);
}

export function resolveBestChoice(
  choices: ChoiceCandidate[],
  targetValue: string,
  minimumScore = 70,
  minimumMargin = 8,
): ChoiceResolution | null {
  const ranked = choices
    .map((choice, index) => ({
      index,
      disabled: Boolean(choice.disabled),
      score: scoreOptionMatch(choice.text, choice.value || '', targetValue),
    }))
    .filter((choice) => !choice.disabled && choice.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (ranked.length === 0 || ranked[0].score < minimumScore) return null;
  const runnerUpScore = ranked[1]?.score ?? -1;
  const margin = ranked[0].score - runnerUpScore;
  const ambiguous = ranked[0].score < 98 && runnerUpScore >= minimumScore && margin < minimumMargin;
  if (ambiguous) return null;
  return { index: ranked[0].index, score: ranked[0].score, margin, ambiguous: false };
}

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
  const normalizePhoneForField = ${normalizePhoneForField.toString()};
  const normalizeChoiceText = ${normalizeChoiceText.toString()};
  const scoreOptionMatch = ${scoreOptionMatch.toString()};
  const resolveBestChoice = ${resolveBestChoice.toString()};
  let filledCount = 0;
  let skippedCount = 0;
  let preservedCount = 0;
  const failedFields = [];

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


  // Remove any legacy laser badges or popup bars if present
  try {
    const oldBadges = document.querySelectorAll('#za_laser_badge, [id*="za_laser"]');
    oldBadges.forEach(b => b.parentNode && b.parentNode.removeChild(b));
  } catch {}

  // Inject High-End Visual Virtual Mouse Pointer
  let pointerEl = document.getElementById('za-virtual-cursor');
  if (!pointerEl) {
    const container = document.createElement('div');
    container.id = 'za-virtual-pointer-root';
    container.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none!important;user-select:none!important;';

    const cursorSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));"><path d="M3 3L10.07 20.97L13.58 13.58L20.97 10.07L3 3Z" fill="#09090b" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/></svg>';

    pointerEl = document.createElement('div');
    pointerEl.id = 'za-virtual-cursor';
    pointerEl.innerHTML = cursorSvg;
    pointerEl.style.cssText = 'position:fixed;top:0;left:0;width:24px;height:24px;transform:translate3d(' + (window.innerWidth/2) + 'px,' + (window.innerHeight/2) + 'px,0);transition:transform 0.22s cubic-bezier(0.2,0.8,0.2,1);pointer-events:none!important;will-change:transform;display:flex;align-items:flex-start;';

    const tag = document.createElement('div');
    tag.id = 'za-pointer-tag';
    tag.innerText = 'ZeroApply';
    tag.style.cssText = 'margin-left:16px;margin-top:14px;padding:2px 7px;background:#09090b;color:#ffffff;font-size:10px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.15);white-space:nowrap;letter-spacing:0.02em;opacity:0.92;';
    pointerEl.appendChild(tag);

    container.appendChild(pointerEl);
    document.documentElement.appendChild(container);
  }

  // Animate Virtual Mouse smoothly to element with realistic click dip & ripple
  async function animateVirtualMouse(element) {
    if (!element || !pointerEl) return;
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    pointerEl.style.transform = 'translate3d(' + targetX + 'px, ' + targetY + 'px, 0)';
    await sleep(220);

    // Micro click dip animation
    pointerEl.style.transform = 'translate3d(' + targetX + 'px, ' + targetY + 'px, 0) scale(0.85)';
    setTimeout(() => {
      if (pointerEl) pointerEl.style.transform = 'translate3d(' + targetX + 'px, ' + targetY + 'px, 0) scale(1)';
    }, 100);

    // Click ripple wave
    try {
      const ripple = document.createElement('div');
      ripple.style.cssText = 'position:fixed;left:' + targetX + 'px;top:' + targetY + 'px;width:24px;height:24px;margin-left:-12px;margin-top:-12px;border-radius:50%;border:1.5px solid #09090b;background:rgba(9,9,11,0.08);pointer-events:none!important;animation:zaRipple 0.35s cubic-bezier(0.1,0.8,0.3,1) forwards;';
      if (!document.getElementById('za-ripple-style')) {
        const style = document.createElement('style');
        style.id = 'za-ripple-style';
        style.innerHTML = '@keyframes zaRipple { 0% { transform: scale(0.3); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }';
        document.head.appendChild(style);
      }
      document.body.appendChild(ripple);
      setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 380);
    } catch {}

    // Native browser mouse event dispatch
    const eventNames = ['mousemove', 'mouseenter', 'mouseover', 'mousedown', 'mouseup'];
    eventNames.forEach(type => {
      const e = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: targetX,
        clientY: targetY
      });
      element.dispatchEvent(e);
    });
  }

  function isElementVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function dispatchSingleClick(element) {
    const rect = element.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    element.dispatchEvent(new PointerEvent('pointerdown', init));
    element.dispatchEvent(new MouseEvent('mousedown', init));
    element.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));
    element.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }));
    element.click();
  }

  function controlIsChecked(element) {
    if ('checked' in element) return Boolean(element.checked);
    return element.getAttribute('aria-checked') === 'true' || element.getAttribute('data-state') === 'checked';
  }

  function optionDisplayText(element) {
    if (!element) return '';
    return String(
      element.getAttribute('aria-label') ||
      element.getAttribute('data-value') ||
      element.innerText ||
      element.textContent ||
      element.getAttribute('value') ||
      '',
    ).replace(/\\s+/g, ' ').trim();
  }

  function selectedCustomValue(element) {
    const activeId = element.getAttribute('aria-activedescendant');
    const active = activeId ? document.getElementById(activeId) : null;
    const controlsId = element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
    const controlled = controlsId ? document.getElementById(controlsId.split(/\\s+/)[0]) : null;
    const selected = active || controlled?.querySelector('[role="option"][aria-selected="true"]');
    return optionDisplayText(selected) || String(element.value || element.getAttribute('data-value') || element.innerText || '').trim();
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

  function normalizedComparable(element, value, category) {
    const raw = String(value ?? '').trim();
    if (category === 'phone') return normalizePhoneForField(raw, element.maxLength > 0 ? element.maxLength : 0, element.getAttribute('pattern') || '');
    if (element.type === 'email') return raw.toLowerCase();
    return raw.replace(/\\s+/g, ' ');
  }

  function valueMatches(element, expected, category) {
    const actual = normalizedComparable(element, element.value, category);
    const target = normalizedComparable(element, expected, category);
    return Boolean(target) && actual === target;
  }

  // Simulate human typing character by character
  async function simulateTyping(element, text, category) {
    element.focus();
    
    // Clear existing
    setNativeValue(element, '');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    let typed = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      typed += char;
      setNativeValue(element, typed);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
      
      // Random keystroke delay: average 35-85ms
      await sleep(randomDelay(30, 90));
      
      // Occasional random pause (reading/thinking)
      if (Math.random() < 0.04) {
        await sleep(randomDelay(150, 400));
      }
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    await sleep(40);

    if (!valueMatches(element, text, category)) {
      element.focus();
      setNativeValue(element, text);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      await sleep(40);
    }
    return valueMatches(element, text, category);
  }

  // Autonomous Canvas Signature Pad Vector Signer
  async function simulateCanvasSignature(canvas, name) {
    if (!canvas) return;
    try {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      const width = rect.width || 300;
      const height = rect.height || 100;
      const startX = rect.left + width * 0.15;
      const startY = rect.top + height * 0.55;

      function dispatchPointer(type, clientX, clientY) {
        const init = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
          button: 0,
          buttons: 1,
          pressure: 0.7
        };
        canvas.dispatchEvent(new PointerEvent(type, init));
        canvas.dispatchEvent(new MouseEvent(type, init));
      }

      dispatchPointer('pointerdown', startX, startY);
      dispatchPointer('mousedown', startX, startY);

      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(width * 0.15, height * 0.55);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
      }

      // Generate smooth cursive wave loop strokes based on applicant name
      const pointsCount = Math.max(16, Math.min(40, (name || 'Applicant').length * 2));
      const stepX = (width * 0.7) / pointsCount;

      for (let p = 0; p <= pointsCount; p++) {
        const curX = startX + p * stepX;
        const wave = Math.sin(p * 0.7) * (height * 0.18) + Math.cos(p * 1.3) * (height * 0.08);
        const curY = startY + wave;

        dispatchPointer('pointermove', curX, curY);
        dispatchPointer('mousemove', curX, curY);

        if (ctx) {
          ctx.lineTo(width * 0.15 + p * stepX, height * 0.55 + wave);
          ctx.stroke();
        }

        await sleep(15);
      }

      const endX = startX + pointsCount * stepX;
      const endY = startY;
      dispatchPointer('pointerup', endX, endY);
      dispatchPointer('mouseup', endX, endY);
      canvas.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      console.warn('Canvas signature generation skipped:', e);
    }
  }

  function legacyScoreOptionMatch(optionText, optionValue, targetValue) {
    if (!targetValue || (!optionText && !optionValue)) return -1;
    const target = String(targetValue).toLowerCase().trim();
    const optText = String(optionText || '').toLowerCase().trim();
    const optVal = String(optionValue || '').toLowerCase().trim();

    // Ignore generic placeholder options
    if (/^(?:select|please select|choose|--|select an option|select one|choose an option|options)$/i.test(optText)) return -1;

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

    // 2. Yes / No / Authorization / Sponsorship / Driver's License Matching
    if (target === 'yes' || target === 'true' || target === '1' || /^yes/i.test(target)) {
      if (/^yes|^true|authorized|citizen|permanent resident|agree|acknowledge|certify|confirm|eligible|valid license|have a (?:valid )?driver/i.test(optText) || optVal === 'true' || optVal === '1' || optVal === 'yes') return 95;
    }
    if (target === 'no' || target === 'false' || target === '0' || /^no/i.test(target)) {
      if (/^no|^false|will not|do not|none|disagree|not a (?:protected )?veteran|no disability|do not require|not authorized/i.test(optText) || optVal === 'false' || optVal === '0' || optVal === 'no') return 95;
    }

    // 3. Notice Period / Availability Matching
    if (/immediate|2 week|notice|start date/i.test(target)) {
      if (/immediate|serving notice|15 days|2 weeks|1 month|less than 1 month|asap/i.test(optText)) return 90;
    }

    // 4. Experience & Proficiency Levels
    const numTarget = parseInt(target, 10);
    if (!isNaN(numTarget)) {
      if (optText.includes(String(numTarget)) || optVal === String(numTarget)) return 90;
      if (numTarget >= 5 && /expert|advanced|senior|lead|5\\+|5 to|5-7|7\\+|10\\+/i.test(optText)) return 85;
      if (numTarget >= 2 && numTarget <= 4 && /intermediate|proficient|mid|2 to|2\\+|3\\+|3-5|2-4/i.test(optText)) return 85;
      if (numTarget <= 1 && /beginner|entry|fresher|junior|0-1|1\\+|less than 1/i.test(optText)) return 85;
    }

    // 5. Degree & Education Levels
    if (/bachelor/i.test(target) && /bachelor|undergraduate|b\\.?tech|b\\.?e\\.|b\\.?s\\.|b\\.?a\\.|bca|bs/i.test(optText)) return 95;
    if (/master/i.test(target) && /master|postgraduate|m\\.?tech|m\\.?s\\.|m\\.?e\\.|mba|mca|ms/i.test(optText)) return 95;
    if (/ph\\.?d|doctor/i.test(target) && /doctor|ph\\.?d/i.test(optText)) return 95;

    // 6. EEO Demographics & Self-Identification
    if (/decline|not wish|prefer not/i.test(target) && /decline|prefer not|do not wish|choose not|not specified|i do not/i.test(optText)) return 95;

    // 7. Work Preference
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

      let intendedValue = String(inst.value ?? '');
      if (inst.category === 'phone') {
        intendedValue = normalizePhoneForField(
          intendedValue,
          el.maxLength > 0 ? el.maxLength : 0,
          el.getAttribute('pattern') || '',
        );
      }

      if (!['select', 'radio', 'checkbox', 'custom_dropdown', 'file', 'signature'].includes(inst.type)
        && valueMatches(el, intendedValue, inst.category)) {
        preservedCount++;
        filledCount++;
        emitTelemetry({
          type: 'status',
          title: 'Already correct: ' + fieldLabel,
          target: fieldLabel,
          status: 'completed'
        });
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


      // Animate virtual mouse smoothly to element with click ripple
      await animateVirtualMouse(el);
      await sleep(randomDelay(80, 180));
      
      // Scroll element into view smoothly if not visible
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(randomDelay(120, 300));

      if (inst.type === 'select') {
        const options = Array.from(el.options);
        const resolution = resolveBestChoice(options.map(o => ({
          text: o.text || o.label || '',
          value: o.value || '',
          disabled: o.disabled || o.hidden,
        })), inst.value);
        const bestMatch = resolution ? options[resolution.index] : null;

        if (bestMatch) {
          const currentOption = el.options[el.selectedIndex];
          if (currentOption && scoreOptionMatch(currentOption.text, currentOption.value, inst.value) >= 70) {
            preservedCount++;
            filledCount++;
            continue;
          }
          el.focus();
          await sleep(randomDelay(100, 200));
          try {
            // Reset React internal value tracker so React detects the selection change
            const tracker = el._valueTracker;
            if (tracker && typeof tracker.setValue === 'function') {
              tracker.setValue('');
            }
            const selectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
            if (selectValueSetter) {
              selectValueSetter.call(el, bestMatch.value);
            } else {
              el.value = bestMatch.value;
            }
          } catch {
            el.value = bestMatch.value;
          }

          el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          await sleep(60);
          const selectedOption = el.options[el.selectedIndex];
          const verified = Boolean(selectedOption) && scoreOptionMatch(selectedOption.text, selectedOption.value, inst.value) >= 70;
          if (verified) {
            filledCount++;
            emitTelemetry({
              type: 'click',
              title: 'Selected dropdown: ' + (selectedOption.text || selectedOption.value).trim(),
              target: fieldLabel,
              status: 'completed'
            });
          } else {
            failedFields.push(fieldLabel);
            skippedCount++;
          }
        } else {
          failedFields.push(fieldLabel + ' (no confident dropdown match)');
          skippedCount++;
        }
      } else if (inst.type === 'radio') {
        const radios = Array.from(document.querySelectorAll(inst.selector)).filter(isElementVisible);
        const radioChoices = radios.map(r => {
          let label = optionDisplayText(r);
          if (r.id) {
            const associated = document.querySelector('label[for="' + CSS.escape(r.id) + '"]');
            if (associated) label = optionDisplayText(associated);
          }
          if ((!label || label === r.value) && r.closest('label')) label = optionDisplayText(r.closest('label'));
          return { text: label, value: r.value || r.getAttribute('data-value') || '', disabled: r.disabled || r.getAttribute('aria-disabled') === 'true' };
        });
        const resolution = resolveBestChoice(radioChoices, inst.value);
        const bestRadio = resolution ? radios[resolution.index] : null;

        if (bestRadio) {
          if (controlIsChecked(bestRadio)) {
            preservedCount++;
            filledCount++;
            continue;
          }
          await animateVirtualMouse(bestRadio);
          await sleep(randomDelay(80, 160));
          dispatchSingleClick(bestRadio);
          await sleep(60);
          if (controlIsChecked(bestRadio)) filledCount++;
          else {
            failedFields.push(fieldLabel);
            skippedCount++;
          }
          emitTelemetry({
            type: 'click',
            title: 'Selected radio option',
            target: fieldLabel,
            status: 'completed'
          });
        } else {
          failedFields.push(fieldLabel + ' (no confident radio match)');
          skippedCount++;
        }
      } else if (inst.type === 'checkbox') {
        let lbl = '';
        if (el.id) {
          const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          if (l) lbl = l.innerText.trim();
        }
        if (!lbl && el.closest('label')) lbl = el.closest('label').innerText.trim();
        if (!lbl) lbl = optionDisplayText(el);
        const labelLower = (lbl || '').toLowerCase();

        const valLower = normalizeChoiceText(inst.value || '');
        const affirmative = new Set(['yes', 'true', '1', 'checked', 'check']);
        const negative = new Set(['no', 'false', '0', 'unchecked', 'uncheck']);
        const desiredState = affirmative.has(valLower) ? true : negative.has(valLower) ? false : null;

        const isFollowCompany = /follow\\s+.*to stay up to date|follow company|follow this employer/i.test(labelLower);

        const targetState = isFollowCompany ? false : desiredState;
        if (targetState === null) {
          failedFields.push(fieldLabel + ' (checkbox answer was not explicit)');
          skippedCount++;
        } else if (controlIsChecked(el) === targetState) {
          preservedCount++;
          filledCount++;
        } else {
          await animateVirtualMouse(el);
          await sleep(randomDelay(80, 160));
          dispatchSingleClick(el);
          await sleep(60);
          if (controlIsChecked(el) === targetState) {
            filledCount++;
            emitTelemetry({
              type: 'click',
              title: (targetState ? 'Checked: ' : 'Unchecked: ') + fieldLabel,
              target: fieldLabel,
              status: 'completed'
            });
          } else {
            failedFields.push(fieldLabel);
            skippedCount++;
          }
        }
      } else if (inst.type === 'custom_dropdown') {
        const isInput = el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea';
        if (scoreOptionMatch(selectedCustomValue(el), el.value || '', inst.value) >= 70) {
          preservedCount++;
          filledCount++;
          continue;
        }
        if (isInput) {
          await simulateTyping(el, intendedValue, inst.category);
        } else {
          await animateVirtualMouse(el);
          await sleep(80);
          el.focus();
          dispatchSingleClick(el);
        }

        let clickedOption = false;
        let clickedOptionText = '';
        // Adaptive polling loop: wait for suggestions to render over network
        for (let pollAttempt = 0; pollAttempt < 6; pollAttempt++) {
          await sleep(150);

          const controlledIds = String(el.getAttribute('aria-controls') || el.getAttribute('aria-owns') || '').split(/\\s+/).filter(Boolean);
          const controlledContainers = controlledIds.map(id => document.getElementById(id)).filter(Boolean);
          const dropdownContainers = controlledContainers
            .concat(Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .typeahead-options, .artdeco-dropdown__content, .Select-menu-outer, .MuiAutocomplete-listbox, .ant-select-dropdown, .fb-dropdown__select-dropdown, ul[class*="dropdown"]')))
            .concat(el.closest('.search-basic-typeahead, [class*="typeahead"], [class*="dropdown"], .fb-dropdown, .artdeco-dropdown') || []);
            
          for (const container of dropdownContainers) {
            if (!container || !isElementVisible(container)) continue;
            const options = Array.from(container.querySelectorAll('[role="option"], [role="menuitemradio"], [role="menuitem"], .artdeco-dropdown__item, li, .option, .item, button'))
              .filter(option => isElementVisible(option));
            const resolution = resolveBestChoice(options.map(option => ({
              text: optionDisplayText(option),
              value: option.getAttribute('data-value') || option.getAttribute('value') || '',
              disabled: option.getAttribute('aria-disabled') === 'true' || option.disabled,
            })), inst.value);
            const bestMatch = resolution ? options[resolution.index] : null;
            if (bestMatch) {
              clickedOptionText = optionDisplayText(bestMatch);
              await animateVirtualMouse(bestMatch);
              await sleep(80);
              dispatchSingleClick(bestMatch);
              await sleep(80);
              const selectedValue = selectedCustomValue(el);
              clickedOption = scoreOptionMatch(selectedValue, el.value || '', inst.value) >= 70 ||
                bestMatch.getAttribute('aria-selected') === 'true' ||
                scoreOptionMatch(clickedOptionText, bestMatch.getAttribute('data-value') || '', inst.value) >= 98;
              break;
            }
          }
          if (clickedOption) break;
        }

        // Check for underlying hidden select element in parent wrapper
        const parentContainer = el.closest('.fb-dropdown, .artdeco-dropdown, [class*="dropdown"], [class*="select"]');
        if (!clickedOption && parentContainer) {
          const hiddenSelect = parentContainer.querySelector('select');
          if (hiddenSelect && hiddenSelect.options) {
            const opts = Array.from(hiddenSelect.options);
            const resolution = resolveBestChoice(opts.map(option => ({
              text: option.text || option.label || '',
              value: option.value || '',
              disabled: option.disabled || option.hidden,
            })), inst.value);
            const bestHiddenMatch = resolution ? opts[resolution.index] : null;
            if (bestHiddenMatch) {
              try {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
                if (setter) setter.call(hiddenSelect, bestHiddenMatch.value);
                else hiddenSelect.value = bestHiddenMatch.value;
              } catch {
                hiddenSelect.value = bestHiddenMatch.value;
              }
              hiddenSelect.dispatchEvent(new Event('input', { bubbles: true }));
              hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
              hiddenSelect.dispatchEvent(new Event('blur', { bubbles: true }));
              const selected = hiddenSelect.options[hiddenSelect.selectedIndex];
              clickedOption = Boolean(selected) && scoreOptionMatch(selected.text, selected.value, inst.value) >= 70;
              clickedOptionText = selected ? selected.text : '';
            }
          }
        }

        if (!clickedOption && isInput) {
          el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 }));
          await sleep(80);
          el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
          await sleep(80);
          clickedOption = scoreOptionMatch(selectedCustomValue(el), el.value || '', inst.value) >= 70;
        }

        if (clickedOption) {
          filledCount++;
          emitTelemetry({
            type: 'click',
            title: 'Selected custom dropdown: ' + (clickedOptionText || inst.value),
            target: fieldLabel,
            status: 'completed'
          });
        } else {
          failedFields.push(fieldLabel + ' (custom dropdown selection was not verified)');
          skippedCount++;
        }
      } else if (el.tagName.toLowerCase() === 'canvas' || inst.type === 'signature') {
        await simulateCanvasSignature(el, inst.value);
        filledCount++;
        emitTelemetry({
          type: 'type',
          title: 'Signed signature canvas',
          target: fieldLabel,
          status: 'completed'
        });
      } else if (inst.type !== 'file' && inst.value !== '[ATTACH_RESUME]') {
        let textToType = intendedValue;
        const isNumericInput = el.type === 'number' || el.getAttribute('inputmode') === 'numeric' || (el.getAttribute('pattern') && el.getAttribute('pattern').includes('[0-9]'));
        if (inst.category === 'phone') {
          textToType = normalizePhoneForField(textToType, el.maxLength > 0 ? el.maxLength : 0, el.getAttribute('pattern') || '');
        } else if (isNumericInput) {
          const numDigits = textToType.match(/\\b[0-9]+(?:\\.[0-9]+)?\\b/);
          if (numDigits) {
            textToType = numDigits[0];
          } else {
            const maxVal = el.getAttribute('max');
            textToType = maxVal || '10';
          }
        }
        const typed = await simulateTyping(el, textToType, inst.category);
        if (typed) filledCount++;
        else {
          failedFields.push(fieldLabel);
          skippedCount++;
        }
      }

      await sleep(randomDelay(150, 350));

    } catch (e) {
      console.warn('Field fill error for selector ' + inst.selector, e);
      failedFields.push(fieldLabel);
      skippedCount++;
    }
  }

  emitTelemetry({
    type: 'status',
    title: 'Autofill step finished',
    detail: 'Filled ' + filledCount + ' / ' + instructions.length + ' fields successfully',
    status: 'completed'
  });

  return { filledCount, skippedCount, preservedCount, failedFields };
})();
`;
}
