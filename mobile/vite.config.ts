import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve('mobile'),
  base: './',
  publicDir: false,
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
});
