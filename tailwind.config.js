/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f6f9f6",
          100: "#e7efe9",
          200: "#cfe0d4",
          300: "#a9c5b1",
          400: "#7ea68b",
          500: "#5c8a6b",
          600: "#466f54",
          700: "#385a46",
          800: "#2f4a3b",
          900: "#263d31"
        },
        soil: {
          50: "#faf7f2",
          100: "#f1e8dc",
          200: "#e4d2b8",
          300: "#d3b48c",
          400: "#c39a69",
          500: "#b07f4c",
          600: "#8e653b",
          700: "#734f31",
          800: "#5f422b",
          900: "#4f3725"
        },
        coral: {
          50: "#fff5f2",
          100: "#ffe3da",
          200: "#ffcab6",
          300: "#ffac8a",
          400: "#ff8758",
          500: "#ff6a3a",
          600: "#ee4f1c",
          700: "#c73d12",
          800: "#a23210",
          900: "#842c0f"
        }
      },
      fontFamily: {
        display: ["Outfit", "DM Sans", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 12px 30px -20px rgba(24, 48, 32, 0.35)",
        lift: "0 20px 45px -25px rgba(24, 48, 32, 0.45)"
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(90, 120, 95, 0.15) 1px, transparent 0)"
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 106, 58, 0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 106, 58, 0)" }
        }
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
}
