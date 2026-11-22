import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { readQuery } from "../db/neo4j.js";
import { sanitizeStudent } from "../utils/normalize.js";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, jwtVersion: user.jwtVersion }, config.jwtSecret, { expiresIn: "24h" });
}

export const AUTH_COOKIE = "jwt";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" };

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = jwt.verify(token, config.jwtSecret);
    const result = await readQuery("MATCH (s:Student {id: $id}) RETURN s", { id: payload.id });
    const student = result.records[0].get("s").properties;

    if (student.jwtVersion && payload.jwtVersion && student.jwtVersion !== payload.jwtVersion) {
      return res.status(401).json({ message: "Session expired. You logged in on another device." });
    }

    req.user = sanitizeStudent(student);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
