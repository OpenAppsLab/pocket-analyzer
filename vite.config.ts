import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// [vite.dev](https://vite.dev/config/)
export default defineConfig({
  base: '/pocket-analyzer/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})