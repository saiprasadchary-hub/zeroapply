import type { PersonaData } from '../../types';
import { AgentEngine } from '../orchestrator/agentEngine';
import { ApplicationLogger } from '../tracker/applicationLogger';
import { QALogger } from '../tracker/qaLogger';
import { runEasyApplyWorkflow } from '../easyApply';
import { POST_SUBMISSION_CLEANUP_SCRIPT, DISCARD_APPLICATION_SCRIPT } from '../easyApply/scripts';
import { getSavedResumeFileFromStorage } from '../autofill/resumeInjector';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ChimeNotifier } from '../audio/chimeNotifier';

export interface AutoApplyConfig {
  maxJobsPerRun: number;
  pauseForHumanOnFail: boolean;
  maxStepsPerApplication: number;
  actionRetryCount: number;
}

const DEFAULT_CONFIG: AutoApplyConfig = {
  maxJobsPerRun: 5,
  pauseForHumanOnFail: true,
  maxStepsPerApplication: 15,
  actionRetryCount: 4,
};


const JOB_EXTRACTOR_SCRIPT = `
(function extractJobs() {
  const cards = Array.from(document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, [data-oc-id], .jobTuple'));
  const links = [];

  cards.forEach((card, idx) => {
    const titleEl = card.querySelector('.job-card-list__title, .job-title, h3, a');
    const title = titleEl ? titleEl.innerText.trim() : 'Job #' + (idx + 1);
    const companyEl = card.querySelector('.job-card-container__company-name, .company-name');
    const company = companyEl ? companyEl.innerText.trim() : 'Unknown Company';
    
    // Find the main clickable link for the job
    const linkEl = card.querySelector('a[href*="/jobs/"], a[href*="/job/"]') || card.closest('a') || titleEl;

    // Check if card explicitly specifies Easy Apply
    const cardText = (card.innerText || '').toLowerCase();
    const isEasyApply = cardText.includes('easy apply') || Boolean(card.querySelector('.job-card-container__apply-method, [aria-label*="Easy Apply"], .job-card-list__easy-apply-label'));

    if (!card.id) card.id = 'za_job_card_' + idx;

    links.push({
      id: card.id,
      title: title,
      company: company,
      selector: '#' + CSS.escape(card.id),
      href: linkEl ? linkEl.href : '',
      isEasyApply: isEasyApply,
    });
  });

  // Search pages frequently render the same card twice (desktop + responsive
  // list). Keep one stable job identity so a batch never applies twice.
  const seen = new Set();
  return links.filter((job) => {
    const key = [job.href, job.title, job.company].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();
`;

export class AutoApplyEngine {
  private agentEngine: AgentEngine;
  private config: AutoApplyConfig;
  private isRunning: boolean = false;
  private pendingWaits = new Set<() => void>();
  private onStatusUpdate?: (status: string) => void;
  private onLogUpdate?: (log: any) => void;

  constructor(config: Partial<AutoApplyConfig> = {}) {
    this.agentEngine = new AgentEngine();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public setStatusCallback(cb: (status: string) => void) {
    this.onStatusUpdate = cb;
  }
  
  public setLogCallback(cb: (log: any) => void) {
    this.onLogUpdate = cb;
  }

  private updateStatus(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    console.log('[AutoApplyEngine]', msg);
    if (this.onStatusUpdate) {
      this.onStatusUpdate(msg);
    }
    if (this.onLogUpdate) {
      const now = new Date();
      this.onLogUpdate({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0'),
        message: msg,
        type: type
      });
    }
  }

  public stop() {
    this.isRunning = false;
    this.pendingWaits.forEach((cancel) => cancel());
    this.pendingWaits.clear();
    this.updateStatus('Auto-Apply stopped by user.', 'warning');
  }

  private wait(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = globalThis.setTimeout(() => {
        this.pendingWaits.delete(cancel);
        resolve(this.isRunning);
      }, ms);
      const cancel = () => {
        globalThis.clearTimeout(timer);
        resolve(false);
      };
      this.pendingWaits.add(cancel);
    });
  }

  private recordOutcome(portal: string, job: { title: string; company: string }, fieldsFilled: number, status: 'SUCCESS' | 'PARTIAL' | 'FAILED', url: string): void {
    ApplicationLogger.addLog({
      portal,
      jobTitle: job.title,
      companyName: job.company,
      fieldsFilled,
      status,
      url,
    });
  }

  public async startBatchApply(webview: any, persona: PersonaData, platformName: string = 'LinkedIn') {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.updateStatus('Scanning page for job listings...');
    
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      this.updateStatus('Error: Webview not available.', 'error');
      this.isRunning = false;
      return;
    }

    if (persona.applyMode !== 'easy') {
      this.updateStatus('Batch submission is limited to Easy Apply. Normal/external applications remain available for safe Auto-Fill and review.', 'warning');
      this.isRunning = false;
      return;
    }

    if (platformName !== 'LinkedIn') {
      this.updateStatus('Batch submission is currently supported only for LinkedIn Easy Apply. Use Auto-Fill and review for other portals.', 'warning');
      this.isRunning = false;
      return;
    }

    const missingProfileFields = [
      !persona.fullName && 'full name',
      !persona.email && 'email',
      !persona.phone && 'phone number',
    ].filter(Boolean);
    if (missingProfileFields.length) {
      this.updateStatus(`Complete your ${missingProfileFields.join(', ')} before a batch run.`, 'warning');
      this.isRunning = false;
      return;
    }

    if (!getSavedResumeFileFromStorage()) {
      this.updateStatus('Upload a resume before starting Fill & Apply. The batch only uses the resume attached to your active persona.', 'warning');
      this.isRunning = false;
      return;
    }

    const hasResumeMemory = Boolean(persona.resumeChunks && Object.values(persona.resumeChunks).some((chunk) => chunk && chunk.trim().length > 20));
    if (!hasResumeMemory) {
      this.updateStatus('Resume memory chunks are missing. Re-upload the resume so screening answers use verified resume context.', 'warning');
      this.isRunning = false;
      return;
    }

    const runLimit = Math.max(1, Math.min(500, Math.floor(persona.applicationLimit ?? this.config.maxJobsPerRun)));

    const pageUrl = await webview.executeJavaScript('window.location.href').catch(() => '');
    const expectedHosts: Record<string, string> = {
      LinkedIn: 'linkedin.com',
      Indeed: 'indeed.com',
      Glassdoor: 'glassdoor.com',
      Naukri: 'naukri.com',
      Unstop: 'unstop.com',
    };
    const expectedHost = expectedHosts[platformName];
    if (expectedHost && !String(pageUrl).toLowerCase().includes(expectedHost)) {
      this.updateStatus(`Open a ${platformName} job-results page before starting Fill & Apply.`, 'warning');
      this.isRunning = false;
      return;
    }

    let jobs: any[] = [];
    try {
      jobs = await webview.executeJavaScript(JOB_EXTRACTOR_SCRIPT);
    } catch {
      this.updateStatus('Failed to extract job listings from page.', 'error');
      this.isRunning = false;
      return;
    }

    if (!jobs || jobs.length === 0) {
      this.updateStatus('No job listings found on current page.', 'warning');
      this.isRunning = false;
      return;
    }

    this.updateStatus('Found ' + jobs.length + ' jobs. Filtering applied jobs...');
    
    const logs = ApplicationLogger.getLogs();
    const appliedCompositeKeys = new Set(logs
      .filter((log) => log.status === 'SUCCESS')
      .map((log) => log.portal + '|' + log.jobTitle + '|' + log.companyName));

    const pendingJobs = jobs.filter(j => {
      const key = platformName + '|' + j.title + '|' + j.company;
      return !appliedCompositeKeys.has(key);
    });

    this.updateStatus(`${pendingJobs.length} new jobs remaining to process (this run is limited to ${runLimit}).`);
    liveTelemetry.clear();

    let appliedCount = 0;
    let pageNum = 1;
    const maxPages = 15;

    while (this.isRunning && appliedCount < runLimit && pageNum <= maxPages) {
      let jobs: any[] = [];
      try {
        jobs = await webview.executeJavaScript(JOB_EXTRACTOR_SCRIPT);
      } catch {
        this.updateStatus('Failed to extract job listings from page.', 'error');
        break;
      }

      if (!jobs || jobs.length === 0) {
        if (pageNum === 1) {
          this.updateStatus('No job listings found on current page.', 'warning');
        }
        break;
      }

      const logs = ApplicationLogger.getLogs();
      const appliedCompositeKeys = new Set(logs
        .filter((log) => log.status === 'SUCCESS')
        .map((log) => log.portal + '|' + log.jobTitle + '|' + log.companyName));

      const pendingJobs = jobs.filter(j => {
        const key = platformName + '|' + j.title + '|' + j.company;
        return !appliedCompositeKeys.has(key);
      });

      this.updateStatus(`[Page ${pageNum}] Found ${jobs.length} jobs (${pendingJobs.length} new). Progress: ${appliedCount}/${runLimit} applied.`);

      for (let i = 0; i < pendingJobs.length; i++) {
        if (!this.isRunning) break;
        if (appliedCount >= runLimit) {
          this.updateStatus('Reached batch limit of ' + runLimit + ' jobs.');
          break;
        }

        const job = pendingJobs[i];
        this.updateStatus(`[Job ${appliedCount + 1}/${runLimit}] Opening: ${job.title} at ${job.company}`);
        
        // Plain English telemetry: Scrolling
        liveTelemetry.emit({
          type: 'scroll',
          title: `Scrolling to job ${i + 1}/${pendingJobs.length}: ${job.title}`,
          detail: `${job.company} | Aligning listing card in viewport`,
          target: job.title,
          status: 'running',
        });

        // Click the job in the list to load it in the right pane
        const escapedTitle = job.title.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        const clickScript = `
          (function() {
            // 1. Try selector first
            let el = document.querySelector('` + job.selector + `');
            
            // 2. If selector lost or ID changed due to re-render, search all cards by title
            if (!el) {
              const allCards = Array.from(document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, [data-oc-id], .jobTuple'));
              el = allCards.find(c => {
                const t = c.querySelector('.job-card-list__title, .job-title, h3, a');
                const cardTitle = t ? t.innerText.trim().toLowerCase() : '';
                return cardTitle.includes('` + escapedTitle.toLowerCase() + `') || (c.innerText || '').toLowerCase().includes('` + escapedTitle.toLowerCase() + `');
              });
            }
            
            // 3. Fallback: match by index
            if (!el) {
              const allCards = Array.from(document.querySelectorAll('.job-card-container, .jobs-search-results__list-item'));
              if (allCards[` + i + `]) el = allCards[` + i + `];
            }

            if (el) {
              const container = el.closest('.jobs-search-results-list, .scaffold-layout__list') || window;
              if (container !== window) {
                 const elTop = el.offsetTop;
                 container.scrollTo({ top: Math.max(0, elTop - 100), behavior: 'smooth' });
              } else {
                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              
              const rightPane = document.querySelector('.jobs-search__job-details--container, .jobs-details-top-card');
              if (rightPane) rightPane.scrollTo({ top: 0, behavior: 'smooth' });
              
              const clickable = el.querySelector('.job-card-list__title, a[href*="/jobs/"], a') || el;
              clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
              clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
              clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              clickable.click();
              return true;
            }
            return false;
          })();
        `;
        let opened = false;
        try {
          opened = await webview.executeJavaScript(clickScript);
        } catch (error) {
          this.updateStatus(`[Job ${i + 1}/${pendingJobs.length}] Could not open this listing: ${error instanceof Error ? error.message : 'page interaction failed'}.`, 'warning');
          continue;
        }
        if (!opened) {
          this.updateStatus(`[Job ${i + 1}/${pendingJobs.length}] Skipped because the listing is no longer available.`, 'warning');
          continue;
        }

        // Plain English telemetry: Clicking job
        liveTelemetry.emit({
          type: 'click',
          title: `Opening job: ${job.title}`,
          detail: `${job.company} | Loading details pane`,
          target: job.title,
          status: 'running',
        });

        if (!await this.wait(2500)) break; // Wait for job details pane to load

        // Inspect apply button type (Easy Apply vs Normal Apply)
        const inspectApplyScript = `
          (function() {
            if (window.location.href.includes('linkedin.com')) {
              const linkedinBtn = document.querySelector('.jobs-apply-button, [data-job-id] .jobs-apply-button');
              if (linkedinBtn && linkedinBtn.offsetParent !== null) {
                const text = (linkedinBtn.innerText || linkedinBtn.textContent || '').toLowerCase().trim();
                if (text.includes('easy apply')) return { type: 'easy', text: linkedinBtn.innerText.trim() };
                return { type: 'normal', text: linkedinBtn.innerText.trim() };
              }
            }

            const allButtons = Array.from(document.querySelectorAll('.jobs-details-top-card button, .jobs-details-top-card a, .jobs-search__job-details button, .jobs-search__job-details a'));
            for (const b of allButtons) {
              if (b.offsetParent === null) continue;
              const t = (b.innerText || b.textContent || '').toLowerCase().trim();
              const aria = String(b.getAttribute('aria-label') || '').toLowerCase();
              if (t.includes('easy apply') || aria.includes('easy apply')) return { type: 'easy', text: t };
              if (t === 'apply' || t.includes('apply on company website') || t.includes('apply on employer') || t.startsWith('apply')) {
                return { type: 'normal', text: t };
              }
            }
            return { type: 'unknown', text: '' };
          })();
        `;

        let applyInspection = { type: 'unknown', text: '' };
        try {
          applyInspection = await webview.executeJavaScript(inspectApplyScript);
        } catch {}

        // If Apply Mode is Easy Apply and this job is Normal / External Apply, skip immediately
        if (persona.applyMode === 'easy' && applyInspection.type === 'normal') {
          this.updateStatus(`[Job ${i + 1}/${pendingJobs.length}] Skipped: Normal / External Apply detected for "${job.title}". Skipping to next Easy Apply role...`, 'warning');
          liveTelemetry.emit({
            type: 'status',
            title: 'Skipping Normal Apply role',
            detail: `"${job.title}" at ${job.company} is Normal Apply. Skipping down to next Easy Apply job...`,
            status: 'completed',
          });
          continue;
        }

        // Look for Easy Apply button
        const modeLabel = 'Easy Apply';
        this.updateStatus(`[Job ${i + 1}/${pendingJobs.length}] Searching for ${modeLabel} button...`);
        
        // Plain English telemetry: Clicking Easy Apply
        liveTelemetry.emit({
          type: 'click',
          title: `Easy Apply button`,
          detail: `Starting application for ${job.title} at ${job.company}`,
          target: modeLabel,
          status: 'running',
        });
        
        const applyBtnScript = `
          (function() {
            const elements = Array.from(document.querySelectorAll('button, a'));
            const visible = elements.filter(e => e.offsetParent !== null && (e.innerText || e.textContent || '').trim().length > 0);
            
            let targetBtn = null;
            
            if (window.location.href.includes('linkedin.com')) {
               const linkedinBtn = document.querySelector('.jobs-apply-button, [data-job-id] .jobs-apply-button');
               if (linkedinBtn && linkedinBtn.offsetParent !== null) {
                  const text = (linkedinBtn.innerText || linkedinBtn.textContent || '').toLowerCase();
                  if (text.includes('easy apply')) targetBtn = linkedinBtn;
               }
            }
            
            if (!targetBtn) {
              targetBtn = visible.find(b => {
                const text = (b.innerText || b.textContent || '').toLowerCase().trim();
                const aria = String(b.getAttribute('aria-label') || '').toLowerCase();
                return text === 'easy apply' || text.includes('easy apply') || aria.includes('easy apply');
              });
            }
            
            if (targetBtn) {
              targetBtn.click();
              return true;
            }
            return false;
          })();
        `;

        let clickedApply = false;
        for (let attempt = 0; attempt < this.config.actionRetryCount; attempt++) {
          try {
            clickedApply = await webview.executeJavaScript(applyBtnScript);
          } catch {
            clickedApply = false;
          }
          if (clickedApply) break;
          if (!await this.wait(1200)) break;
        }
        
        if (!clickedApply) {
          this.updateStatus(`[Job ${i + 1}/${pendingJobs.length}] Skipped (No ${modeLabel} button found. Skipping down to next role...)`, 'warning');
          liveTelemetry.emit({
            type: 'status',
            title: 'Skipping non-Easy Apply role',
            detail: `"${job.title}" does not have an Easy Apply button. Skipping to next listing...`,
            status: 'completed',
          });
          continue;
        }

        if (!this.isRunning || !await this.wait(1500)) break; // Wait for modal to pop up

        const workflow = await runEasyApplyWorkflow({
          maxSteps: this.config.maxStepsPerApplication,
          isActive: () => this.isRunning,
          wait: (milliseconds) => this.wait(milliseconds),
          fillCurrentStep: () => this.agentEngine.autoFillCurrentPage(webview, persona, platformName, false),
          advanceStep: () => this.agentEngine.advanceApplicationStep(webview),
          executeScript: <T>(script: string) => webview.executeJavaScript(script) as Promise<T>,
          onStatus: (message, type = 'info') => this.updateStatus(`[Job ${i + 1}] ${message}`, type),
        });

        if (workflow.outcome === 'submitted') {
          appliedCount++;
          this.updateStatus(`[Job ${i + 1}] Application submitted successfully to ${job.company}! (${appliedCount}/${runLimit})`, 'success');
          const currentUrl = await webview.executeJavaScript('window.location.href').catch(() => webview.src || '');
          this.recordOutcome(platformName, job, workflow.fieldsFilled, 'SUCCESS', currentUrl);
          
          if (workflow.qaPairs && workflow.qaPairs.length > 0) {
            QALogger.addLog({
              portal: platformName,
              jobTitle: job.title,
              companyName: job.company,
              qaPairs: workflow.qaPairs,
            });
          }

          // Plain English telemetry: Checking submitted & Dismissing prompt
          liveTelemetry.emit({
            type: 'validate',
            title: `Checking submitted or not`,
            detail: `Submission confirmed for ${job.title} at ${job.company}! Finalizing submission...`,
            status: 'completed',
          });

          // Aggressively dismiss post-submission prompt (e.g. "Not now", "Update profile", "Done")
          if (await this.wait(600)) {
            for (let cleanupAttempt = 0; cleanupAttempt < 3; cleanupAttempt++) {
              const cleanup = await webview.executeJavaScript(POST_SUBMISSION_CLEANUP_SCRIPT).catch(() => ({ closed: false, action: 'none' }));
              if (cleanup.closed) {
                this.updateStatus(`[Job ${i + 1}] Dismissed post-submission prompt.`);
                break;
              }
              await this.wait(400);
            }
          }
          
          // Strict verification: ensure no modal backdrop is blocking the next job listing
          const modalStillPresent = await webview.executeJavaScript('Boolean(document.querySelector(\'[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal\'))').catch(() => false);
          if (modalStillPresent) {
            await webview.executeJavaScript(DISCARD_APPLICATION_SCRIPT).catch(() => {});
            await this.wait(800);
          }

          // Settling delay so LinkedIn registers submission and unfreezes the search list
          await this.wait(2000);
        }

        if ((workflow.outcome === 'paused' || workflow.outcome === 'max_steps')) {
          this.updateStatus(`[Job ${i + 1}] Skipping incomplete application... discarding draft to continue batch.`, 'warning');
          await webview.executeJavaScript(DISCARD_APPLICATION_SCRIPT).catch(() => {});
          await this.wait(1500); // Give the modal time to close cleanly
        }
        
        if (!await this.wait(1500)) break; // Brief pause before advancing to next job listing
      }

      if (appliedCount >= runLimit || !this.isRunning) break;

      // Auto-advance to next search results page if more applications needed
      this.updateStatus(`Finished Page ${pageNum}. Advancing to Page ${pageNum + 1}...`);
      const paginationScript = `
        (function() {
          const container = document.querySelector('.jobs-search-results-list, .scaffold-layout__list') || window;
          if (container !== window) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }

          const nextBtn = document.querySelector('.artdeco-pagination__button--next, button[aria-label="View next page"], button[aria-label="Next"], .pagination__next, a[aria-label="Next"], [data-testid="pagination-page-next"]');
          if (nextBtn && !nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true') {
            nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nextBtn.click();
            return true;
          }
          return false;
        })();
      `;
      const hasNextPage = await webview.executeJavaScript(paginationScript).catch(() => false);
      if (!hasNextPage) {
        this.updateStatus(`No further search pages available.`, 'info');
        break;
      }

      pageNum++;
      await this.wait(3000); // Wait for next page results to render
    }

    const completedNormally = this.isRunning;
    this.isRunning = false;
    if (completedNormally) {
      ChimeNotifier.playSuccessChime();
      ChimeNotifier.sendDesktopNotification(
        'ZeroApply Batch Complete',
        `Successfully applied to ${appliedCount} / ${runLimit} jobs!`
      );
      this.updateStatus(`Batch Apply Complete! Successfully applied to ${appliedCount} / ${runLimit} jobs (Application Limit: ${runLimit}).`, 'success');
    }
  }
}
