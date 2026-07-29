import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subpath-Deploy für GitHub Pages: /Pokiman/
export default defineConfig({
  base: '/Pokiman/',
  plugins: [react()],
})
