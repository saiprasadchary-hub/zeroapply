/**
 * ZeroApply State Machine - Step Navigator Bridge
 * Provides safe step advancement, human review checkpoints, and submit protection.
 */

import { stepNavigator, type AdvanceResult, type ForwardButtonResult } from '../navigation/wizardStepNavigator';
import type { WebviewTarget } from '../vision/domObserver';

export interface StepNavigationOptions {
  allowSubmit?: boolean;
}

export class StepNavigator {
  public async detectForwardButton(webview: WebviewTarget): Promise<ForwardButtonResult> {
    return stepNavigator.detectForwardButton(webview);
  }

  public async advance(webview: WebviewTarget, options: StepNavigationOptions = {}): Promise<AdvanceResult & { requiresConfirmation?: boolean }> {
    const btn = await this.detectForwardButton(webview);
    const allowSubmit = options.allowSubmit ?? false;

    if (btn.action === 'submit' && !allowSubmit) {
      return {
        success: false,
        action: 'submit',
        stepChanged: false,
        hasErrors: false,
        requiresConfirmation: true,
      };
    }

    return stepNavigator.advance(webview);
  }
}

export const defaultStepNavigator = new StepNavigator();
