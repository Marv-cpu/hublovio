// postcss.config.mjs
const config = {
  plugins: {
    tailwindcss: {}, // Use the v3 plugin name, NOT @tailwindcss/postcss
    autoprefixer: {},
  },
};

export default config;