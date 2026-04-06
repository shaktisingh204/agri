import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        mist: "#eef2e3",
        earth: "#4d7c0f",
        gold: "#eab308",
        ember: "#ea580c"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 20px 45px -25px rgba(31, 41, 55, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;

