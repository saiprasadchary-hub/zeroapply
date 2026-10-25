import { createReadStream } from 'node:fs';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MODEL_FILENAME, MODEL_BYTES, MODEL_SHA256 } from '../desktop/model-config.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, '..', 'public', 'models', 'zeroapply', MODEL_FILENAME);
if ((await stat(source)).size !== MODEL_BYTES) throw new Error('Download the pinned model with npm run model:download before building the APK.');
const digest = createHash('sha256');
for await (const chunk of createReadStream(source)) digest.update(chunk);
if (digest.digest('hex') !== MODEL_SHA256) throw new Error('The model checksum is incorrect. Download it again before packaging.');
const target = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'models');
await mkdir(target, { recursive: true });
await copyFile(source, path.join(target, MODEL_FILENAME));
console.log('Verified 1.1 GB LLM bundled into Android assets.');
