import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} {...props} type={visible ? "text" : "password"} className="input pr-11" />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn h-8 w-8"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

export default PasswordInput;

export function PasswordStrength({ password = "" }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length < 8) score = 0;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-line-strong", "bg-bad", "bg-warn", "bg-ok", "bg-ok"];

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="grid flex-1 grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 rounded-full ${i <= score ? colors[score] : "bg-sunken"}`} />
        ))}
      </div>
      <span className="w-16 text-right font-mono text-[11px] text-ink-3">{labels[score]}</span>
    </div>
  );
}
