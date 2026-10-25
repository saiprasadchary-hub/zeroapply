import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cpSync, existsSync } from 'node:fs';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        features: fileURLToPath(new URL('./features.html', import.meta.url)),
        howItWorks: fileURLToPath(new URL('./how-it-works.html', import.meta.url)),
        faqs: fileURLToPath(new URL('./faqs.html', import.meta.url))
      }
    }
  },
  plugins: [
    {
      name: 'copy-release-assets',
      closeBundle() {
        if (existsSync('downloads')) cpSync('downloads', 'dist/downloads', { recursive: true });
      }
    }
  ]
});
