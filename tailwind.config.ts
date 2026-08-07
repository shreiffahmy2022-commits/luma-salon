import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#6d4aff", soft: "#efeaff", dark: "#171233" } },
      boxShadow: { card: "0 1px 2px rgba(28,24,48,.05),0 8px 24px -12px rgba(28,24,48,.12)" }
    }
  },
  plugins: []
};
export default config;
