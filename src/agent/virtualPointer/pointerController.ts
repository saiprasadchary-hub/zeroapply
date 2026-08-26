import type { PointerConfig, PointerPosition } from './types';
import { DEFAULT_POINTER_CONFIG } from './types';
import { generatePointerInjectionScript } from './pointerRenderer';
import { generateHumanMousePath } from '../stealth/bezierMovement';

const POINTER_STORAGE_KEY = 'zeroapply_virtual_pointer_config';

export class VirtualPointerController {
  private static instance: VirtualPointerController;
  private config: PointerConfig;
  private currentPosition: PointerPosition = { x: 400, y: 300 };

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): VirtualPointerController {
    if (!VirtualPointerController.instance) {
      VirtualPointerController.instance = new VirtualPointerController();
    }
    return VirtualPointerController.instance;
  }

  private loadConfig(): PointerConfig {
    try {
      const saved = localStorage.getItem(POINTER_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_POINTER_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...DEFAULT_POINTER_CONFIG };
  }

  public getConfig(): PointerConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<PointerConfig>): PointerConfig {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem(POINTER_STORAGE_KEY, JSON.stringify(this.config));
    } catch {}
    return this.getConfig();
  }

  /**
   * Injects the visual virtual pointer into the target webview
   */
  public async attach(executeScript: (script: string) => Promise<any>): Promise<boolean> {
    if (!this.config.enabled) return false;
    try {
      const script = generatePointerInjectionScript(this.config);
      await executeScript(script);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Smoothly animates the virtual cursor along a human Bézier trajectory to target coordinates
   */
  public async moveTo(
    target: PointerPosition,
    executeScript: (script: string) => Promise<any>,
    options: { animatePath?: boolean; speedMultiplier?: number } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    if (!options.animatePath) {
      const script = `if (window.__zaVirtualPointer) window.__zaVirtualPointer.moveTo(${target.x}, ${target.y});`;
      await executeScript(script).catch(() => {});
      this.currentPosition = { ...target };
      return;
    }

    // Generate human-like curved path
    const path = generateHumanMousePath(this.currentPosition, target, {
      overshoot: true,
      jitter: 1.0,
    });

    for (const step of path) {
      const script = `if (window.__zaVirtualPointer) window.__zaVirtualPointer.moveTo(${step.point.x}, ${step.point.y});`;
      await executeScript(script).catch(() => {});
      if (step.delayMs > 0) {
        await new Promise((r) => setTimeout(r, step.delayMs));
      }
    }

    this.currentPosition = { ...target };
  }

  /**
   * Performs a click animation with micro-scale dip and subtle ripple effect at target coordinates
   */
  public async click(
    target: PointerPosition,
    executeScript: (script: string) => Promise<any>
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Move to target first if not already there
    await this.moveTo(target, executeScript, { animatePath: true });

    const clickScript = `if (window.__zaVirtualPointer) window.__zaVirtualPointer.click(${target.x}, ${target.y});`;
    await executeScript(clickScript).catch(() => {});
    await new Promise((r) => setTimeout(r, 140));
  }

  /**
   * Updates the floating label text next to the pointer (e.g. "Typing name...", "Submitting...")
   */
  public async setActionText(
    text: string,
    executeScript: (script: string) => Promise<any>
  ): Promise<void> {
    if (!this.config.enabled) return;
    const script = `if (window.__zaVirtualPointer) window.__zaVirtualPointer.setActionText(${JSON.stringify(text)});`;
    await executeScript(script).catch(() => {});
  }
}

export const virtualPointer = VirtualPointerController.getInstance();
