import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { WebLlmEngineState } from '../../src/agent/llm/webLlmEngine';

export interface PhoneModelState extends WebLlmEngineState { modelDownloaded: boolean; isGenerating: boolean; }
export interface BrowserControl { action: 'continue' | 'stop' | 'closed'; }
export interface BrowserPage { url: string; title: string; progress: number; canGoBack: boolean; canGoForward: boolean; popup: boolean; }
interface PhoneAgentPlugin {
  openBrowser(options: { url: string }): Promise<void>;
  setBrowserBounds(options: { left: number; top: number; width: number; height: number; viewport: number; visible: boolean }): Promise<void>;
  browserNavigate(options: { action: 'back' | 'forward' | 'reload' | 'stop' | 'closePopup' }): Promise<void>;
  addListener(event: 'browserPage', callback: (page: BrowserPage) => void): Promise<PluginListenerHandle>;
  addListener(event: 'browserStatus', callback: (event: { message: string }) => void): Promise<PluginListenerHandle>;
  loginWithGoogle(): Promise<{ idToken: string }>;
  openChrome(options: { url: string }): Promise<void>;
  modelStatus(): Promise<PhoneModelState>;
  modelStart(options: { trigger: 'review-start' }): Promise<PhoneModelState>;
  modelGenerate(options: { prompt: string; systemPrompt: string; maxTokens: number }): Promise<{ text: string }>;
  modelStop(): Promise<void>;
  openLinkedIn(options: { url: string }): Promise<void>;
  evaluateLinkedIn(options: { script: string }): Promise<{ json: string }>;
  showBrowserStatus(options: { message: string }): Promise<void>;
  closeLinkedIn(): Promise<void>;
  addListener(event: 'modelState', callback: (state: PhoneModelState) => void): Promise<PluginListenerHandle>;
  addListener(event: 'browserControl', callback: (event: BrowserControl) => void): Promise<PluginListenerHandle>;
}
export const phoneAgent = registerPlugin<PhoneAgentPlugin>('ZeroApplyPhoneAgent');
export function isPhoneRuntime(): boolean { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; }

export function installPhoneBridge(): void {
  if (!isPhoneRuntime()) return;
  const subscribers = new Set<(state: WebLlmEngineState) => void>();
  void phoneAgent.addListener('modelState', (state: PhoneModelState): void => {
    for (const callback of subscribers) callback(state);
  }).catch((): void => {});
  window.zeroApply = {
    isDesktop: false,
    loginWithGoogleInChrome: async (): Promise<{ ok: true; idToken: string } | { ok: false; error: string }> => {
      try { const result = await phoneAgent.loginWithGoogle(); return { ok: true, idToken: result.idToken }; }
      catch (error: unknown) { return { ok: false, error: error instanceof Error ? error.message : 'Google sign-in failed.' }; }
    },
    startEmbeddedLlm: (): Promise<PhoneModelState> => phoneAgent.modelStart({ trigger: 'review-start' }),
    getEmbeddedLlmStatus: (): Promise<PhoneModelState> => phoneAgent.modelStatus(),
    generateEmbeddedLlm: async (options: { prompt: string; systemPrompt: string; temperature: number; maxTokens: number }): Promise<string> => {
      const response = await phoneAgent.modelGenerate({ prompt: options.prompt, systemPrompt: options.systemPrompt, maxTokens: options.maxTokens });
      return response.text;
    },
    stopEmbeddedLlm: (): Promise<void> => phoneAgent.modelStop(),
    onEmbeddedLlmState: (callback: (state: WebLlmEngineState) => void): (() => void) => {
      subscribers.add(callback);
      return (): void => { subscribers.delete(callback); };
    },
  };
  window.addEventListener('pagehide', (): void => { void phoneAgent.modelStop().catch((): void => {}); });
}
export async function evaluateLinkedIn<T>(script: string): Promise<T> {
  const response = await phoneAgent.evaluateLinkedIn({ script });
  return JSON.parse(response.json) as T;
}
