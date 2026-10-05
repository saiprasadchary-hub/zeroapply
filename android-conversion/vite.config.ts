import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';
import { adaptAndroidSource } from './adapt-source.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
export default defineConfig({
  root: path.join(repoRoot, 'android-conversion'),
  base: './',
  publicDir: false,
  resolve: { alias: [{ find: /^\.\.\/AgentBrowser$/, replacement: path.join(repoRoot, 'android-conversion/src/AndroidBrowser.tsx') }] },
  plugins: [
    { name: 'zeroapply-android-adapters', enforce: 'pre', transform: adaptAndroidSource },
    react(), tailwindcss(),
    { name: 'zeroapply-android-branding', closeBundle(): void {
      const output = path.join(repoRoot, 'android-conversion/dist');
      for (const name of ['zeroapply-logo.png', 'logo_square.png', 'favicon.svg']) {
        const source = path.join(repoRoot, 'public', name);
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, name));
      }
    } },
  ],
  build: { outDir: 'dist', emptyOutDir: true },
});
