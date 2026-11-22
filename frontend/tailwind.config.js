const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        sunken: token("sunken"),
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3") },
        line: { DEFAULT: token("line"), strong: token("line-strong") },
        accent: { DEFAULT: token("accent"), ink: token("accent-ink"), soft: token("accent-soft") },
        pop: { DEFAULT: token("pop"), ink: token("pop-ink") },
        ok: { DEFAULT: token("ok"), soft: token("ok-soft") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft") },
        bad: { DEFAULT: token("bad"), soft: token("bad-soft") }
      },
      fontFamily: {
        display: ['"Unbounded Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Manrope Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px"
      },
      boxShadow: {
        float: "0 20px 50px -20px rgb(var(--ink) / 0.35), 0 0 0 1px rgb(var(--line))",
        glow: "0 18px 40px -18px rgb(var(--glow) / 0.55)"
      },
      keyframes: {
        "fade-up": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        ping2: { "0%": { transform: "scale(1)", opacity: 0.6 }, "100%": { transform: "scale(2.4)", opacity: 0 } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } }
      },
      animation: {
        "fade-up": "fade-up 420ms cubic-bezier(.2,.8,.2,1) both",
        marquee: "marquee 38s linear infinite",
        "marquee-rev": "marquee 44s linear infinite reverse",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 60s linear infinite",
        ping2: "ping2 2.4s cubic-bezier(0,0,.2,1) infinite",
        shimmer: "shimmer 2.2s linear infinite"
      }
    }
  },
  plugins: []
};
