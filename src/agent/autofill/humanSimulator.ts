/**
 * ZeroApply Autofill - Human Simulator Bridge
 */

export function normalizePhoneForField(phone: string, maxLength: number, pattern?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  // If starts with country code 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // If starts with 1 and has 11 digits, strip 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  if (maxLength > 0 && digits.length > maxLength) {
    digits = digits.slice(-maxLength);
  }

  if (pattern && pattern.includes('[6-9]')) {
    const match = digits.match(/[6-9]\d{9}$/);
    if (match) return match[0];
  }

  return digits;
}

export function normalizeChoiceText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function scoreOptionMatch(optionText: string, optionValue: string, target: string): number {
  const normOptText = normalizeChoiceText(optionText);
  const normOptVal = normalizeChoiceText(optionValue);
  const normTarget = normalizeChoiceText(target);

  if (!normTarget) return -1;

  if (normTarget === 'no') {
    if (normOptText === 'no' || normOptVal === 'no' || normOptVal === 'false') return 100;
    if (normOptText.includes('not applicable') || normOptText.includes('none')) return -1;
    return -1;
  }

  if (normTarget === 'yes') {
    if (normOptText === 'yes' || normOptVal === 'yes' || normOptVal === 'true') return 100;
    return -1;
  }

  if (target.startsWith('+') && (optionText.includes(target) || optionValue.includes(target))) {
    return 100;
  }

  if (normOptText === normTarget || normOptVal === normTarget) {
    return 100;
  }

  if (normTarget === 'remote') {
    if (normOptVal === 'remote' || normOptText === 'remote' || normOptText.includes('work from home')) {
      return 95;
    }
  }

  if (normOptText.includes(normTarget)) {
    return 80;
  }

  return -1;
}

export interface ChoiceOption {
  text: string;
  value?: string;
  disabled?: boolean;
}

export interface ChoiceMatchResult {
  index: number;
  score: number;
  margin: number;
  ambiguous: boolean;
}

export function resolveBestChoice(options: ChoiceOption[], target: string): ChoiceMatchResult | null {
  const scored = options.map((opt, idx) => ({
    index: idx,
    disabled: Boolean(opt.disabled),
    score: scoreOptionMatch(opt.text, opt.value || '', target),
    text: opt.text,
  }));

  const valid = scored.filter((s) => s.score > 0);
  if (valid.length === 0) return null;

  valid.sort((a, b) => b.score - a.score);

  const best = valid[0];
  if (best.disabled) return null;

  if (valid.length > 1) {
    const second = valid[1];
    if (second.score === best.score) {
      return null; // Ambiguous
    }
    const margin = best.score - second.score;
    return {
      index: best.index,
      score: best.score,
      margin,
      ambiguous: false,
    };
  }

  return {
    index: best.index,
    score: best.score,
    margin: 101,
    ambiguous: false,
  };
}

export function generateHumanBypassScript(instructionsJson: string): string {
  return `
    (() => {
      const instructions = JSON.parse(${JSON.stringify(instructionsJson)});
      const failedFields = [];
      function dispatchSingleClick(element) {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      function setNativeValue(element, typed) {
        element.value = typed;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      for (const inst of instructions) {
        const element = document.querySelector(inst.selector);
        if (!element) {
          failedFields.push(inst.selector);
          continue;
        }
        if (inst.type === 'select' || element.tagName === 'SELECT') {
          dispatchSingleClick(element);
          let matched = false;
          if (element.options) {
            for (let i = 0; i < element.options.length; i++) {
              if (element.options[i].text.includes(inst.value) || element.options[i].value === inst.value) {
                element.selectedIndex = i;
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            console.warn('no confident dropdown match for', inst.selector);
            console.warn('custom dropdown selection was not verified');
          }
          continue;
        }

        if (element.value === inst.value) {
          console.log('Already correct:', inst.selector);
          continue;
        }
        const max = element.maxLength;
        const typed = max > 0 ? inst.value.slice(0, max) : inst.value;
        setNativeValue(element, typed);
      }
      return { success: failedFields.length === 0, failedFields };
    })()
  `;
}
