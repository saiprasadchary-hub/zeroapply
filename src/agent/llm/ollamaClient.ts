import type { PersonaData } from '../../types';
import { buildQuestionPrompt } from './promptBuilder';
import { parseLlmAnswer } from './answerParser';
import { HierarchicalMemory } from '../memory/hierarchicalMemory';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ErrorLogger } from '../tracker/errorLogger';

export interface OllamaStatus {
  online: boolean;
  modelAvailable: boolean;
  modelName: string;
  latencyMs?: number;
  error?: string;
  availableModels?: string[];
}

export interface ModelDownloadProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent: number;
  speedMBps?: number;
  downloadedMB: string;
  totalMB: string;
}

export interface QuestionSolveResult {
  answer: string;
  confidence: number;
  source: 'ollama' | 'heuristic';
  rawResponse?: string;
}

const OLLAMA_ENDPOINTS = ['http://127.0.0.1:11434', 'http://localhost:11434'];
export const ONLY_LLM_MODEL = 'qwen2.5:1.5b';
let cachedBaseUrl = 'http://127.0.0.1:11434';

const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

export function getActiveModelName(): string {
  return ONLY_LLM_MODEL;
}

/**
 * Checks if local Ollama server is running and accessible at http://127.0.0.1:11434 or http://localhost:11434
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const startTime = Date.now();

  for (const baseUrl of OLLAMA_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (response.ok) {
        cachedBaseUrl = baseUrl;
        const data = await response.json();
        const models: Array<{ name: string }> = data.models || [];
        
        const detected = models.find((model) => model.name.toLowerCase() === ONLY_LLM_MODEL);

        return {
          online: true,
          modelAvailable: Boolean(detected),
          modelName: ONLY_LLM_MODEL,
          latencyMs: Date.now() - startTime,
          availableModels: models.map(m => m.name),
        };
      }
    } catch {
      // Try next endpoint
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    online: false,
    modelAvailable: false,
    modelName: ONLY_LLM_MODEL,
    latencyMs: Date.now() - startTime,
    error: 'Ollama server unreachable at http://127.0.0.1:11434 or http://localhost:11434',
  };
}

/**
 * Solves a custom form screening question using only Qwen2.5 1.5B.
 * with dual-stack network retry and intelligent semantic reasoning.
 */
export async function solveScreeningQuestion(
  questionText: string,
  persona: PersonaData,
  options?: { timeoutMs?: number; availableOptions?: string[]; errorMessage?: string }
): Promise<QuestionSolveResult> {
  const model = ONLY_LLM_MODEL;
  const timeoutMs = options?.timeoutMs ?? 30000;
  const availableOptions = options?.availableOptions;
  const errorMessage = options?.errorMessage;

  const thinkingAction = liveTelemetry.startAction({
    type: 'think',
    title: `Qwen 2.5 1.5B: Reasoning "${questionText.length > 40 ? questionText.slice(0, 38) + '...' : questionText}"`,
    detail: `Prompting local model: ${model}${errorMessage ? ` [Constraint: ${errorMessage}]` : ''}${availableOptions && availableOptions.length > 0 ? ` (${availableOptions.length} choices)` : ''}`,
    target: questionText,
    model,
    source: 'ollama',
  });

  const heuristicAnswer = parseLlmAnswer('', questionText, persona, availableOptions, errorMessage);
  if (heuristicAnswer && heuristicAnswer.confidence >= 0.95) {
    HierarchicalMemory.recordStepAnswer(questionText, heuristicAnswer.answer);
    thinkingAction.complete({
      title: `Heuristic: Solved "${heuristicAnswer.answer}"`,
      detail: `Deterministic rule matched (${Math.round(heuristicAnswer.confidence * 100)}% confidence)`,
      source: 'heuristic',
      value: heuristicAnswer.answer,
      confidence: heuristicAnswer.confidence,
    });
    return { ...heuristicAnswer, source: 'heuristic' };
  }

  let prompt = '';
  try {
    prompt = await buildQuestionPrompt(questionText, persona, availableOptions, errorMessage);
  } catch (error) {
    const answer = heuristicAnswer?.answer || '';
    const confidence = heuristicAnswer?.confidence || 0.5;
    ErrorLogger.log({
      source: 'Ollama LLM Client',
      message: `Prompt construction failed; workflow continued with the deterministic fallback for "${questionText}": ${String(error)}`,
      severity: 'INFO',
    });
    thinkingAction.complete({
      title: answer ? `Recovered with deterministic answer: "${answer}"` : 'LLM step skipped safely',
      detail: 'The workflow will continue and re-check the field during validation.',
      source: 'heuristic',
      value: answer,
      confidence,
    });
    return { answer, confidence, source: 'heuristic' };
  }

  // Attempt generation against primary and fallback Ollama endpoints
  const endpointsToTry = [cachedBaseUrl, ...OLLAMA_ENDPOINTS.filter(e => e !== cachedBaseUrl)];

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          keep_alive: '5m',
          options: {
            temperature: 0.1,
            num_predict: 120,
          },
        }),
      });

      if (response.ok) {
        cachedBaseUrl = endpoint;
        const data = await response.json();
        const rawResponse = data.response || '';
        const parsed = parseLlmAnswer(rawResponse, questionText, persona, availableOptions, errorMessage);

        if (parsed) {
          HierarchicalMemory.recordStepAnswer(questionText, parsed.answer);
          thinkingAction.complete({
            title: `Qwen 2.5 1.5B Solved: "${parsed.answer}"`,
            detail: `Confidence: ${Math.round(parsed.confidence * 100)}% | Question: ${questionText}`,
            value: parsed.answer,
            confidence: parsed.confidence,
          });

          return {
            answer: parsed.answer,
            confidence: parsed.confidence,
            source: 'ollama',
            rawResponse,
          };
        }
      }
    } catch (err) {
      const timedOut = isAbortError(err);
      console.warn(`Ollama query to ${endpoint} ${timedOut ? 'timed out; using fallback' : 'failed; trying next'}:`, err);
      if (timedOut) break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Instant Heuristic Fallback
  const fallbackAnswer = heuristicAnswer;
  const resultAnswer = fallbackAnswer ? fallbackAnswer.answer : '';
  const resultConf = fallbackAnswer ? fallbackAnswer.confidence : 0.5;

  ErrorLogger.log({
    source: 'Ollama LLM Client',
    message: `Ollama request failed or timed out. Used heuristic solver: "${resultAnswer}" for question "${questionText}"`,
    severity: 'INFO',
  });

  thinkingAction.complete({
    title: `Heuristic: Solved "${resultAnswer}"`,
    detail: `Rule-based fallback matched (${Math.round(resultConf * 100)}% confidence)`,
    source: 'heuristic',
    value: resultAnswer,
    confidence: resultConf,
  });

  return {
    answer: resultAnswer,
    confidence: resultConf,
    source: 'heuristic',
  };
}

/**
 * Direct raw text prompt querying against local Ollama models.
 */
export async function queryOllama(prompt: string, timeoutMs = 30000): Promise<string> {
  const endpointsToTry = [cachedBaseUrl, ...OLLAMA_ENDPOINTS.filter(e => e !== cachedBaseUrl)];

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: ONLY_LLM_MODEL,
          prompt,
          stream: false,
          keep_alive: '5m',
          options: {
            temperature: 0.2,
            num_predict: 200,
          },
        }),
      });

      if (response.ok) {
        cachedBaseUrl = endpoint;
        const data = await response.json();
        return (data.response || '').trim();
      }
    } catch (error) {
      // Continue to fallback endpoint
      if (isAbortError(error)) break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return '';
}

/**
 * Downloads and registers the single supported local LLM.
 * with real-time streaming progress, bytes transferred, speed, and status.
 */
export async function pullOllamaModelWithProgress(
  modelName: string,
  onProgress: (progress: ModelDownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<boolean> {
  if (modelName !== ONLY_LLM_MODEL) {
    throw new Error(`Unsupported model. ZeroApply only permits ${ONLY_LLM_MODEL}.`);
  }
  const endpointsToTry = [cachedBaseUrl, ...OLLAMA_ENDPOINTS.filter(e => e !== cachedBaseUrl)];

  // Estimated sizes for known models (used as fallback when Ollama reports 0)
  const ESTIMATED_SIZES: Record<string, number> = {
    [ONLY_LLM_MODEL]: 986_000_000,
  };
  const estimatedTotal = ESTIMATED_SIZES[modelName];
  let knownTotal = 0; // Will be set once Ollama reports a real total

  for (const endpoint of endpointsToTry) {
    try {
      const response = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortSignal,
        body: JSON.stringify({
          name: modelName,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        continue;
      }

      cachedBaseUrl = endpoint;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastCompleted = 0;
      let lastTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            const rawTotal = data.total || 0;
            const completed = data.completed || 0;

            // Track the largest real total we've seen from Ollama
            if (rawTotal > knownTotal) {
              knownTotal = rawTotal;
            }

            // Use real total if available, otherwise estimated
            const displayTotal = knownTotal > 0 ? knownTotal : estimatedTotal;
            const percent = displayTotal > 0 ? Math.min(100, Math.round((completed / displayTotal) * 100)) : 0;

            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            let speedMBps: number | undefined;

            if (timeDiff > 0.5 && completed > lastCompleted) {
              speedMBps = Number((((completed - lastCompleted) / (1024 * 1024)) / timeDiff).toFixed(1));
              lastCompleted = completed;
              lastTime = now;
            }

            // Friendly status text
            let status = data.status || 'Processing model...';
            if (status === 'pulling manifest') {
              status = 'Connecting to model repository...';
            } else if (status.startsWith('pulling') && data.digest) {
              status = 'Downloading model weights...';
            } else if (status === 'verifying sha256 digest') {
              status = 'Verifying download integrity...';
            } else if (status === 'writing manifest') {
              status = 'Finalizing installation...';
            }

            onProgress({
              status,
              digest: data.digest,
              total: displayTotal,
              completed,
              percent,
              speedMBps,
              downloadedMB: (completed / (1024 * 1024)).toFixed(1),
              totalMB: (displayTotal / (1024 * 1024)).toFixed(1),
            });

            if (data.status === 'success') {
              return true;
            }
          } catch {
            // Partial JSON chunk
          }
        }
      }

      return true;
    } catch (e: any) {
      if (abortSignal?.aborted) {
        throw new Error('Download cancelled by user');
      }
      console.warn(`[pullOllamaModelWithProgress] Pull failed on ${endpoint}:`, e);
    }
  }

  throw new Error('Could not connect to Ollama server. Please ensure Ollama is running.');
}
