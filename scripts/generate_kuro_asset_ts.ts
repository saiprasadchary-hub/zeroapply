import fs from 'node:fs';
import path from 'node:path';

const imgPath = path.join(process.cwd(), 'src/assets/kuro_star_clean.png');
const imgBuffer = fs.readFileSync(imgPath);
const base64Uri = `data:image/png;base64,${imgBuffer.toString('base64')}`;

const code = `// Auto-generated photorealistic Kuro Star Celestial mascot base64 asset
export const KURO_STAR_BASE64_URI = '${base64Uri}';
`;

const outPath = path.join(process.cwd(), 'src/assets/kuroStarAsset.ts');
fs.writeFileSync(outPath, code, 'utf-8');
console.log('Successfully wrote', outPath, 'Bytes:', code.length);
