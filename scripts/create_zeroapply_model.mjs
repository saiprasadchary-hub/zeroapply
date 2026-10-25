import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const modelfilePath = path.join(workspaceDir, 'Modelfile.zeroapply');

console.log('============================================================');
console.log('🚀 Compiling ZeroApply Neural Core Model (Node.js Engine)');
console.log('============================================================');

if (!fs.existsSync(modelfilePath)) {
  console.error(`❌ Error: Modelfile not found at ${modelfilePath}`);
  process.exit(1);
}

const modelfileContent = fs.readFileSync(modelfilePath, 'utf8');

async function checkOllamaDaemon() {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/version');
    return res.ok;
  } catch {
    return false;
  }
}

async function createViaApi() {
  console.log('📡 Sending build request to Ollama daemon HTTP API...');
  const res = await fetch('http://127.0.0.1:11434/api/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'zeroapply',
      modelfile: modelfileContent,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errorText}`);
  }

  console.log('✅ Model "zeroapply" compiled successfully via Ollama HTTP API!');
}

function createViaCli() {
  return new Promise((resolve, reject) => {
    const ollamaPath = fs.existsSync('/opt/homebrew/bin/ollama') ? '/opt/homebrew/bin/ollama' : 'ollama';
    console.log(`💻 Executing: ${ollamaPath} create zeroapply -f ${modelfilePath}`);
    const proc = spawn(ollamaPath, ['create', 'zeroapply', '-f', modelfilePath], { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Ollama CLI exited with code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  const isDaemonRunning = await checkOllamaDaemon();
  if (!isDaemonRunning) {
    console.warn('⚠️ Ollama HTTP daemon is not currently responding on port 11434.');
    console.log('Attempting CLI compilation directly...');
    await createViaCli();
  } else {
    try {
      await createViaApi();
    } catch (err) {
      console.warn('API creation failed, falling back to CLI:', err.message);
      await createViaCli();
    }
  }

  console.log('\n============================================================');
  console.log('🎉 "zeroapply" model is active and ready for UltraQuestionResolver!');
  console.log('============================================================');
}

main().catch((err) => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
