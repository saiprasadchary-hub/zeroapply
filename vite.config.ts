import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs';
import path from 'node:path';

// Native model files are installer resources, not renderer assets. Avoid duplicating
// gigabytes into dist or publishing them with the website.
const copyPublicAssets = {
  name: 'zeroapply-public-assets',
  closeBundle(): void {
    if (!fs.existsSync('dist')) return;
    for (const entry of fs.readdirSync('public')) {
      if (entry === 'models') continue;
      fs.cpSync(path.join('public', entry), path.join('dist', entry), { recursive: true });
    }
  },
};

// https://vite.dev/config/
export default defineConfig({
  // Electron loads the production UI from file://. Relative asset URLs keep
  // the JS and CSS resolvable instead of pointing at file:///assets/.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    copyPublicAssets,
  ],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/dist/**', '**/release*/**'],
    },
  },
  build: {
    copyPublicDir: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/resume/') || id.includes('/src/resume-autofill/')) return 'resume';
          if (id.includes('/node_modules/react')) return 'react';
          if (id.includes('/node_modules/lucide-react')) return 'icons';
          if (id.includes('/node_modules/pdfjs-dist')) return 'pdf';
          if (id.includes('/node_modules/jszip')) return 'documents';
          if (id.includes('/node_modules/@firebase/auth')) return 'firebase-auth';
          if (id.includes('/node_modules/@firebase/firestore')) return 'firebase-firestore';
          if (id.includes('/node_modules/@firebase/storage')) return 'firebase-storage';
          if (id.includes('/node_modules/firebase') || id.includes('/node_modules/@firebase')) return 'firebase-core';
          if (id.includes('/node_modules/@langchain') || id.includes('/node_modules/langchain')) return 'langchain';
        },
      },
    },
  },
})
