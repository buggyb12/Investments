import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F1EA",
        ink: "#1A1815",
        muted: "#8B857A",
        accent: "#9C3D2E",
        secondary: "#3C5A3E",
        line: "rgba(26, 24, 21, 0.12)",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        body: ['"Inter Tight"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
} satisfies Config;
