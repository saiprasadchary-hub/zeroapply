import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getActiveModelName,
  ONLY_LLM_MODEL,
  pullOllamaModelWithProgress,
} from '../src/agent/llm/ollamaClient';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx)$/.test(name) ? [path] : [];
  });
}

assert.equal(ONLY_LLM_MODEL, 'qwen2.5:1.5b');
assert.equal(getActiveModelName(), ONLY_LLM_MODEL);

const source = sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

assert.doesNotMatch(source, /qwen2\.5:3b/i);
assert.doesNotMatch(source, /qwen2\.5-?vl/i);
assert.doesNotMatch(source, /queryOllamaVision|inspectScreenWithVLM/);
assert.doesNotMatch(source, /llama3\.2|deepseek/i);
await assert.rejects(
  pullOllamaModelWithProgress('qwen2.5:3b', () => undefined),
  /only permits qwen2\.5:1\.5b/i,
);

console.log('Single LLM model policy tests passed (7/7).');
