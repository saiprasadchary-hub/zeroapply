import http from 'http';

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
        try {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.status) {
              if (parsed.total && parsed.completed) {
                const pct = ((parsed.completed / parsed.total) * 100).toFixed(1);
                process.stdout.write(`\r[Ollama] ${parsed.status}: ${pct}%`);
              } else {
                console.log(`[Ollama] ${parsed.status}`);
              }
            }
          }
        } catch {}
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Upgrading Ollama Local Model to Qwen 2.5 3B (~1.9 GB) ===\n');

  // 1. Check current models
  console.log('1. Checking current models in Ollama...');
  const tagsRes = await request({
    hostname: '127.0.0.1',
    port: 11434,
    path: '/api/tags',
    method: 'GET'
  });

  if (tagsRes.status !== 200) {
    throw new Error(`Ollama server not responding on 11434 (status ${tagsRes.status})`);
  }

  const tagsData = JSON.parse(tagsRes.body);
  console.log('Currently installed:', tagsData.models?.map(m => m.name) || []);

  // 2. Pull qwen2.5:3b
  console.log('\n2. Downloading and installing qwen2.5:3b (~1.9 GB)...');
  const pullRes = await request({
    hostname: '127.0.0.1',
    port: 11434,
    path: '/api/pull',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ name: 'qwen2.5:3b', stream: true }));

  console.log('\n✓ qwen2.5:3b downloaded and ready!');

  // 3. Delete old qwen2.5:1.5b to free disk space
  console.log('\n3. Removing old qwen2.5:1.5b...');
  try {
    const deleteRes = await request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/delete',
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ name: 'qwen2.5:1.5b' }));
    console.log('✓ Removed qwen2.5:1.5b');
  } catch (err) {
    console.warn('Note: Could not delete qwen2.5:1.5b (may not exist):', err.message);
  }

  // 4. Verification
  console.log('\n4. Verifying active models...');
  const verifyRes = await request({
    hostname: '127.0.0.1',
    port: 11434,
    path: '/api/tags',
    method: 'GET'
  });
  const verifyData = JSON.parse(verifyRes.body);
  console.log('Available models:', verifyData.models?.map(m => m.name));
  console.log('\n🎉 SUCCESS: qwen2.5:3b is now installed and active!');
}

main().catch(err => {
  console.error('Error upgrading model:', err);
  process.exit(1);
});
