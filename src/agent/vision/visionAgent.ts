import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export interface VisualElementTarget {
  tag: string;
  text: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isObstructed: boolean;
  role: string;
}

export interface VisualInspectionResult {
  hasObstructingOverlays: boolean;
  overlayText?: string;
  interactiveElements: VisualElementTarget[];
  primaryActionButton?: VisualElementTarget;
  viewport: { width: number; height: number };
}

export const VISUAL_INSPECTOR_SCRIPT = `
(function inspectVisualGeometry() {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // 1. Detect obstructing modal backdrops or overlays
  const overlays = Array.from(document.querySelectorAll('.modal-backdrop, .overlay, .artdeco-modal-overlay, [role="dialog"], [aria-modal="true"]'));
  let hasObstructingOverlays = false;
  let overlayText = '';

  for (const ov of overlays) {
    const rect = ov.getBoundingClientRect();
    if (rect.width > 0.5 * viewportWidth && rect.height > 0.5 * viewportHeight) {
      hasObstructingOverlays = true;
      overlayText = ov.innerText ? ov.innerText.slice(0, 100).trim() : 'Modal Overlay';
      break;
    }
  }

  // 2. Discover interactive elements with coordinates
  const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]'));
  const targets = [];
  let primaryActionButton = null;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) continue;

    const computed = window.getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') continue;

    // Check if element is obstructed at its center point
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    const isObstructed = !!elementAtPoint && !el.contains(elementAtPoint) && !elementAtPoint.contains(el);

    const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim();
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type') || '';
    const role = el.getAttribute('role') || tag;

    const target = {
      tag,
      text: text.slice(0, 50),
      type,
      x: Math.round(centerX),
      y: Math.round(centerY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      isObstructed,
      role,
    };

    targets.push(target);

    // Identify primary actions (Easy Apply, Next, Review, Submit)
    const textLower = text.toLowerCase();
    if (!isObstructed && (tag === 'button' || role === 'button' || type === 'submit')) {
      if (textLower.includes('submit') || textLower.includes('apply') || textLower.includes('next') || textLower.includes('review') || textLower.includes('continue')) {
        if (!primaryActionButton || textLower.includes('submit') || textLower.includes('apply')) {
          primaryActionButton = target;
        }
      }
    }
  }

  return {
    hasObstructingOverlays,
    overlayText,
    interactiveElements: targets.slice(0, 30),
    primaryActionButton,
    viewport: { width: viewportWidth, height: viewportHeight },
  };
})();
`;

export class VisionAgent {
  /**
   * Inspects visual geometry and calculates exact coordinates for elements on the screen.
   */
  public static async inspectScreen(webview: any): Promise<VisualInspectionResult> {
    try {
      if (!webview || typeof webview.executeJavaScript !== 'function') {
        return {
          hasObstructingOverlays: false,
          interactiveElements: [],
          viewport: { width: 1280, height: 800 },
        };
      }

      const result: VisualInspectionResult = await webview.executeJavaScript(VISUAL_INSPECTOR_SCRIPT);

      if (result) {
        liveTelemetry.emit({
          type: 'scan',
          title: `Visual Geometry Scanned (${result.interactiveElements.length} Targets)`,
          detail: result.primaryActionButton ? `Action Target: "${result.primaryActionButton.text}" at (${result.primaryActionButton.x}, ${result.primaryActionButton.y})` : 'Full viewport analyzed',
          status: 'completed',
        });

        ProcessLogger.log({
          level: 'INFO',
          source: 'Vision Agent',
          message: `Inspected screen visual geometry: ${result.interactiveElements.length} elements detected`,
          detail: result.primaryActionButton ? `Primary action detected: "${result.primaryActionButton.text}" at (${result.primaryActionButton.x}, ${result.primaryActionButton.y})` : undefined,
          metadata: {
            hasOverlays: result.hasObstructingOverlays,
            viewport: result.viewport,
            primaryButton: result.primaryActionButton,
          },
        });
      }

      return result;
    } catch (err) {
      console.warn('[VisionAgent] Visual inspection failed:', err);
      return {
        hasObstructingOverlays: false,
        interactiveElements: [],
        viewport: { width: 1280, height: 800 },
      };
    }
  }
}
