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

const OLLAMA_BASE_URL = 'http://localhost:11434';
let cachedActiveModel: string = 'qwen2.5:0.5b';

export function getActiveModelName(): string {
  return cachedActiveModel;
}

/**
 * Checks if local Ollama server is running and accessible at http://localhost:11434
 */
export async function checkOllamaStatus(modelName?: string): Promise<OllamaStatus> {
  const startTime = Date.now();
  const endpoints = ['http://localhost:11434', 'http://127.0.0.1:11434'];

  for (const baseUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const models: Array<{ name: string }> = data.models || [];
        
        // Priority order for auto-selecting best lightweight 1GB/sub-3GB models
        const candidateModels = [
          modelName,
          'qwen2.5:1.5b',
          'llama3.2:1b',
          'deepseek-r1:1.5b',
          'qwen2.5:3b',
          'llama3.2:3b',
          'qwen2.5:0.5b',
          'phi3:mini',
          'phi3.5'
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
      // Try next endpoint fallback
    }
  }

  return {
    online: false,
    modelAvailable: false,
    modelName: modelName || cachedActiveModel,
    latencyMs: Date.now() - startTime,
    error: 'Ollama server unreachable at http://localhost:11434 or http://127.0.0.1:11434',
  };
}

/**
 * Solves a custom form screening question using local Ollama (qwen2.5:0.5b)
 * with instant heuristic fallback if Ollama is unreachable or slow.
 */
export async function solveScreeningQuestion(
  questionText: string,
  persona: PersonaData,
  options?: { model?: string; timeoutMs?: number }
): Promise<QuestionSolveResult> {
  const model = options?.model || cachedActiveModel;
  const timeoutMs = options?.timeoutMs || 15000;

  const thinkingAction = liveTelemetry.startAction({
    type: 'think',
    title: `Qwen 2.5: Reasoning "${questionText.length > 40 ? questionText.slice(0, 38) + '...' : questionText}"`,
    detail: `Prompting local model: ${model}`,
    target: questionText,
    model,
    source: 'ollama',
  });

  const prompt = await buildQuestionPrompt(questionText, persona);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 100,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawResponse = data.response || '';
      const parsed = parseLlmAnswer(rawResponse, questionText, persona);

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
    console.warn('Ollama local LLM query skipped or timed out, using heuristic solver:', err);
    ErrorLogger.log({
      source: 'Ollama LLM Client',
      message: `Local LLM query failed or timed out: ${err instanceof Error ? err.message : String(err)}. Falling back to heuristic solver.`,
      severity: 'NETWORK',
    });
  }

  // Instant Heuristic Fallback
  const fallbackAnswer = parseLlmAnswer('', questionText, persona);
  const resultAnswer = fallbackAnswer ? fallbackAnswer.answer : '';
  const resultConf = fallbackAnswer ? fallbackAnswer.confidence : 0.5;

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
