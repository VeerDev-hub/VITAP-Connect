import { config } from "../config/env.js";

export function list(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function sanitizeStudent(student = {}) {
  const { passwordHash, ...safe } = student;

  if (safe.avatarUrl) {
    // Repair legacy hardcoded URLs (extract filename if /uploads/ is present)
    if (safe.avatarUrl.includes("/uploads/")) {
      safe.avatarUrl = safe.avatarUrl.split("/uploads/").pop();
    }

    // If it's just a filename (no http/https), prepend the base URL
    if (!safe.avatarUrl.startsWith("http")) {
      const cleanBase = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl;
      safe.avatarUrl = `${cleanBase}/uploads/${safe.avatarUrl}`;
    }
  }
  // Extract Registration Number from email (e.g. name.23BCE7453@vitapstudent.ac.in).
  // Only accept the real format (2 digits, 3 letters, 4-5 digits) so plain
  // "first.last@" addresses don't produce a bogus number.
  if (safe.email && safe.role !== "admin") {
    const candidate = safe.email.split("@")[0].split(".")[1] || "";
    if (/^\d{2}[a-z]{3}\d{4,5}$/i.test(candidate)) {
      safe.regNumber = candidate.toUpperCase();
    }
  }
  return safe;
}

export function node(record, key) {
  return record.get(key).properties;
}

export function integer(value) {
  if (value?.toNumber) return value.toNumber();
  return Number(value || 0);
}
