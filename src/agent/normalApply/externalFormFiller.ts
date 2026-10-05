import type { PersonaData } from '../../types';
import { scanFormFields } from '../domScanner/injectedScanner';
import { classifyFields } from '../domScanner/fieldClassifier';
import { resolveQuestion } from '../localLlm/questionResolver';
import { fillField } from '../formFiller/formFiller';
import { auditFormFields } from '../formFiller/formAuditor';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { stepNavigator } from '../navigation/wizardStepNavigator';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { processTracker } from '../tracker/processTracker';
import { questionMemory } from '../memory/questionMemoryBank';
import { ensureVisualCursor } from '../stealth/agentCursor';
import { SubmissionVerifier } from './submissionVerifier';
import type { NormalApplyConfig } from './normalApplyTypes';
import { scanAndHandleWhatsApp } from '../workflow/whatsappHandler';

export interface FormFillProgress {
  totalFieldsFilled: number;
  stepsCount: number;
  submitted: boolean;
  isConfirmed: boolean;
  error?: string;
}

export class ExternalFormFiller {
  private verifier = new SubmissionVerifier();

  /**
   * Orchestrates the multi-step form filling lifecycle on an external ATS tab.
   * Guarantees complete field scanning, answering, and verified submission before completion.
   */
  public async fillAndSubmitExternalForm(
    view: any,
    persona: PersonaData,
    jobTitle: string,
    config: NormalApplyConfig = {}
  ): Promise<FormFillProgress> {
    const { maxSteps = 15, stepDelayMs = 600, allowSubmit = true, auditMaxPasses = 3 } = config;

    let totalFieldsFilled = 0;
    let stepsCount = 0;
    let submitted = false;
    let isConfirmed = false;

    await ensureVisualCursor(view).catch(() => {});

    while (stepsCount < maxSteps) {
      stepsCount++;

      liveTelemetry.emit({
        type: 'think',
        title: `External ATS Step ${stepsCount}: Scanning and filling fields for "${jobTitle}"`,
        status: 'running',
      });

      // 1. Check if the page transitioned to a submission confirmation state from previous step
      if (stepsCount > 1) {
        const intermediateConfirmation = await this.verifier.verifySubmission(view);
        if (intermediateConfirmation.isConfirmed) {
          submitted = true;
          isConfirmed = true;
          break;
        }
      }

      // Proactively scan for WhatsApp links or joining invites: copy to clipboard, notify, and disarm opening
      await scanAndHandleWhatsApp(view).catch(() => {});

      // On step 1: If we are on a job details landing page with an unclicked "Apply Now" button, trigger it first!
      if (stepsCount === 1) {
        const hasTriggeredLanding = await view.executeJavaScript(`
          (() => {
            const isVisible = (el) => {
              if (!el) return false;
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            };
            const isCandidateInput = (el) => {
              if (!isVisible(el)) return false;
              const p = el.closest('header, nav, .jobs-search-box, [role="search"], .keywordsearch, .jobsearch, [class*="alert"], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield');
              if (p) return false;
              const desc = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
              return !/search|keyword|location|postal|alert|subscribe|frequency/i.test(desc);
            };
            const realInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).filter(isCandidateInput);
            if (realInputs.length >= 2) return false;

            const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]'));
            const btn = candidates.find(b => 
              /apply now|apply for this job|start application|apply online|^apply\\b/i.test((b.textContent || b.value || '').trim()) &&
              isVisible(b) &&
              !/easy\\s*apply|applied/i.test((b.textContent || b.value || '').trim())
            );
            if (btn) {
              if (window.__zeroapplyCursor) {
                try { window.__zeroapplyCursor.clickElement(btn.tagName.toLowerCase(), 'AI: Reveal Application Form'); } catch(e) {}
              }
              btn.click();
              setTimeout(() => {
                const subOptions = Array.from(document.querySelectorAll('.dropdown-menu a, [role="menu"] [role="menuitem"], .dropdown-content a, ul[class*="apply"] li a'));
                const sub = subOptions.find(opt => /apply now|apply manually|standard apply|direct apply/i.test(opt.textContent || '') && isVisible(opt));
                if (sub) sub.click();
              }, 350);
              return true;
            }
            return false;
          })()
        `).catch(() => false);

        if (hasTriggeredLanding) {
          liveTelemetry.emit({
            type: 'click',
            title: 'Revealing application form via Apply Now button',
            status: 'completed',
          });
          await new Promise((r) => setTimeout(r, 1600));
        }
      }

      // 2. Scan Form Fields on current step
      const fields = await scanFormFields(view);
      const classified = classifyFields(fields, persona);

      processTracker.recordFormStep(stepsCount, `External Step ${stepsCount}`, classified.length);

      if (classified.length > 0) {
        for (const field of classified) {
          if (field.fieldType === 'resume' || field.fieldType === 'resume_upload' || field.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(field.label || '')) {
            continue;
          }
          let answerVal = field.mappedValue;
          let source: 'persona' | 'ollama' = 'persona';

          if (!answerVal) {
            const res = await resolveQuestion({ ...field, jobContext: { jobTitle } }, persona);
            answerVal = res.answer;
            source = res.source === 'persona' ? 'persona' : 'ollama';

            if (answerVal && field.label) {
              questionMemory.addOrUpdateEntry(field.label, answerVal, 'llm', res.confidence || 0.9);
            }
          }

          if (answerVal) {
            liveTelemetry.emit({
              type: 'type',
              title: `External Fill: (${field.label || 'Field'}) -> "${answerVal}"`,
              target: field.label,
              value: answerVal,
              source,
              status: 'completed',
            });

            processTracker.recordQuestionAnswer(
              field.label || 'Field',
              answerVal,
              source === 'ollama' ? 'llm' : 'persona',
              field.inputType
            );

            const fillRes = await fillField(view, field, answerVal, persona);
            if (fillRes.success) {
              totalFieldsFilled++;
            }
            if (stepDelayMs > 0) {
              await new Promise((r) => setTimeout(r, Math.min(stepDelayMs, 300)));
            }
          }
        }
      }

      // 3. Check for Resume upload input or dropzone on current step
      const hasUploadZone = await view.executeJavaScript(`
        (() => {
          const up = document.querySelector('input[type="file"], .dropzone, [data-dropzone="true"], [data-automation-id*="file-upload"]');
          return !!(up && up.offsetParent !== null);
        })()
      `).catch(() => false);

      if (hasUploadZone) {
        liveTelemetry.emit({
          type: 'click',
          title: 'Uploading candidate resume to external ATS',
          status: 'running',
        });
        const uploadRes = await attachResumeFile(view, undefined, persona.fullName);
        if (uploadRes.success) {
          totalFieldsFilled++;
        }
      }

      // 4. Pre-flight question audit (ensure required fields aren't missing or invalid)
      let audit = await auditFormFields(view);
      let auditPasses = 0;

      while ((!audit.ready || (audit.unansweredQuestions && audit.unansweredQuestions.length > 0)) && auditPasses < auditMaxPasses) {
        const unanswered = (audit.unansweredQuestions || []).filter(
          (u) => u.isRequired || u.hasError || ((audit.unansweredQuestions?.length || 0) <= 3)
        );
        if (unanswered.length === 0 && (!audit.errors || audit.errors.length === 0)) break;

        auditPasses++;
        liveTelemetry.emit({
          type: 'check',
          title: `Audit Pass ${auditPasses}/${auditMaxPasses}: Resolving ${unanswered.length} unanswered question(s)...`,
          status: 'running',
        });

        // Proactively scan for WhatsApp links or joining invites
        await scanAndHandleWhatsApp(view).catch(() => {});

        const freshFields = await scanFormFields(view);
        const freshClassified = classifyFields(freshFields, persona);

        for (const ff of freshClassified) {
          if (ff.fieldType === 'resume' || ff.fieldType === 'resume_upload' || ff.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(ff.label || '')) {
            continue;
          }
          const isUnanswered =
            (ff.inputType === 'checkbox' || ff.inputType === 'switch')
              ? (ff.currentValue !== 'true' && (ff.required || ff.fieldType === 'terms' || /agree|verify|accurate|terms|consent|joined|whatsapp|community/i.test(ff.label || '')))
              : (!ff.currentValue ||
                 /^(select|choose|select an option|please select|--|0)$/i.test((ff.currentValue || '').trim()) ||
                 ff.hasError ||
                 (ff.inputType === 'radio' && !ff.currentValue));

          if (isUnanswered) {
            let answerVal = ff.mappedValue;
            if (!answerVal) {
              const res = await resolveQuestion({ ...ff, jobContext: { jobTitle } }, persona);
              answerVal = res.answer;
            }

            if (answerVal) {
              const fillRes = await fillField(view, ff, answerVal, persona);
              if (fillRes.success) totalFieldsFilled++;
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }

        await new Promise((r) => setTimeout(r, 300));
        audit = await auditFormFields(view);
      }

      // 5. Detect forward action button (Next / Continue / Review / Submit)
      let forwardBtn = await stepNavigator.detectForwardButton(view);

      // Deep ATS search fallback if default detector didn't find button
      if (!forwardBtn.exists) {
        forwardBtn = await this.detectExternalAtsButton(view);
      }

      if (!forwardBtn.exists) {
        // Double-check if page submitted asynchronously
        const postCheck = await this.verifier.verifySubmission(view);
        if (postCheck.isConfirmed) {
          submitted = true;
          isConfirmed = true;
        }
        break;
      }

      const forwardText = (forwardBtn.text || forwardBtn.action).trim();
      liveTelemetry.emit({
        type: 'click',
        title: `Clicking: "${forwardText}"`,
        target: forwardText,
        status: 'running',
      });

      if (forwardBtn.action === 'submit') {
        if (allowSubmit) {
          liveTelemetry.emit({
            type: 'submit',
            title: `Submitting external job application (${forwardText})`,
            status: 'running',
          });

          // Click submit
          if (forwardBtn.selector) {
            await view.executeJavaScript(`
              (() => {
                const btn = document.querySelector(${JSON.stringify(forwardBtn.selector)});
                if (btn) {
                  try { btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
                  try { btn.focus(); } catch(e) {}
                  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                  btn.click();
                  return true;
                }
                return false;
              })()
            `).catch(() => {});
          } else {
            await stepNavigator.advance(view);
          }

          submitted = true;

          // Poll up to 8 seconds for server response / confirmation page
          for (let poll = 0; poll < 8; poll++) {
            await new Promise((r) => setTimeout(r, 1000));
            const verifyCheck = await this.verifier.verifySubmission(view);
            if (verifyCheck.isConfirmed) {
              isConfirmed = true;
              break;
            }
          }
        } else {
          liveTelemetry.emit({
            type: 'status',
            title: 'Submit skipped (safe review mode enabled).',
            status: 'completed',
          });
        }
        break;
      } else {
        // Advance to next step in the wizard
        if (forwardBtn.selector) {
          await view.executeJavaScript(`
            (() => {
              const btn = document.querySelector(${JSON.stringify(forwardBtn.selector)});
              if (btn) {
                try { btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
                try { btn.focus(); } catch(e) {}
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                btn.click();
                return true;
              }
              return false;
            })()
          `).catch(() => {});
        } else {
          await stepNavigator.advance(view);
        }

        if (stepDelayMs > 0) {
          await new Promise((r) => setTimeout(r, stepDelayMs));
        }
      }
    }

    return {
      totalFieldsFilled,
      stepsCount,
      submitted,
      isConfirmed,
    };
  }

  /**
   * Deep fallback button detector tailored for external ATS portals (Greenhouse, Lever, Workday, etc.).
   */
  private async detectExternalAtsButton(view: any): Promise<{ exists: boolean; action: 'next' | 'submit' | 'none'; text: string; selector: string; disabled: boolean }> {
    const script = `
      (() => {
        const isVisible = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
          if (r.width === 0 && r.height === 0) return false;
          const s = window.getComputedStyle ? window.getComputedStyle(el) : null;
          if (s && (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0')) return false;
          return true;
        };

        const candidates = Array.from(document.querySelectorAll(
          'button, input[type="submit"], input[type="button"], a[role="button"], [role="button"], a.postings-btn, .btn, .button, [data-automation-id*="submit"], [data-automation-id*="next"]'
        )).filter(isVisible);

        // 1. Submit action candidates
        const submitRegex = /submit\\s*application|submit|send\\s*application|complete\\s*application|finish|apply\\s*now/i;
        for (const el of candidates) {
          const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
          if (/back|previous|cancel|close|dismiss/i.test(text)) continue;
          if (submitRegex.test(text) || el.type === 'submit') {
            el.setAttribute('data-za-external-btn', 'submit');
            return {
              exists: true,
              action: 'submit',
              text: text || 'Submit application',
              selector: '[data-za-external-btn="submit"]',
              disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
            };
          }
        }

        // 2. Next / Continue / Review action candidates
        const nextRegex = /next\\s*step|next|continue|review\\s*and\\s*submit|review|save\\s*&\\s*continue|proceed/i;
        for (const el of candidates) {
          const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
          if (/back|previous|cancel|close|dismiss/i.test(text)) continue;
          if (nextRegex.test(text)) {
            el.setAttribute('data-za-external-btn', 'next');
            return {
              exists: true,
              action: 'next',
              text: text || 'Next',
              selector: '[data-za-external-btn="next"]',
              disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
            };
          }
        }

        return { exists: false, action: 'none', text: '', selector: '', disabled: false };
      })()
    `;

    try {
      const res = await view.executeJavaScript(script);
      if (res && res.exists) return res;
    } catch {}

    return { exists: false, action: 'none', text: '', selector: '', disabled: false };
  }
}
