import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          900: "#0b3d1f",
          700: "#13662f",
          500: "#1f9e4a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
