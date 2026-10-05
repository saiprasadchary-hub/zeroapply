import { AppStateMachine } from '../stateMachine/appStateMachine';
import type { PersonaData } from '../../types';
import { QuestionMemoryBank } from '../memory/questionMemory';
import { ErrorLogger } from '../tracker/errorLogger';
import { ensureVisualCursor } from '../stealth/agentCursor';
import type { WebviewTarget } from '../domScanner/injectedScanner';
import { scanFormFields } from '../domScanner/injectedScanner';
import { classifyFields } from '../domScanner/fieldClassifier';
import { resolveQuestion } from '../localLlm/questionResolver';
import { fillField } from '../formFiller/formFiller';
import { stepNavigator } from '../navigation/wizardStepNavigator';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { getStoredResume } from '../fileUpload/resumeFileAdapter';
import { processTracker } from '../tracker/processTracker';
import { auditFormFields } from '../formFiller/formAuditor';

export interface AutoFillResult {
  success: boolean;
  fieldsFilled?: number;
  filledCount?: number;
  totalFields?: number;
  detectedCount?: number;
  message?: string;
  error?: string;
}

export class AgentEngine {
  private stateMachine: AppStateMachine = new AppStateMachine();
  private isRunning = false;

  public getStateMachine(): AppStateMachine {
    return this.stateMachine;
  }

  public async autoFillCurrentPage(
    view: WebviewTarget,
    persona: PersonaData,
    platformLabel = 'Portal'
  ): Promise<AutoFillResult> {
    this.isRunning = true;
    this.stateMachine.transition('SCANNING', {
      thought: `Scanning ${platformLabel} page for application form fields with 3D Visual Cursor & Local Qwen...`,
    });

    try {
      // Seed memory bank with persona
      QuestionMemoryBank.getInstance().seedFromPersona(persona);

      // Initialize 3D Purple Visual Cursor on page
      await ensureVisualCursor(view);

      // 1. Scan Form Fields with injected scanner
      const scannedFields = await scanFormFields(view);
      const classified = classifyFields(scannedFields, persona);

      let filledCount = 0;

      if (classified.length > 0) {
        this.stateMachine.transition('FILLING', {
          detectedCount: classified.length,
          thought: `Classified ${classified.length} fields. Filling with 3D Purple Visual Cursor & Local Qwen 2.5...`,
        });

        for (const field of classified) {
          if (!this.isRunning) break;

          let answerVal = field.mappedValue;
          let sourceVal: 'persona' | 'resume' | 'memory' | 'llm' | 'fallback' = 'persona';
          if (!answerVal) {
            const res = await resolveQuestion(field, persona);
            answerVal = res.answer;
            sourceVal = res.source;
          }

          if (!answerVal && (field.inputType === 'radio' || (field.options && field.options.length > 0))) {
            if (field.options && field.options.length > 0) {
              const affirmative = field.options.find(o => /^(yes|agree|confirm|true)$/i.test(o.trim()))
                || field.options.find(o => /yes|agree|confirm|true/i.test(o.trim()))
                || field.options[0];
              answerVal = affirmative;
            } else {
              answerVal = 'Yes';
            }
            sourceVal = 'fallback';
          }

          if (answerVal) {
            const fillRes = await fillField(view, field, answerVal, persona);
            if (fillRes.success) {
              filledCount++;
              processTracker.recordQuestionAnswer(
                field.label || field.name || 'Screening Question',
                answerVal,
                sourceVal,
                field.inputType
              );
            }
            // Natural human reading/transition pause between fields
            await new Promise((r) => setTimeout(r, 380 + Math.random() * 320));
          }
        }
      }

      // Check for resume selection / picker
      const hasResumePicker = await view.executeJavaScript(`
        (() => {
          const list = document.querySelector('.resume-item, #resume-selector-list, [data-resume-name]');
          return !!(list && list.offsetParent !== null);
        })()
      `).catch(() => false);

      const storedResume = getStoredResume();
      const storedResumeName = (storedResume?.name || '').toLowerCase().replace(/\.[^/.]+$/, '');
      const resumeTokens = storedResumeName.split(/[-_\s.]+/).filter((t) => t.length > 2);
      const candidateNameParts = (persona.fullName || '').toLowerCase().split(/\s+/).filter((p) => p.length > 2);
      const candidateRoles = (persona.targetRoles || []).map((r) => r.toLowerCase());
      const matchTerms = Array.from(new Set([...resumeTokens, ...candidateNameParts, ...candidateRoles, 'resume', 'cv', 'swe', 'engineer']));

      const resumeStatus = await view.executeJavaScript<{
        hasPicker: boolean;
        hasSelected: boolean;
        handled: boolean;
        selectedName: string;
      }>(`
        (() => {
          const candidateTerms = ${JSON.stringify(matchTerms)};
          const itemSelectors = [
            'button.jobs-resume-picker__resume-btn',
            '.jobs-resume-picker__list-item button.jobs-resume-picker__resume-btn',
            '[data-test-resume-item]',
            '[data-test-document-card]',
            '.jobs-document-upload__resume-item',
            '.resume-item[role="radio"]',
            '.resume-item',
            'button[aria-label*="Select resume" i]',
            '[role="radio"][aria-label*="resume" i]',
            '[data-resume-name]'
          ];

          const rawItems = Array.from(document.querySelectorAll(itemSelectors.join(', ')));
          const items = rawItems.filter(el => {
            if (el.classList.contains('jobs-document-upload') && !el.classList.contains('jobs-document-upload__resume-item')) return false;
            if (el.classList.contains('download-icon-btn') || el.getAttribute('title')?.toLowerCase().includes('download')) return false;
            return true;
          });

          function isElementSelected(el) {
            if (el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true') return true;
            if (el.classList.contains('jobs-resume-picker__resume-btn--selected') || el.classList.contains('selected') || el.classList.contains('active')) return true;
            const btn = el.querySelector('button.jobs-resume-picker__resume-btn, [role="radio"]');
            if (btn && (btn.getAttribute('aria-checked') === 'true' || btn.classList.contains('jobs-resume-picker__resume-btn--selected') || btn.classList.contains('selected'))) return true;
            const radio = el.querySelector('input[type="radio"]') || (el.tagName === 'INPUT' && el.type === 'radio' ? el : null);
            if (radio && radio.checked) return true;
            return false;
          }

          if (items.length === 0) {
            return { hasPicker: false, hasSelected: false, handled: false, selectedName: '' };
          }

          // 1. If any resume is ALREADY selected, preserve it! Do NOT click another resume!
          for (const el of items) {
            const name = (el.getAttribute('data-resume-name') || el.getAttribute('aria-label') || el.textContent || '').trim();
            if (isElementSelected(el)) {
              return { hasPicker: true, hasSelected: true, handled: true, selectedName: name.slice(0, 45) };
            }
          }

          // 2. None selected yet: find candidate's best matching resume by name or terms
          let target = null;
          for (const el of items) {
            const text = (el.getAttribute('data-resume-name') || el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
            if (candidateTerms.some(t => text.includes(t))) {
              target = el;
              break;
            }
          }

          // Fallback to first available resume if no name match
          if (!target && items.length > 0) {
            target = items[0];
          }

          if (target) {
            const name = (target.getAttribute('data-resume-name') || target.getAttribute('aria-label') || target.textContent || '').trim().slice(0, 45);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const radio = target.querySelector('input[type="radio"]') || (target.tagName === 'INPUT' && target.type === 'radio' ? target : null);
            if (radio) {
              radio.checked = true;
              radio.dispatchEvent(new Event('input', { bubbles: true }));
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const selectBtn = target.tagName === 'BUTTON'
              ? target
              : (target.querySelector('button.jobs-resume-picker__resume-btn, button:not(.download-icon-btn):not([title*="Download" i])') || target);
            selectBtn.focus();
            selectBtn.click();
            selectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            target.setAttribute('aria-checked', 'true');
            target.classList.add('selected');

            return { hasPicker: true, hasSelected: true, handled: true, selectedName: name };
          }

          return { hasPicker: true, hasSelected: false, handled: false, selectedName: '' };
        })()
      `).catch(() => ({ hasPicker: false, hasSelected: false, handled: false, selectedName: '' }));

      if (resumeStatus.handled && resumeStatus.selectedName) {
        filledCount++;
      }

      // Check for resume file upload zone if no resume is selected
      const hasUploadZone = await view.executeJavaScript(`
        (() => {
          const up = document.querySelector('input[type="file"], .dropzone, [data-dropzone="true"], label[for*="upload" i], button[aria-label*="Upload resume" i]');
          return !!up;
        })()
      `).catch(() => false);

      // Upload ONLY when: upload zone exists AND picker has 0 existing resumes
      if (hasUploadZone && !resumeStatus.hasPicker) {
        const uploadRes = await attachResumeFile(view, undefined, persona.fullName);
        if (uploadRes.success) filledCount++;
      }

      const total = classified.length || scannedFields.length || filledCount;

      this.stateMachine.transition('REVIEW_READY', {
        detectedCount: total,
        filledCount,
        thought: `Completed auto-filling: ${filledCount} of ${total} fields successfully populated.`,
      });

      return {
        success: true,
        fieldsFilled: filledCount,
        filledCount,
        totalFields: total,
        detectedCount: total,
        message: `Successfully filled ${filledCount} of ${total} fields using 3D Visual Cursor & Local Qwen 2.5!`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      ErrorLogger.log({ source: 'AgentEngine', message: msg, severity: 'HIGH' });
      this.stateMachine.transition('ERROR', { lastError: msg, thought: `Auto-fill failed: ${msg}` });
      return { success: false, error: msg };
    } finally {
      this.isRunning = false;
    }
  }

  public async advanceNextStep(view: WebviewTarget, persona?: PersonaData): Promise<boolean> {
    this.stateMachine.transition('ADVANCING', { thought: 'Auditing questions & advancing wizard step with 3D Visual Cursor...' });

    try {
      await ensureVisualCursor(view);

      // Pre-flight check: Ensure all questions are answered before advancing
      const audit = await auditFormFields(view);
      if (!audit.ready && persona && (audit.missingRequired.length > 0 || (audit.unansweredQuestions && audit.unansweredQuestions.length > 0))) {
        await this.autoFillCurrentPage(view, persona);
      }

      const advResult = await stepNavigator.advance(view);

      if (advResult.success && advResult.stepChanged) {
        const currentStep = this.stateMachine.getContext().step;
        this.stateMachine.transition('SCANNING', {
          step: currentStep + 1,
          thought: `Advanced to step ${currentStep + 1} (${advResult.action}).`,
        });
        return true;
      }

      if (advResult.success && !advResult.hasErrors) {
        return true;
      }

      // Fallback
      const nextScript = `
        (function() {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"], a.artdeco-button'));

          // Check if top choice is active, prioritize skip
          const bodyText = (document.body?.innerText || '').toLowerCase();
          if (/top\\s*choice|mark.*top\\s*choice|premium/.test(bodyText)) {
            const skip = buttons.find(b => {
              const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
              return /skip|not\\s*now|no\\s*thanks|apply\\s*without|continue\\s*without/i.test(text) && !b.disabled;
            });
            if (skip) {
              if (window.__zeroapplyCursor) {
                window.__zeroapplyCursor.clickElement('#' + (skip.id || 'skip-btn'), 'Skip Top Choice');
              }
              skip.click();
              return true;
            }
          }

          const nextBtn = buttons.find(b => {
            const text = (b.textContent || b.value || b.getAttribute('aria-label') || '').trim().toLowerCase();
            if (/mark.*(?:as\\s*a?\\s*)?top\\s*choice|try\\s*premium|get\\s*premium|upgrade|subscribe/i.test(text)) {
              return false;
            }
            return (
              text === 'next' ||
              text === 'continue' ||
              text === 'review' ||
              text === 'submit application' ||
              text.includes('next') ||
              text.includes('review')
            ) && !b.disabled;
          });

          if (nextBtn) {
            if (window.__zeroapplyCursor) {
              window.__zeroapplyCursor.clickElement('#' + (nextBtn.id || 'next-btn'), 'Advance Step');
            }
            nextBtn.click();
            return true;
          }
          return false;
        })()
      `;

      let advanced = false;
      if (view && typeof view.executeJavaScript === 'function') {
        advanced = await view.executeJavaScript(nextScript, true);
      }

      if (advanced) {
        const currentStep = this.stateMachine.getContext().step;
        this.stateMachine.transition('SCANNING', {
          step: currentStep + 1,
          thought: `Advanced to step ${currentStep + 1}.`,
        });
        return true;
      }

      this.stateMachine.transition('IDLE', { thought: 'No advance button found or already on final step.' });
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.stateMachine.transition('ERROR', { lastError: msg });
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.stateMachine.transition('PAUSED', { thought: 'Agent operation paused by user.' });
  }
}

