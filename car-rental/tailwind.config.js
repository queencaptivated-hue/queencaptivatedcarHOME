/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0B0D",
        charcoal: "#17171A",
        panel: "#1E1E22",
        hairline: "#2C2C31",
        gold: {
          DEFAULT: "#D4AF6A",
          soft: "#E8CE9A",
          deep: "#B8863F",
        },
        ivory: "#F3EEE4",
        muted: "#9A968C",
        garnet: "#6E1F2B",
        sage: "#5C7A63",
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
    },
  },
  plugins: [],
};
