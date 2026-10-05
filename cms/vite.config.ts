import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { cmsApiPlugin } from './api-plugin.ts'

export default defineConfig({
  base: '/cms/',
  plugins: [react(), tailwindcss(), cmsApiPlugin()],
  server: { host: '0.0.0.0', port: 43918, strictPort: true, cors: true },
})
