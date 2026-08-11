import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fbf8f1",
          100: "#f5edd9",
          200: "#ebdab3",
          300: "#dfc186",
          400: "#d3a95c",
          500: "#c4933f",
          600: "#a87731",
          700: "#875e29",
          800: "#6f4d27",
          900: "#5d4123",
        },
        sand: {
          50: "#faf8f4",
          100: "#f3ede1",
          200: "#e8ddc7",
          300: "#dac8a4",
          400: "#c9ae7d",
        },
        anthracite: {
          50: "#f4f5f6",
          100: "#e4e6e8",
          200: "#c7cbd0",
          300: "#9ea5ad",
          400: "#6f7882",
          500: "#4f5761",
          600: "#3a4048",
          700: "#2b3037",
          800: "#1f2227",
          900: "#16181c",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(22, 24, 28, 0.08)",
        card: "0 2px 8px -2px rgba(22, 24, 28, 0.06), 0 12px 32px -12px rgba(22, 24, 28, 0.10)",
        "card-hover": "0 8px 16px -4px rgba(22, 24, 28, 0.10), 0 24px 48px -16px rgba(22, 24, 28, 0.16)",
        glow: "0 0 0 1px rgba(196, 147, 63, 0.15), 0 8px 24px -8px rgba(196, 147, 63, 0.35)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
      },
      backgroundImage: {
        "gold-radial":
          "radial-gradient(120% 120% at 50% -10%, rgba(196,147,63,0.16) 0%, rgba(196,147,63,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
