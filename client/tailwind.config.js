/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Warm neutrals + a single amber accent. Deliberately not slate-on-blue.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      bg: {
        DEFAULT: "#1c1917", // stone-900 — page background
        deep: "#0c0a09", // stone-950 — emphasis bg (header bottom edge)
        soft: "#292524", // stone-800 — surface
        sub: "#1f1d1b", // between bg and soft, for nested panes
      },
      ink: {
        DEFAULT: "#e7e5e4", // stone-200 — primary text
        muted: "#a8a29e", // stone-400 — secondary text
        dim: "#78716c", // stone-500 — labels / hints
        faint: "#57534e", // stone-600 — captions
      },
      rule: "#3f3a37", // stone-700ish — borders, dividers
      ruleSoft: "#2a2522", // very subtle dividers
      accent: {
        DEFAULT: "#f97316", // orange-500
        strong: "#ea580c", // orange-600
        soft: "#fb923c", // orange-400
        glow: "rgba(249, 115, 22, 0.15)",
      },
      good: "#84cc16", // lime — used very sparingly for success states
      bad: "#f87171", // red-400 — errors
    },
    fontFamily: {
      serif: [
        '"IBM Plex Serif"',
        '"Source Serif Pro"',
        "Georgia",
        "serif",
      ],
      sans: [
        '"IBM Plex Sans"',
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "sans-serif",
      ],
      mono: [
        '"IBM Plex Mono"',
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "monospace",
      ],
    },
    extend: {
      letterSpacing: {
        wider2: "0.12em",
      },
      keyframes: {
        caret: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        caret: "caret 1.05s step-end infinite",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
