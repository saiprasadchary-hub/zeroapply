import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { MODEL_FILENAME, MODEL_URL, MODEL_BYTES, MODEL_SHA256 } from '../desktop/model-config.mjs';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/models/zeroapply');
const destination = path.join(directory, MODEL_FILENAME);
fs.mkdirSync(directory, { recursive: true });
async function verify(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size !== MODEL_BYTES) return false;
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex') === MODEL_SHA256;
}
if (await verify(destination)) {
  console.log('Bundled model already verified.');
  process.exit(0);
}
const partial = `${destination}.partial`;
let received = 0;
let lastPercent = -1;
try {
  const disk = fs.statfsSync(directory);
  if (disk.bavail * disk.bsize < MODEL_BYTES + 256 * 1024 * 1024) {
    throw new Error('Free at least 1.4 GB of disk space before downloading the bundled model.');
  }
  const response = await fetch(MODEL_URL, { signal: AbortSignal.timeout(30 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`Model download failed: HTTP ${response.status}`);
  if (!response.url.startsWith('https://')) throw new Error('Rejected insecure model download.');
  const counter = new Transform({ transform(chunk, _encoding, callback) {
    received += chunk.length;
    if (received > MODEL_BYTES) return callback(new Error('Model download exceeded expected size.'));
    const percent = Math.floor(received / MODEL_BYTES * 100);
    if (percent >= lastPercent + 5) { lastPercent = percent; console.log(`Downloading bundled model: ${percent}%`); }
    callback(null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(partial));
  if (!await verify(partial)) throw new Error('Model checksum mismatch; download was not installed.');
  fs.renameSync(partial, destination);
  console.log('Bundled model downloaded and SHA-256 verified.');
} catch (error) {
  fs.rmSync(partial, { force: true });
  throw error;
}
