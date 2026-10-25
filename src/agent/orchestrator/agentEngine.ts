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
import { advanceExactlyOneStep } from '../navigation/manualStepNavigator';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { getStoredResume } from '../fileUpload/resumeFileAdapter';
import { processTracker } from '../tracker/processTracker';

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
    if (this.isRunning) return { success: false, message: 'Another manual action is already in progress.' };
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
      const fillFailures: string[] = [];

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
            if (!fillRes.success) fillFailures.push(`${field.label || field.name || 'Field'}: ${fillRes.error || 'selection failed'}`);
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
        message: fillFailures.length ? fillFailures.join('; ') : `Successfully filled ${filledCount} of ${total} fields using 3D Visual Cursor & Local Qwen 2.5!`,
        error: fillFailures.length ? fillFailures.join('; ') : undefined,
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

  public async advanceNextStep(view: WebviewTarget, _persona?: PersonaData): Promise<boolean> {
    if (this.isRunning) return false;
    this.isRunning = true;
    this.stateMachine.transition('ADVANCING', { thought: 'Advancing exactly one application step…' });
    try {
      const result = await advanceExactlyOneStep(view);
      const currentStep = this.stateMachine.getContext().step;
      this.stateMachine.transition('IDLE', {
        step: result.advanced ? currentStep + 1 : currentStep,
        thought: result.message,
      });
      return result.advanced;
    } finally {
      this.isRunning = false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.stateMachine.transition('PAUSED', { thought: 'Agent operation paused by user.' });
  }
}

