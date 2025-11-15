import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  /*optimizeDeps: {
    include: ['geotiff.js']
  },
*/
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'node:buffer': 'buffer',
    },
  },
  optimizeDeps: {
    include: ['geotiff'],
    exclude: ['@loaders.gl/images']
  }
})
