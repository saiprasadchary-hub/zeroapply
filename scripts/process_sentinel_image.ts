import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const srcImgPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/.user_uploaded/media_1793007617230.jpg';
  const imgBuffer = fs.readFileSync(srcImgPath);
  const dataUri = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; background: transparent;">
        <img id="src" src="${dataUri}" />
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForSelector('#src');

  const info = await page.evaluate(async () => {
    const img = document.getElementById('src') as HTMLImageElement;
    await img.decode();
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    };
  });

  console.log('Image dimensions:', info);
  await browser.close();
}

main().catch(console.error);
