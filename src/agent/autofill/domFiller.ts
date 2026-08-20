import type { FieldFillInstruction } from './personaMapper';
import { generateHumanBypassScript } from './humanSimulator';

export interface FillResult {
  filledCount: number;
  skippedCount: number;
  totalTargeted: number;
}

/**
 * Driver that executes field filling script inside an Electron webview or document context.
 */
export async function executeDomAutofill(
  webview: any,
  instructions: FieldFillInstruction[]
): Promise<FillResult> {
  if (!instructions || instructions.length === 0) {
    return { filledCount: 0, skippedCount: 0, totalTargeted: 0 };
  }

  const instructionsJson = JSON.stringify(instructions);
  // Phase 5: Switched to human-simulator instead of instant React-bypasser
  const script = generateHumanBypassScript(instructionsJson);

  try {
    let result: any;
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return { filledCount: 0, skippedCount: instructions.length, totalTargeted: instructions.length };
    }
    result = await webview.executeJavaScript(script).catch((err: any) => {
      console.warn('DOM autofill execution non-fatal catch:', err);
      return null;
    });

    return {
      filledCount: result?.filledCount || 0,
      skippedCount: result?.skippedCount || 0,
      totalTargeted: instructions.length,
    };
  } catch (err) {
    console.error('Error executing DOM autofill script:', err);
    return { filledCount: 0, skippedCount: instructions.length, totalTargeted: instructions.length };
  }
}
