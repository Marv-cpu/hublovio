import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AuraConnect Luxury Palette
        aura: {
          black: "#0D0B14",     // Deep midnight background
          purple: {
            light: "#E9D5FF",  // Lavender accent
            main: "#7C3AED",   // Vivid Royal Purple
            dark: "#4C1D95",   // Deep Plum
          },
          gold: "#F59E0B",     // For "Elite/Premium" badges
          silver: "#94A3B8",   // For "Plus" badges
        },
      },
      backgroundImage: {
        'aura-gradient': "linear-gradient(to bottom right, #4C1D95, #7C3AED, #0D0B14)",
        'luxury-mesh': "url('/mesh-gradient.png')", // You can add a subtle mesh later
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }
    },
  },
  plugins: [],
};
export default config;