import { assertSiteAccessible } from '../security/siteAccess';
import type { WebviewTarget } from '../domScanner/injectedScanner';
import type { PersonaData } from '../../types';
import { AgentEngine } from '../orchestrator/agentEngine';

export class StandardFormsEngine {
  private isRunning = false;
  private engine = new AgentEngine();
  private statusCallback: ((status: string) => void) | null = null;
  private logCallback: ((log: any) => void) | null = null;

  public setStatusCallback(callback: (status: string) => void): void {
    this.statusCallback = callback;
  }

  public setLogCallback(callback: (log: any) => void): void {
    this.logCallback = callback;
  }

  public async startBatchApply(
    view: WebviewTarget,
    persona: PersonaData,
    platformLabel = 'Standard Form',
    allowSubmit = false,
    _openTab?: (url?: string) => Promise<WebviewTarget | null>
  ): Promise<void> {
    this.isRunning = true;
    if (this.statusCallback) this.statusCallback(`Starting apply on ${platformLabel}...`);

    try {
      for (let step = 1; step <= 6 && this.isRunning; step++) {
        await assertSiteAccessible(view);
        await this.engine.autoFillCurrentPage(view, persona, platformLabel);
        await new Promise((r) => setTimeout(r, 800));

        const advanced = await this.engine.advanceNextStep(view);
        if (!advanced) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
    } finally {
      this.isRunning = false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.engine.stop();
  }
}
