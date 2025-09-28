import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/coinmarketcal": {
        target: "https://developers.coinmarketcal.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinmarketcal/, ""),
        headers: {
          "User-Agent": "TGE-Calendar/1.0",
        },
      },
    },
  },
  define: {
    global: "globalThis",
  },
})
