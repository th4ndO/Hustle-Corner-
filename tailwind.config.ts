import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2f7",
          100: "#d6dfea",
          500: "#1e3a5f",
          600: "#14283e",
          700: "#0c1a29",
        },
        // Form-field borders: 3.4:1 on white, so a control's edge meets the
        // 3:1 WCAG non-text contrast rule (gray-300 was 1.5:1).
        field: "#858c96",
      },
      fontFamily: {
        // Bricolage Grotesque, self-hosted by next/font (see app/layout.tsx).
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
