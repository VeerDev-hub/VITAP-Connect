export function list(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function sanitizeStudent(student = {}) {
  const { passwordHash, ...safe } = student;
  if (safe.avatarUrl && safe.avatarUrl.includes("localhost:5000") && process.env.API_BASE_URL) {
    safe.avatarUrl = safe.avatarUrl.replace(/http:\/\/localhost:5000/g, process.env.API_BASE_URL);
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
