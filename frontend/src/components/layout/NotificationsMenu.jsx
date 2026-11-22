import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff } from "lucide-react";
import { timeAgo } from "../../lib/format";

export default function NotificationsMenu({ feed, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function toggle() {
    setOpen((v) => !v);
    feed.markSeen();
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={toggle} className="icon-btn relative" aria-label="Notifications">
        <motion.span key={feed.unseen} animate={feed.unseen ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }} className="inline-flex">
          <Bell size={18} />
        </motion.span>
        {feed.unseen > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-pop" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pop ring-2 ring-surface" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={`absolute z-50 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-surface shadow-float ${align === "right" ? "right-0" : "left-0"}`}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <p className="font-display text-sm font-semibold">Notifications</p>
              {feed.notifications.length > 0 && (
                <button type="button" onClick={feed.clearAll} className="text-xs font-bold text-ink-3 hover:text-bad">Clear all</button>
              )}
            </div>
            <div className="scrollbar-thin max-h-96 overflow-y-auto px-2 pb-2">
              {feed.notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-3">
                  <BellOff size={22} /> You&apos;re all caught up.
                </div>
              ) : (
                feed.notifications.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-3 rounded-2xl px-3 py-3 hover:bg-sunken"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.message}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{timeAgo(n.createdAt)} ago</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
