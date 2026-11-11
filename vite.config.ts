import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/**
 * Preload the fonts that paint the first screen. Vite hashes font file names,
 * so the tags have to be generated from the bundle rather than written by hand.
 */
function preloadFonts(patterns: RegExp[]): Plugin {
  let base = "/"
  return {
    name: "preload-fonts",
    apply: "build",
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => patterns.some((pattern) => pattern.test(file)))
          .map((file) => ({
            tag: "link",
            attrs: { rel: "preload", as: "font", type: "font/woff2", href: `${base}${file}`, crossorigin: true },
            injectTo: "head" as const,
          }))
      },
    },
  }
}

/**
 * Link previews need absolute URLs: crawlers do not resolve a relative
 * og:image. SITE_URL wins; on Vercel the project's production domain is used
 * (so a custom domain is picked up by itself); otherwise the default deployment.
 */
function siteUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const url = process.env.SITE_URL ?? (production ? `https://${production}` : "https://tge-calendar.vercel.app")
  return url.replace(/\/+$/, "")
}

function absoluteSiteUrls(): Plugin {
  return {
    name: "absolute-site-urls",
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl()),
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    absoluteSiteUrls(),
    // Body text and headlines; the monospace face is allowed to swap in.
    preloadFonts([/inter-latin-wght-normal-.*\.woff2$/, /space-grotesk-latin-wght-normal-.*\.woff2$/]),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    // three.js is lazy-loaded in its own chunk and is expected to be large.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Libraries change far less often than app code: keeping them in their
        // own files means a new release does not re-download React.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: "motion", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
    // Date maths is asserted against fixed calendar days.
    env: { TZ: "UTC" },
  },
})
