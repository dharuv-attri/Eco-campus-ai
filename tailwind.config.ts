import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#effcf4",
          100: "#d8f7e3",
          200: "#b4edca",
          300: "#81dda8",
          400: "#4bc47f",
          500: "#25a95f",
          600: "#17884b",
          700: "#146c3f",
          800: "#14532d",
          900: "#114527",
          950: "#062714",
        },
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        ink: {
          50: "#f7f8f8",
          100: "#eceeed",
          200: "#d7dcda",
          300: "#b4bebb",
          400: "#8b9995",
          500: "#6b7a76",
          600: "#56625f",
          700: "#46514f",
          800: "#2f3937",
          900: "#1d2624",
          950: "#0d1412",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Inter", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(20, 83, 45, 0.18)",
        card: "0 1px 2px rgba(13, 20, 18, 0.04), 0 12px 32px -16px rgba(13, 20, 18, 0.16)",
        glow: "0 0 0 1px rgba(16, 185, 129, .15), 0 18px 48px -20px rgba(16, 185, 129, .35)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseRing: {
          "0%": { transform: "scale(.85)", opacity: ".8" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .5s ease both",
        "float-slow": "float-slow 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulseRing 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
