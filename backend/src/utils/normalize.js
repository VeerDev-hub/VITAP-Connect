import dotenv from "dotenv";
dotenv.config();

export function list(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function sanitizeStudent(student = {}) {
  const { passwordHash, ...safe } = student;
  
  if (safe.avatarUrl) {
    // Aggressively repair legacy hardcoded URLs (extract filename if /uploads/ is present)
    if (safe.avatarUrl.includes("/uploads/")) {
      safe.avatarUrl = safe.avatarUrl.split("/uploads/").pop();
    }

    // If it's just a filename (no http/https), prepend the base URL
    if (!safe.avatarUrl.startsWith("http")) {
      const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      safe.avatarUrl = `${cleanBase}/uploads/${safe.avatarUrl}`;
    }
  }
  // Extract Registration Number from email (e.g. name.23BCE7453@vitapstudent.ac.in)
  if (safe.email && safe.role !== "admin") {
    const handle = safe.email.split("@")[0];
    const parts = handle.split(".");
    if (parts.length > 1) {
      safe.regNumber = parts[1].toUpperCase();
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
