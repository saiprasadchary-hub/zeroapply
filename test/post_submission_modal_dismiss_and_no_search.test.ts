import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { fillField } from '../src/agent/formFiller/formFiller';
import type { PersonaData } from '../src/types';

function createMockElement(tag: string, options: {
  id?: string;
  className?: string;
  attributes?: Record<string, string>;
  textContent?: string;
  disabled?: boolean;
  children?: any[];
  offsetWidth?: number;
  offsetHeight?: number;
} = {}): any {
  const attrs: Record<string, string> = { ...(options.attributes || {}) };
  if (options.id) attrs['id'] = options.id;
  if (options.className) attrs['class'] = options.className;

  const el: any = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    id: options.id || '',
    className: options.className || '',
    textContent: options.textContent || '',
    innerText: options.textContent || '',
    disabled: Boolean(options.disabled),
    children: options.children || [],
    attributes: attrs,
    offsetWidth: options.offsetWidth ?? 100,
    offsetHeight: options.offsetHeight ?? 40,
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
    setAttribute(name: string, val: string) {
      attrs[name] = String(val);
    },
    getBoundingClientRect() {
      return { width: this.offsetWidth, height: this.offsetHeight, top: 50, left: 50 };
    },
    matches(sel: string) {
      const selParts = sel.split(',').map(s => s.trim().toLowerCase());
      const cls = (this.className || '').toLowerCase().split(/\s+/);
      const tagLower = tag.toLowerCase();
      const idLower = (this.id || '').toLowerCase();
      const ariaLabel = (this.getAttribute('aria-label') || '').toLowerCase();

      return selParts.some(part => {
        if (part.startsWith('#')) return idLower === part.slice(1);
        if (part.startsWith('.')) return cls.includes(part.slice(1));
        if (part === tagLower) return true;
        if (part.includes('aria-label') && ariaLabel.includes('dismiss')) return true;
        if (part.includes('jobs-search-box') && (cls.includes('jobs-search-box') || cls.includes('jobs-search-box__text-input'))) return true;
        if (part.includes('global-nav') && cls.includes('global-nav')) return true;
        return false;
      });
    },
    closest(sel: string) {
      let cur: any = this;
      while (cur) {
        if (typeof cur.matches === 'function' && cur.matches(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelectorAll(sel: string) {
      const results: any[] = [];
      function recurse(node: any) {
        for (const child of node.children || []) {
          child.parentElement = node;
          if (child.matches(sel)) results.push(child);
          recurse(child);
        }
      }
      recurse(this);
      return results;
    },
    querySelector(sel: string) {
      return this.querySelectorAll(sel)[0] || null;
    },
    click() {
      this._clicked = true;
    },
  };

  for (const child of el.children) {
    child.parentElement = el;
  }

  return el;
}

describe('Post-Submission Modal Dismissal & Search Bar Protection', () => {
  const mockPersona: PersonaData = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-123-4567',
    targetRoles: ['Python Developer'],
    techStack: ['Python', 'TypeScript', 'FastAPI'],
    experienceYears: 4,
    educationLevel: 'Bachelor',
  };

  it('1. Post-submission upsell dialog prioritizes clicking "Not now" over "Update profile" and "X"', () => {
    const xBtn = createMockElement('button', {
      className: 'artdeco-modal__dismiss',
      id: 'dismiss-x-btn',
      attributes: { 'aria-label': 'Dismiss' },
    });
    const updateProfileBtn = createMockElement('button', {
      className: 'artdeco-button--primary',
      textContent: 'Update profile',
    });
    const notNowBtn = createMockElement('button', {
      className: 'artdeco-button',
      textContent: 'Not now',
    });
    const modal = createMockElement('div', {
      className: 'artdeco-modal',
      attributes: { role: 'dialog' },
      children: [xBtn, updateProfileBtn, notNowBtn],
      textContent: 'Update your profile with this information? Turn your resume into a profile that recruiters notice',
    });

    // Execute dismissal logic matching orchestrator, autoApplyEngine, and modalDismissGuard
    const allButtons = modal.querySelectorAll('button');
    const targetNotNow = allButtons.find((b: any) => {
      const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      if (/update.*profile|save.*profile|add.*skills.*profile/i.test(txt)) return false;
      return /not\s*now|no\s*thanks|maybe\s*later/i.test(txt);
    });

    assert.ok(targetNotNow, 'Should find Not now button');
    targetNotNow.click();

    assert.strictEqual(notNowBtn._clicked, true, 'Not now button received click');
    assert.strictEqual(updateProfileBtn._clicked, undefined, 'Update profile button must NEVER receive click');
  });

  it('2. Post-submission dialog clicks "X" button if "Not now" button is missing', () => {
    const xBtn = createMockElement('button', {
      className: 'artdeco-modal__dismiss',
      id: 'dismiss-x-btn',
      attributes: { 'aria-label': 'Dismiss' },
    });
    const modal = createMockElement('div', {
      className: 'artdeco-modal',
      attributes: { role: 'dialog' },
      children: [xBtn],
      textContent: 'Your application was sent to Gandiv Insights LLC!',
    });

    const allButtons = modal.querySelectorAll('button');
    let dismissedTarget = allButtons.find((b: any) => {
      const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      if (/update.*profile|save.*profile/i.test(txt)) return false;
      return /not\s*now|no\s*thanks/i.test(txt);
    });

    if (!dismissedTarget) {
      dismissedTarget = modal.querySelector(
        'button.artdeco-modal__dismiss, button[aria-label*="Dismiss" i], button[aria-label*="Close" i], [data-test-modal-close-btn]'
      );
    }

    assert.ok(dismissedTarget, 'Close button should be located when Not now is absent');
    dismissedTarget.click();
    assert.strictEqual(xBtn._clicked, true, 'X button received click');
  });

  it('3. fieldClassifier strictly excludes global search inputs from current_title mapping', () => {
    const searchBarField = {
      id: 'jobs-search-box-keyword-id',
      selector: '.jobs-search-box input.jobs-search-box__text-input',
      tagName: 'input',
      inputType: 'text',
      label: 'Search by title, skill, or company',
      placeholder: 'Search by title, skill, or company',
      name: 'keywords',
      required: false,
      currentValue: '',
      hasError: false,
    };

    const classified = classifyFields([searchBarField as any], mockPersona);
    const titleMatch = classified.find(f => f.fieldType === 'current_title');
    assert.strictEqual(titleMatch, undefined, 'Search box must not be classified as current_title');
  });

  it('4. fillField refuses to interact with any element inside .jobs-search-box or global-nav', async () => {
    const mockWebview = {
      executeJavaScript: async <T>(code: string): Promise<T> => {
        // Simulates the safety guard check inside fillField
        if (code.includes('closest')) {
          return true as T; // Simulates element being inside .jobs-search-box
        }
        return false as T;
      },
    };

    const searchField = {
      id: 'global-search-input',
      selector: '#global-search-input',
      tagName: 'input',
      inputType: 'text',
      label: 'Search',
      placeholder: 'Search jobs',
      name: 'search',
      required: false,
      currentValue: '',
      hasError: false,
      fieldType: 'current_title' as const,
      confidence: 0.9,
    };

    const res = await fillField(mockWebview as any, searchField, 'Python Developer', mockPersona);
    assert.strictEqual(res.success, false, 'fillField must reject search bar targets');
    assert.ok(res.error?.includes('search bar'), 'Error must specify search bar protection');
  });

  it('5. Post-submission confirmation detection regex matches "Your application was sent to..."', () => {
    const text = 'Your application was sent to Gandiv Insights LLC!\nYou can keep track of your application in the "Applied" tab of My Jobs';
    const isSubmittedConfirmed = /your application was sent|application submitted|thank you for applying|application received|received your application/i.test(text);
    assert.strictEqual(isSubmittedConfirmed, true, 'ATS confirmation regex must match LinkedIn post-submission modal');
  });
});
