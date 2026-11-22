import { useState } from "react";

// Deterministic warm tones for initials avatars (no external avatar service).
const TONES = [
  "bg-[#E9DFCF] text-[#5B4A2E]",
  "bg-[#DCE6DA] text-[#2F5233]",
  "bg-[#F3D9CC] text-[#7A3417]",
  "bg-[#D9E2EC] text-[#2C4560]",
  "bg-[#E8DDE8] text-[#5B3A5B]",
  "bg-[#EDE6C8] text-[#5E5418]"
];

function toneFor(name = "") {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts.at(-1)[0] : "")).toUpperCase() || "?";
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
  "2xl": "h-32 w-32 text-4xl"
};

export default function Avatar({ name, src, size = "md", online, className = "" }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`${SIZES[size]} rounded-md border border-line object-cover`}
        />
      ) : (
        <span className={`${SIZES[size]} ${toneFor(name)} inline-flex items-center justify-center rounded-md font-display font-semibold`} aria-label={name}>
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${online ? "bg-ok" : "bg-line-strong"}`}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
