import fs from 'node:fs';
import path from 'node:path';

const src = path.join(process.cwd(), 'scripts', 'mochi_neko_preview.png');
const dest = '/Users/sriman/.gemini/antigravity-ide/brain/43e7adfe-6e72-4028-ab48-d6a88ab9e892/mochi_neko_preview.png';

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Artifact copied successfully');
}
