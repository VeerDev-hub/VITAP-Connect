import { config } from "../config/env.js";

// CSRF guard: reject mutating requests whose Origin/Referer is not an allowed client.
export function originCheck(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin || req.headers.referer || "";
  if (!origin) return next(); // server-to-server or same-origin curl
  const isAllowed = config.clientUrls.some((allowed) => origin.startsWith(allowed));
  if (!isAllowed) return res.status(403).json({ message: "Forbidden: cross-origin request rejected" });
  next();
}
