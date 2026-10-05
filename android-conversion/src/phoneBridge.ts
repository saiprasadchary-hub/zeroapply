import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { WebLlmEngineState } from '../../src/agent/llm/webLlmEngine';

export interface PhoneModelState extends WebLlmEngineState { modelDownloaded: boolean; isGenerating: boolean; }
export interface BrowserControl { action: 'continue' | 'stop' | 'closed'; }
interface PhoneAgentPlugin {
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
