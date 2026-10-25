import { checkOllamaHealth, generateOllamaAnswer } from './ollamaClient';

export class LocalLlmEngine {
  private static instance: LocalLlmEngine | null = null;
  private constructor() {}
  public static getInstance(): LocalLlmEngine {
    return LocalLlmEngine.instance ??= new LocalLlmEngine();
  }
  public async checkOllamaHealth(_ping = true): Promise<boolean> { return checkOllamaHealth(); }
  public async generateAnswer(prompt: string, systemPrompt = ''): Promise<string> {
    return generateOllamaAnswer(prompt, systemPrompt);
  }
}
export const llmEngine = LocalLlmEngine.getInstance();
export const langchainPipeline = {
  executeChat: async (prompt: string, systemPrompt = ''): Promise<string> => llmEngine.generateAnswer(prompt, systemPrompt),
};
