/** Compatibility exports for existing form resolvers; inference uses the bundled desktop engine. */
import { generateWebLlmResponse, getWebLlmState } from '../llm/webLlmEngine';

export const ONLY_LLM_MODEL = 'Qwen2.5 1.5B (built-in)';
export const OLLAMA_BASE_URL = '';
export function getActiveModelName(): string { return ONLY_LLM_MODEL; }
export function setActiveModelName(_modelName: string): void { /* One bundled model. */ }
export async function fetchInstalledModels(): Promise<string[]> { return [ONLY_LLM_MODEL]; }
export async function checkOllamaHealth(_timeoutMs = 3000): Promise<boolean> { return getWebLlmState().isReady; }
export interface OllamaStatus {
  online: boolean;
  modelAvailable: boolean;
  modelName: string;
  latencyMs?: number;
}
export async function checkOllamaStatus(_timeoutMs = 3000): Promise<OllamaStatus> {
  const ready = getWebLlmState().isReady;
  return { online: ready, modelAvailable: ready, modelName: ONLY_LLM_MODEL };
}
export async function pullOllamaModelWithProgress(_modelName = ONLY_LLM_MODEL, _onProgress?: (percent: number, status: string) => void): Promise<boolean> {
  throw new Error('The model is included with ZeroApply. Click Review & start AutoApply to load it.');
}
export async function deleteOllamaModel(_modelName = ONLY_LLM_MODEL): Promise<boolean> { return false; }
export async function generateOllamaAnswer(prompt: string, systemPrompt = '', temperature = 0, maxTokens = 512): Promise<string> {
  return generateWebLlmResponse(prompt, systemPrompt, temperature, maxTokens);
}
export const queryOllama = generateOllamaAnswer;
export const ollamaClient = { ONLY_LLM_MODEL, getActiveModelName, setActiveModelName, fetchInstalledModels, checkOllamaHealth, pullOllamaModelWithProgress, generateOllamaAnswer, queryOllama };
