import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ withLabel = false }) {
  const { dark, toggle } = useTheme();
  const Icon = dark ? Sun : Moon;
  const label = dark ? "Light mode" : "Dark mode";
  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={dark ? "sun" : "moon"} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={{ duration: 0.25 }} className="inline-flex">
        <Icon size={withLabel ? 16 : 18} />
      </motion.span>
    </AnimatePresence>
  );
  if (withLabel) {
    return <button type="button" onClick={toggle} className="btn btn-ghost btn-sm w-full justify-start">{icon} {label}</button>;
  }
  return <button type="button" onClick={toggle} className="icon-btn" aria-label={label} title={label}>{icon}</button>;
}
