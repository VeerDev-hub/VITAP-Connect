import { motion } from "motion/react";
import Orbit from "../Orbit";
import { Logo } from "../ui";
import ThemeToggle from "./ThemeToggle";

// Split layout for login / register / password flows. The visual side is
// always dark (it sets the .dark tokens on itself), whatever the app theme.
export default function AuthLayout({ aside, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="dark relative hidden overflow-hidden bg-bg text-ink lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="dot-grid mask-fade-b absolute inset-0 opacity-60" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-pop/10 blur-3xl" />
        <div className="relative"><Logo /></div>
        <div className="relative flex justify-center py-6"><Orbit size={440} /></div>
        <motion.div
          className="relative max-w-md [&_h2]:text-[1.9rem] [&_h2]:leading-[1.15]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          {aside}
        </motion.div>
      </aside>

      <div className="relative flex flex-col">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex h-20 items-center justify-between px-5 sm:px-10">
          <span className="lg:invisible"><Logo /></span>
          <ThemeToggle />
        </div>
        <div className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-2 sm:px-8 lg:items-center">
          <motion.div
            className="w-full max-w-md rounded-[2rem] border border-line bg-surface p-6 shadow-float sm:p-9"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
