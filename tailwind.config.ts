import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        bronze: {
          DEFAULT: "hsl(var(--bronze))",
          light: "hsl(var(--bronze-light))",
          dark: "hsl(var(--bronze-dark))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        vollkorn: ['Vollkorn', 'serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.97)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(178, 93, 41, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(178, 93, 41, 0.4)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "blur-in": {
          "0%": { opacity: "0", filter: "blur(8px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        "content-show": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "content-hide": {
          "0%": { opacity: "1", transform: "scale(1) translateY(0)" },
          "100%": { opacity: "0", transform: "scale(0.96) translateY(4px)" },
        },
        // Testimonial marquee — translates exactly one full set (-50% of doubled content)
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Kira empty-state aura — slow diffuse orange glow that breathes organically
        "aura-breathe": {
          "0%, 100%": { transform: "scale(1) translate(0%, 0%)",      opacity: "0.48" },
          "33%":       { transform: "scale(1.20) translate(2%, -4%)", opacity: "0.62" },
          "66%":       { transform: "scale(0.90) translate(-3%, 3%)", opacity: "0.36" },
        },
        "aura-breathe-alt": {
          "0%, 100%": { transform: "scale(1) translate(0%, 0%)",       opacity: "0.40" },
          "33%":       { transform: "scale(0.86) translate(-4%, 3%)",  opacity: "0.55" },
          "66%":       { transform: "scale(1.16) translate(4%, -3%)",  opacity: "0.44" },
        },
        // Kira empty-state text — soft fade-rise entrance
        "kira-greeting": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "accordion-up": "accordion-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.5s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in-down": "fade-in-down 0.5s cubic-bezier(0.32, 0.72, 0, 1)",
        "scale-in": "scale-in 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-up": "slide-up 0.5s cubic-bezier(0.32, 0.72, 0, 1)",
        "glow": "glow 3s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "breathe": "breathe 4s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "blur-in": "blur-in 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        "content-show": "content-show 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "content-hide": "content-hide 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
        // Slow, luxurious scroll — 48s feels deliberate, not frantic
        "marquee": "marquee 48s linear infinite",
        // Kira empty-state
        "aura-breathe":     "aura-breathe 7s ease-in-out infinite",
        "aura-breathe-alt": "aura-breathe-alt 8s ease-in-out infinite",
        "kira-greeting":    "kira-greeting 0.7s cubic-bezier(0.32, 0.72, 0, 1) both",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    // standalone: variant — activates when the app is running as an installed PWA
    // (iOS "Add to Home Screen" / Android TWA). Targets @media (display-mode: standalone).
    // Usage: standalone:block, standalone:hidden, standalone:pt-safe, etc.
    ({ addVariant }: { addVariant: (name: string, definition: string) => void }) => {
      addVariant("standalone", "@media (display-mode: standalone)");
    },
  ],
} satisfies Config;
