import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Development: Vite chạy ở cổng 5174, proxy /api tới server nội bộ (mặc định 127.0.0.1:5080).
const target = process.env.GIAOAN_API ?? 'http://127.0.0.1:5080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target, changeOrigin: true } },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
})
