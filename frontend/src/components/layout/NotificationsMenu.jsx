import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { timeAgo } from "../../lib/format";

export default function NotificationsMenu({ feed, align = "right", withLabel = false }) {
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
      {withLabel ? (
        <button type="button" onClick={toggle} className="btn btn-ghost btn-sm w-full justify-start">
          <span className="relative">
            <Bell size={16} />
            {feed.unseen > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />}
          </span>
          Notifications
          {feed.unseen > 0 && <span className="ml-auto font-mono text-[11px] text-accent">{feed.unseen}</span>}
        </button>
      ) : (
        <button type="button" onClick={toggle} className="icon-btn relative" aria-label="Notifications">
          <Bell size={18} />
          {feed.unseen > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />}
        </button>
      )}

      {open && (
        <div
          className={`absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-fade-up overflow-hidden rounded-lg border border-line bg-surface shadow-pop ${
            align === "right" ? "right-0" : "left-0 bottom-full mb-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {feed.notifications.length > 0 && (
              <button type="button" onClick={feed.clearAll} className="text-xs font-semibold text-ink-3 hover:text-bad">
                Clear all
              </button>
            )}
          </div>
          <div className="scrollbar-thin max-h-80 overflow-y-auto">
            {feed.notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink-3">You&apos;re all caught up.</p>
            ) : (
              feed.notifications.map((n) => (
                <div key={n.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{n.message}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-3">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
