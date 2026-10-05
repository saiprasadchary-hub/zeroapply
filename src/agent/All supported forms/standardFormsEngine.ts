import type { PersonaData } from '../../types';
import { DOM_SCANNER_SCRIPT } from '../domScanner/injectedScanner';

export type OpenApplicationTab = (url: string) => Promise<any>;

export interface StandardFormsEngineOptions {
  openApplicationTab?: OpenApplicationTab;
}

export class StandardFormsEngine {
  private isRunning = false;
  private options: StandardFormsEngineOptions;

  public constructor(options: StandardFormsEngineOptions = {}) {
    this.options = options;
  }

  public async startBatchApply(
    entry: any,
    _persona: PersonaData,
    _platformId = 'standard',
    allowSubmit = false,
    _openTab?: OpenApplicationTab
  ): Promise<void> {
    this.isRunning = true;
    const workflow = { haltBatch: false };
    const effectiveSubmit = allowSubmit && !workflow.haltBatch;
    try {
      if (entry && entry.webview && typeof entry.webview.executeJavaScript === 'function') {
        await entry.webview.executeJavaScript(DOM_SCANNER_SCRIPT);
      }
    } finally {
      this.isRunning = false;
    }
  }

  public stop(): void {
    this.isRunning = false;
  }
}
