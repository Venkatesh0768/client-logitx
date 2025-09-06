import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],

  // server: {
  //   port: 5174,
  //   allowedHosts: ["16abc65a965f.ngrok-free.app"], 
  //   host: true,
  // },

  // optimizeDeps: {
  //   include: ['date-fns'],
  // },
})
