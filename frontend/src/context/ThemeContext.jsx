import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vitap_connect_theme";
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // index.html already applied the initial class before paint.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  }, [dark]);

  // Crossfade colours for a moment while switching, then drop the class so
  // normal hover transitions stay snappy.
  const value = useMemo(() => ({
    dark,
    toggle: () => {
      const root = document.documentElement;
      root.classList.add("theme-anim");
      setDark((d) => !d);
      setTimeout(() => root.classList.remove("theme-anim"), 450);
    }
  }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
