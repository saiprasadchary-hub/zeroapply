import { createQuestionSession } from '../localLlm/questionSession';
import { needsAvailabilityInterpretation } from '../localLlm/availabilityFacts';
import { refreshSalaryRate } from '../localLlm/salaryExchange';
import { assertSecureStorageHealthy } from '../../services/secureStorage';
import { dismissSubmissionReceipt } from '../recovery/postSubmissionDismissal';
import { captureSubmissionEvidence, saveSubmissionEvidence, type SubmissionAnswer } from '../tracker/submissionEvidenceStore';
import { ApplicationLogger } from '../tracker/applicationLogger';
import { resolveFieldScreeningFact } from '../localLlm/fieldAnswer';
import { checkpointFor, newCheckpoint, profileRevision, saveCheckpoint, type WorkflowCheckpoint } from './automationStore';
import { recordQuality } from '../telemetry/qualityMetrics';
import { SUBMISSION_EVIDENCE_SCRIPT } from '../normalApply/submissionEvidence';
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
import { getActiveModelName } from '../localLlm/ollamaClient';
import { analyzeErrorConstraint } from '../localLlm/errorConstraintAnalyzer';
import { fillFieldWithRecovery as fillField } from '../formFiller/fillRecovery';
import { auditFormFields } from '../formFiller/formAuditor';
import { stepNavigator } from '../navigation/wizardStepNavigator';
import { WorkflowStateMachine } from './stateMachine';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { detectSecurityChallenge, waitForChallengeResolution } from '../security';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { getStoredResume } from '../fileUpload/resumeFileAdapter';
import { omniVision } from '../vision';
import { captureWebsiteScreenshot } from '../vision/websiteScreenshot';
import { clarifyVisualFields } from '../vision/visualFieldFallback';
import { ensureVisualCursor, cursorMoveAndClick } from '../stealth/agentCursor';
import { getLiveAgentLightHudScript } from '../ui/liveAgentLightHUD';
import { isLiveAgentActivityEnabled } from '../../settings/settingsManager';
import { processTracker } from '../tracker/processTracker';
import { QALogger } from '../tracker/qaLogger';
import { scanAndHandleWhatsApp } from './whatsappHandler';
import { ensureLinkedInSafeSession } from '../stealth/linkedinSafetyGuard';

export interface OrchestratorOptions {
  allowSubmit?: boolean;
  companyName?: string;
  jobTitle?: string;
  maxSteps?: number;
  stepDelayMs?: number;
  openTab?: (url?: string) => Promise<any | null>;
  closeTabAndReturn?: (tabView?: any) => Promise<void>;
  isCancelled?: () => boolean;
}

export interface OrchestrationResult {
  outcome: 'submitted' | 'skipped' | 'failed';
  platform?: string;
  fieldsFilled: number;
  stepsExecuted: number;
  error?: string;
  evidenceId?: string;
  evidenceError?: string;
}

export class AutoApplyOrchestrator {
  public async runApplication(
    webview: WebviewTarget,
    persona: PersonaData,
    options: OrchestratorOptions = {}
  ): Promise<OrchestrationResult> {
  assertSecureStorageHealthy();
  await refreshSalaryRate().catch(() => undefined);
    const { maxSteps = 12, stepDelayMs = 650, openTab, closeTabAndReturn } = options;
    const sm = new WorkflowStateMachine();

    let totalFieldsFilled = 0;
    let stepsCount = 0;
    let detectedPlatform = 'Generic Portal';

    const unresolvedReasons = new Map<string, string>();
    const resolveForRun = createQuestionSession(async field => {
      liveTelemetry.emit({ type: 'think', title: `Local AI answering: ${field.label}`, target: field.label, status: 'running' });
      const result = await resolveQuestion(field, persona);
      if (!result.answer) {
        const reason = result.resumeContext || 'No supported answer was returned from the saved profile and resume.';
        unresolvedReasons.set(field.label, reason);
        liveTelemetry.emit({ type: 'status', title: `${field.label}: ${reason}${result.retryable ? ' Local AI recovery is limited to one retry.' : ' Required answer remains unresolved.'}`, target: field.label, status: 'running' });
      } else unresolvedReasons.delete(field.label);
      return result;
    });
    const savedAnswers = new Map<string, SubmissionAnswer>();
    let evidenceId: string | undefined;
    let evidenceError: string | undefined;
    let checkpoint: WorkflowCheckpoint | undefined;
    const preserveReceipt = async (): Promise<void> => {
      if (evidenceId) return;
      const alreadyConfirmed = checkpoint?.phase === 'confirmed';
      if (checkpoint) {
        checkpoint = { ...checkpoint, phase: 'confirmed', pending: [], answers: [...savedAnswers.values()], reason: undefined };
        await saveCheckpoint(checkpoint).catch(() => {});
      }
      if (!alreadyConfirmed) recordQuality('confirmedApplications');
      try {
        const jobUrl = await webview.executeJavaScript<string>('location.href');
        const bundle = await captureSubmissionEvidence(webview, {
          applicant: { name: persona.fullName, email: persona.email }, jobUrl,
          companyName: options.companyName || '', jobTitle: options.jobTitle || '', answers: [...savedAnswers.values()],
        });
        await saveSubmissionEvidence(bundle);
        evidenceId = bundle.id;
        liveTelemetry.emit({ type: 'check', title: bundle.screenshotError || 'Application receipt and answers saved.', status: 'completed' });
      } catch (error: unknown) {
        evidenceError = error instanceof Error ? error.message : 'Application receipt could not be saved.';
        liveTelemetry.emit({ type: 'check', title: `Application confirmed; receipt storage failed: ${evidenceError}`, status: 'failed' });
      }
      const dismissal = await dismissSubmissionReceipt(webview);
      if (dismissal.clicked) liveTelemetry.emit({ type: 'click', title: dismissal.reason, status: dismissal.dismissed ? 'completed' : 'paused' });
    };

    try {
      const currentUrl = await webview.executeJavaScript<string>('location.href').catch(() => '');
      const previous = typeof currentUrl === 'string' ? checkpointFor(persona, currentUrl) : undefined;
      checkpoint = previous && previous.revision === profileRevision(persona) ? { ...previous } : newCheckpoint(persona, typeof currentUrl === 'string' ? currentUrl : '', options.companyName, options.jobTitle);
      // A changed profile never erases an unresolved submission for this applicant/job.
      if (previous && ['submitting', 'uncertain', 'confirmed'].includes(previous.phase)) {
        checkpoint = { ...previous };
        for (const answer of previous.answers) savedAnswers.set(answer.question, answer);
        const receipt = await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false);
        if (receipt || ApplicationLogger.hasSubmitted({ jobUrl: currentUrl })) {
          await preserveReceipt();
          return { outcome: 'submitted', evidenceId, evidenceError, platform: detectedPlatform, fieldsFilled: previous.answers.length, stepsExecuted: 0 };
        }
        if (previous.phase === 'submitting') {
          checkpoint = { ...checkpoint, phase: 'uncertain', reason: 'Interrupted while submitting; confirmation must be checked.' };
          await saveCheckpoint(checkpoint);
          recordQuality('uncertainApplications');
        }
        return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: 0, stepsExecuted: 0, error: 'A previous submission for this job needs confirmation. Check the receipt or application history; another Submit click was prevented.' };
      }
      if (previous?.revision === checkpoint.revision) {
        for (const answer of previous.answers) savedAnswers.set(answer.question, answer);
        liveTelemetry.emit({ type: 'status', title: 'Saved application found. Rechecking the live form before continuing.', status: 'running' });
      }
      checkpoint = { ...checkpoint, phase: 'draft', pending: [], reason: undefined };
      await saveCheckpoint(checkpoint);
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
      const dialogCompany = await webview.executeJavaScript<string>(`(() => {
        const roots = [document];
        for (let i = 0; i < roots.length; i++) {
          for (const node of roots[i].querySelectorAll('*')) if (node.shadowRoot) roots.push(node.shadowRoot);
          for (const dialog of roots[i].querySelectorAll('dialog[open], [role="dialog"], .artdeco-modal')) {
            if (!dialog.getClientRects().length) continue;
            const match = (dialog.innerText || dialog.textContent || '').match(/^Apply to ([^\\n]+)/im);
            if (match) return match[1].trim();
          }
        }
        return '';
      })()`).catch(() => '');
      const activeJobContext = { ...pagePerception?.job,
        companyName: dialogCompany || options.companyName || pagePerception?.job?.companyName,
        jobTitle: options.jobTitle || pagePerception?.job?.jobTitle,
      };
      const normalizeCompany = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const company = normalizeCompany(activeJobContext.companyName || '');
      const screeningContext = { previouslyAppliedToCompany: company && !['company', 'target company'].includes(company)
        ? ApplicationLogger.getLogs().some(log => log.status === 'SUCCESS' && normalizeCompany(log.companyName) === company)
          || QALogger.getLogs().some(log => log.status === 'SUBMITTED' && normalizeCompany(log.companyName || log.company) === company)
        : undefined };
      await webview.executeJavaScript(`window.__zeroapplyHUD?.setJob(${JSON.stringify(activeJobContext?.jobTitle || 'Current application')}, ${JSON.stringify(activeJobContext?.companyName || 'Reading job details')})`).catch(() => {});


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
            allowSubmit: options.allowSubmit,
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
            '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, dialog[open], [role="dialog"][aria-modal="true"], .artdeco-modal'
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
        const applyClicked = await cursorMoveAndClick(webview, applyBtnSelector, { label: applyLabel });

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
        if (!applyClicked) await webview.executeJavaScript(clickApplyScript);
        if (stepDelayMs > 0) await new Promise((r) => setTimeout(r, Math.max(stepDelayMs, 1500)));
      }

      // Step execution loop
      while (stepsCount < maxSteps) {
        if (options.isCancelled?.()) {
          return {
            outcome: 'skipped',
            platform: detectedPlatform,
            fieldsFilled: totalFieldsFilled,
            stepsExecuted: stepsCount,
            error: 'Application cancelled by user',
          };
        }
        if (await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false)) {
          await preserveReceipt();
          return { outcome: 'submitted', evidenceId, evidenceError, platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount };
        }
        const hasApplicationScope = await webview.executeJavaScript<boolean>(`(() => {
          if (!/(^|[.])linkedin[.]com$/i.test(location.hostname)) return true;
          const roots = [document];
          for (let i = 0; i < roots.length; i++) {
            for (const element of roots[i].querySelectorAll('*')) if (element.shadowRoot) roots.push(element.shadowRoot);
            if (Array.from(roots[i].querySelectorAll('dialog[open], [role="dialog"], .jobs-easy-apply-modal'))
              .some(element => element.getBoundingClientRect().width > 80 && element.getBoundingClientRect().height > 80)) return true;
          }
          return false;
        })()`).catch(() => false);
        if (!hasApplicationScope) {
          return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'No application dialog is open. Stopped before clicking job-results controls.' };
        }
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
            const modal = document.querySelector('#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, dialog[open], [role="dialog"][aria-modal="true"], dialog[open], [role="dialog"]');
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
            window.__zeroapplyHUD.setStep(${stepsCount}, 0, ${JSON.stringify(activeStepTitle)});
          }
        `).catch(() => {});

        // Proactively scan for WhatsApp links or joining invites: copy to clipboard, notify, and disarm opening
        await scanAndHandleWhatsApp(webview).catch(() => {});

        // Enforce LinkedIn stealth mask, disarm tracker iframe errors, uncheck follow company, and bypass top-choice traps
        await ensureLinkedInSafeSession(webview).catch(() => {});

        let fields = await clarifyVisualFields(webview, await scanFormFields(webview));
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
          for (const field of [...classified].sort((a, b) => a.rect && b.rect ? a.rect.y - b.rect.y || a.rect.x - b.rect.x : 0)) {
            if (field.standardKey === 'top_choice_upsell' && field.currentValue !== 'true') continue;
            // Resume cards/files are handled exclusively by the dedicated resume pipeline below
            if (field.fieldType === 'resume' || field.fieldType === 'resume_upload' || field.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(field.label || '')) {
              continue;
            }
            // Determine answer (Persona mapped value or Local Qwen 2.5 LLM resolution)
            if (!field.required && (field.inputType === 'checkbox' || !field.mappedValue)) continue;
            const screenedFact = resolveFieldScreeningFact({ ...field, jobUrl: checkpoint?.jobUrl }, persona, screeningContext);
            const isSubjectiveRating = /(?:rate|rating|scale).*\b(?:skills?|yourself|proficien|1\s*[-–]\s*10)|\b(?:skills?|yourself).*\b(?:rate|rating|scale)/i.test(field.label);
            if (isSubjectiveRating && screenedFact === '' && field.required && !needsAvailabilityInterpretation(field.label)) {
              const error = `Needs a verified profile answer: ${field.label}`;
              liveTelemetry.emit({ type: 'status', title: error, target: field.label, status: 'paused' });
              await webview.executeJavaScript(`window.__zeroapplyHUD?.setQuestion(${JSON.stringify(error)}, 'Needs your answer')`).catch(() => {});
              // Finish other grounded answers; the final audit still blocks advancement.
              continue;
            }
            let answerVal = needsAvailabilityInterpretation(field.label) ? undefined : (screenedFact || field.mappedValue);
            let source: 'persona' | 'ollama' | 'rule' = 'persona';
            let resumeContextUsed: string | undefined;

            if (!answerVal) {
              const res = await resolveForRun({ ...field, jobUrl: checkpoint?.jobUrl, captureScreenshot: () => captureWebsiteScreenshot(webview), jobContext: activeJobContext });
              answerVal = res.answer;
              source = res.source === 'persona' ? 'persona' : 'ollama';
              resumeContextUsed = res.resumeContext;

              // Persist novel answer to Question Memory Bank for 0ms recurring resolution
              if (answerVal && field.label) {
              }
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
                    ${JSON.stringify(getActiveModelName())}
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

              if (!field.hasError && field.currentValue === answerVal && savedAnswers.get(field.label)?.answer === answerVal) continue;
              const fillRes = await fillField(webview, field, answerVal, persona, options.isCancelled);
              if (!fillRes.success) {
                const error = `Answer did not persist for "${field.label}": ${fillRes.error || 'field verification failed'}`;
                liveTelemetry.emit({ type: 'status', title: error, target: field.label, status: 'paused' });
                return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error };
              }
              totalFieldsFilled++;
              savedAnswers.set(field.label, { question: field.label, answer: fillRes.value || answerVal, source });
              if (checkpoint) { checkpoint = { ...checkpoint, step: stepsCount, answers: [...savedAnswers.values()] }; await saveCheckpoint(checkpoint); }

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
          (async () => {
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
              if (window.__zeroapplyCursor?.clickElement) {
                const clicked = await window.__zeroapplyCursor.clickElement(selectBtn, 'Select resume');
                if (!clicked) return { hasPicker: true, hasSelected: false, handled: false, selectedName: '' };
              } else {
                selectBtn.focus();
                selectBtn.click();
              }

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

        while ((!audit.ready || (audit.unansweredQuestions || []).some(question => question.isRequired || question.hasError)) && auditPasses < 3) {
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
            if (ff.standardKey === 'top_choice_upsell') continue;
            if (!ff.required && !ff.hasError) continue;
            if (ff.fieldType === 'resume' || ff.fieldType === 'resume_upload' || ff.inputType === 'file' || /resume|\.pdf|\.docx?|cv\b/i.test(ff.label || '')) {
              continue;
            }
            const isUnanswered =
              (ff.inputType === 'checkbox' || ff.inputType === 'switch')
                ? (ff.currentValue !== 'true' && (ff.required || ff.fieldType === 'terms' || /agree|verify|accurate|terms|consent|joined|whatsapp|community/i.test(ff.label || '')))
                : (!ff.currentValue ||
                   /^(select|choose|select an option|please select|--|option auswählen|auswählen|bitte auswählen|seleccionar|seleccione|sélectionner|choisir|selecionar|selezionare|selecteer|kies)$/i.test((ff.currentValue || '').trim()) ||
                   ff.hasError ||
                   (ff.inputType === 'radio' && !ff.currentValue));

            if (isUnanswered) {
              let answerVal = needsAvailabilityInterpretation(ff.label) ? undefined : resolveFieldScreeningFact({ ...ff, jobUrl: checkpoint?.jobUrl }, persona, screeningContext) ?? ff.mappedValue;
              let source: 'persona' | 'ollama' | 'rule' = 'persona';

              const matchingUnanswered = (audit.unansweredQuestions || []).find(
                (u) => (u.id && u.id === ff.id) || (u.name && u.name === ff.name) || (u.label && u.label === ff.label)
              );
              const activeError = (ff.errorMessage || matchingUnanswered?.errorText || (audit.errors && audit.errors[0]) || '').trim();
              const activeHelper = (ff.helperText || matchingUnanswered?.helperText || '').trim();

              // If the field has an active error, previous mappedValue cannot be trusted (e.g. '8' when >100 required).
              // Always resolve afresh with the error and helper text!
              if (ff.hasError || Boolean(activeError) || !answerVal) {
                const res = await resolveForRun({
                  ...ff,
                  jobUrl: checkpoint?.jobUrl,
                  validationError: activeError,
                  errorMessage: activeError,
                  helperText: activeHelper,
                  contextHint: activeHelper ? `${ff.contextHint || ''} ${activeHelper}`.trim() : ff.contextHint,
                  captureScreenshot: () => captureWebsiteScreenshot(webview), jobContext: activeJobContext,
                });
                answerVal = res.answer;
                source = res.source === 'persona' ? 'persona' : 'ollama';

                if (answerVal && ff.label) {
                }
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

                const fillRes = await fillField(webview, ff, answerVal, persona, options.isCancelled);
                if (fillRes.success) totalFieldsFilled++;
                await new Promise((r) => setTimeout(r, 250));
              }
            }
          }

          await new Promise((r) => setTimeout(r, 350));
          audit = await auditFormFields(webview);
        }

        if (!audit.ready || audit.missingRequired.length || audit.errors.length || (audit.unansweredQuestions || []).some(question => question.isRequired || question.hasError)) {
          const details = [...new Set([
            ...audit.missingRequired,
            ...audit.unansweredQuestions.filter(question => question.isRequired || question.hasError).map(question => question.label),
          ])].map(label => unresolvedReasons.has(label) ? `${label}: ${unresolvedReasons.get(label)}` : label);
          const error = `Required answers did not pass verification: ${[...details, ...audit.errors].join('; ') || 'unresolved questions'}`;
          const unresolved = (audit.unansweredQuestions || []).filter(question => question.isRequired || question.hasError);
          const liveFields = await scanFormFields(webview).catch(() => []);
          if (checkpoint) {
            checkpoint = { ...checkpoint, phase: 'blocked', step: stepsCount, reason: error, answers: [...savedAnswers.values()], pending: liveFields.filter(field => unresolved.some(question => (question.id && question.id === field.id) || question.label === field.label)).map(field => ({ label: field.label, inputType: field.inputType, options: field.options, error: unresolvedReasons.get(field.label) || field.errorMessage })) };
            await saveCheckpoint(checkpoint);
          }
          recordQuality('blockedForms');
          liveTelemetry.emit({ type: 'status', title: error, status: 'paused' });
          return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error };
        }

        // Save actual persisted values after the final audit, including prefilled answers.
        const persistedFields = await scanFormFields(webview).catch(() => []);
        for (const field of persistedFields) {
          if (field.label && field.currentValue && !/password|file/i.test(field.inputType || '')) {
            savedAnswers.set(field.label, { question: field.label, answer: field.currentValue, source: 'verified form value' });
          }
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
              const modal = document.querySelector('.artdeco-modal, dialog[open], [role="dialog"], #artdeco-modal-outlet') || document;
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
          const isDone = await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false);
          if (isDone) {
            await preserveReceipt();
            await ensureVisualCursor(webview);
            await webview.executeJavaScript(`
              (async () => {
                try {
                  const modal = document.querySelector(
                    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, dialog[open], [role="dialog"][aria-modal="true"], dialog[open], [role="dialog"], .artdeco-modal'
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
              outcome: 'submitted', evidenceId, evidenceError,
              platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled,
              stepsExecuted: stepsCount,
            };
          }
          break;
        }

        if (forwardBtn.action === 'submit' && options.allowSubmit !== true) {
          return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'Application is ready for review; final submission is disabled for this run.' };
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
          if (options.isCancelled?.()) return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'Application cancelled by user' };
          if (checkpoint) { checkpoint = { ...checkpoint, phase: 'submitting', step: stepsCount, answers: [...savedAnswers.values()] }; await saveCheckpoint(checkpoint); }
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

          // Wait & poll for submission confirmation view or post-submit upsell from ATS (up to 45 seconds)
          let isSubmittedConfirmed = false;
          const pollStart = Date.now();
          while (Date.now() - pollStart < 45000) {
            isSubmittedConfirmed = await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false);

            if (isSubmittedConfirmed) break;
            await new Promise((r) => setTimeout(r, 500));
          }

          if (isSubmittedConfirmed) {
            await preserveReceipt();
            await ensureVisualCursor(webview);
            await webview.executeJavaScript(`
              (async () => {
                try {
                  const modal = document.querySelector(
                    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, dialog[open], [role="dialog"][aria-modal="true"], dialog[open], [role="dialog"], .artdeco-modal'
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
              outcome: 'submitted', evidenceId, evidenceError,
              platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled,
              stepsExecuted: stepsCount,
            };
          } else {
            if (checkpoint) { checkpoint = { ...checkpoint, phase: adv.hasErrors ? 'blocked' : 'uncertain', reason: 'Submission receipt has not been confirmed.' }; await saveCheckpoint(checkpoint); }
            recordQuality('uncertainApplications');
            // Submission still processing or required fields blocked it; DO NOT DISMISS MODAL!
            liveTelemetry.emit({
              type: 'check',
              title: 'Submission unconfirmed. Stopped without sending another click.',
              status: 'running',
            });
            return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'Submission unconfirmed; no repeat click sent.' };
          }
        }

        if (forwardBtn.action === 'done') {
          const confirmed = await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false);
          if (!confirmed) return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'Done button found without a confirmed application receipt.' };
          await preserveReceipt();
          await stepNavigator.advance(webview);
          sm.transition('done');
          return {
            outcome: 'submitted', evidenceId, evidenceError,
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
              const modal = document.querySelector('.jobs-easy-apply-modal, #artdeco-modal-outlet .artdeco-modal, dialog[open], [role="dialog"]');
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
              let answerVal = needsAvailabilityInterpretation(rf.label) ? undefined : resolveFieldScreeningFact({ ...rf, jobUrl: checkpoint?.jobUrl }, persona, screeningContext) ?? rf.mappedValue;
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
                const res = await resolveForRun({
                  ...rf,
                  jobUrl: checkpoint?.jobUrl,
                  validationError: fieldErrorMsg,
                  errorMessage: fieldErrorMsg,
                  helperText: rf.helperText,
                  contextHint: rf.helperText ? `${rf.contextHint || ''} ${rf.helperText}`.trim() : rf.contextHint,
                  captureScreenshot: () => captureWebsiteScreenshot(webview), jobContext: activeJobContext,
                });
                answerVal = res.answer;
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

                const fillRes = await fillField(webview, rf, answerVal, persona, options.isCancelled);
                if (fillRes.success) {
                  totalFieldsFilled++;
                }
                await new Promise((r) => setTimeout(r, 220 + Math.random() * 200));
              }
            }
          }

          // Small settling pause before re-attempting advance
          await new Promise((r) => setTimeout(r, 450));
          const repairedAudit = await auditFormFields(webview);
          if (!repairedAudit.ready) {
            const unresolved = [...new Set([
              ...repairedAudit.missingRequired,
              ...repairedAudit.unansweredQuestions.map(question => question.label),
              ...repairedAudit.errors,
            ])].join('; ');
            return {
              outcome: 'skipped', platform: detectedPlatform,
              fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount,
              error: `Required answers still need attention after repair: ${unresolved || 'Form validation failed'}. No repeat navigation click sent.`,
            };
          }
          advResult = await stepNavigator.advance(webview);
          if (advResult.stepChanged && !advResult.hasErrors) {
            liveTelemetry.emit({
              type: 'check',
              title: `Self-Healing successful: All fields repaired and advanced to next step!`,
              status: 'completed',
            });
            break;
          }
        }
        if (!advResult.stepChanged) {
          return { outcome: 'skipped', platform: detectedPlatform, fieldsFilled: totalFieldsFilled, stepsExecuted: stepsCount, error: 'Application step did not change. Stopped repeated clicks; review the open form.' };
        }
      }

      const isActuallySubmitted = await webview.executeJavaScript<boolean>(SUBMISSION_EVIDENCE_SCRIPT).catch(() => false);

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
