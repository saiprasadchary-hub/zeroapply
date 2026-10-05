import { assertSiteAccessible } from '../security/siteAccess';
import type { PersonaData } from '../../types';
import { AgentEngine } from '../orchestrator/agentEngine';
import { ApplicationLogger } from '../tracker/applicationLogger';
import {
  dailyQuotaManager,
  stealthEngine,
  ensureLinkedInSafeSession,
  uncheckLinkedInFollowCompany,
  handleLinkedInJobSafetyReminder,
} from '../stealth';
import { orchestrator } from '../workflow/orchestrator';
import { ensureVisualCursor } from '../stealth/agentCursor';
import { processTracker } from '../tracker/processTracker';
import { waitForPageSettled, waitForJobDetailPaneSettled, waitForEasyApplyModalOpened } from '../navigation/pageSettler';
import { ensureAllModalsClosed, dismissInterruptingModals } from '../recovery/modalDismissGuard';
import { normalApplyEngine } from '../normalApply';

import type { WebviewTarget } from '../domScanner/injectedScanner';

interface JobCardMetadata { index: number; title: string; company: string; isApplied: boolean }
interface ApplyTriggerResult { status: string; url?: string }

export const MAX_APPLICATIONS_PER_RUN = 50;

export function isExpectedPortalUrl(rawUrl: string, expectedDomain: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    const domain = expectedDomain.toLowerCase();
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export function isAllowedPlatformHost(hostname: string, expectedHost: string): boolean {
  return hostname === expectedHost || hostname.endsWith(`.${expectedHost}`);
}

export class AutoApplyEngine {
  private isRunning = false;
  private agentEngine: AgentEngine = new AgentEngine();
  private statusCallback: ((status: string) => void) | null = null;
  private logCallback: ((log: any) => void) | null = null;

  public setStatusCallback(callback: (status: string) => void): void {
    this.statusCallback = callback;
  }

  public setLogCallback(callback: (log: any) => void): void {
    this.logCallback = callback;
  }

  public getAgentEngine(): AgentEngine {
    return this.agentEngine;
  }

  private notifyStatus(status: string): void {
    if (this.statusCallback) {
      try {
        this.statusCallback(status);
      } catch {}
    }
  }

  private notifyLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    if (this.logCallback) {
      try {
        const now = new Date();
        const timestamp =
          now.getHours().toString().padStart(2, '0') +
          ':' +
          now.getMinutes().toString().padStart(2, '0') +
          ':' +
          now.getSeconds().toString().padStart(2, '0');

        this.logCallback({
          id: Math.random().toString(36).substring(2, 9),
          timestamp,
          message,
          type,
        });
      } catch {}
    }
  }

  public async startBatchApply(
    view: WebviewTarget,
    persona: PersonaData,
    platformLabel = 'LinkedIn',
    allowSubmit = false,
    openTab?: (url?: string) => Promise<any | null>,
    closeTabAndReturn?: (tabView?: any) => Promise<void>,
    options: { stepDelayMs?: number; singleJobOnly?: boolean; maxJobs?: number } = {}
  ): Promise<void> {
    this.isRunning = true;
    let appliedCount = 0;
    const workflow = { haltBatch: false };
    const effectiveSubmit = allowSubmit && !workflow.haltBatch;
    const batchLimit = Math.max(1, options.maxJobs ?? persona.applicationLimit ?? 5);
    this.notifyStatus(`Starting Auto-Apply on ${platformLabel}... (Batch Limit: ${batchLimit} jobs, submit=${effectiveSubmit})`);
    this.notifyLog(`AutoApplyEngine started for ${platformLabel} (Batch Limit: ${batchLimit} jobs max, Daily Quota: ${dailyQuotaManager.getRemainingQuota()} remaining)`, 'info');

    try {
      if (!view || typeof view.executeJavaScript !== 'function') {
        throw new Error('Webview view target is unavailable');
      }

      await assertSiteAccessible(view);

      // Enforce Daily Application Safety Quota
      if (!dailyQuotaManager.canApply()) {
        const stats = dailyQuotaManager.getDailyStats();
        this.notifyLog(`Daily application limit reached (${stats.count}/${stats.maxDaily}). Pausing to protect account from platform rate limits.`, 'warning');
        this.notifyStatus(`Daily quota reached (${stats.count}/${stats.maxDaily}). Auto-apply paused until midnight.`);
        this.isRunning = false;
        return;
      }

      // Step 0: Detect target ATS architecture dynamically
      try {
        const { detectAtsArchitecture } = await import('../domScanner/atsDetector');
        const ats = await detectAtsArchitecture(view);
        if (ats && ats.platform !== 'generic_portal') {
          platformLabel = ats.displayName;
          this.notifyLog(`Universal ATS Perception: Identified ${ats.displayName} [${ats.structure}]`, 'info');
        }
      } catch {}

      // Universal modern job card selectors covering LinkedIn (modern & classic), Indeed, and testbeds
      const UNIVERSAL_JOB_CARD_SELECTORS = [
        'li.jobs-search-results-list__list-item',
        'li.jobs-search-results__list-item',
        'div.job-card-container',
        '[data-occludable-job-id]',
        'div[data-job-id]',
        'li[data-occludable-job-id]',
        'div[data-view-name="job-card"]',
        '[data-view-name="job-card"]',
        '.jobs-search-results-list > li',
        '.scaffold-layout__list-container > li',
        '.job-card',
        'div.job_seen_beacon',
      ].join(', ');

      // Step 1: Wait for search page and job listings to fully load and settle (snappy detection)
      this.notifyStatus(`Waiting for ${platformLabel} page to fully load...`);
      await waitForPageSettled(view, {
        timeoutMs: 3500,
        minStableMs: 80,
        requiredSelector: `${UNIVERSAL_JOB_CARD_SELECTORS}, button.jobs-apply-button, [aria-label*="Easy Apply" i], .jobs-s-apply button`,
        checkLoaders: false,
      });

      // Initialize visual cursor on target page
      await ensureVisualCursor(view);

      const detectCardsScript = `
        (() => {
          const cardSelectors = ${JSON.stringify(UNIVERSAL_JOB_CARD_SELECTORS)};
          const rawCards = Array.from(document.querySelectorAll(cardSelectors));
          // Deduplicate nested card elements (keep outer-most card)
          const cards = rawCards.filter((el) => {
            return !rawCards.some((parent) => parent !== el && parent.contains(el));
          });

          return cards.map((c, i) => {
            const title = c.querySelector('.job-card__title, .job-card-list__title, .base-search-card__title, h2, h3, a')?.textContent?.trim() || ('Job ' + (i + 1));
            const company = c.querySelector('.job-card__company, .company-name, [class*="company"], .job-card-container__company-name, .job-card-container__primary-description')?.textContent?.trim() || '';
            const isApplied = /applied/i.test(c.textContent || '');
            return { index: i, title, company, isApplied };
          });
        })()
      `;

      let detectedCards = (await view.executeJavaScript<JobCardMetadata[]>(detectCardsScript).catch(() => [])) || [];

      // If cards are not rendered yet, nudge the feed scroll to dynamically trigger lazy hydration
      if (detectedCards.length === 0) {
        this.notifyStatus('Scanning & scrolling job postings feed...');
        await view.executeJavaScript(`
          (async () => {
            const listContainer = document.querySelector(
              '.jobs-search-results-list, .scaffold-layout__list-detail-inner, .jobs-search__left-rail, ul.jobs-search__results-list, [data-view-name="job-search-results-list"], .scaffold-layout__list-container'
            );
            if (listContainer) {
              listContainer.scrollBy({ top: 350, behavior: 'smooth' });
              await new Promise((r) => setTimeout(r, 200));
              listContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollBy({ top: 300, behavior: 'smooth' });
              await new Promise((r) => setTimeout(r, 200));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          })()
        `).catch(() => {});
        detectedCards = (await view.executeJavaScript<JobCardMetadata[]>(detectCardsScript).catch(() => [])) || [];
      }

      const totalCards = detectedCards.length;

      if (totalCards > 1) {
        this.notifyLog(`Detected ${totalCards} job postings in search results. Initiating multi-job queue...`, 'info');

        for (let cardIndex = 0; cardIndex < Math.min(totalCards, MAX_APPLICATIONS_PER_RUN) && this.isRunning; cardIndex++) {
          if (appliedCount >= batchLimit) {
            this.notifyStatus(`Application batch limit reached (${appliedCount}/${batchLimit} jobs). Completed application pass.`);
            this.notifyLog(`Application batch limit of ${batchLimit} reached (${appliedCount} submitted). Pausing batch.`, 'success');
            break;
          }

          const cardMeta = detectedCards[cardIndex];
          if (cardMeta && cardMeta.isApplied) {
            this.notifyLog(`Job ${cardIndex + 1}/${totalCards} (${cardMeta.title}) already applied. Moving to next job...`, 'info');
            continue;
          }

          this.notifyStatus(`Going to job ${cardIndex + 1}/${totalCards}: "${cardMeta?.title || 'Role'}" at "${cardMeta?.company || 'Company'}"`);
          this.notifyLog(`Selecting job card ${cardIndex + 1}/${totalCards}: ${cardMeta?.title}`, 'info');

          processTracker.startNewJob(cardMeta?.title || 'Role', cardMeta?.company || 'Company', platformLabel);

          // Clear any lingering modals or discard popups before selecting card
          await ensureAllModalsClosed(view);

          // Ensure LinkedIn session stealth & safety checks
          if (platformLabel.toLowerCase().includes('linkedin')) {
            await ensureLinkedInSafeSession(view);
          }

          // Initialize visual cursor on page
          await ensureVisualCursor(view);

          // Glide cursor to the selected job card and click with smooth scroll
          const clickCardScript = `
            (() => {
              try {
                const cardSelectors = ${JSON.stringify(UNIVERSAL_JOB_CARD_SELECTORS)};
                const rawCards = Array.from(document.querySelectorAll(cardSelectors));
                const cards = rawCards.filter((el) => {
                  return !rawCards.some((parent) => parent !== el && parent.contains(el));
                });

                const target = cards[${cardIndex}];
                if (target) {
                  try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch(e) {}
                  const allAnchors = target.querySelectorAll('a[target="_blank"]');
                  allAnchors.forEach((a) => {
                    a.removeAttribute('target');
                    a.setAttribute('target', '_self');
                  });
                  if (target.tagName === 'A') {
                    target.removeAttribute('target');
                    target.setAttribute('target', '_self');
                  }
                  const clickTarget = target.querySelector(
                    'a.job-card-list__title, a.job-card-container__link, a[data-control-name*="job_card"], a[href*="/jobs/view/"], .job-card-list__title, h2 a, h3 a'
                  ) || target;
                  const rect = clickTarget.getBoundingClientRect();
                  if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.glideTo === 'function') {
                    window.__zeroapplyCursor.glideTo(rect.left + rect.width / 2, rect.top + rect.height / 2, ${JSON.stringify(`AI: View "${cardMeta?.title || 'Job'}"`)});
                  }
                  if (clickTarget && clickTarget.tagName === 'A') {
                    clickTarget.removeAttribute('target');
                    clickTarget.setAttribute('target', '_self');
                  }
                  clickTarget.click();
                  return true;
                }
                return false;
              } catch(e) {
                return false;
              }
            })()
          `;
          await view.executeJavaScript(clickCardScript).catch(() => false);
          // Wait for job details pane to finish loading (no skeleton loaders, Easy Apply button rendered)
          this.notifyStatus(`Waiting for job details to load: "${cardMeta?.title}"...`);

          // For subsequent jobs, simulate reading scroll; for Card 0, LinkedIn already loads the details pane
          if (cardIndex > 0) {
            await view.executeJavaScript(`
              (() => {
                try {
                  const pane = document.querySelector(
                    '.scaffold-layout__detail, .jobs-search__job-details, .job-view-layout, .jobs-details, [data-job-details="true"], .jobs-description__container, .jobs-box__html-content'
                  );
                  if (pane && pane.scrollHeight > pane.clientHeight) {
                    pane.scrollBy({ top: 180, behavior: 'smooth' });
                    setTimeout(() => {
                      pane.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 200);
                  }
                } catch(e) {}
              })()
            `).catch(() => {});
          }
          await waitForJobDetailPaneSettled(view, 3500);

          // Check for Easy Apply or External Apply button
          await ensureVisualCursor(view);
          const openModalScript = `
            (function() {
              try {
                const detailPane = document.querySelector(
                  '.scaffold-layout__detail, .jobs-search__job-details, .job-view-layout, .jobs-details, .jobs-details__main-content, [data-job-details="true"], .jobs-description__container'
                ) || document;
                let btn = detailPane.querySelector(
                  'button.jobs-apply-button, .jobs-s-apply button, [aria-label*="Easy Apply" i], button#main-easy-apply-btn, a.jobs-apply-button, button[data-za-apply-btn], .jobs-apply-button--top-card button, [data-view-name="job-apply-button"] button'
                );
                if (!btn) {
                  btn = document.querySelector(
                    'button.jobs-apply-button, .jobs-s-apply button, [aria-label*="Easy Apply" i], button#main-easy-apply-btn, a.jobs-apply-button, button[data-za-apply-btn], [data-view-name="job-apply-button"] button'
                  );
                }
                if (btn && !btn.disabled) {
                  const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
                  if (/easy\\s*apply|in\\s*apply/i.test(text)) {
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                      window.__zeroapplyCursor.clickElement(btn, 'AI: Click "Easy Apply"');
                    } else {
                      const rect = btn.getBoundingClientRect();
                      if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.glideTo === 'function') {
                        window.__zeroapplyCursor.glideTo(rect.left + rect.width / 2, rect.top + rect.height / 2, 'AI: Click "Easy Apply"');
                      }
                      try { if (typeof btn.focus === 'function') btn.focus(); } catch(e) {}
                      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                      btn.click();
                    }
                    return { status: 'easy_apply_triggered' };
                  }
                  let capturedUrl = '';
                  try {
                    const origOpen = window.open;
                    window.open = function(u) {
                      if (u) capturedUrl = String(u);
                      return origOpen ? origOpen.apply(this, arguments) : null;
                    };
                  } catch(e) {}

                  const link = btn.closest('a')?.href || (btn.tagName === 'A' ? btn.href : '') || btn.getAttribute('data-href') || '';
                  if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                    window.__zeroapplyCursor.clickElement(btn, 'AI: Click "Apply" (External)');
                  } else {
                    const rect = btn.getBoundingClientRect();
                    if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.glideTo === 'function') {
                      window.__zeroapplyCursor.glideTo(rect.left + rect.width / 2, rect.top + rect.height / 2, 'AI: Click "Apply" (External)');
                    }
                    try { if (typeof btn.focus === 'function') btn.focus(); } catch(e) {}
                    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    btn.click();
                  }
                  return { status: 'external_apply', url: link || capturedUrl };
                }
                return { status: 'none' };
              } catch(e) {
                return { status: 'none' };
              }
            })()
          `;

          const modalStatus = await view.executeJavaScript<ApplyTriggerResult>(openModalScript).catch((): ApplyTriggerResult => ({ status: 'none' }));
          const statusType = modalStatus?.status || modalStatus;

          if (statusType === 'easy_apply_triggered') {
            processTracker.recordTabOpened('modal');
            if (platformLabel.toLowerCase().includes('linkedin')) {
              await handleLinkedInJobSafetyReminder(view);
            }
            // Wait for Easy Apply application modal to fully open and settle before form filling!
            this.notifyStatus('Waiting for Easy Apply modal to fully load...');
            await waitForEasyApplyModalOpened(view, 6000);
            if (platformLabel.toLowerCase().includes('linkedin')) {
              await handleLinkedInJobSafetyReminder(view);
              await uncheckLinkedInFollowCompany(view);
            }
          } else if (statusType === 'external_apply') {
            if (platformLabel.toLowerCase().includes('linkedin')) {
              await handleLinkedInJobSafetyReminder(view);
            }
            if (openTab) {
              const rawExtUrl = modalStatus?.url || '';
              let externalUrl: string | undefined = undefined;
              if (rawExtUrl) {
                try {
                  const u = new URL(rawExtUrl);
                  const host = u.hostname.toLowerCase();
                  const isInternalPortal = (host.includes('linkedin.com') || host.includes('indeed.com')) && (
                    u.pathname.includes('/jobs/search') ||
                    u.pathname.includes('/jobs/view') ||
                    u.pathname.includes('/jobs/') ||
                    u.searchParams.has('currentJobId')
                  );
                  if (!isInternalPortal) {
                    externalUrl = rawExtUrl;
                  }
                } catch {}
              }
              const extResult = await normalApplyEngine.executeNormalApply(
                {
                  jobTitle: cardMeta?.title || persona.targetRoles[0] || 'Software Engineer',
                  companyName: cardMeta?.company || 'Target Company',
                  platform: platformLabel,
                  externalUrl,
                  cardIndex,
                },
                persona,
                {
                  openTab,
                  closeTabAndReturn,
                  notifyStatus: (s) => this.notifyStatus(s),
                  notifyLog: (m, t) => this.notifyLog(m, t),
                },
                {
                  allowSubmit: effectiveSubmit,

                  stepDelayMs: options.stepDelayMs ?? 650,
                  maxSteps: 15,
                }
              );

              if (extResult.outcome === 'submitted') {
                appliedCount++;
                processTracker.recordMovingToNext(detectedCards[cardIndex + 1]?.title);

                if (options.singleJobOnly) {
                  this.notifyStatus(`Demo finished. External application completed!`);
                  break;
                }

                if (appliedCount >= batchLimit) {
                  this.notifyStatus(`Application batch limit reached (${appliedCount}/${batchLimit} jobs). Completed application pass.`);
                  this.notifyLog(`Completed ${appliedCount} job application(s) (Application Batch Limit: ${batchLimit} reached). Pausing batch.`, 'success');
                  break;
                }

                // Humanized Gaussian inter-application delay
                const interDelay = stealthEngine.getHumanInterApplicationDelay();
                this.notifyLog(`Stealth Pacing: pausing ${(interDelay / 1000).toFixed(1)}s before selecting next job posting...`, 'info');

                await new Promise((r) => setTimeout(r, interDelay));
                continue;
              } else {
                this.notifyStatus(`External application in new tab is not yet completed/submitted. Keeping tab open.`);
                this.notifyLog(`New tab kept open: application for "${cardMeta?.title || 'Job'}" requires completion before returning to main search list.`, 'warning');
                break;
              }
            }

            this.notifyLog(`Job ${cardIndex + 1} has external application link. Moving to next job...`, 'info');
            await new Promise((r) => setTimeout(r, 600));
            continue;
          } else if (statusType === 'none') {
            this.notifyLog(`Job ${cardIndex + 1} has no open apply button. Moving to next job...`, 'info');
            continue;
          }

          this.notifyLog(`Easy Apply modal opened for ${cardMeta?.title}. Executing application with 3D Purple Visual Cursor & Local Qwen...`, 'success');
          await new Promise((r) => setTimeout(r, 150));

          // Execute full orchestrated application with 3D Visual Cursor, OmniVision, and Local Qwen 2.5
          const configuredDelay = options.stepDelayMs ?? 400;
          const appResult = await orchestrator.runApplication(view, persona, { maxSteps: 12, stepDelayMs: configuredDelay });
          this.notifyLog(`Applied to "${cardMeta?.title}": outcome=${appResult.outcome}, fields=${appResult.fieldsFilled}`, 'success');

          let isEasyApplySubmitted = appResult.outcome === 'submitted';

          if (!isEasyApplySubmitted) {
            // Robust check: Did submission succeed on the page (e.g. "Applied", "Application was sent", or "Not now" upsell prompt visible)?
            const pageSubmissionDetected = await view.executeJavaScript<boolean>(`
              (() => {
                const text = (document.body ? document.body.innerText : '').toLowerCase();
                const hasAppliedBadge = /applied\s*\d|applied\s*just\s*now|your application was sent|application submitted|thank you for applying/i.test(text);
                const hasUpsell = /turn your resume into a profile|update your profile|save skills to your profile/i.test(text);
                const hasNotNow = Array.from(document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
                  const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                  return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
                });
                return hasAppliedBadge || (hasUpsell && hasNotNow) || hasNotNow;
              })()
            `).catch(() => false);

            if (pageSubmissionDetected) {
              isEasyApplySubmitted = true;
              this.notifyLog(`Submission confirmed via page inspection for "${cardMeta?.title}".`, 'success');
            }
          }

          processTracker.recordSubmissionCheck(isEasyApplySubmitted, isEasyApplySubmitted ? 'Easy Apply submitted cleanly!' : 'Form advance halted.');

          if (isEasyApplySubmitted) {
            appliedCount++;
            processTracker.recordMovingToNext(detectedCards[cardIndex + 1]?.title);

            // Close success / completion modal so we return cleanly to the search list
            await new Promise((r) => setTimeout(r, 600));
            await ensureVisualCursor(view);
            await view.executeJavaScript(`
              (async () => {
                try {
                  const modal = document.querySelector(
                    '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
                  );
                  // If modal is already closed, do NOT search document and do NOT click anything!
                  if (!modal) return true;

                  // Priority 1: "Not now" button on the post-submission upsell dialog
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
                } catch(e) {
                  return false;
                }
              })()
            `).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
            await ensureAllModalsClosed(view);

            // Log application
            ApplicationLogger.log({
              portal: platformLabel,
              jobTitle: cardMeta?.title || persona.targetRoles[0] || 'Software Engineer',
              companyName: cardMeta?.company || 'Target Company',
              status: 'SUCCESS',
              fieldsFilled: appResult.fieldsFilled || 5,
              totalFields: appResult.fieldsFilled || 5,
            });

            dailyQuotaManager.recordApplication();
            const remaining = dailyQuotaManager.getRemainingQuota();
            this.notifyLog(`✓ Submitted application for "${cardMeta?.title}". Daily quota remaining: ${remaining}`, 'success');

            if (options.singleJobOnly) {
              this.notifyStatus(`Demo finished. Application submitted and confirmed!`);
              this.notifyLog(`Single-job demonstration complete. Pausing so you can inspect the result.`, 'success');
              break;
            }

            if (appliedCount >= batchLimit) {
              this.notifyStatus(`Application batch limit reached (${appliedCount}/${batchLimit} jobs). Completed application pass.`);
              this.notifyLog(`Completed ${appliedCount} job application(s) (Application Batch Limit: ${batchLimit} reached). Pausing batch.`, 'success');
              break;
            }

            this.notifyStatus(`Submitted job ${cardIndex + 1}/${totalCards}. Moving to next job...`);

            // Safeguard: halt loop if daily cap reached
            if (!dailyQuotaManager.canApply()) {
              this.notifyLog('Daily application safety limit reached. Pausing batch to safeguard account.', 'warning');
              break;
            }

            // Humanized Gaussian inter-application delay before advancing to next job posting
            const interDelay = stealthEngine.getHumanInterApplicationDelay();
            this.notifyLog(`Stealth Pacing: pausing ${(interDelay / 1000).toFixed(1)}s before selecting next job posting...`, 'info');

            await new Promise((r) => setTimeout(r, interDelay));
          } else {
            // Unsubmitted / in-progress modal: DO NOT close, DO NOT dismiss! Keep open for user review!
            this.notifyLog(`Easy Apply for "${cardMeta?.title}" is open on screen (${appResult.outcome}). Modal kept open for user review.`, 'warning');
            this.notifyStatus(`Application paused for "${cardMeta?.title}". Review form on screen.`);
            break;
          }
        }

        this.notifyStatus(`Auto-Apply batch completed for ${platformLabel}!`);
      } else {
        // Fallback for single job detail view
        await ensureVisualCursor(view);

        // Detect job metadata from page
        const singleMetaScript = `
          (() => {
            const title = document.querySelector('#detail-job-title, .jobs-unified-top-card__job-title, h1, h2, .job-details__title')?.textContent?.trim() || '';
            const company = document.querySelector('#detail-company-name, .jobs-unified-top-card__company-name, .job-details__company, .company-name')?.textContent?.trim() || '';
            return { title, company };
          })()
        `;
        const pageMeta = await view.executeJavaScript<{ title: string; company: string }>(singleMetaScript).catch(() => ({ title: '', company: '' }));
        const singleJobTitle = pageMeta?.title || detectedCards[0]?.title || persona.targetRoles[0] || 'Software Engineer';
        const singleCompany = pageMeta?.company || detectedCards[0]?.company || 'Target Company';

        processTracker.startNewJob(singleJobTitle, singleCompany, platformLabel);

        this.notifyStatus('Waiting for job detail view to settle...');
        await waitForPageSettled(view, {
          timeoutMs: 3000,
          minStableMs: 100,
          requiredSelector: 'button.jobs-apply-button, [aria-label*="Easy Apply" i], button#main-easy-apply-btn, a.jobs-apply-button, .jobs-s-apply button, button[data-za-apply-btn], [data-view-name="job-apply-button"] button',
          checkLoaders: false,
        });

        const singleApplyScript = `
          (function() {
            try {
              const btn = document.querySelector('button.jobs-apply-button, [aria-label*="Easy Apply"], button#main-easy-apply-btn, a.jobs-apply-button, .jobs-s-apply button, button[data-za-apply-btn]');
              if (btn && !btn.disabled) {
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
                if (/easy\\s*apply|in\\s*apply/i.test(text)) {
                  if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
                    window.__zeroapplyCursor.clickElement(btn, 'AI: Click "Easy Apply"');
                  }
                  btn.click();
                  return { status: 'easy_apply' };
                }
                let capturedUrl = '';
                try {
                  const origOpen = window.open;
                  window.open = function(u) {
                    if (u) capturedUrl = String(u);
                    return origOpen ? origOpen.apply(this, arguments) : null;
                  };
                } catch(e) {}

                const link = btn.closest('a')?.href || (btn.tagName === 'A' ? btn.href : '') || btn.getAttribute('data-href') || '';
                if (window.__zeroapplyCursor) {
                  window.__zeroapplyCursor.clickElement('button.jobs-apply-button, a.jobs-apply-button', 'AI: Click "Apply" (External)');
                } else {
                  btn.click();
                }
                return { status: 'external_apply', url: link || capturedUrl };
              }
              return { status: 'none' };
            } catch(e) {
              return { status: 'none' };
            }
          })()
        `;

        const applyResult = await view.executeJavaScript<ApplyTriggerResult>(singleApplyScript).catch((): ApplyTriggerResult => ({ status: 'none' }));

        if (applyResult?.status === 'external_apply' && openTab) {
          const extResult = await normalApplyEngine.executeNormalApply(
            {
              jobTitle: singleJobTitle,
              companyName: singleCompany,
              platform: platformLabel,
              externalUrl: applyResult.url || undefined,
            },
            persona,
            {
              openTab,
              closeTabAndReturn,
              notifyStatus: (s) => this.notifyStatus(s),
              notifyLog: (m, t) => this.notifyLog(m, t),
            },
            {
              allowSubmit: effectiveSubmit,

              stepDelayMs: options.stepDelayMs ?? 650,
              maxSteps: 15,
            }
          );

          if (extResult.outcome === 'submitted') {
            this.notifyStatus(`Normal application complete! Returned to 1st tab.`);
          } else {
            this.notifyStatus(`Normal application tab kept open until completely filled and submitted.`);
          }
          return;
        }

        if (applyResult?.status === 'easy_apply') {
          processTracker.recordTabOpened('modal');
          this.notifyStatus('Waiting for Easy Apply application modal to fully load...');
          await waitForEasyApplyModalOpened(view, 8000);
          this.notifyLog('Easy Apply modal opened and fully settled', 'success');
        }

        // Execute full orchestrated application with 3D Purple Visual Cursor & Local Qwen
        await ensureVisualCursor(view);
        const appRes = await orchestrator.runApplication(view, persona, { maxSteps: 12, stepDelayMs: 400 });
        this.notifyLog(`Application completed: outcome=${appRes.outcome}, fields=${appRes.fieldsFilled}`, 'success');

        let isEasyApplySubmitted = appRes.outcome === 'submitted';

        if (!isEasyApplySubmitted) {
          const pageSubmissionDetected = await view.executeJavaScript<boolean>(`
            (() => {
              const text = (document.body ? document.body.innerText : '').toLowerCase();
              const hasAppliedBadge = /applied\s*\d|applied\s*just\s*now|your application was sent|application submitted|thank you for applying/i.test(text);
              const hasUpsell = /turn your resume into a profile|update your profile|save skills to your profile/i.test(text);
              const hasNotNow = Array.from(document.querySelectorAll('button, [role="button"], a.artdeco-button, a[role="button"]')).some(b => {
                const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                return /not\\s*now|no\\s*thanks|maybe\\s*later/i.test(t);
              });
              return hasAppliedBadge || (hasUpsell && hasNotNow) || hasNotNow;
            })()
          `).catch(() => false);

          if (pageSubmissionDetected) {
            isEasyApplySubmitted = true;
            this.notifyLog(`Submission confirmed via page inspection.`, 'success');
          }
        }

        processTracker.recordSubmissionCheck(isEasyApplySubmitted, isEasyApplySubmitted ? 'Easy Apply submitted cleanly!' : 'Form advance halted.');

        if (isEasyApplySubmitted) {
          // Close completion modal with visual cursor ONLY when submitted
          await new Promise((r) => setTimeout(r, 600));
          await view.executeJavaScript(`
            (async () => {
              try {
                const modal = document.querySelector(
                  '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
                );
                // If modal is already closed, do NOT search document and do NOT click anything!
                if (!modal) return true;

                // Priority 1: "Not now" button on the post-submission upsell dialog
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
              } catch(e) {
                return false;
              }
            })()
          `).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          await ensureAllModalsClosed(view);

          ApplicationLogger.log({
            portal: platformLabel,
            jobTitle: singleJobTitle,
            companyName: singleCompany,
            status: 'SUCCESS',
            fieldsFilled: appRes.fieldsFilled,
            totalFields: Math.max(appRes.fieldsFilled, 5),
          });

          dailyQuotaManager.recordApplication();
          this.notifyStatus(`Application successfully submitted for ${platformLabel}!`);
          this.notifyLog(`Application submitted and confirmed for "${singleJobTitle}"!`, 'success');
        } else {
          // Unsubmitted / in-progress modal: DO NOT close, DO NOT dismiss! Keep open for user review!
          this.notifyLog(`Easy Apply for "${singleJobTitle}" is open on screen (${appRes.outcome}). Modal kept open for user review.`, 'warning');
          this.notifyStatus(`Application paused for "${singleJobTitle}". Review form on screen.`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.notifyLog(`AutoApply error: ${msg}`, 'error');
      console.error('[AutoApplyEngine] Error:', err);
    } finally {
      this.isRunning = false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.agentEngine.stop();
    this.notifyStatus('AutoApply stopped');
    this.notifyLog('AutoApply stopped by user', 'warning');
  }
}
