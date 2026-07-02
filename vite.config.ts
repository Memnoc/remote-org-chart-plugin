import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const gitSha = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
})
