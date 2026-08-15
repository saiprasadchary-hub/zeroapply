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
const DEFAULT_MODEL = 'qwen2.5:0.5b';

/**
 * Checks if local Ollama server is running and accessible at http://localhost:11434
 */
export async function checkOllamaStatus(modelName: string = DEFAULT_MODEL): Promise<OllamaStatus> {
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
        const isModelPresent = models.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()));

        return {
          online: true,
          modelAvailable: isModelPresent,
          modelName,
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
    modelName,
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
  const model = options?.model || DEFAULT_MODEL;
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
