import { getActiveModelName } from '../localLlm/ollamaClient';
/**
 * ZeroApply Workflow - Advanced Orchestrator
 * Coordinates ATS architecture perception, local Qwen 2.5 LLM answering,
 * synthetic event filling, 3D purple cursor animation, pre-flight auditing,
 * and self-healing wizard advancement for any job application platform.
 */

import type { PersonaData } from '../../types';
import type { WebviewTarget } from '../domScanner/injectedScanner';
import { analyzePage } from '../vision/pageAnalyzer';
import { scanFormFields } from '../domScanner/injectedScanner';
import { classifyFields } from '../domScanner/fieldClassifier';
import { detectAtsArchitecture } from '../domScanner/atsDetector';
import { resolveQuestion } from '../localLlm/questionResolver';
import { analyzeErrorConstraint } from '../localLlm/errorConstraintAnalyzer';
import { fillField } from '../formFiller/formFiller';
import { auditFormFields, isFieldAlreadySatisfied } from '../formFiller/formAuditor';
import { stepNavigator } from '../navigation/wizardStepNavigator';
import { WorkflowStateMachine } from './stateMachine';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { detectSecurityChallenge, waitForChallengeResolution } from '../security';
import { questionMemory } from '../memory/questionMemoryBank';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { getStoredResume } from '../fileUpload/resumeFileAdapter';
import { omniVision } from '../vision';
import { ensureVisualCursor, cursorMoveAndClick } from '../stealth/agentCursor';
import { getLiveAgentLightHudScript } from '../ui/liveAgentLightHUD';
import { isLiveAgentActivityEnabled } from '../../settings/settingsManager';
import { processTracker } from '../tracker/processTracker';
import { QALogger } from '../tracker/qaLogger';
import { scanAndHandleWhatsApp } from './whatsappHandler';
import { ensureLinkedInSafeSession } from '../stealth/linkedinSafetyGuard';

export interface OrchestratorOptions {
  maxSteps?: number;
  stepDelayMs?: number;
  openTab?: (url?: string) => Promise<any | null>;
  closeTabAndReturn?: (tabView?: any) => Promise<void>;
}

export interface OrchestrationResult {
  outcome: 'submitted' | 'skipped' | 'failed';
  platform?: string;
  fieldsFilled: number;
  stepsExecuted: number;
  error?: string;
}

export class AutoApplyOrchestrator {
  public async runApplication(
    webview: WebviewTarget,
    persona: PersonaData,
    options: OrchestratorOptions = {}
  ): Promise<OrchestrationResult> {
    const { maxSteps = 12, stepDelayMs = 650, openTab, closeTabAndReturn } = options;
    const sm = new WorkflowStateMachine();

    let totalFieldsFilled = 0;
    let stepsCount = 0;
    let detectedPlatform = 'Generic Portal';

    try {
      sm.transition('analyzing');

      // Initialize 3D Purple Visual Cursor & Live Light HUD on target webview
      await ensureVisualCursor(webview);
      if (isLiveAgentActivityEnabled()) {
        await webview.executeJavaScript(getLiveAgentLightHudScript()).catch(() => {});
      }

      // 1. Universal ATS & Architecture Perception Pass
      const ats = await detectAtsArchitecture(webview);
      detectedPlatform = ats.displayName;

      // Full-Spectrum OmniVision Perception (Layout, Spatial Elements, and Job Context)
      const pagePerception = await omniVision.perceive(webview).catch(() => null);
      const activeJobContext = pagePerception?.job;

      liveTelemetry.emit({
        type: 'think',
        title: `Perception: Detected ATS "${ats.displayName}" (${ats.structure}) | Role: "${activeJobContext?.jobTitle || ats.displayName}"`,
        target: ats.displayName,
        status: 'completed',
      });

      // Synchronize active job metadata with ProcessTracker and QALogger
      if (activeJobContext?.jobTitle || activeJobContext?.companyName) {
        const title = activeJobContext.jobTitle || 'Job Application';
        const company = activeJobContext.companyName || 'Target Company';
        const activeSession = processTracker.getActiveSession();
        if (activeSession && activeSession.status === 'in_progress') {
          if (!activeSession.jobTitle || activeSession.jobTitle === 'Role' || activeSession.jobTitle === 'Job Listing' || activeSession.jobTitle === 'Active Job Application') {
            activeSession.jobTitle = title;
          }
          if (!activeSession.companyName || activeSession.companyName === 'Company' || activeSession.companyName === 'Current Company') {
            activeSession.companyName = company;
          }
          activeSession.portal = ats.displayName || detectedPlatform;
        }
        try {
          QALogger.updateJobDetails({
            jobTitle: title,
            company: company,
            companyName: company,
            portal: ats.displayName || detectedPlatform,
          });
        } catch {}
      }

      // 2. Initial Page Analysis
      const pageInfo = await analyzePage(webview);

      // Handle External Apply Button (opens in new tab, completes application, confirms, returns to 1st tab)
      if (pageInfo.applyButton?.exists && pageInfo.applyButton.type === 'external' && openTab) {
        const externalUrl = pageInfo.applyButton.url;
        const applyBtnSelector = pageInfo.applyButton.selector || 'button.jobs-apply-button, a.jobs-apply-button, [data-za-apply-btn]';

        liveTelemetry.emit({
          type: 'click',
          title: 'External Apply Detected: Opening job application in new tab',
          target: 'External Apply Button',
          status: 'running',
        });

        await ensureVisualCursor(webview);
        await cursorMoveAndClick(webview, applyBtnSelector, { label: 'AI: Click "Apply" (External)' });

        // Trigger click on external apply button
        await webview.executeJavaScript(`
          (() => {
            const btn = document.querySelector(${JSON.stringify(pageInfo.applyButton.selector || '')}) ||
              document.querySelector('button.jobs-apply-button, a.jobs-apply-button, [data-za-apply-btn]');
            if (btn) btn.click();
          })()
        `).catch(() => {});

        const extView = await openTab(externalUrl || undefined);
        if (extView) {
          liveTelemetry.emit({
            type: 'think',
            title: 'Switched focus to new tab. Executing external application workflow...',
            status: 'running',
          });
          if (stepDelayMs > 0) await new Promise((r) => setTimeout(r, 2000));

          // Run application on external tab
          const extResult = await this.runApplication(extView, persona, {
            maxSteps,
            stepDelayMs,
          });

          // Once finished and confirmed submission, close tab and return focus to 1st tab
          if (closeTabAndReturn) {
            liveTelemetry.emit({
              type: 'status',
              title: 'External application finished and confirmed. Closing new tab and returning focus to 1st tab...',
              status: 'completed',
            });
            await closeTabAndReturn(extView);
            if (stepDelayMs > 0) await new Promise((r) => setTimeout(r, 600));
          }

          return extResult;
        }
      }

      // If modal or multi-step wizard is ALREADY open, do not re-click apply button
      const isModalActive = await webview.executeJavaScript<boolean>(`
        (() => {
          const modal = document.querySelector(
            '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], .artdeco-modal'
          );
          if (!modal) return false;
          const rect = modal.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })()
      `).catch(() => false);

      // If on job landing page with an unclicked Apply Now / Easy Apply button and form is not yet open, click apply
      if (
        !isModalActive &&
        pageInfo.state !== 'application_form' &&
        (pageInfo.applyButton?.exists || ats.stage === 'job_detail_view')
      ) {
        const applyBtnSelector = pageInfo.applyButton?.selector || 'button.jobs-apply-button, #main-easy-apply-btn, [data-za-apply-btn]';
        const applyLabel = ats.platform === 'linkedin_easy_apply' ? 'AI: Click "Easy Apply"' : 'AI: Click "Apply Now"';

        liveTelemetry.emit({
          type: 'click',
          title: `Clicking: "${applyLabel}"`,
          target: 'Apply Button',
          status: 'running',
        });

        await ensureVisualCursor(webview);
        await cursorMoveAndClick(webview, applyBtnSelector, { label: applyLabel });

        const clickApplyScript = `
          (() => {
            let btn = document.querySelector(${JSON.stringify(pageInfo.applyButton?.selector || '')});
            if (!btn || (typeof btn.getBoundingClientRect === 'function' && btn.getBoundingClientRect().width === 0)) {
              const all = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]'));
              btn = all.find(b => {
                const rect = b.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;
                if (b.closest('header, nav, .jobs-search-box, [role="search"], .keywordsearch, .jobsearch, form[action*="jobalert"], .jobs-alert-form, .jobs-search-create-alert, [data-test-job-alert-modal], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield')) return false;
                const txt = (b.textContent || b.value || '').trim();
                return /apply now|apply for this job|start application|apply online|^apply\\b/i.test(txt) && !/applied/i.test(txt);
              });
            }
            if (btn) {
              btn.click();
              setTimeout(() => {
                const subOptions = Array.from(document.querySelectorAll('.dropdown-menu a, [role="menu"] [role="menuitem"], .dropdown-content a, ul[class*="apply"] li a'));
                const sub = subOptions.find(opt => /apply now|apply manually|standard apply|direct apply/i.test(opt.textContent || ''));
                if (sub) sub.click();
              }, 350);
              return true;
            }
            return false;
          })()
        `;
        await webview.executeJavaScript(clickApplyScript);
        if (stepDelayMs > 0) await new Promise((r) => setTimeout(r, Math.max(stepDelayMs, 1500)));
      }

      // Step execution loop
      while (stepsCount < maxSteps) {
        stepsCount++;

        // Pre-flight anti-bot challenge perception
        const securityCheck = await detectSecurityChallenge(webview);
        if (securityCheck.detected) {
          liveTelemetry.emit({
            type: 'status',
            title: `Anti-Bot: Detected ${securityCheck.message || 'Security Verification'}`,
            target: 'Security Checkpoint',
            status: 'paused',
          });
          const cleared = await waitForChallengeResolution(webview, { timeoutMs: 180000 });
          if (!cleared) {
            return {
              outcome: 'failed',
              platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled,
              stepsExecuted: stepsCount,
              error: 'Anti-bot challenge resolution timed out',
            };
          }
        }

        sm.transition('scanning');

        // Extract active wizard step title from modal or ATS DOM
        const activeStepTitle = await webview.executeJavaScript<string>(`
          (() => {
            const modal = document.querySelector('#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"]');
            const root = modal || document;
            const el = root.querySelector(
              '.modal-step.active .step-section-title, .modal-step.active h3, .jobs-easy-apply-modal .modal-step.active [class*="title"], ' +
              '.jobs-easy-apply-form-section h3, .fb-form-section-title, [data-automation-id="step-title"], ' +
              'h3, .jobs-easy-apply-modal h3' +
              (modal ? ', legend' : '')
            );
            return el ? (el.textContent || '').trim() : '';
          })()
        `).catch(() => '') || `Step ${stepsCount}`;

        // 1. Scan Form Fields (including modern custom comboboxes, radios, dropzones)
        await webview.executeJavaScript(`
          if (window.__zeroapplyHUD) {
            window.__zeroapplyHUD.setStep(${stepsCount}, 5, ${JSON.stringify(activeStepTitle)});
          }
        `).catch(() => {});

        // Proactively scan for WhatsApp links or joining invites: copy to clipboard, notify, and disarm opening
        await scanAndHandleWhatsApp(webview).catch(() => {});

        // Enforce LinkedIn stealth mask, disarm tracker iframe errors, uncheck follow company, and bypass top-choice traps
        await ensureLinkedInSafeSession(webview).catch(() => {});

        let fields = await scanFormFields(webview);
        let classified = classifyFields(fields, persona);

        // Scan retry: If 0 fields found on a non-review step, allow React / modal DOM to settle
        const isReviewOrSuccess = /review|done|success|confirmation/i.test(activeStepTitle);
        if (classified.length === 0 && !isReviewOrSuccess) {
          for (let retry = 1; retry <= 3; retry++) {
            await new Promise((r) => setTimeout(r, 350));
            fields = await scanFormFields(webview);
            classified = classifyFields(fields, persona);
            if (classified.length > 0) break;
          }
        }

        processTracker.recordFormStep(stepsCount, activeStepTitle, classified.length);

        if (classified.length > 0) {
          liveTelemetry.emit({
            type: 'think',
            title: `Perceived ${classified.length} field(s) on ${activeStepTitle}: [${classified.map(f => f.label || f.name).join(', ')}]`,
            status: 'completed',
          });

          sm.transition('filling');
          for (const field of classified) {
            // Resume cards/files are handled exclusively by the dedicated resume pipeline below
            if (field.fieldType === 'resume' || field.fieldType === 'resume_upload' || field.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(field.label || '')) {
              continue;
            }
            // Determine answer (Persona mapped value or Local Qwen 2.5 LLM resolution)
            let answerVal = field.mappedValue;
            let source: 'persona' | 'ollama' | 'rule' = 'persona';
            let resumeContextUsed: string | undefined;

            if (!answerVal) {
              const res = await resolveQuestion({ ...field, jobContext: activeJobContext }, persona);
              answerVal = res.answer;
              source = res.source === 'persona' ? 'persona' : 'ollama';
              resumeContextUsed = res.resumeContext;

              // Persist novel answer to Question Memory Bank for 0ms recurring resolution
              if (answerVal && field.label) {
                questionMemory.addOrUpdateEntry(field.label, answerVal, 'llm', res.confidence || 0.9);
              }
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
              source = 'rule';
            }

            if (answerVal) {
              const hasExisting = Boolean(field.currentValue && field.currentValue.trim());
              const syncNotice = hasExisting ? ` (syncing over existing "${field.currentValue}")` : '';

              // Real-time update to Live Agent Light HUD
              await webview.executeJavaScript(`
                if (window.__zeroapplyHUD) {
                  window.__zeroapplyHUD.setLLMGeneration(
                    ${JSON.stringify(field.label)},
                    ${JSON.stringify(resumeContextUsed || '')},
                    ${JSON.stringify(answerVal)},
                    ${JSON.stringify(source)},
                    'Qwen 2.5:3b'
                  );
                }
              `).catch(() => {});

              liveTelemetry.emit({
                type: 'think',
                title: `Question (${field.label}) thinking answers: "${answerVal}"`,
                target: field.label,
                value: answerVal,
                source,
                model: getActiveModelName(),
                status: 'completed',
              });

              liveTelemetry.emit({
                type: 'type',
                title: `Question (${field.label}) filling this: "${answerVal}"${syncNotice}`,
                target: field.label,
                value: answerVal,
                status: 'completed',
              });

              processTracker.recordQuestionAnswer(
                field.label || 'Application Field',
                answerVal,
                source === 'ollama' ? 'llm' : 'persona',
                field.inputType
              );

              const fillRes = await fillField(webview, field, answerVal, persona);
              if (fillRes.success) totalFieldsFilled++;

              // Record filled field in Live Agent Light HUD
              await webview.executeJavaScript(`
                if (window.__zeroapplyHUD) {
                  window.__zeroapplyHUD.recordFilled(
                    ${JSON.stringify(field.label)},
                    ${JSON.stringify(answerVal)},
                    ${JSON.stringify(source)}
                  );
                }
              `).catch(() => {});

              // Human saccade & field transition pause (proportional to stepDelayMs for observable demo pacing)
              const fieldPause = stepDelayMs > 800 ? Math.min(stepDelayMs * 0.65, 1400) : (350 + Math.random() * 300);
              await new Promise((r) => setTimeout(r, fieldPause));
            }
          }
        } else {
          liveTelemetry.emit({
            type: 'think',
            title: `Step "${activeStepTitle}": No standard form fields to fill. Checking resume & navigation controls...`,
            status: 'completed',
          });
        }

        // ----------------------------------------------------
        // Resume Handling: Select Existing Resume OR Allow Upload
        // ----------------------------------------------------
        const storedResume = getStoredResume();
        const storedResumeName = (storedResume?.name || '').toLowerCase().replace(/\.[^/.]+$/, '');
        const resumeTokens = storedResumeName.split(/[-_\s.]+/).filter((t) => t.length > 2);
        const candidateNameParts = (persona.fullName || '').toLowerCase().split(/\s+/).filter((p) => p.length > 2);
        const candidateRoles = (persona.targetRoles || []).map((r) => r.toLowerCase());
        const matchTerms = Array.from(new Set([...resumeTokens, ...candidateNameParts, ...candidateRoles, 'resume', 'cv', 'swe', 'engineer']));

        const resumeStatus = await webview.executeJavaScript<{
          hasPicker: boolean;
          hasSelected: boolean;
          handled: boolean;
          selectedName: string;
        }>(`
          (() => {
            const candidateTerms = ${JSON.stringify(matchTerms)};

            // Selectors for specific resume cards, radio buttons, or resume list items
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
              if (el.classList.contains('jobs-resume-picker__resume-btn--selected') || el.classList.contains('selected') || el.classList.contains('active') || el.classList.contains('checked')) return true;
              const btn = el.querySelector('button.jobs-resume-picker__resume-btn, [role="radio"]');
              if (btn && (btn.getAttribute('aria-checked') === 'true' || btn.classList.contains('jobs-resume-picker__resume-btn--selected') || btn.classList.contains('selected'))) return true;
              const radio = el.querySelector('input[type="radio"]') || (el.tagName === 'INPUT' && el.type === 'radio' ? el : null);
              if (radio && radio.checked) return true;
              const checkIcon = el.querySelector('[data-test-icon="check-circle"], [data-test-icon="circle-checked"], svg[data-test-icon*="check"], .artdeco-icon--circle-check, [class*="checked"], [class*="selected"]');
              if (checkIcon) return true;
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
          liveTelemetry.emit({
            type: 'click',
            title: `✓ Resume selected: "${resumeStatus.selectedName}"`,
            target: 'Resume Selector',
            status: 'completed',
          });
          totalFieldsFilled++;
        }

        // Check if file upload is available on current step
        const uploadZoneAvailable = await webview.executeJavaScript<boolean>(`
          (() => {
            const up = document.querySelector(
              'input[type="file"], .dropzone, [data-dropzone="true"], [data-automation-id*="file-upload"], ' +
              'label[for*="upload" i], button[aria-label*="Upload resume" i], [data-test-file-uploader]'
            );
            return !!up;
          })()
        `).catch(() => false);

        // Upload ONLY when: upload zone exists AND picker has 0 existing resumes
        // If resumes already exist in candidate's LinkedIn picker, NEVER upload a duplicate!
        if (uploadZoneAvailable && !resumeStatus.hasPicker) {
          liveTelemetry.emit({
            type: 'click',
            title: 'Uploading candidate resume file',
            target: 'Resume Upload',
            status: 'running',
          });

          const uploadRes = await attachResumeFile(webview, undefined, persona.fullName);
          if (uploadRes.success) {
            totalFieldsFilled++;
          }
        }

        // Active poll & verify: Ensure any upload finishes and a resume card is selected
        await webview.executeJavaScript<boolean>(`
          (async () => {
            const startTime = Date.now();
            const maxWait = 4500;

            function trySelectResume() {
              const items = Array.from(document.querySelectorAll(
                'button.jobs-resume-picker__resume-btn, [data-test-resume-item], [data-test-document-card], ' +
                '.jobs-document-upload__resume-item, .resume-item, button[aria-label*="Select resume" i]'
              ));
              if (items.length === 0) return false;

              const selected = items.find(el => {
                if (el.getAttribute('aria-checked') === 'true' || el.classList.contains('selected') || el.classList.contains('jobs-resume-picker__resume-btn--selected')) return true;
                const radio = el.querySelector('input[type="radio"]');
                return radio && radio.checked;
              });
              if (selected) return true;

              const target = items[0];
              try {
                target.scrollIntoView({ behavior: 'auto', block: 'center' });
                const radio = target.querySelector('input[type="radio"]');
                if (radio) {
                  radio.checked = true;
                  radio.dispatchEvent(new Event('input', { bubbles: true }));
                  radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
                const btn = target.tagName === 'BUTTON' ? target : (target.querySelector('button') || target);
                btn.focus();
                btn.click();
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                target.setAttribute('aria-checked', 'true');
                target.classList.add('selected');
                return true;
              } catch (e) {
                return false;
              }
            }

            while (Date.now() - startTime < maxWait) {
              const isUploading = Boolean(document.querySelector('.jobs-document-upload__loading, .artdeco-loader, [data-test-document-upload-progress]'));
              const selected = trySelectResume();
              const fwd = document.querySelector('footer button.artdeco-button--primary, .artdeco-modal__actionbar button.artdeco-button--primary, button[aria-label*="Continue to next step" i]');
              const fwdEnabled = fwd && !fwd.disabled && fwd.getAttribute('aria-disabled') !== 'true';

              if (!isUploading && (selected || !document.querySelector('input[type="file"], [data-test-resume-item]')) && fwdEnabled) {
                return true;
              }
              await new Promise(r => setTimeout(r, 250));
            }
            return trySelectResume();
          })()
        `).catch(() => false);

        // 2. Pre-Flight Question Audit: Ensure ALL questions on current step are answered before Next/Continue/Submit
        sm.transition('auditing');
        let audit = await auditFormFields(webview);
        let auditPasses = 0;

        while ((!audit.ready || (audit.unansweredQuestions && audit.unansweredQuestions.length > 0)) && auditPasses < 3) {
          const unanswered = (audit.unansweredQuestions || []).filter(
            (u) => u.inputType !== 'file' && !/resume|cv\b/i.test(u.label)
          );
          if (unanswered.length === 0 && (!audit.errors || audit.errors.length === 0)) break;

          auditPasses++;
          liveTelemetry.emit({
            type: 'check',
            title: `Pre-Flight Audit: Found ${unanswered.length} unanswered question(s) before advance. Answering now (Pass ${auditPasses}/3)...`,
            status: 'running',
          });

          // Check for WhatsApp links or joining prompts before answering missing questions
          await scanAndHandleWhatsApp(webview).catch(() => {});

          // Re-scan fields dynamically to capture missing / unresolved questions
          const freshFields = await scanFormFields(webview);
          const freshClassified = classifyFields(freshFields, persona);

          for (const ff of freshClassified) {
            if (ff.fieldType === 'resume' || ff.fieldType === 'resume_upload' || ff.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(ff.label || '')) {
              continue;
            }
            const isUnanswered =
              (ff.inputType === 'checkbox' || ff.inputType === 'switch')
                ? (ff.currentValue !== 'true' && (ff.required || ff.fieldType === 'terms' || /agree|verify|accurate|terms|consent|joined|whatsapp|community/i.test(ff.label || '')))
                : (!ff.currentValue ||
                   /^(select|choose|select an option|please select|--)$/i.test((ff.currentValue || '').trim()) ||
                   ff.hasError ||
                   (ff.inputType === 'radio' && !ff.currentValue));

            if (isUnanswered) {
              let answerVal = ff.mappedValue;
              let source: 'persona' | 'ollama' | 'rule' = 'persona';

              const matchingUnanswered = (audit.unansweredQuestions || []).find(
                (u) => (u.id && u.id === ff.id) || (u.name && u.name === ff.name) || (u.label && u.label === ff.label)
              );
              const activeError = (ff.errorMessage || matchingUnanswered?.errorText || (audit.errors && audit.errors[0]) || '').trim();
              const activeHelper = (ff.helperText || matchingUnanswered?.helperText || '').trim();

              // If the field has an active error, previous mappedValue cannot be trusted (e.g. '8' when >100 required).
              // Always resolve afresh with the error and helper text!
              if (ff.hasError || Boolean(activeError) || !answerVal) {
                const res = await resolveQuestion({
                  ...ff,
                  validationError: activeError,
                  errorMessage: activeError,
                  helperText: activeHelper,
                  contextHint: activeHelper ? `${ff.contextHint || ''} ${activeHelper}`.trim() : ff.contextHint,
                  jobContext: activeJobContext,
                }, persona);
                answerVal = res.answer;
                source = res.source === 'persona' ? 'persona' : 'ollama';

                if (answerVal && ff.label) {
                  questionMemory.addOrUpdateEntry(ff.label, answerVal, 'llm', res.confidence || 0.9);
                }
              }

              if (!answerVal && (ff.inputType === 'radio' || (ff.options && ff.options.length > 0))) {
                if (ff.options && ff.options.length > 0) {
                  const affirmative = ff.options.find(o => /^(yes|agree|confirm|true)$/i.test(o.trim()))
                    || ff.options.find(o => /yes|agree|confirm|true/i.test(o.trim()))
                    || ff.options[0];
                  answerVal = affirmative;
                } else {
                  answerVal = 'Yes';
                }
                source = 'rule';
              }

              if (answerVal) {
                liveTelemetry.emit({
                  type: 'think',
                  title: `Audit Answering: (${ff.label}) -> "${answerVal}"`,
                  target: ff.label,
                  value: answerVal,
                  source,
                  model: getActiveModelName(),
                  status: 'completed',
                });

                liveTelemetry.emit({
                  type: 'type',
                  title: `Audit Filling: (${ff.label}) with "${answerVal}"`,
                  target: ff.label,
                  value: answerVal,
                  status: 'completed',
                });

                processTracker.recordQuestionAnswer(
                  ff.label || 'Required Question',
                  answerVal,
                  source === 'ollama' ? 'llm' : 'persona',
                  ff.inputType
                );

                const fillRes = await fillField(webview, ff, answerVal, persona);
                if (fillRes.success) totalFieldsFilled++;
                await new Promise((r) => setTimeout(r, 250));
              }
            }
          }

          await new Promise((r) => setTimeout(r, 350));
          audit = await auditFormFields(webview);
        }

        // 3. Detect Forward Wizard Button (Next / Review / Submit / Done)
        let forwardBtn = await stepNavigator.detectForwardButton(webview);

        if (!forwardBtn.exists) {
          // Retry: Ensure scrollable modal body does not obscure footer and scroll footer into view
          await webview.executeJavaScript(`
            (() => {
              const modalContent = document.querySelector('.jobs-easy-apply-modal, .artdeco-modal__content, [class*="content"]');
              if (modalContent) {
                modalContent.scrollTop = modalContent.scrollHeight;
              }
              const modal = document.querySelector('.artdeco-modal, [role="dialog"], #artdeco-modal-outlet') || document;
              const footer = modal.querySelector('footer, .artdeco-modal__actionbar, .jobs-easy-apply-footer, button.artdeco-button--primary');
              if (footer && typeof footer.scrollIntoView === 'function') {
                footer.scrollIntoView({ behavior: 'auto', block: 'end' });
              }
            })()
          `).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          forwardBtn = await stepNavigator.detectForwardButton(webview);
        }

        if (!forwardBtn.exists) {
          liveTelemetry.emit({
            type: 'check',
            title: 'Checking: Verifying application submission status',
            status: 'running',
          });

          // Check if already completed / submitted
          const isDone = await webview.executeJavaScript<boolean>(`
            (() => {
              try {
                const el = document.querySelector('.success-view, #step-success.active, [data-test-modal-close-btn], [class*="application-submitted"], [class*="success-message"]');
                if (el) return true;
                const modal = document.querySelector('.artdeco-modal, [role="dialog"], #easy-apply-modal-overlay');
                const text = (modal ? modal.textContent : (document.body ? document.body.innerText : '') || '').toLowerCase();
                const hasConfirmText = /your application was sent|application submitted|thank you for applying|application received|received your application|turn your resume into a profile|update your profile|save skills to your profile/i.test(text);
                const hasNotNowBtn = modal ? Array.from(modal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
                  const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                  return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
                }) : false;
                const hasDoneBtn = Boolean(modal && modal.querySelector('#btn-success-done, [data-test-modal-close-btn], .success-view button'));
                return hasConfirmText || hasNotNowBtn || hasDoneBtn;
              } catch (e) {
                return false;
              }
            })()
          `).catch(() => false);
          if (isDone) {
            await ensureVisualCursor(webview);
            await webview.executeJavaScript(`
              (async () => {
                try {
                  const modal = document.querySelector(
                    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
                  );
                  // If modal is already closed, do NOT search document and do NOT click anything!
                  if (!modal) return true;

                  // Priority 1: "Not now" button on the post-submission upsell dialog (Skip profile update)
                  const allButtons = Array.from(modal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
                  const notNowBtn = allButtons.find(b => {
                    const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                    if (/update.*profile|save.*profile|add.*skills.*profile|add.*to.*profile/i.test(txt)) return false;
                    return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(txt);
                  });
                  if (notNowBtn) {
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                      await window.__zeroapplyCursor.clickElement(notNowBtn, 'AI: Click "Not now" (Skip profile update)');
                    } else {
                      notNowBtn.click();
                    }
                    return true;
                  }

                  // Priority 2: Modal's own Close / Dismiss / 'X' button
                  const closeBtn = modal.querySelector(
                    'button.artdeco-modal__dismiss, [data-test-modal-close-btn], button[data-control-name*="close"], button:has(li-icon[type="cancel-icon"]), button:has(svg[data-test-icon*="close"])'
                  );
                  if (closeBtn) {
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                      await window.__zeroapplyCursor.clickElement(closeBtn, 'AI: Application Sent! Dismissing confirmation');
                    } else {
                      closeBtn.click();
                    }
                    return true;
                  }

                  // Priority 3: Success "Done" button
                  const doneBtn = modal.querySelector(
                    '#btn-success-done, [data-test-modal-close-btn], .success-view button, [class*="application-submitted"] button, [data-za-action="done"]'
                  );
                  if (doneBtn) {
                    const doneTxt = (doneBtn.textContent || '').trim().toLowerCase();
                    if (!/update.*profile|save.*profile/i.test(doneTxt)) {
                      if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                        await window.__zeroapplyCursor.clickElement(doneBtn, 'AI: Application Sent! Click Done');
                      } else {
                        doneBtn.click();
                      }
                      return true;
                    }
                  }

                  return false;
                } catch (e) {
                  return false;
                }
              })()
            `).catch(() => {});

            await new Promise((r) => setTimeout(r, 400));
            sm.transition('done');
            processTracker.recordSubmissionCheck(true, 'Application confirmed by ATS.');
            liveTelemetry.emit({
              type: 'submit',
              title: 'Application successfully submitted!',
              status: 'completed',
            });
            return {
              outcome: 'submitted',
              platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled,
              stepsExecuted: stepsCount,
            };
          }
          break;
        }

        // Human review pause before advancing step (600ms - 1100ms)
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));

        const forwardBtnText = (forwardBtn.text || (forwardBtn.action === 'submit' ? 'Submit application' : (forwardBtn.action === 'review' ? 'Review' : 'Next'))).trim();

        liveTelemetry.emit({
          type: 'click',
          title: `Clicking: "${forwardBtnText}"`,
          target: forwardBtnText,
          status: 'running',
        });

        // Record real-time step advance / click in process tracker
        processTracker.recordStepAdvance({
          stepNumber: stepsCount,
          stepTitle: activeStepTitle,
          buttonText: forwardBtnText,
          action: (forwardBtn.action === 'submit' ? 'submit' : (forwardBtn.action === 'review' ? 'review' : 'next')),
          nextStepNumber: forwardBtn.action === 'submit' ? undefined : stepsCount + 1,
          fieldsFilledCount: totalFieldsFilled,
        });

        if (forwardBtn.action === 'submit') {
          sm.transition('submitting');
          const adv = await stepNavigator.advance(webview);
          if (stepDelayMs > 0) await new Promise((r) => setTimeout(r, stepDelayMs));

          // Self-healing: if errors occurred on submission, report diagnostics
          if (adv.hasErrors) {
            liveTelemetry.emit({
              type: 'check',
              title: `Validation Warning: ${adv.errorCount || 0} fields require review`,
              status: 'running',
            });
          }

          // Wait & poll for submission confirmation view or post-submit upsell from ATS (up to 4500ms)
          let isSubmittedConfirmed = false;
          const pollStart = Date.now();
          while (Date.now() - pollStart < 4500) {
            isSubmittedConfirmed = await webview.executeJavaScript<boolean>(`
              (() => {
                const el = document.querySelector('.success-view, #step-success.active, [class*="application-submitted"], [class*="success-message"]');
                if (el) return true;
                const modal = document.querySelector('.artdeco-modal, [role="dialog"], #easy-apply-modal-overlay') || document;
                const text = (modal.textContent || (document.body ? document.body.innerText : '')).toLowerCase();
                const hasConfirmText = /your application was sent|application submitted|thank you for applying|application received|received your application|turn your resume into a profile|update your profile|save skills to your profile|add skills to your profile/i.test(text);
                const hasNotNowBtn = Array.from(modal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
                  const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                  return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
                });
                const hasDoneBtn = Boolean(modal.querySelector('#btn-success-done, [data-test-modal-close-btn], .success-view button'));
                return hasConfirmText || hasNotNowBtn || hasDoneBtn;
              })()
            `).catch(() => false);

            if (isSubmittedConfirmed) break;
            await new Promise((r) => setTimeout(r, 500));
          }

          if (isSubmittedConfirmed) {
            await ensureVisualCursor(webview);
            await webview.executeJavaScript(`
              (async () => {
                try {
                  const modal = document.querySelector(
                    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
                  );
                  // If modal is already closed, do NOT search document and do NOT click anything!
                  if (!modal) return true;

                  // Priority 1: "Not now" / "No thanks" / "Maybe later" button on the post-submission upsell dialog
                  // Strictly dismiss upsell prompts WITHOUT updating candidate profile
                  const allButtons = Array.from(modal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]'));
                  const notNowBtn = allButtons.find(b => {
                    const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                    if (/update.*profile|save.*profile|add.*skills.*profile|add.*to.*profile/i.test(txt)) return false;
                    return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(txt);
                  });

                  if (notNowBtn) {
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                      await window.__zeroapplyCursor.clickElement(notNowBtn, 'AI: Click "Not now" (Skip profile update)');
                    } else {
                      notNowBtn.click();
                    }
                    return true;
                  }

                  // Priority 2: Modal's own Close / Dismiss / 'X' button
                  const closeBtn = modal.querySelector(
                    'button.artdeco-modal__dismiss, [data-test-modal-close-btn], button[data-control-name*="close"], button:has(li-icon[type="cancel-icon"]), button:has(svg[data-test-icon*="close"])'
                  );

                  if (closeBtn) {
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                      await window.__zeroapplyCursor.clickElement(closeBtn, 'AI: Application Sent! Dismissing confirmation');
                    } else {
                      closeBtn.click();
                    }
                    return true;
                  }

                  // Priority 3: Success "Done" button
                  const doneBtn = modal.querySelector(
                    '#btn-success-done, [data-test-modal-close-btn], .success-view button, [class*="application-submitted"] button, [data-za-action="done"]'
                  );
                  if (doneBtn) {
                    const doneTxt = (doneBtn.textContent || '').trim().toLowerCase();
                    if (!/update.*profile|save.*profile/i.test(doneTxt)) {
                      if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                        await window.__zeroapplyCursor.clickElement(doneBtn, 'AI: Application Sent! Click Done');
                      } else {
                        doneBtn.click();
                      }
                      return true;
                    }
                  }

                  return false;
                } catch (e) {
                  return false;
                }
              })()
            `).catch(() => {});

            await new Promise((r) => setTimeout(r, 450));

            sm.transition('done');
            processTracker.recordSubmissionCheck(true, 'Application confirmed by ATS.');
            liveTelemetry.emit({
              type: 'submit',
              title: 'Application successfully submitted!',
              status: 'completed',
            });
            return {
              outcome: 'submitted',
              platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled,
              stepsExecuted: stepsCount,
            };
          } else {
            // Submission still processing or required fields blocked it; DO NOT DISMISS MODAL!
            liveTelemetry.emit({
              type: 'check',
              title: 'Submission pending or fields required review. Modal kept open.',
              status: 'running',
            });
          }
        }

        if (forwardBtn.action === 'done') {
          await stepNavigator.advance(webview);
          sm.transition('done');
          return {
            outcome: 'submitted',
            platform: detectedPlatform,
            fieldsFilled: totalFieldsFilled,
            stepsExecuted: stepsCount,
          };
        }

        // Advance to next step (action is 'next' or 'review')
        let advResult = await stepNavigator.advance(webview);
        const stepWait = Math.max(stepDelayMs, 850) + Math.random() * 350;
        await new Promise((r) => setTimeout(r, stepWait));

        // Wait for modal DOM and step transition animations to settle
        await webview.executeJavaScript(`
          (async () => {
            const start = Date.now();
            while (Date.now() - start < 1500) {
              const modal = document.querySelector('.jobs-easy-apply-modal, #artdeco-modal-outlet .artdeco-modal, [role="dialog"]');
              const isAnimating = modal && (modal.classList.contains('artdeco-modal--animating') || modal.querySelector('.artdeco-loader, [data-test-document-upload-progress]'));
              if (!isAnimating) break;
              await new Promise(r => setTimeout(r, 100));
            }
          })()
        `).catch(() => {});

        // Self-healing error recovery: If step did not advance due to validation errors
        let recoveryPasses = 0;
        const maxRecoveryPasses = 3;

        while (advResult.hasErrors && advResult.errorMessages && advResult.errorMessages.length > 0 && recoveryPasses < maxRecoveryPasses) {
          recoveryPasses++;
          liveTelemetry.emit({
            type: 'check',
            title: `Self-Healing (Pass ${recoveryPasses}/${maxRecoveryPasses}): Detected ${advResult.errorCount} validation issue(s) [${advResult.errorMessages.join(', ')}], repairing inputs...`,
            status: 'running',
          });

          const reScanned = await scanFormFields(webview);
          const reClassified = classifyFields(reScanned, persona);

          for (const rf of reClassified) {
            // Find specific error message associated with this field if available
            const matchedFieldError = advResult.fieldErrors?.find(
              fe => (rf.id && fe.id === rf.id) ||
                    (rf.name && fe.selector && fe.selector.includes(rf.name)) ||
                    (fe.selector && rf.selector && fe.selector === rf.selector)
            );
            const fieldErrorMsg = (matchedFieldError?.message || rf.errorMessage || advResult.errorMessages[0] || '').trim();
            const analysis = fieldErrorMsg ? analyzeErrorConstraint(fieldErrorMsg) : null;

            // Determine if this field is actively invalid or requires correction
            const isMarkedError = Boolean(rf.hasError || rf.errorMessage || matchedFieldError);
            const isInvalidExp = (rf.fieldType === 'role_years_exp' || rf.fieldType === 'years_exp') &&
              (isNaN(Number(rf.currentValue)) || Number(rf.currentValue) <= 0);
            const isInvalidConstraint = Boolean(analysis?.isNumericConstraint && (!rf.currentValue || isNaN(Number(rf.currentValue))));
            const shouldRefill = isMarkedError || isInvalidExp || isInvalidConstraint || !rf.currentValue || rf.inputType === 'radio';

            if (shouldRefill) {
              // Resolve question with explicit validationError constraint
              let answerVal = rf.mappedValue;
              const numericAns = answerVal ? Number(answerVal) : NaN;
              const violatesConstraint = Boolean(
                analysis?.isNumericConstraint && (
                  isNaN(numericAns) ||
                  (analysis.targetMinValue !== undefined && (
                    numericAns < analysis.targetMinValue ||
                    (numericAns === analysis.targetMinValue && /(?:larger|greater|more)\s*than/i.test(fieldErrorMsg))
                  ))
                )
              );

              // If mappedValue is missing, or field has an active error, or violates constraint, resolve via questionResolver
              if (!answerVal || isMarkedError || violatesConstraint) {
                const res = await resolveQuestion({
                  ...rf,
                  validationError: fieldErrorMsg,
                  errorMessage: fieldErrorMsg,
                  helperText: rf.helperText,
                  contextHint: rf.helperText ? `${rf.contextHint || ''} ${rf.helperText}`.trim() : rf.contextHint,
                  jobContext: activeJobContext,
                }, persona);
                answerVal = res.answer;
              }

              if (!answerVal && (rf.inputType === 'radio' || (rf.options && rf.options.length > 0))) {
                if (rf.options && rf.options.length > 0) {
                  const affirmative = rf.options.find(o => /^(yes|agree|confirm|true)$/i.test(o.trim()))
                    || rf.options.find(o => /yes|agree|confirm|true/i.test(o.trim()))
                    || rf.options[0];
                  answerVal = affirmative;
                } else {
                  answerVal = 'Yes';
                }
              }

              if (answerVal) {
                // Telemetry indicating self-healing repair
                liveTelemetry.emit({
                  type: 'think',
                  title: `Self-Healing Q (${rf.label}): Constraint "${fieldErrorMsg}", filling "${answerVal}"`,
                  target: rf.label,
                  value: answerVal,
                  status: 'running',
                });

                await webview.executeJavaScript(`
                  if (window.__zeroapplyHUD) {
                    window.__zeroapplyHUD.setLLMGeneration(
                      ${JSON.stringify(rf.label)},
                      ${JSON.stringify(fieldErrorMsg)},
                      ${JSON.stringify(answerVal)},
                      'ollama',
                      'Qwen 2.5:3b (Self-Healing)'
                    );
                  }
                `).catch(() => {});

                const fillRes = await fillField(webview, rf, answerVal, persona);
                if (fillRes.success) {
                  totalFieldsFilled++;
                }
                await new Promise((r) => setTimeout(r, 220 + Math.random() * 200));
              }
            }
          }

          // Small settling pause before re-attempting advance
          await new Promise((r) => setTimeout(r, 450));
          advResult = await stepNavigator.advance(webview);
          if (!advResult.hasErrors) {
            liveTelemetry.emit({
              type: 'check',
              title: `Self-Healing successful: All fields repaired and advanced to next step!`,
              status: 'completed',
            });
            break;
          }
        }
      }

      const isActuallySubmitted = await webview.executeJavaScript<boolean>(`
        (() => {
          try {
            const url = (window.location.href || '').toLowerCase();
            const successUrlKeywords = ['/thank-you', '/thankyou', '/confirmation', '/submitted', '/success', '/applied', '/application-received', '/complete', 'formresponse'];
            for (const kw of successUrlKeywords) {
              if (url.includes(kw)) return true;
            }

            const modal = document.querySelector('.artdeco-modal, [role="dialog"], #easy-apply-modal-overlay') || document;
            const text = (modal.textContent || (document.body ? document.body.innerText : '')).toLowerCase();
            const hasConfirmText = /your application was sent|application (has been )?submitted|thank you for applying|thanks for applying|application received|received your application|congratulations|submission successful|your response has been recorded|form submitted|turn your resume into a profile|update your profile|save skills to your profile/i.test(text);
            if (hasConfirmText) return true;

            const el = document.querySelector('.success-view, #step-success.active, [data-test-modal-close-btn], [class*="application-submitted"], [class*="success-message"], [data-automation-id="congratulations"], .application-confirmation, #application-confirmation, #btn-success-done, [data-za-action="done"]');
            if (el && el.offsetParent !== null) return true;

            const hasNotNowBtn = Array.from(modal.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
              const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
              return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
            });
            if (hasNotNowBtn) return true;

            const hasAppliedBadge = /applied\\s*\\d|applied\\s*just\\s*now/i.test(text);
            return hasAppliedBadge;
          } catch(e) {
            return false;
          }
        })()
      `).catch(() => false);

      processTracker.recordSubmissionCheck(
        isActuallySubmitted,
        isActuallySubmitted ? 'Application completed and confirmed.' : 'Application halted before completion.'
      );

      return {
        outcome: isActuallySubmitted ? 'submitted' : 'skipped',
        platform: detectedPlatform,
        fieldsFilled: totalFieldsFilled,
        stepsExecuted: stepsCount,
      };
    } catch (err) {
      sm.transition('error');
      return {
        outcome: 'failed',
        platform: detectedPlatform,
        fieldsFilled: totalFieldsFilled,
        stepsExecuted: stepsCount,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const orchestrator = new AutoApplyOrchestrator();

