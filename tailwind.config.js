/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,js,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nordic: {
          bgLight: "#f2f5f3",
          bgDark: "#0d1413",
          cardLight: "#ffffff",
          cardDark: "#131f1c",
          borderLight: "#d8e2dc",
          borderDark: "#20332d",
          textLight: "#15221d",
          textDark: "#e3ebe6",
          mutedLight: "#52635c",
          mutedDark: "#7e978d",
          accentLight: "#2d6a4f",
          accentDark: "#52b788",
        }
      },
      fontFamily: {
        serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', "monospace"],
      }
    },
  },
  plugins: [],
};
