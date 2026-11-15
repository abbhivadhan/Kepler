/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#000000",
          900: "#05050a",
          850: "#0b0c12",
          800: "#12141c",
          700: "#1e2230",
          600: "#2d3345",
        },
        lunar: {
          cyan: "#00f0ff",
          amber: "#fbbf24",
          green: "#10b981",
          red: "#f43f5e",
          violet: "#a855f7",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 15px rgba(0, 240, 255, 0.25), 0 0 30px rgba(0, 240, 255, 0.1)",
        "neon-amber": "0 0 15px rgba(251, 191, 36, 0.25), 0 0 30px rgba(251, 191, 36, 0.1)",
        "neon-emerald": "0 0 15px rgba(16, 185, 129, 0.25), 0 0 30px rgba(16, 185, 129, 0.1)",
      },
    },
  },
  plugins: [],
}
