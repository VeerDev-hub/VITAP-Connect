import { motion } from "motion/react";
import { LogoMark } from "./ui";

// Students and skills circling "you" on three rings. Pure CSS rotation (cheap),
// with each chip counter-rotating so its text stays upright.
const RINGS = [
  { r: 0.22, dur: 38, dir: 1, items: [["skill", "React"], ["person", "PR"], ["skill", "Neo4j"]] },
  { r: 0.35, dur: 56, dir: -1, items: [["person", "AK"], ["skill", "Figma"], ["person", "SN"], ["skill", "Python"], ["match", "92% match"]] },
  { r: 0.47, dur: 80, dir: 1, items: [["skill", "Flutter"], ["person", "RV"], ["skill", "ML"], ["person", "DM"], ["skill", "Node.js"], ["skill", "UI/UX"]] }
];
const TONES = ["bg-[#FFD166] text-[#4a3500]", "bg-[#7BDFF2] text-[#06343d]", "bg-[#F4A6C6] text-[#4b0f29]", "bg-[#B8F2A0] text-[#123b05]"];

function Chip({ kind, label, i }) {
  if (kind === "person") {
    return <span className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-extrabold shadow-lg ring-4 ring-bg ${TONES[i % TONES.length]}`}>{label}</span>;
  }
  if (kind === "match") {
    return <span className="whitespace-nowrap rounded-full bg-pop px-3 py-1.5 text-xs font-extrabold text-pop-ink shadow-[0_0_30px_-4px_rgb(var(--pop))]">{label}</span>;
  }
  return <span className="whitespace-nowrap rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-bold text-ink-2 shadow-sm backdrop-blur">{label}</span>;
}

export default function Orbit({ size = 520, className = "" }) {
  return (
    <div className={`relative aspect-square ${className}`} style={{ width: "100%", maxWidth: size }} aria-hidden="true">
      <div className="absolute inset-[18%] rounded-full bg-accent/25 blur-3xl" />
      {RINGS.map((ring, ri) => {
        const d = `${ring.r * 200}%`;
        const style = { width: d, height: d, left: `${50 - ring.r * 100}%`, top: `${50 - ring.r * 100}%` };
        const spin = { animation: `spin-slow ${ring.dur}s linear infinite${ring.dir < 0 ? " reverse" : ""}` };
        const counter = { animation: `spin-slow ${ring.dur}s linear infinite${ring.dir < 0 ? "" : " reverse"}` };
        return (
          <motion.div
            key={ri}
            className="absolute"
            style={style}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15 * ri, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-ink/15" />
            <div className="absolute inset-0" style={spin}>
              {ring.items.map(([kind, label], i) => {
                const a = (360 / ring.items.length) * i + ri * 23;
                return (
                  <div key={label} className="absolute" style={{ left: `${50 + 50 * Math.cos((a * Math.PI) / 180)}%`, top: `${50 + 50 * Math.sin((a * Math.PI) / 180)}%` }}>
                    <div className="-translate-x-1/2 -translate-y-1/2" style={counter}>
                      <Chip kind={kind} label={label} i={i + ri} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.3 }}
      >
        <span className="absolute inset-0 animate-ping2 rounded-[22px] bg-accent/40" />
        <LogoMark className="relative h-20 w-20 drop-shadow-[0_20px_40px_rgb(var(--accent)/0.5)]" />
      </motion.div>
    </div>
  );
}
