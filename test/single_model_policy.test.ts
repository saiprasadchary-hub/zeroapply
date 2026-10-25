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

assert.ok(ONLY_LLM_MODEL, 'Default model should be defined');
assert.equal(getActiveModelName(), ONLY_LLM_MODEL);

console.log('Local zero-cost LLM model policy tests passed.');
