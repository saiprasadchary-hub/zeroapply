import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.join(__dirname, '..', 'public', 'models', 'qwen2.5-1.5b');
const cacheJsonPath = path.join(targetDir, 'ndarray-cache.json');
const BASE_URL = 'https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f32_1-MLC/resolve/main/';

if (!fs.existsSync(cacheJsonPath)) {
  console.log('ndarray-cache.json not found!');
  process.exit(1);
}

const cacheData = JSON.parse(fs.readFileSync(cacheJsonPath, 'utf8'));
const shardFiles = cacheData.records?.map(r => r.dataPath).filter(Boolean) || [];
const uniqueShards = [...new Set(shardFiles)];

console.log(`Found ${uniqueShards.length} parameter shard(s) in ndarray-cache.json.`);

for (const shard of uniqueShards) {
  const dest = path.join(targetDir, shard);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`✓ ${shard} already downloaded (${(fs.statSync(dest).size / (1024 * 1024)).toFixed(1)} MB).`);
    continue;
  }

  console.log(`Downloading ${shard}...`);
  const response = await fetch(BASE_URL + shard, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download ${shard}: HTTP ${response.status}`);
  }

  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
  const sizeMB = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
  console.log(`✓ ${shard} saved (${sizeMB} MB).`);
}

console.log('\n✅ 100% of Qwen 2.5 1.5B weights are stored and ready in zeroapply/public/models/qwen2.5-1.5b!');
