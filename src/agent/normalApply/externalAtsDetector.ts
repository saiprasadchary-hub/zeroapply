import type { ExternalAtsKind } from './normalApplyTypes';

export interface ExternalAtsProfile {
  kind: ExternalAtsKind;
  displayName: string;
  formSelector: string;
  hasLandingApplyButton: boolean;
  landingApplySelector?: string;
}

export class ExternalAtsDetector {
  /**
   * Identifies the external ATS architecture from the current URL and DOM signatures.
   */
  public async detectAts(view: any): Promise<ExternalAtsProfile> {
    const script = `
      (() => {
        const url = window.location.href.toLowerCase();
        const host = window.location.hostname.toLowerCase();
        const bodyText = document.body ? document.body.innerText.slice(0, 1500).toLowerCase() : '';

        // Helper to check if an element is visible
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        // 0. Google Forms
        if (host.includes('docs.google.com') || host.includes('forms.gle')) {
          return {
            kind: 'generic',
            displayName: 'Google Forms',
            formSelector: 'form, [role="list"]',
            hasLandingApplyButton: false,
          };
        }

        // 1. Greenhouse
        if (host.includes('greenhouse.io') || document.querySelector('#application_form, #application, form[action*="greenhouse"]')) {
          const applyBtn = Array.from(document.querySelectorAll('a, button')).find((b) => 
            /apply for this job|apply now/i.test(b.textContent || '') && isVisible(b)
          );
          return {
            kind: 'greenhouse',
            displayName: 'Greenhouse ATS',
            formSelector: '#application_form, #application, form',
            hasLandingApplyButton: !!applyBtn && !document.querySelector('#first_name, input[name="first_name"]'),
            landingApplySelector: applyBtn ? (applyBtn.id ? '#' + applyBtn.id : 'a[href*="#app"], .postings-btn') : undefined
          };
        }

        // 2. Lever
        if (host.includes('lever.co') || document.querySelector('.application-form, .posting-headline, a[href*="/apply"]')) {
          const applyBtn = Array.from(document.querySelectorAll('a.postings-btn, a[href*="/apply"], button')).find((b) =>
            /apply for this job|apply now/i.test(b.textContent || '') && isVisible(b)
          );
          return {
            kind: 'lever',
            displayName: 'Lever ATS',
            formSelector: '.application-form, form',
            hasLandingApplyButton: !!applyBtn && !document.querySelector('input[name="name"], input[name="email"]'),
            landingApplySelector: applyBtn ? 'a.postings-btn, a[href*="/apply"]' : undefined
          };
        }

        // 3. Workday
        if (host.includes('myworkdayjobs.com') || host.includes('workday.com') || document.querySelector('[data-automation-id*="workday"]')) {
          const applyBtn = Array.from(document.querySelectorAll('button, a')).find((b) =>
            /apply|apply now/i.test(b.textContent || '') && isVisible(b) && !/applied/i.test(b.textContent || '')
          );
          return {
            kind: 'workday',
            displayName: 'Workday Enterprise ATS',
            formSelector: '[data-automation-id*="form"], form, main',
            hasLandingApplyButton: !!applyBtn && !document.querySelector('input[type="text"]'),
            landingApplySelector: applyBtn ? '[data-automation-id*="apply"], button' : undefined
          };
        }

        // 4. Ashby
        if (host.includes('ashbyhq.com') || document.querySelector('[data-testid*="ashby"], [class*="ashby"]')) {
          return {
            kind: 'ashby',
            displayName: 'Ashby ATS',
            formSelector: '[data-testid="application-form"], form',
            hasLandingApplyButton: false,
          };
        }

        // 5. SmartRecruiters
        if (host.includes('smartrecruiters.com') || document.querySelector('form#st-apply-form, [class*="smartrecruiters"]')) {
          const applyBtn = Array.from(document.querySelectorAll('button, a')).find((b) =>
            /apply now|i'm interested/i.test(b.textContent || '') && isVisible(b)
          );
          return {
            kind: 'smartrecruiters',
            displayName: 'SmartRecruiters',
            formSelector: '#st-apply-form, form',
            hasLandingApplyButton: !!applyBtn && !document.querySelector('input[name*="email"]'),
            landingApplySelector: applyBtn ? 'button, a' : undefined
          };
        }

        // 6. Generic / Company Portal (e.g. SAP SuccessFactors, Taleo, iCIMS, Career Site Builder)
        const isExcludedWidget = (el) => {
          if (!el) return true;
          const parent = el.closest('header, nav, .jobs-search-box, [role="search"], .keywordsearch, .jobsearch, [class*="alert"], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield');
          if (parent) return true;
          const descriptor = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
          return /search|keyword|location|postal|alert|subscribe|frequency/i.test(descriptor);
        };

        const genericApplyBtn = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]')).find((b) =>
          /apply now|apply for this job|start application|submit application|^apply\b/i.test((b.textContent || b.value || '').trim()) &&
          isVisible(b) &&
          !/easy\s*apply|applied/i.test((b.textContent || b.value || '').trim())
        );

        // Genuine application fields (excluding search and alert inputs)
        const candidateInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).filter((el) => {
          return isVisible(el) && !isExcludedWidget(el);
        });

        const hasRealApplicationForm = candidateInputs.length >= 2 && candidateInputs.some((el) => {
          const descriptor = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
          return /first.*name|last.*name|email|phone|resume|cover.*letter|address|experience|education/i.test(descriptor);
        });

        return {
          kind: 'generic',
          displayName: 'Direct ATS Portal',
          formSelector: 'form, [role="form"], main',
          hasLandingApplyButton: !!genericApplyBtn && !hasRealApplicationForm,
          landingApplySelector: genericApplyBtn ? (genericApplyBtn.id ? '#' + genericApplyBtn.id : 'a, button, [role="button"]') : undefined
        };
      })()
    `;

    try {
      const res = await view.executeJavaScript(script);
      if (res && res.kind) return res;
    } catch {}

    return {
      kind: 'generic',
      displayName: 'Direct ATS Portal',
      formSelector: 'form',
      hasLandingApplyButton: false,
    };
  }

  /**
   * If the landing page requires clicking "Apply for this job" / "Apply Now" before the form appears,
   * trigger the click smoothly and wait for the form to reveal. Handles nested dropdown options if present.
   */
  public async triggerLandingApplyIfPresent(view: any, profile: ExternalAtsProfile): Promise<boolean> {
    if (!profile.hasLandingApplyButton) return false;

    const script = `
      (() => {
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]'));
        const btn = candidates.find((b) => 
          /apply for this job|apply now|start application|apply online|^apply\b/i.test((b.textContent || b.value || '').trim()) &&
          isVisible(b) &&
          !/easy\\s*apply|applied/i.test((b.textContent || b.value || '').trim())
        );

        if (btn) {
          if (window.__zeroapplyCursor) {
            try { window.__zeroapplyCursor.clickElement(btn.tagName.toLowerCase(), 'AI: Reveal Application Form'); } catch(e) {}
          }
          btn.click();

          // If clicking revealed a dropdown menu (e.g. "Apply Now", "Apply with LinkedIn", "Apply Manually")
          setTimeout(() => {
            const dropdownOptions = Array.from(document.querySelectorAll('.dropdown-menu a, [role="menu"] [role="menuitem"], .dropdown-content a, ul[class*="apply"] li a'));
            const subApply = dropdownOptions.find(opt => /apply now|apply manually|standard apply|direct apply/i.test(opt.textContent || '') && isVisible(opt));
            if (subApply) {
              subApply.click();
            }
          }, 350);

          return true;
        }
        return false;
      })()
    `;

    try {
      const clicked = await view.executeJavaScript(script);
      if (clicked) {
        // Wait for form to scroll into view, hydrate, or navigate to login/apply step
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return true;
      }
    } catch {}

    return false;
  }
}
