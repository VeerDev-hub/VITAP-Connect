// Small motion kit used across the app. Everything respects "reduce motion"
// through <MotionConfig reducedMotion="user"> in main.jsx.
import { Children, useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";

export const ease = [0.22, 1, 0.36, 1];
export const spring = { type: "spring", stiffness: 380, damping: 30 };

// Fade + rise into place the first time it scrolls into view.
export function Reveal({ as = "div", delay = 0, y = 24, className, children, ...rest }) {
  const Comp = motion[as];
  return (
    <Comp
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease, delay }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}

// Children animate in one after another.
export function Stagger({ as = "div", className, children, delay = 0, gap = 0.06, inView = false }) {
  const Comp = motion[as];
  const trigger = inView ? { whileInView: "show", viewport: { once: true, margin: "-40px" } } : { animate: "show" };
  return (
    <Comp className={className} initial="hidden" {...trigger} variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}>
      {Children.map(children, (child) => child && (
        <motion.div variants={{ hidden: { opacity: 0, y: 18, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } } }}>
          {child}
        </motion.div>
      ))}
    </Comp>
  );
}

// Headline whose words slide up from a mask, one by one.
export function SplitText({ text, className = "", delay = 0, wordClass = {} }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => [
        i > 0 && " ",
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden="true">
          <motion.span
            className={`inline-block ${wordClass[w] || ""}`}
            initial={{ y: "110%", rotate: 4 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ duration: 0.8, ease, delay: delay + i * 0.07 }}
          >
            {w}
          </motion.span>
        </span>
      ])}
    </span>
  );
}

// Animated number that counts up when it first appears.
export function CountUp({ value, duration = 1.1, className, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  const target = Number(value) || 0;
  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, target, { duration, ease, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, target, duration]);
  return <span ref={ref} className={className}>{shown}{suffix}</span>;
}

// Element that leans toward the cursor (buttons, logo marks).
export function Magnetic({ children, strength = 0.25, className }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 }), sy = useSpring(y, { stiffness: 250, damping: 18 });
  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  }
  return (
    <motion.span className={`inline-block ${className || ""}`} style={{ x: sx, y: sy }} onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

// Card with a soft light that follows the cursor and a slight 3D tilt.
export function SpotlightCard({ className = "", children, tilt = 4, ...rest }) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [tilt, -tilt]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-tilt, tilt]), { stiffness: 200, damping: 20 });
  const bg = useTransform([mx, my], ([x, y]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgb(var(--accent) / 0.12), transparent 60%)`);
  function move(e) {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`group relative overflow-hidden ${className}`}
      {...rest}
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// Endless horizontal ticker.
export function Marquee({ items, reverse = false, className = "" }) {
  const row = [...items, ...items];
  return (
    <div className={`mask-fade-x overflow-hidden ${className}`}>
      <div className={`flex w-max gap-3 ${reverse ? "animate-marquee-rev" : "animate-marquee"} hover:[animation-play-state:paused]`}>
        {row.map((item, i) => <span key={i}>{item}</span>)}
      </div>
    </div>
  );
}

// Route-level enter animation.
export function PageTransition({ children, id }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
    >
      {children}
    </motion.div>
  );
}
