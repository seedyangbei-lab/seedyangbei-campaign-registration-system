import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Noto Sans TC", "sans-serif"] },
      colors: {
        primary: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa",
          400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
        },
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        stepPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        fadeSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 18s linear infinite",
        stepPulse: "stepPulse 1.8s ease-in-out infinite",
        fadeSlideDown: "fadeSlideDown 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
