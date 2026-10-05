import type { PersonaData } from '../../types';
import { TabLifecycleManager } from './tabLifecycleManager';
import { ExternalAtsDetector } from './externalAtsDetector';
import { ExternalFormFiller } from './externalFormFiller';
import { SubmissionVerifier } from './submissionVerifier';
import { ApplicationLogger } from '../tracker/applicationLogger';
import { dailyQuotaManager } from '../stealth/dailyQuotaManager';
import { processTracker } from '../tracker/processTracker';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import type {
  NormalApplyTarget,
  TabBridgeCallbacks,
  NormalApplyConfig,
  NormalApplyExecutionResult,
} from './normalApplyTypes';

export class NormalApplyEngine {
  private atsDetector = new ExternalAtsDetector();
  private formFiller = new ExternalFormFiller();
  private verifier = new SubmissionVerifier();

  /**
   * Executes a complete Normal Apply workflow:
   * 1. Opens the job application in a new tab.
   * 2. Waits for redirects and page hydration to settle.
   * 3. Detects the external ATS and triggers landing buttons if needed.
   * 4. Scans and fills all form fields across multi-step wizard.
   * 5. Uploads candidate resume to file dropzone/input.
   * 6. Submits the application and verifies ATS confirmation.
   * 7. Logs telemetry and quota stats.
   * 8. Closes the new tab and restores focus to the main search tab.
   */
  public async executeNormalApply(
    target: NormalApplyTarget,
    persona: PersonaData,
    callbacks: TabBridgeCallbacks,
    config: NormalApplyConfig = {}
  ): Promise<NormalApplyExecutionResult> {
    const tabManager = new TabLifecycleManager(callbacks);
    const allowSubmit = config.allowSubmit ?? true;
    let finalUrl = target.externalUrl || '';

    callbacks.notifyStatus?.(`Starting Normal Apply for "${target.jobTitle}" at "${target.companyName}"...`);
    callbacks.notifyLog?.(
      `Normal Apply workflow initiated: opens new tab, completes filling & submission, and returns to main tab.`,
      'info'
    );

    let extView: any = null;

    try {
      // 1. Open new tab and wait for hydration/redirects
      extView = await tabManager.openAndSettleExternalTab(target.externalUrl, config.pageSettledTimeoutMs ?? 15000);

      if (!extView) {
        return {
          outcome: 'failed',
          fieldsFilled: 0,
          stepsExecuted: 0,
          error: 'Failed to open or attach to external application tab',
        };
      }

      try {
        finalUrl = typeof extView.getURL === 'function' ? String(extView.getURL() || '') : finalUrl;
      } catch {}

      processTracker.recordTabOpened('new_tab', finalUrl);
      callbacks.notifyStatus?.(`Working on application for "${target.jobTitle}" in new tab...`);

      // 2. Universal External ATS Perception
      const atsProfile = await this.atsDetector.detectAts(extView);
      callbacks.notifyLog?.(
        `Perception on new tab: Identified ${atsProfile.displayName} (${atsProfile.kind})`,
        'info'
      );

      // 3. Handle initial landing page "Apply" trigger if form is not yet visible
      if (atsProfile.hasLandingApplyButton) {
        callbacks.notifyStatus?.(`Revealing application form on ${atsProfile.displayName}...`);
        await this.atsDetector.triggerLandingApplyIfPresent(extView, atsProfile);
      }

      // 4. Fill and submit external form across wizard steps
      callbacks.notifyStatus?.(`Autonomous form filling running in new tab for "${target.jobTitle}"...`);
      const fillProgress = await this.formFiller.fillAndSubmitExternalForm(
        extView,
        persona,
        target.jobTitle,
        config
      );

      // 5. Verify submission status
      let isConfirmed = fillProgress.isConfirmed;
      let confirmationReason = 'Submission completed and verified';

      if (!isConfirmed && fillProgress.submitted && allowSubmit) {
        const verifyRes = await this.verifier.verifySubmission(extView);
        isConfirmed = verifyRes.isConfirmed;
        confirmationReason = verifyRes.reason;
      }

      processTracker.recordSubmissionCheck(
        isConfirmed,
        isConfirmed ? `External application confirmed: ${confirmationReason}` : 'External application in progress or awaiting completion.'
      );

      // 6. Record Application Telemetry and Quota
      ApplicationLogger.log({
        portal: atsProfile.displayName,
        jobTitle: target.jobTitle,
        companyName: target.companyName,
        status: isConfirmed ? 'SUCCESS' : 'FAILED',
        fieldsFilled: fillProgress.totalFieldsFilled,
        totalFields: Math.max(fillProgress.totalFieldsFilled, 5),
      });

      if (isConfirmed) {
        dailyQuotaManager.recordApplication();
        callbacks.notifyLog?.(
          `✓ Successfully completed and submitted "${target.jobTitle}" on ${atsProfile.displayName}! (${fillProgress.totalFieldsFilled} fields filled)`,
          'success'
        );
        callbacks.notifyStatus?.('Application submitted and verified! Closing tab and returning to primary search list...');

        // Close new tab and return to main search tab ONLY after full completion & confirmed submission
        await tabManager.closeAndReturnToMainTab();
        callbacks.notifyLog?.('Returned to primary search tab. Continuing job search loop...', 'info');
      } else {
        callbacks.notifyLog?.(
          `Application for "${target.jobTitle}" in new tab is not yet confirmed/completed (${fillProgress.totalFieldsFilled} fields filled). Keeping new tab open for user review.`,
          'warning'
        );
        callbacks.notifyStatus?.(`Application kept open in new tab until completely filled and submitted.`);
      }

      liveTelemetry.emit({
        type: 'submit',
        title: isConfirmed
          ? `External application submitted and confirmed for "${target.jobTitle}"`
          : `External tab active for "${target.jobTitle}" (awaiting completion)`,
        status: isConfirmed ? 'completed' : 'running',
      });

      return {
        outcome: isConfirmed ? 'submitted' : 'failed',
        fieldsFilled: fillProgress.totalFieldsFilled,
        stepsExecuted: fillProgress.stepsCount,
        atsDetected: atsProfile.displayName,
        finalUrl,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      callbacks.notifyLog?.(`Error in Normal Apply workflow: ${errMsg}`, 'error');
      return {
        outcome: 'failed',
        fieldsFilled: 0,
        stepsExecuted: 0,
        error: errMsg,
      };
    }
  }
}

export const normalApplyEngine = new NormalApplyEngine();
