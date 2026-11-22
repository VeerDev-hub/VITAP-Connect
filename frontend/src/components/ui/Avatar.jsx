import { useState } from "react";

// Deterministic bright tones for initials avatars (no external avatar service).
const TONES = [
  "bg-[#FFD166] text-[#4a3500]",
  "bg-[#7BDFF2] text-[#06343d]",
  "bg-[#F4A6C6] text-[#4b0f29]",
  "bg-[#B8F2A0] text-[#123b05]",
  "bg-[#C3B8FF] text-[#22105c]",
  "bg-[#FFB38A] text-[#4d1d00]"
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
          className={`${SIZES[size]} rounded-full object-cover ring-1 ring-line`}
        />
      ) : (
        <span className={`${SIZES[size]} ${toneFor(name)} inline-flex items-center justify-center rounded-full font-body font-extrabold`} aria-label={name}>
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5" title={online ? "Online" : "Offline"}>
          {online && <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-ok/60" />}
          <span className={`relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-surface ${online ? "bg-ok" : "bg-line-strong"}`} />
        </span>
      )}
    </span>
  );
}
