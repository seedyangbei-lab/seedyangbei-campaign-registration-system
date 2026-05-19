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
    },
  },
  plugins: [],
};
export default config;
