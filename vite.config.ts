import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'terser'
  }
})
