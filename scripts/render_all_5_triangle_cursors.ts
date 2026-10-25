import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import {
  CURSOR_POINTER_OPTIONS,
  getCustomCombinedCursorMarkup,
} from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 750 } });

  // Generate SVG for all 5 pointers directly from the production cursors engine
  const svgPointers = CURSOR_POINTER_OPTIONS.map((opt, idx) => ({
    ...opt,
    svg: getCustomCombinedCursorMarkup(opt.id, 'avatar_grok_bot', `p-${idx}`, 'cursor'),
  }));

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Every Cursor In Near-Triangle Shape (Zero Clutter, No Tails, No Floating Rings)</title>
      <style>
        body {
          margin: 0;
          padding: 36px 40px;
          background: #0b0f19;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f1f5f9;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }
        .header {
          text-align: center;
          max-width: 860px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 26px;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header p {
          margin: 0;
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.5;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 1320px;
        }
        .card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .stage {
          width: 190px;
          height: 190px;
          background: radial-gradient(circle at 50% 50%, #1f2937 0%, #111827 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stage svg {
          width: 90px;
          height: 90px;
        }
        .meta {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .title {
          font-weight: 700;
          font-size: 14px;
          color: #f8fafc;
        }
        .badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 9999px;
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          align-self: center;
        }
        .desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>All 5 Cursors In Pure Near-Triangle Shape</h1>
        <p>100% Tailless aerodynamic delta arrowheads with zero bottom stems/tails and zero floating rings or orbiting clutter. Sleek 3-corner delta geometry matching user specifications.</p>
      </div>

      <div class="grid">
        ${svgPointers
          .map(
            (p) => `
          <div class="card">
            <div class="stage">${p.svg}</div>
            <div class="meta">
              <span class="badge">${p.badge}</span>
              <span class="title">${p.name}</span>
              <span class="desc">${p.description}</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/all_5_triangle_cursors_preview.png';
  await page.screenshot({ path: outPath });
  console.log('Saved updated preview to:', outPath);
  await browser.close();
}

main().catch(console.error);
