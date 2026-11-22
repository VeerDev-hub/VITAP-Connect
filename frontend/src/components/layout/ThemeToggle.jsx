import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ withLabel = false }) {
  const { dark, toggle } = useTheme();
  const Icon = dark ? Sun : Moon;
  const label = dark ? "Light mode" : "Dark mode";

  if (withLabel) {
    return (
      <button type="button" onClick={toggle} className="btn btn-ghost btn-sm w-full justify-start">
        <Icon size={16} /> {label}
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} className="icon-btn" aria-label={label} title={label}>
      <Icon size={18} />
    </button>
  );
}
