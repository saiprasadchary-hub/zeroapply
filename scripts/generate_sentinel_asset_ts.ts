import fs from 'node:fs';
import path from 'node:path';

const imgPath = path.join(process.cwd(), 'src/assets/aero_sentinel_clean.png');
const imgBuffer = fs.readFileSync(imgPath);
const base64Uri = `data:image/png;base64,${imgBuffer.toString('base64')}`;

const code = `// Auto-generated photorealistic Aero Sentinel mascot base64 asset
export const AERO_SENTINEL_BASE64_URI = '${base64Uri}';
`;

const outPath = path.join(process.cwd(), 'src/assets/aeroSentinelAsset.ts');
fs.writeFileSync(outPath, code, 'utf-8');
console.log('Successfully wrote', outPath, 'Bytes:', code.length);
