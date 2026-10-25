import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // zxcvbn's dictionaries are ~1.5 MB; keep them in their own long-cached chunk.
        manualChunks: (id) => {
          if (id.includes('@zxcvbn-ts')) return 'zxcvbn'
          if (id.includes('node_modules/react') || id.includes('react-router') || id.includes('node_modules/motion') || id.includes('framer-motion')) return 'vendor'
        },
      },
    },
  },
})
