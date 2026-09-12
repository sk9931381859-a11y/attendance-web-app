import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        brand: {
          teal: {
            50: "var(--brand-teal-50)",
            200: "var(--brand-teal-200)",
            DEFAULT: "var(--brand-teal-600)",
            700: "var(--brand-teal-700)",
          },
          green: {
            50: "var(--brand-green-50)",
            100: "var(--brand-green-100)",
            200: "var(--brand-green-200)",
            400: "var(--brand-green-400)",
            500: "var(--brand-green-500)",
            DEFAULT: "var(--brand-green-600)",
            700: "var(--brand-green-700)",
            800: "var(--brand-green-800)",
          },
        },
        slateCard: {
          bg: "var(--slate-card-bg)",
          border: "var(--slate-card-border)",
          muted: "var(--slate-muted-bg)",
          text: "var(--slate-dark-text)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        dropdown: "var(--shadow-dropdown)",
      },
    },
  },
  plugins: [],
};
export default config;
