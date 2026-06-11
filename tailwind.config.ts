import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f", // texto principal (casi negro Apple)
        subtle: "#6e6e73", // texto secundario
        accent: "#0071e3", // azul Apple
        canvas: "#f5f5f7", // fondo
        hair: "rgba(0,0,0,0.08)", // bordes finos
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        float: "0 8px 30px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
