import { useRef } from "react";

// Six separate boxes that behave as one field (paste-friendly).
export default function OtpInput({ value = "", onChange, autoFocus = false }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(index, char) {
    const next = digits.map((d, i) => (i === index ? char : d)).join("").replace(/\s+$/, "");
    onChange(next.replace(/\s/g, ""));
  }

  function handleChange(index, e) {
    const input = e.target.value.replace(/\D/g, "");
    if (!input) return;
    if (input.length > 1) {
      // Paste or autofill: spread digits across boxes.
      const merged = (value.slice(0, index) + input).slice(0, 6);
      onChange(merged);
      refs.current[Math.min(merged.length, 5)]?.focus();
      return;
    }
    setAt(index, input);
    refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index].trim()) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight") {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label="6-digit verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digit.trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-full rounded-md border border-line-strong bg-surface text-center font-mono text-2xl font-medium text-ink outline-none focus:border-ink"
        />
      ))}
    </div>
  );
}
