import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        brand: {
          DEFAULT: "#16a34a",
          50: "#ecfdf3",
          100: "#d1fadf",
          200: "#a7f3c7",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#16a34a",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      boxShadow: {
        modal: "0 10px 40px rgba(15, 23, 42, 0.15)",
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
