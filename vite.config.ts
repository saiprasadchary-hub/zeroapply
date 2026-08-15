import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Electron loads the production UI from file://. Relative asset URLs keep
  // the JS and CSS resolvable instead of pointing at file:///assets/.
  base: './',
  plugins: [
    react(),
    tailwindcss()
  ],
  // Forced cache clearing restart
})

