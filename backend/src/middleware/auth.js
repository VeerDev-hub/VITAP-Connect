import jwt from "jsonwebtoken";
import { readQuery } from "../db.js";
import { sanitizeStudent } from "../utils/normalize.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await readQuery("MATCH (s:Student {id: $id}) RETURN s", { id: payload.id });
    if (!result.records.length) return res.status(401).json({ message: "User not found" });

    req.user = sanitizeStudent(result.records[0].get("s").properties);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
