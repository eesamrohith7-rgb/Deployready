import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ----- Terminal Prime tokens -----
        background: "#0a0a0a",
        "on-background": "#e5e2e1",
        surface: "#111111",
        "surface-dim": "#0a0a0a",
        "surface-bright": "#3a3939",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#ddc1b1",
        outline: "#a58c7d",
        "outline-variant": "#564336",
        primary: "#ffb787",
        "on-primary": "#502400",
        "primary-container": "#f38020",
        "on-primary-container": "#1a0d00",
        secondary: "#c6c6c7",
        "on-secondary": "#2f3131",
        "secondary-container": "#454747",
        tertiary: "#c8c6c6",
        "tertiary-container": "#a09f9f",
        error: "#ffb4ab",
        "error-container": "#93000a",
        success: "#4ade80",
        warning: "#fbbf24",
        // legacy aliases used by older components (kept harmless)
        bg: "#0a0a0a",
        panel: "#111111",
        border: "#1f1f1f",
        accent: "#f38020",
        muted: "#a58c7d",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
      },
      spacing: {
        gutter: "16px",
        "container-max": "1440px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
      },
      maxWidth: {
        "container-max": "1440px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "headline-xl": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "code-lg": ["16px", { lineHeight: "1.5", fontWeight: "500" }],
        "code-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "700" }],
      },
      keyframes: {
        blink: { "50%": { opacity: "0" } },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
