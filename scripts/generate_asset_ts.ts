import fs from 'node:fs';
import path from 'node:path';

const pngPath = path.join(process.cwd(), 'src', 'assets', 'aqua_drop_clean.png');
const pngBuffer = fs.readFileSync(pngPath);
const base64 = pngBuffer.toString('base64');

console.log(`PNG Size: ${pngBuffer.length} bytes (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
console.log(`Base64 length: ${base64.length}`);

const code = `// Auto-generated photorealistic Aqua Drop mascot base64 asset
export const AQUA_DROP_BASE64_URI = 'data:image/png;base64,${base64}';
`;

fs.writeFileSync(path.join(process.cwd(), 'src', 'assets', 'aquaDropAsset.ts'), code);
console.log('✅ Generated src/assets/aquaDropAsset.ts');
