/**
 * ZeroApply Workflow - Batch Runner
 * Iterates through job search result cards, executes AutoApply on Easy Apply postings,
 * skips external ATS links when appropriate, and respects application limits.
 */

import type { PersonaData } from '../../types';
import type { WebviewTarget } from '../vision/domObserver';
import { analyzePage } from '../vision/pageAnalyzer';
import { orchestrator } from './orchestrator';
import { liveTelemetry } from '../telemetry/liveTelemetry';

export interface BatchOptions {
  maxApplications?: number;
  delayBetweenJobsMs?: number;
  allowExternalApply?: boolean;
}

export interface BatchResult {
  totalAttempted: number;
  submittedCount: number;
  skippedCount: number;
}

export class BatchRunner {
  public async runBatch(
    webview: WebviewTarget,
    persona: PersonaData,
    options: BatchOptions = {}
  ): Promise<BatchResult> {
    const { maxApplications = 5, delayBetweenJobsMs = 1000, allowExternalApply = false } = options;

    let submittedCount = 0;
    let skippedCount = 0;
    let totalAttempted = 0;

    // Discover job cards on current search page
    const cardDiscoveryScript = `
      (() => {
        const cardSelectors = 'li.jobs-search-results__list-item, .job-card, [data-job-id]';
        const cards = Array.from(document.querySelectorAll(cardSelectors));
        return { count: cards.length, selector: cardSelectors };
      })()
    `;

    const discovery = await webview.executeJavaScript<{ count: number; selector: string }>(cardDiscoveryScript);
    const totalCards = discovery?.count || 0;

    const cardsToProcess = Math.min(totalCards, maxApplications);

    for (let index = 0; index < cardsToProcess; index++) {
      totalAttempted++;

      // Click card at index
      const clickCardScript = `
        (() => {
          const cards = Array.from(document.querySelectorAll('li.jobs-search-results__list-item, .job-card, [data-job-id]'));
          const index = ${index};
          const card = cards[index];
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.click();
            const title = card.querySelector('.job-card__title, a, h3')?.textContent?.trim() || '';
            const company = card.querySelector('.job-card__company, [class*="company"]')?.textContent?.trim() || '';
            return { title, company };
          }
          return null;
        })()
      `;

      const cardInfo = await webview.executeJavaScript<{ title: string; company: string } | null>(clickCardScript);
      const title = cardInfo?.title || `Position ${index + 1}`;
      const company = cardInfo?.company || 'Company';

      liveTelemetry.emit({
        type: 'scroll',
        title: `Going to: Job ${index + 1}/${cardsToProcess}: "${title}" at "${company}"`,
        target: `${title} at ${company}`,
        status: 'running',
      });

      if (delayBetweenJobsMs > 0) await new Promise((r) => setTimeout(r, delayBetweenJobsMs));

      // Analyze selected job details
      const pageInfo = await analyzePage(webview);

      if (pageInfo.applyButton.type === 'external' && !allowExternalApply) {
        skippedCount++;
        continue;
      }

      if (pageInfo.applyButton.type === 'easy_apply' || pageInfo.hasActiveModal) {
        const result = await orchestrator.runApplication(webview, persona, {
          maxSteps: 10,
          stepDelayMs: delayBetweenJobsMs,
        });

        if (result.outcome === 'submitted') {
          submittedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }

      if (delayBetweenJobsMs > 0) await new Promise((r) => setTimeout(r, delayBetweenJobsMs));
    }

    return {
      totalAttempted,
      submittedCount,
      skippedCount,
    };
  }
}

export const batchRunner = new BatchRunner();
