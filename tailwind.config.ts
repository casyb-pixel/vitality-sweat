import type { Config } from "tailwindcss";

/**
 * Vitality Sweat — brand tokens (VS Brand Guide).
 * Tailwind v4 primarily reads theme from `src/app/globals.css` `@theme`.
 * This file documents the canonical HEX values for cross-tool reference.
 *
 * Brand Primary (wordmark / ink): #404040
 * Icon Primary (muted charcoal):  #6f6b6b
 * Icon Secondary (accent orange): #ff6600
 * Typography: Vesper Libre Medium
 */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#404040",
          muted: "#6f6b6b",
          orange: "#ff6600",
          "orange-deep": "#e55c00",
        },
        surface: {
          DEFAULT: "#f4f2ef",
          elevated: "#ffffff",
          dark: "#1a1a1a",
        },
      },
      fontFamily: {
        display: ["var(--font-vesper)", "Georgia", "serif"],
        sans: ["var(--font-source-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        site: "72rem",
      },
    },
  },
} satisfies Config;

export default config;
