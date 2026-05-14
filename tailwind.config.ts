import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        imperial: {
          gold: "#F59E0B",
          vermilion: "#E11D48",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "imperial-gold-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 12px rgba(245, 158, 11, 0.45), inset 0 0 0 1px rgba(251, 191, 36, 0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 22px rgba(245, 158, 11, 0.8), 0 0 36px rgba(251, 191, 36, 0.35), inset 0 0 0 1px rgba(254, 243, 199, 0.5)",
          },
        },
        "imperial-vitals-alert": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.72", filter: "brightness(1.25)" },
        },
        "imperial-token-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
          "70%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
        "imperial-dopamine-bleed": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
        "imperial-dopamine-shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "imperial-gold-glow":
          "imperial-gold-glow 2.4s ease-in-out infinite",
        "imperial-vitals-alert":
          "imperial-vitals-alert 1.05s ease-in-out infinite",
        "imperial-token-pop": "imperial-token-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "imperial-dopamine-bleed":
          "imperial-dopamine-bleed 0.35s ease-in-out infinite",
        "imperial-dopamine-shimmer":
          "imperial-dopamine-shimmer 1.35s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
