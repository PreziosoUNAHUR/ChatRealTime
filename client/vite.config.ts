import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // xp.css contiene una regla que el minificador lightningcss rechaza.
    cssMinify: 'esbuild',
  },
})
