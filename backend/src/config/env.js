import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Load backend/.env by default. Set ENV_FILE to load a different file
// (relative to backend/ or absolute). Variables already present in the
// environment — e.g. injected by Docker Compose — always win.
dotenv.config({
  path: process.env.ENV_FILE ? path.resolve(backendRoot, process.env.ENV_FILE) : path.join(backendRoot, ".env")
});

const csv = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const clientUrls = csv(process.env.CLIENT_URL);

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === "production",
  // Number of reverse proxies in front of the app (Render, Nginx…). Needed so
  // rate limiting sees real client IPs instead of the proxy's.
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  clientUrls: clientUrls.length ? clientUrls : ["http://localhost:5173", "http://localhost:5174"],
  collegeEmailDomain: "@vitapstudent.ac.in",
  uploadDir: path.join(backendRoot, "uploads"),

  jwtSecret: process.env.JWT_SECRET,
  chatKeySource: process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || "vitap-connect-chat",

  neo4j: {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
    database: process.env.NEO4J_DATABASE || "neo4j"
  },
  mongoUri: process.env.MONGODB_URI,

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: `mailto:${process.env.EMAIL_USER || "admin@vitapstudent.ac.in"}`
  },

  mail: {
    // SMTP takes priority when SMTP_HOST is set (used by Mailpit in Docker).
    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.MAIL_FROM || `"VITAP Connect" <${process.env.EMAIL_USER || "no-reply@vitapconnect.local"}>`,
    gmailUser: process.env.EMAIL_USER,
    gmailPass: process.env.EMAIL_PASS,
    webhookUrl: process.env.GOOGLE_MAIL_WEBHOOK || "https://script.google.com/macros/s/AKfycbwIIJX0Ssi5MfUHSsSj2KduMEnf8Fl5ZLcc6enaI3SJmYoznXzS7CCB8l0SRcFT9PN74A/exec"
  },

  ice: {
    stunUrls: csv(process.env.STUN_URLS || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
    turnSource: String(process.env.METERED_TURN_API || process.env.TURN_URLS || process.env.TURN_URL || ""),
    turnUsername: process.env.TURN_USERNAME,
    turnCredential: process.env.TURN_CREDENTIAL
  }
};
