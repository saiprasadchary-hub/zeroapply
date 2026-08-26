import type { PersonaData } from '../../types';
import type { PlatformId } from '../ui/AgentControlBar';
import { AgentEngine } from '../orchestrator/agentEngine';
import { DOM_SCANNER_SCRIPT, type ScannedField } from '../detector/fieldScanner';
import { IN_PAGE_PAGE_READINESS_SCRIPT } from '../network/pageLoadWatcher';
import { ApplicationLogger } from '../tracker/applicationLogger';
import { QALogger } from '../tracker/qaLogger';
import {
  createStandardJobExtractorScript,
  createStandardStepScript,
  STANDARD_BROWSER_CONTEXT_SCRIPT,
  STANDARD_FORM_ENTRY_SCRIPT,
  STANDARD_FORM_STATE_SCRIPT,
} from './scripts';
import { getStandardSiteAdapter, isAdapterUrl, isSafeHttpsUrl } from './siteAdapters';
import type { StandardJobCandidate } from './types';
import { runStandardFormWorkflow } from './workflow';

interface EntryResult {
  state:
    | 'already_applied'
    | 'form_ready'
    | 'navigate'
    | 'clicked'
    | 'security_checkpoint'
    | 'login_required'
    | 'rate_limited'
    | 'job_unavailable'
    | 'transient_error'
    | 'not_found';
  href?: string;
  text?: string;
}

interface ApplicationEntryResult extends EntryResult {
  webview: any;
}

type OpenApplicationTab = (url?: string) => Promise<any | null>;

interface PageReadiness {
  isReadyState: boolean;
  hasModal: boolean;
  hasInputs: boolean;
  hasJobHeading: boolean;
  bodyLength: number;
  url: string;
}

interface BrowserContextResult {
  title: string;
  heading: string;
  actions: Array<{ action: 'next' | 'review' | 'submit' | 'apply' | 'other'; text: string }>;
  sameOriginFrames: number;
  inaccessibleFrames: number;
}

export const MAX_STANDARD_APPLICATIONS_PER_RUN = 50;

export class StandardFormsEngine {
  private readonly agentEngine = new AgentEngine();
  private isRunning = false;
  private pendingWaits = new Set<() => void>();
  private onStatusUpdate?: (status: string) => void;
  private onLogUpdate?: (log: any) => void;

  public setStatusCallback(callback: (status: string) => void): void {
    this.onStatusUpdate = callback;
  }

  public setLogCallback(callback: (log: any) => void): void {
    this.onLogUpdate = callback;
  }

  private updateStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    this.onStatusUpdate?.(message);
    this.onLogUpdate?.({
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      message,
      type,
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.pendingWaits.forEach((cancel) => cancel());
    this.pendingWaits.clear();
    this.updateStatus('Standard-form run stopped safely.', 'warning');
  }

  private wait(milliseconds: number): Promise<boolean> {
    if (!this.isRunning) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pendingWaits.delete(cancel);
        resolve(value);
      };
      const cancel = () => finish(false);
      const timer = setTimeout(() => finish(this.isRunning), milliseconds);
      this.pendingWaits.add(cancel);
    });
  }

  private async waitForInteractivePage(
    webview: any,
    previousUrl: string,
    target: string,
    timeoutMs = 9000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (this.isRunning && Date.now() < deadline) {
      const page = await webview.executeJavaScript(IN_PAGE_PAGE_READINESS_SCRIPT)
        .catch(() => null as PageReadiness | null);
      const navigated = !previousUrl || previousUrl === target || (page?.url && page.url !== previousUrl);
      if (page && navigated && page.isReadyState
        && (page.hasModal || page.hasInputs || page.hasJobHeading || page.bodyLength > 150)) {
        return true;
      }
      if (!await this.wait(400)) return false;
    }
    return false;
  }

  private async navigate(webview: any, target: string): Promise<boolean> {
    if (!isSafeHttpsUrl(target) || !this.isRunning) return false;
    const previousUrl = typeof webview.getURL === 'function'
      ? String(webview.getURL() || '')
      : await webview.executeJavaScript('window.location.href').catch(() => '');

    for (let attempt = 1; attempt <= 3 && this.isRunning; attempt++) {
      try {
        webview.src = target;
      } catch (error) {
        const expectedRedirectAbort = /ERR_ABORTED|(?:^|\D)-3(?:\D|$)/.test(String(error));
        if (!expectedRedirectAbort && attempt === 3) return false;
      }
      if (await this.waitForInteractivePage(webview, previousUrl, target)) return true;
      if (attempt < 3) {
        this.updateStatus('Page load did not settle. Retrying safely (attempt ' + (attempt + 1) + '/3)...', 'warning');
        if (!await this.wait(attempt * 500)) return false;
      }
    }
    return false;
  }

  private async inspectDomApplication(webview: any): Promise<void> {
    const [fields, context] = await Promise.all([
      webview.executeJavaScript(DOM_SCANNER_SCRIPT).catch(() => [] as ScannedField[]),
      webview.executeJavaScript(STANDARD_BROWSER_CONTEXT_SCRIPT).catch(() => ({
        title: '',
        heading: '',
        actions: [],
        sameOriginFrames: 0,
        inaccessibleFrames: 0,
      } as BrowserContextResult)),
    ]);
    const scanned = Array.isArray(fields) ? fields : [];
    const required = scanned.filter((field) => field.required).length;
    const choices = scanned.reduce((total, field) => total + (field.options?.length || 0), 0);
    const errors = scanned.filter((field) => field.errorMessage).length;
    const actionCount = Array.isArray(context.actions) ? context.actions.length : 0;
    const frameNote = context.inaccessibleFrames > 0
      ? ` ${context.inaccessibleFrames} cross-origin frame(s) require the site to open the form directly.`
      : '';
    this.updateStatus(
      `DOM understood ${scanned.length} field(s): ${required} required, ${choices} choices, ${errors} validation error(s), ${actionCount} semantic action(s).${frameNote}`,
      context.inaccessibleFrames > 0 ? 'warning' : 'info',
    );
  }

  private async reloadCurrentPage(webview: any): Promise<boolean> {
    const currentUrl = typeof webview.getURL === 'function'
      ? String(webview.getURL() || '')
      : await webview.executeJavaScript('window.location.href').catch(() => '');
    return isSafeHttpsUrl(currentUrl) && this.navigate(webview, currentUrl);
  }

  private async openApplication(webview: any, openApplicationTab?: OpenApplicationTab): Promise<ApplicationEntryResult> {
    let activeWebview = webview;
    for (let attempt = 0; attempt < 5 && this.isRunning; attempt++) {
      let popupUrl = '';
      const capturePopup = (event: { url?: string; preventDefault?: () => void }) => {
        if (!event.url || !isSafeHttpsUrl(event.url)) return;
        popupUrl = event.url;
        event.preventDefault?.();
      };
      activeWebview.addEventListener?.('new-window', capturePopup);
      if (typeof activeWebview.send === 'function') {
        activeWebview.send('zeroapply-allow-popup');
        if (!await this.wait(50)) return { state: 'not_found', webview: activeWebview };
      }
      const entry = await activeWebview.executeJavaScript(STANDARD_FORM_ENTRY_SCRIPT)
        .catch(() => ({ state: 'not_found' } as EntryResult));
      if (entry.state === 'navigate' && entry.href) {
        activeWebview.removeEventListener?.('new-window', capturePopup);
        this.updateStatus(`Clicking “${entry.text || 'Apply'}” and opening the application in a new tab...`);
        const nextWebview = openApplicationTab ? await openApplicationTab(entry.href) : null;
        if (nextWebview) {
          activeWebview = nextWebview;
          if (!await this.waitForInteractivePage(activeWebview, '', entry.href)) {
            return { state: 'not_found', webview: activeWebview };
          }
        } else if (!await this.navigate(activeWebview, entry.href)) {
          return { state: 'not_found', webview: activeWebview };
        }
        continue;
      }
      if (entry.state === 'clicked') {
        this.updateStatus(`Clicked “${entry.text || 'Apply'}”; waiting for the application form...`);
        const settled = await this.wait(1200);
        activeWebview.removeEventListener?.('new-window', capturePopup);
        if (!settled) return { state: 'not_found', webview: activeWebview };
        if (popupUrl) {
          const popupWebview = openApplicationTab ? await openApplicationTab(popupUrl) : null;
          if (popupWebview) {
            activeWebview = popupWebview;
            if (!await this.waitForInteractivePage(activeWebview, '', popupUrl)) {
              return { state: 'not_found', webview: activeWebview };
            }
          } else if (!await this.navigate(activeWebview, popupUrl)) {
            return { state: 'not_found', webview: activeWebview };
          }
          continue;
        }
        const routedPopupWebview = openApplicationTab ? await openApplicationTab() : null;
        if (routedPopupWebview && routedPopupWebview !== activeWebview) {
          activeWebview = routedPopupWebview;
          const routedUrl = typeof activeWebview.getURL === 'function' ? String(activeWebview.getURL() || '') : '';
          if (!await this.waitForInteractivePage(activeWebview, '', routedUrl)) {
            return { state: 'not_found', webview: activeWebview };
          }
          continue;
        }
        const state = await activeWebview.executeJavaScript(STANDARD_FORM_STATE_SCRIPT)
          .catch(() => ({ state: 'not_found' } as EntryResult));
        if (state.state === 'not_found' && attempt < 4) {
          this.updateStatus('Apply was clicked, but the form is still loading. Re-scanning...');
          if (!await this.wait(650)) return { state: 'not_found', webview: activeWebview };
          continue;
        }
        if (state.state === 'transient_error' && attempt < 4) {
          this.updateStatus('The application page reported a temporary error. Reloading safely...', 'warning');
          if (await this.reloadCurrentPage(activeWebview)) continue;
        }
        return { ...state, webview: activeWebview };
      }
      activeWebview.removeEventListener?.('new-window', capturePopup);
      if (entry.state === 'not_found' && attempt < 4) {
        this.updateStatus('Apply control is not ready yet. Re-scanning the page...');
        if (!await this.wait(650)) return { state: 'not_found', webview: activeWebview };
        continue;
      }
      if (entry.state === 'transient_error' && attempt < 4) {
        this.updateStatus('The page reported a temporary error. Reloading safely...', 'warning');
        if (await this.reloadCurrentPage(activeWebview)) continue;
      }
      return { ...entry, webview: activeWebview };
    }
    return { state: 'not_found', webview: activeWebview };
  }

  public async startBatchApply(
    webview: any,
    persona: PersonaData,
    platformId: PlatformId,
    allowSubmit: boolean,
    openApplicationTab?: OpenApplicationTab,
  ): Promise<void> {
    if (this.isRunning) return;
    if (persona.applyMode !== 'normal') {
      this.updateStatus('All supported forms requires the “All supported forms” mode.', 'warning');
      return;
    }
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      this.updateStatus('Desktop browser is unavailable.', 'error');
      return;
    }
    const adapter = getStandardSiteAdapter(platformId);
    if (!adapter) {
      this.updateStatus('Choose LinkedIn, Indeed, Glassdoor, Naukri, or Unstop for an all-forms run.', 'warning');
      return;
    }

    const currentUrl = typeof webview.getURL === 'function'
      ? webview.getURL()
      : await webview.executeJavaScript('window.location.href').catch(() => '');
    if (!isAdapterUrl(currentUrl, adapter)) {
      this.updateStatus(`Open ${adapter.label} search results before starting this run.`, 'warning');
      return;
    }

    this.isRunning = true;
    const limit = Math.max(1, Math.min(MAX_STANDARD_APPLICATIONS_PER_RUN, Math.floor(persona.applicationLimit ?? 5)));
    let submitted = 0;

    try {
      const extracted = await webview.executeJavaScript(createStandardJobExtractorScript(adapter))
        .catch(() => [] as StandardJobCandidate[]);
      const jobs = (Array.isArray(extracted) ? extracted : [])
        .filter((job): job is StandardJobCandidate => Boolean(job && isAdapterUrl(job.url, adapter)))
        .slice(0, MAX_STANDARD_APPLICATIONS_PER_RUN);

      if (jobs.length === 0) {
        this.updateStatus(`No supported job cards were found on this ${adapter.label} page.`, 'warning');
        return;
      }

      this.updateStatus(`Found ${jobs.length} ${adapter.label} jobs. Processing up to ${limit} with one site context at a time.`);
      for (let index = 0; index < jobs.length && submitted < limit && this.isRunning; index++) {
        const job = jobs[index];
        if (job.alreadyApplied) {
          this.updateStatus(`[${index + 1}/${jobs.length}] Skipped ${job.title}: already applied.`);
          continue;
        }

        this.updateStatus(`[${index + 1}/${jobs.length}] Opening ${job.title} at ${job.company}...`);
        if (!await this.navigate(webview, job.url)) {
          this.updateStatus(`Could not safely open ${job.title}; skipped.`, 'warning');
          continue;
        }

        const entry = await this.openApplication(webview, openApplicationTab);
        if (entry.state === 'already_applied') {
          this.updateStatus('Skipped ' + job.title + ': the site reports it was already applied.');
          continue;
        }
        if (entry.state === 'job_unavailable') {
          this.updateStatus('Skipped ' + job.title + ': this listing is closed or no longer accepts applications.', 'warning');
          continue;
        }
        if (entry.state === 'security_checkpoint' || entry.state === 'login_required' || entry.state === 'rate_limited') {
          const reason = entry.state === 'security_checkpoint'
            ? 'a security or CAPTCHA checkpoint needs manual completion'
            : entry.state === 'login_required'
              ? 'the website login session expired'
              : 'the website temporarily rate-limited this session';
          this.updateStatus('Paused safely on ' + job.title + ': ' + reason + '.', 'warning');
          this.isRunning = false;
          break;
        }
        if (entry.state !== 'form_ready') {
          this.updateStatus(
            'Skipped ' + job.title + ' after automatic recovery: no safe application form or Apply control was found.',
            'warning',
          );
          continue;
        }

        const workflow = await runStandardFormWorkflow({
          maxSteps: 20,
          allowSubmit,
          isActive: () => this.isRunning,
          wait: (milliseconds) => this.wait(milliseconds),
          fillCurrentStep: async () => {
            await this.inspectDomApplication(entry.webview);
            return this.agentEngine.autoFillCurrentPage(entry.webview, persona, adapter.label, false);
          },
          advanceStep: (submissionAllowed) => entry.webview.executeJavaScript(createStandardStepScript(submissionAllowed)),
          executeScript: <T>(script: string) => entry.webview.executeJavaScript(script) as Promise<T>,
          onStatus: (message, type = 'info') => this.updateStatus(`[${index + 1}/${jobs.length}] ${message}`, type),
        });

        if (workflow.outcome === 'submitted') {
          submitted++;
          ApplicationLogger.addLog({
            portal: `${adapter.label} Standard Form`,
            jobTitle: job.title,
            companyName: job.company,
            fieldsFilled: workflow.fieldsFilled,
            status: 'SUCCESS',
            url: job.url,
          });
          if (workflow.qaPairs?.length) {
            QALogger.addLog({ portal: adapter.label, jobTitle: job.title, companyName: job.company, qaPairs: workflow.qaPairs });
          }
          this.updateStatus(`Confirmed applied to ${job.title} at ${job.company}. Moving to the next job (${submitted}/${limit}).`, 'success');
          if (!await this.wait(1400)) break;
          continue;
        }

        if (workflow.outcome !== 'stopped') {
          ApplicationLogger.addLog({
            portal: `${adapter.label} Standard Form`,
            jobTitle: job.title,
            companyName: job.company,
            fieldsFilled: workflow.fieldsFilled,
            status: 'PARTIAL',
            url: job.url,
          });
          this.updateStatus(`Paused on ${job.title}. It was not recorded as applied because confirmation was not proven.`, 'warning');
        }
        this.isRunning = false;
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus('Run stopped safely after an unexpected browser error: ' + message, 'error');
      this.isRunning = false;
    } finally {
      const completedNaturally = this.isRunning;
      this.isRunning = false;
      this.pendingWaits.forEach((cancel) => cancel());
      this.pendingWaits.clear();
      if (completedNaturally) {
        this.updateStatus(`All supported forms run complete: ${submitted} application${submitted === 1 ? '' : 's'} positively confirmed.`, submitted > 0 ? 'success' : 'warning');
      }
    }
  }
}
