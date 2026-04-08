import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { closeDriver, initSchema, runQuery } from "../src/db.js";

dotenv.config();

const admin = {
  id: randomUUID(),
  name: process.env.ADMIN_NAME || "VITAP Admin",
  email: (process.env.ADMIN_EMAIL || "admin@vitapconnect.local").toLowerCase(),
  passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@12345", 12),
  department: "Administration",
  year: 0,
  role: "admin",
  status: "active",
  emailVerified: true,
  verifiedAt: new Date().toISOString(),
  bio: "VITAP Connect moderation account",
  createdAt: new Date().toISOString()
};

try {
  await initSchema();
  await runQuery(`
    MERGE (s:Student {email: $email})
    ON CREATE SET s = $admin
    ON MATCH SET s.role = "admin", s.status = "active", s.emailVerified = true, s.verifiedAt = $admin.verifiedAt, s.name = $admin.name, s.passwordHash = $admin.passwordHash
    WITH s
    MERGE (department:Department {name: "Administration"})
    MERGE (s)-[:BELONGS_TO]->(department)
  `, { email: admin.email, admin });
  console.log(`Admin ready: ${admin.email}`);
} finally {
  await closeDriver();
}



