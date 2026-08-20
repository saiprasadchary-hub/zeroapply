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
}

export interface QuestionSolveResult {
  answer: string;
  confidence: number;
  source: 'ollama' | 'heuristic';
  rawResponse?: string;
}

const OLLAMA_ENDPOINTS = ['http://127.0.0.1:11434', 'http://localhost:11434'];
let cachedBaseUrl = 'http://127.0.0.1:11434';
let cachedActiveModel: string = 'qwen2.5:3b';

export function getActiveModelName(): string {
  return cachedActiveModel;
}

/**
 * Checks if local Ollama server is running and accessible at http://127.0.0.1:11434 or http://localhost:11434
 */
export async function checkOllamaStatus(modelName?: string): Promise<OllamaStatus> {
  const startTime = Date.now();

  for (const baseUrl of OLLAMA_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        cachedBaseUrl = baseUrl;
        const data = await response.json();
        const models: Array<{ name: string }> = data.models || [];
        
        // Priority order for auto-selecting best model (qwen2.5:3b ranked #1)
        const candidateModels = [
          modelName,
          'qwen2.5:3b',
          'qwen2.5:1.5b',
          'llama3.2:3b',
          'deepseek-r1:1.5b',
          'llama3.2:1b',
          'qwen2.5:0.5b',
          'phi3.5',
          'phi3:mini'
        ].filter(Boolean) as string[];

        let detected = models.find(m => candidateModels.some(c => m.name.toLowerCase().includes(c.toLowerCase())));
        if (!detected && models.length > 0) {
          detected = models[0];
        }

        if (detected) {
          cachedActiveModel = detected.name;
        }

        const effectiveModel = detected ? detected.name : (modelName || cachedActiveModel);

        return {
          online: true,
          modelAvailable: Boolean(detected),
          modelName: effectiveModel,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch {
      // Try next endpoint
    }
  }

  return {
    online: false,
    modelAvailable: false,
    modelName: modelName || cachedActiveModel,
    latencyMs: Date.now() - startTime,
    error: 'Ollama server unreachable at http://127.0.0.1:11434 or http://localhost:11434',
  };
}

/**
 * Solves a custom form screening question using local Ollama (qwen2.5:3b)
 * with dual-stack network retry and intelligent semantic reasoning.
 */
export async function solveScreeningQuestion(
  questionText: string,
  persona: PersonaData,
  options?: { model?: string; timeoutMs?: number; availableOptions?: string[] }
): Promise<QuestionSolveResult> {
  const model = options?.model || cachedActiveModel;
  const timeoutMs = options?.timeoutMs || 15000;
  const availableOptions = options?.availableOptions;

  const thinkingAction = liveTelemetry.startAction({
    type: 'think',
    title: `Qwen 2.5: Reasoning "${questionText.length > 40 ? questionText.slice(0, 38) + '...' : questionText}"`,
    detail: `Prompting local model: ${model}${availableOptions && availableOptions.length > 0 ? ` (${availableOptions.length} choices)` : ''}`,
    target: questionText,
    model,
    source: 'ollama',
  });

  const prompt = await buildQuestionPrompt(questionText, persona, availableOptions);

  // Attempt generation against primary and fallback Ollama endpoints
  const endpointsToTry = [cachedBaseUrl, ...OLLAMA_ENDPOINTS.filter(e => e !== cachedBaseUrl)];

  for (const endpoint of endpointsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 120,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        cachedBaseUrl = endpoint;
        const data = await response.json();
        const rawResponse = data.response || '';
        const parsed = parseLlmAnswer(rawResponse, questionText, persona, availableOptions);

        if (parsed) {
          HierarchicalMemory.recordStepAnswer(questionText, parsed.answer);
          thinkingAction.complete({
            title: `Qwen 2.5 Solved: "${parsed.answer}"`,
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
      console.warn(`Ollama query to ${endpoint} failed, trying next:`, err);
    }
  }

  // Instant Heuristic Fallback
  const fallbackAnswer = parseLlmAnswer('', questionText, persona, availableOptions);
  const resultAnswer = fallbackAnswer ? fallbackAnswer.answer : '';
  const resultConf = fallbackAnswer ? fallbackAnswer.confidence : 0.5;

  ErrorLogger.log({
    source: 'Ollama LLM Client',
    message: `Ollama unavailable on all endpoints. Used heuristic solver: "${resultAnswer}" for question "${questionText}"`,
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
