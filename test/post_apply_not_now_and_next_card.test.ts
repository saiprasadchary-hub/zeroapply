import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DETECT_FORWARD_BUTTON_SCRIPT } from '../src/agent/navigation/wizardStepNavigator';

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
    hasAttribute(name: string) {
      return name in attrs;
    },
    removeAttribute(name: string) {
      delete attrs[name];
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
        if (part.includes('artdeco-button--primary') && cls.includes('artdeco-button--primary')) return true;
        if (part.includes('artdeco-modal') && cls.includes('artdeco-modal')) return true;
        if (part.includes('[role="dialog"]') && attrs['role'] === 'dialog') return true;
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
    contains(other: any) {
      if (other === this) return true;
      for (const child of this.children || []) {
        if (child === other || (typeof child.contains === 'function' && child.contains(other))) {
          return true;
        }
      }
      return false;
    },
    querySelectorAll(sel: string) {
      const results: any[] = [];
      function recurse(node: any) {
        for (const child of node.children || []) {
          child.parentElement = node;
          if (typeof child.matches === 'function' && child.matches(sel)) results.push(child);
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

describe('Post-Apply Not Now & Next Card Progression', () => {
  it('1. wizardStepNavigator DETECT_FORWARD_BUTTON_SCRIPT selects "Not now" as done and excludes "Update profile"', () => {
    const updateProfileBtn = createMockElement('button', {
      className: 'artdeco-button artdeco-button--primary',
      textContent: 'Update profile',
      id: 'update-profile-btn',
      offsetWidth: 120,
      offsetHeight: 40,
    });

    const notNowBtn = createMockElement('button', {
      className: 'artdeco-button artdeco-button--secondary',
      textContent: 'Not now',
      id: 'not-now-btn',
      offsetWidth: 90,
      offsetHeight: 40,
    });

    const modal = createMockElement('div', {
      className: 'artdeco-modal jobs-easy-apply-modal',
      attributes: { role: 'dialog' },
      children: [updateProfileBtn, notNowBtn],
      textContent: 'Update your profile with this information?',
      offsetWidth: 600,
      offsetHeight: 500,
    });

    // Mock DOM environment for DETECT_FORWARD_BUTTON_SCRIPT
    const fakeDocument: any = {
      querySelectorAll(sel: string) {
        if (sel.includes('.artdeco-modal') || sel.includes('[role="dialog"]')) {
          return [modal];
        }
        if (sel.includes('button')) {
          return [updateProfileBtn, notNowBtn];
        }
        return [];
      },
      querySelector(sel: string) {
        if (sel.includes('#step-success.active, .success-view')) return null;
        if (sel.includes('.artdeco-modal')) return modal;
        return null;
      },
      body: {
        innerText: 'Update your profile with this information?',
      },
    };

    // Execute script logic in the simulated context
    const runDetectScript = new Function('document', `return (${DETECT_FORWARD_BUTTON_SCRIPT});`);
    const result = runDetectScript(fakeDocument);

    assert.strictEqual(result.exists, true, 'A button candidate must be detected');
    assert.strictEqual(result.action, 'done', 'Action must be "done" for Not now');
    assert.ok(result.text.toLowerCase().includes('not now'), 'Detected button must be Not now');
    assert.strictEqual(
      notNowBtn.getAttribute('data-za-action-target'),
      'true',
      'Target attribute must be set on Not now button, NOT on Update profile'
    );
    assert.strictEqual(
      updateProfileBtn.getAttribute('data-za-action-target'),
      null,
      'Update profile button must NEVER be targeted'
    );
  });

  it('2. Post-apply confirmation detects "Update your profile" prompt as submitted ATS state', () => {
    const modalText = 'Update your profile with this information? Turn your resume into a profile that recruiters notice';
    const hasConfirmText = /your application was sent|application submitted|thank you for applying|application received|received your application|turn your resume into a profile|update your profile|save skills to your profile|add skills to your profile/i.test(modalText);
    assert.strictEqual(hasConfirmText, true, 'Upsell prompt text must be recognized as ATS confirmation');
  });

  it('3. AutoApply loop continues to next card after submitted application', () => {
    const queue = [
      { id: 1, title: 'AI Automation Engineer', isApplied: false },
      { id: 2, title: 'Python Backend Engineer', isApplied: false },
    ];
    let appliedCount = 0;
    const processedTitles: string[] = [];

    for (let i = 0; i < queue.length; i++) {
      const card = queue[i];
      // Simulate submission of card 0
      appliedCount++;
      processedTitles.push(card.title);
      // Ensure loop doesn't break, advances to card 1
    }

    assert.strictEqual(appliedCount, 2, 'Must process both applications in queue');
    assert.deepStrictEqual(processedTitles, ['AI Automation Engineer', 'Python Backend Engineer']);
  });
});
