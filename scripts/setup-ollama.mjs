import { spawn, execSync } from 'child_process';

function runStep(cmd, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`[STEP] ${description}`);
    console.log(`Command: ${cmd} ${args.join(' ')}`);
    console.log(`========================================`);

    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });
    p.on('error', (err) => reject(err));
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Starting Automated Ollama & Qwen 2.5 1.5B Setup...');

  // 1. Install Ollama via Homebrew
  await runStep('/opt/homebrew/bin/brew', ['install', 'ollama'], 'Installing Ollama via Homebrew');

  // 2. Start Ollama service in background
  console.log('\n========================================');
  console.log('[STEP] Starting Ollama server background process...');
  console.log('========================================');
  
  try {
    // Try brew services first
    execSync('/opt/homebrew/bin/brew services start ollama', { stdio: 'inherit' });
  } catch {
    // Fallback to detached process
    const bg = spawn('/opt/homebrew/bin/ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    bg.unref();
  }

  // Wait for server to respond
  console.log('Waiting for Ollama service to become healthy on port 11434...');
  let healthy = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      const res = await fetch('http://127.0.0.1:11434/api/version');
      if (res.ok) {
        healthy = true;
        console.log('✓ Ollama server is UP and responding!');
        break;
      }
    } catch {
      process.stdout.write('.');
    }
  }

  if (!healthy) {
    // Spawn directly if brew services didn't start it
    const bg = spawn('/opt/homebrew/bin/ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    bg.unref();
    await sleep(2000);
  }

  // 3. Pull qwen2.5:1.5b
  await runStep('/opt/homebrew/bin/ollama', ['pull', 'qwen2.5:1.5b'], 'Downloading model: qwen2.5:1.5b');

  // 4. Verify model is loaded
  console.log('\n========================================');
  console.log('[STEP] Verifying model availability...');
  console.log('========================================');
  const checkRes = await fetch('http://127.0.0.1:11434/api/tags');
  if (checkRes.ok) {
    const data = await checkRes.json();
    console.log('Available models:', data.models?.map((m) => m.name));
    console.log('\n🎉 SUCCESS! Local LLM (qwen2.5:1.5b) is installed, running, and ready for ZeroApply!');
  } else {
    console.error('Failed to verify models via Ollama API');
  }
}

main().catch((err) => {
  console.error('\n❌ Installation failed:', err.message);
  process.exit(1);
});
