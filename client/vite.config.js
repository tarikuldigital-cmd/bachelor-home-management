import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the build works on GitHub Pages sub-path and on any domain/hosting
export default defineConfig({
  plugins: [react()],
  base: './',
})
