import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The API runs separately (server/), so the browser never sees provider tokens.
    proxy: { '/api': 'http://127.0.0.1:8787' },
    // Allow importing ../shared (competition config + API types).
    fs: { allow: ['..'] },
  },
})
