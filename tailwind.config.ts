import type { Config } from "tailwindcss";

// Animation keyframes for 3D mannequin

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
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-soft': 'var(--gradient-soft)',
      },
      boxShadow: {
        'clean': 'var(--shadow-clean)',
        'medium': 'var(--shadow-medium)',
        'hover': 'var(--shadow-hover)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "slide-left": {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        // 3D Mannequin animations
        "dress-on": {
          "0%": { opacity: "0", transform: "translateY(-50px) scale(0.8) rotateX(20deg)" },
          "50%": { opacity: "1", transform: "translateY(10px) scale(1.05) rotateX(-5deg)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1) rotateX(0)" }
        },
        "dress-off": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "50%": { opacity: "0.5", transform: "translateY(-20px) scale(0.95) rotateX(10deg)" },
          "100%": { opacity: "0", transform: "translateY(-60px) scale(0.8) rotateX(30deg)" }
        },
        "mannequin-idle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" }
        },
        "mannequin-float": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-6px) scale(1.005)" }
        },
        "float-accessory": {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px 5px rgba(168, 85, 247, 0.2)" },
          "50%": { boxShadow: "0 0 40px 10px rgba(168, 85, 247, 0.4)" }
        },
        "add-glow": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)", filter: "brightness(1)" },
          "30%": { boxShadow: "0 0 30px 15px hsl(var(--primary) / 0.6)", filter: "brightness(1.2)" },
          "60%": { boxShadow: "0 0 50px 25px hsl(var(--primary) / 0.4)", filter: "brightness(1.1)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)", filter: "brightness(1)" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.4s ease-out both",
        "slide-down": "slide-down 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-left": "slide-left 0.4s ease-out",
        "slide-right": "slide-right 0.4s ease-out",
        // 3D Mannequin animations
        "dress-on": "dress-on 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "dress-off": "dress-off 0.4s ease-out forwards",
        "mannequin-idle": "mannequin-idle 4s ease-in-out infinite",
        "mannequin-float": "mannequin-float 3s ease-in-out infinite",
        "float-accessory": "float-accessory 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "add-glow": "add-glow 0.8s ease-out forwards",
      },
      transitionProperty: {
        'smooth': 'var(--transition-smooth)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
