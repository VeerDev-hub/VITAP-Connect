import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "node:http";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dns from "node:dns";
import { Server as SocketServer } from "socket.io";
import rateLimit from "express-rate-limit";
import webPush from "web-push";
import cookieParser from "cookie-parser";
import { initSchema, readQuery, runQuery } from "./db.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { integer, list, sanitizeStudent } from "./utils/normalize.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:5173", "http://localhost:5174"];
const io = new SocketServer(server, { cors: { origin: allowedOrigins, credentials: true } });

const projectMessageSchema = new mongoose.Schema({
  projectId: { type: String, index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  deliveredTo: { type: [String], default: [] },
  readBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});
const directMessageSchema = new mongoose.Schema({
  conversationId: { type: String, index: true, required: true },
  participants: { type: [String], index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  recipientId: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  deliveredTo: { type: [String], default: [] },
  readBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});
const callLogSchema = new mongoose.Schema({
  roomId: { type: String, index: true, required: true },
  callerId: { type: String, required: true },
  callerName: { type: String, required: true },
  calleeId: { type: String, required: true },
  calleeName: { type: String, default: "Student" },
  callType: { type: String, enum: ["voice", "video"], default: "video" },
  title: { type: String, default: "Private call" },
  status: { type: String, default: "ringing" },
  startedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 }
});
const groupChatSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true, required: true },
  name: { type: String, required: true },
  creatorId: { type: String, required: true },
  members: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});
const groupMessageSchema = new mongoose.Schema({
  groupId: { type: String, index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const feedbackSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  subscription: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.models.ProjectMessage || mongoose.model("ProjectMessage", projectMessageSchema);
const DirectMessage = mongoose.models.DirectMessage || mongoose.model("DirectMessage", directMessageSchema);
const CallLog = mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
const GroupChat = mongoose.models.GroupChat || mongoose.model("GroupChat", groupChatSchema);
const GroupMessage = mongoose.models.GroupMessage || mongoose.model("GroupMessage", groupMessageSchema);
const PushSubscription = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
if (process.env.MONGODB_URI?.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}
const mongoReady = process.env.MONGODB_URI ? mongoose.connect(process.env.MONGODB_URI).then(() => true).catch((error) => { console.warn("MongoDB chat disabled:", error.message); return false; }) : Promise.resolve(false);
const onlineUsers = new Map();
const callRooms = new Map();
const pendingCallInvites = new Map();
const chatKeySource = process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || "vitap-connect-chat";
const chatEncryptionKey = createHash("sha256").update(chatKeySource).digest();

// ── VAPID Setup for Web Push ─────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    `mailto:${process.env.EMAIL_USER || 'admin@vitapstudent.ac.in'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true, legacyHeaders: false
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please wait 15 minutes." },
  standardHeaders: true, legacyHeaders: false
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true, legacyHeaders: false
});
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Sending messages too fast. Please slow down." },
  standardHeaders: true, legacyHeaders: false
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Smart Serving for both legacy (extensionless) and new avatars
app.use("/uploads", cors({ origin: allowedOrigins, credentials: true }), express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    // If the file has no extension, or is a common image type, force the header
    const ext = path.extname(filePath).toLowerCase();
    if (!ext || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
      res.setHeader("Content-Type", ext === ".png" ? "image/png" : 
                    ext === ".svg" ? "image/svg+xml" : 
                    ext === ".webp" ? "image/webp" : "image/jpeg");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  }
}));

app.get("/auth/debug", requireAuth, (req, res) => {
  res.json({ 
    user: req.user,
    env: {
      API_BASE_URL: process.env.API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV
    }
  });
});

// ── CSRF: validate Origin on mutating requests ────────────────────────────────
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin || req.headers.referer || "";
  if (!origin) return next(); // server-to-server or same-origin curl
  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
  if (!isAllowed) return res.status(403).json({ message: "Forbidden: cross-origin request rejected" });
  next();
});

const collegeEmailDomain = "@vitapstudent.ac.in";

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, jwtVersion: user.jwtVersion }, process.env.JWT_SECRET, { expiresIn: "24h" });
}

// ── Push Notification helper ──────────────────────────────────────────────────
async function sendPushToUser(userId, payload) {
  if (!(await mongoReady)) return;
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await PushSubscription.find({ userId }).lean();
  const results = await Promise.allSettled(
    subs.map((s) => webPush.sendNotification(s.subscription, JSON.stringify(payload)))
  );
  // Remove expired subscriptions (410 Gone)
  const expiredIndexes = results.map((r, i) => r.status === 'rejected' && r.reason?.statusCode === 410 ? i : -1).filter(i => i >= 0);
  if (expiredIndexes.length) {
    const expiredIds = expiredIndexes.map(i => subs[i]._id);
    await PushSubscription.deleteMany({ _id: { $in: expiredIds } });
  }
}

// ── Email notification helper ────────────────────────────────────────────────
async function sendEmailNotification(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({ from: `"VITAP Connect" <${process.env.EMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.warn('Email notification failed:', err.message);
  }
}

// Apply general rate limiter to all API routes
app.use('/auth', apiLimiter);
app.use('/users', apiLimiter);
app.use('/connections', apiLimiter);
app.use('/projects', apiLimiter);
app.use('/chat', apiLimiter);
app.use('/groups', apiLimiter);
app.use('/notifications', apiLimiter);

function encryptMessage(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chatEncryptionKey, iv);
  const cipherText = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
  return { cipherText, iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

function decryptMessage(message) {
  if (message?.text) return message.text;
  if (!message?.cipherText || !message?.iv || !message?.authTag) return "";
  const decipher = createDecipheriv("aes-256-gcm", chatEncryptionKey, Buffer.from(message.iv, "base64"));
  decipher.setAuthTag(Buffer.from(message.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(message.cipherText, "base64")), decipher.final()]).toString("utf8");
}

function messageStatus(message, viewerId) {
  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  const deliveredTo = Array.isArray(message.deliveredTo) ? message.deliveredTo : [];
  return {
    deliveredTo,
    readBy,
    status: viewerId && readBy.includes(viewerId) ? "read" : viewerId && deliveredTo.includes(viewerId) ? "delivered" : "sent"
  };
}

function serializeDirectMessage(message, viewerId) {
  const source = typeof message.toObject === "function" ? message.toObject() : message;
  return { ...source, text: decryptMessage(source), ...messageStatus(source, viewerId) };
}

function serializeProjectMessage(message) {
  const source = typeof message.toObject === "function" ? message.toObject() : message;
  return { ...source, text: decryptMessage(source), deliveredTo: Array.isArray(source.deliveredTo) ? source.deliveredTo : [], readBy: Array.isArray(source.readBy) ? source.readBy : [] };
}

function studentFromRecord(record, key = "student") {
  return sanitizeStudent(record.get(key));
}

function directConversationId(userA, userB) {
  return [userA, userB].sort().join(":");
}

function onlineUserIds() {
  return [...onlineUsers.keys()];
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function removeSocketFromCallRooms(socket) {
  for (const [roomId, participants] of callRooms.entries()) {
    if (!participants.has(socket.id)) continue;
    const participant = participants.get(socket.id);
    participants.delete(socket.id);
    socket.to(`call:${roomId}`).emit("call:participant-left", { roomId, socketId: socket.id, userId: participant?.userId, userName: participant?.userName });
    if (participants.size === 0) {
      callRooms.delete(roomId);
    } else {
      callRooms.set(roomId, participants);
    }
  }
}

async function areFriends(userId, otherUserId) {
  const result = await readQuery(`
    MATCH (:Student {id: $userId})-[friend:FRIEND_OF]-(:Student {id: $otherUserId})
    RETURN count(friend) AS count
  `, { userId, otherUserId });
  return integer(result.records[0]?.get("count")) > 0;
}

async function getStudentById(id) {
  const result = await readQuery(`
    MATCH (s:Student {id: $id})
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH s, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN s { .*, skills: skills, interests: interests } AS student
  `, { id });
  return result.records[0] ? studentFromRecord(result.records[0]) : null;
}

async function getStudentList(where = "s.id <> $id", params = {}) {
  const result = await readQuery(`
    MATCH (s:Student)
    WHERE ${where}
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH s, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN s { .*, skills: skills, interests: interests } AS student
    ORDER BY student.name
  `, params);
  return result.records.map((record) => studentFromRecord(record));
}

async function createCallLog(invite) {
  if (!(await mongoReady)) return null;
  return CallLog.create({
    roomId: invite.roomId,
    callerId: invite.fromUserId,
    callerName: invite.fromUserName,
    calleeId: invite.toUserId,
    calleeName: invite.toUserName || "Student",
    callType: invite.callType || "video",
    title: invite.title || "Private call",
    status: "ringing",
    startedAt: new Date()
  });
}

async function updateCallLog(roomId, updates) {
  if (!(await mongoReady)) return;
  await CallLog.findOneAndUpdate({ roomId }, updates, { sort: { startedAt: -1 } });
}

function callDurationSeconds(call) {
  if (!call?.acceptedAt || !call?.endedAt) return 0;
  return Math.max(0, Math.round((new Date(call.endedAt).getTime() - new Date(call.acceptedAt).getTime()) / 1000));
}

async function buildIceServers() {
  const stunUrls = String(process.env.STUN_URLS || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const iceServers = [];

  if (stunUrls.length) {
    iceServers.push({ urls: stunUrls });
  }

  const turnUrlsStr = String(process.env.METERED_TURN_API || process.env.TURN_URLS || process.env.TURN_URL || "");
  if (turnUrlsStr.startsWith("http")) {
    try {
      const response = await fetch(turnUrlsStr);
      const data = await response.json();
      if (Array.isArray(data)) return data; 
      if (data.iceServers) return data.iceServers;
    } catch (error) {
      console.error("Failed to fetch TURN credentials from API:", error.message);
    }
  }

  const turnUrls = turnUrlsStr.split(",").map((v) => v.trim()).filter(Boolean);
  if (turnUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });
  }

  return iceServers;
}

async function saveProfileRelationships(userId, skills, interests, department, club) {
  await runQuery(`
    MATCH (s:Student {id: $userId})
    OPTIONAL MATCH (s)-[r:HAS_SKILL|INTERESTED_IN|BELONGS_TO|MEMBER_OF]->()
    DELETE r
    WITH s
    FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (s)-[:HAS_SKILL]->(skill))
    FOREACH (name IN $interests | MERGE (interest:Interest {name: name}) MERGE (s)-[:INTERESTED_IN]->(interest))
    FOREACH (_ IN CASE WHEN $department <> "" THEN [1] ELSE [] END | MERGE (department:Department {name: $department}) MERGE (s)-[:BELONGS_TO]->(department))
    FOREACH (_ IN CASE WHEN $club <> "" THEN [1] ELSE [] END | MERGE (club:Club {name: $club}) MERGE (s)-[:MEMBER_OF]->(club))
  `, { userId, skills, interests, department: department || "", club: club || "" });
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "vitap-connect-api" }));

app.get("/config/call", requireAuth, async (req, res, next) => {
  try {
    const iceServers = await buildIceServers();
    res.json({ iceServers });
  } catch (error) {
    next(error);
  }
});

app.get("/calls/history", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ calls: [] });
    const calls = await CallLog.find({ $or: [{ callerId: req.user.id }, { calleeId: req.user.id }] }).sort({ startedAt: -1 }).limit(20).lean();
    res.json({
      calls: calls.map((call) => ({
        ...call,
        counterpartId: call.callerId === req.user.id ? call.calleeId : call.callerId,
        counterpartName: call.callerId === req.user.id ? call.calleeName : call.callerName,
        direction: call.callerId === req.user.id ? "outgoing" : "incoming",
        durationSeconds: call.durationSeconds || callDurationSeconds(call)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/feedback", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Database not ready" });
    const { rating, message } = req.body;
    if (!rating || !message) return res.status(400).json({ message: "Rating and message are required" });

    const feedback = await Feedback.create({
      userId: req.user.id,
      userName: req.user.name || "Student",
      rating: Number(rating),
      message: message.trim()
    });

    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    next(error);
  }
});

app.get("/feedback", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Database not ready" });
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();
    res.json({ feedbacks });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/send-register-otp", apiLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email.endsWith(collegeEmailDomain)) return res.status(400).json({ message: "Use your VIT-AP student email ending with @vitapstudent.ac.in" });
    const existing = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email });
    if (existing.records.length) return res.status(409).json({ message: "Email already registered" });

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Replace any existing pending OTP for this email
    await runQuery("MATCH (ot:RegOtpToken {email: $email}) DELETE ot", { email });
    await runQuery("CREATE (ot:RegOtpToken {email: $email, otp: $otp, expiresAt: $expiresAt})", { email, otp, expiresAt });

    try {
      const mailPayload = {
        to: email,
        subject: 'Verify your email – VITAP Connect',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#6366f1;margin-bottom:8px">VITAP Connect</h2>
            <h3 style="margin-bottom:16px">Verify your email address</h3>
            <p style="color:#475569">Use this one-time code to complete your registration. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px;color:#1e293b;margin:24px 0">${otp}</div>
            <p style="color:#94a3b8;font-size:13px">If you did not attempt to register on VITAP Connect, please ignore this email.</p>
          </div>
        `
      };

      const webhookUrl = process.env.GOOGLE_MAIL_WEBHOOK || "https://script.google.com/macros/s/AKfycbwIIJX0Ssi5MfUHSsSj2KduMEnf8Fl5ZLcc6enaI3SJmYoznXzS7CCB8l0SRcFT9PN74A/exec";
      const mailRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailPayload)
      });

      const resData = await mailRes.json();
      if (resData.status !== "success") {
        console.error("Google Script Mail Error:", resData.message);
        return res.status(500).json({ message: "Failed to deliver email: " + (resData.message || "Unknown error") });
      }

      res.json({ message: "OTP sent to your email" });
    } catch (apiError) {
      console.error("Fetch Error:", apiError);
      return res.status(500).json({ message: "Failed to connect to email webhook." });
    }
  } catch (error) {
    next(error);
  }
});

app.post("/auth/register", authLimiter, async (req, res, next) => {
  try {
    const skills = list(req.body.skills);
    const interests = list(req.body.interests);
    if (req.body.confirmPassword && req.body.password !== req.body.confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email.endsWith(collegeEmailDomain)) return res.status(400).json({ message: "Use your VIT-AP student email ending with @vitapstudent.ac.in" });
    const existing = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email });
    if (existing.records.length) return res.status(409).json({ message: "Email already registered" });

    // Verify registration OTP
    const otp = String(req.body.otp || "").trim();
    const now = new Date().toISOString();
    const otpResult = await readQuery(
      "MATCH (ot:RegOtpToken {email: $email, otp: $otp}) WHERE ot.expiresAt > $now RETURN ot",
      { email, otp, now }
    );
    if (!otpResult.records.length) return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
    await runQuery("MATCH (ot:RegOtpToken {email: $email}) DELETE ot", { email });

    const user = {
      id: randomUUID(),
      name: req.body.name || "New Student",
      email,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      department: req.body.department || "Computer Science",
      year: Number(req.body.year || 1),
      graduationYear: Number(req.body.graduationYear || new Date().getFullYear() + 1),
      goal: req.body.goal || "Find project partners",
      availability: req.body.availability || "Evenings",
      bio: req.body.bio || "",
      role: "student",
      status: "active",
      emailVerified: true,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      jwtVersion: randomUUID()
    };

    await runQuery("CREATE (s:Student) SET s = $user", { user });
    await saveProfileRelationships(user.id, skills, interests, user.department, req.body.club || "");
    const created = await getStudentById(user.id);
    const token = sign(created);
    res.cookie("jwt", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ user: created });
  } catch (error) {
    next(error);
  }
});
app.post("/auth/login", authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const result = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email });
    const user = result.records[0]?.get("s").properties;
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status === "blocked") return res.status(403).json({ message: "Account blocked by admin" });
    
    // Auto-logout old sessions:
    await runQuery("MATCH (s:Student {id: $id}) SET s.jwtVersion = $version", { id: user.id, version: randomUUID() });

    const safe = await getStudentById(user.id);
    const token = sign(safe);
    res.cookie("jwt", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: safe });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ message: "Logged out successfully" });
});

app.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email.endsWith(collegeEmailDomain)) return res.status(400).json({ message: "Use your VIT-AP student email" });
    const result = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email });
    if (!result.records.length) return res.status(404).json({ message: "No account found with this email" });

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete any existing OTPs for this email, then store new one
    await runQuery("MATCH (ot:OtpToken {email: $email}) DELETE ot", { email });
    await runQuery("CREATE (ot:OtpToken {email: $email, otp: $otp, expiresAt: $expiresAt})", { email, otp, expiresAt });

    try {
      const mailPayload = {
        to: email,
        subject: 'Your Password Reset OTP – VITAP Connect',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#6366f1;margin-bottom:8px">VITAP Connect</h2>
            <h3 style="margin-bottom:16px">Password Reset OTP</h3>
            <p style="color:#475569">Use the following one-time password to reset your account password. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px;color:#1e293b;margin:24px 0">${otp}</div>
            <p style="color:#94a3b8;font-size:13px">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `
      };

      const webhookUrl = process.env.GOOGLE_MAIL_WEBHOOK || "https://script.google.com/macros/s/AKfycbwIIJX0Ssi5MfUHSsSj2KduMEnf8Fl5ZLcc6enaI3SJmYoznXzS7CCB8l0SRcFT9PN74A/exec";
      const mailRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailPayload)
      });

      const resData = await mailRes.json();
      if (resData.status !== "success") {
        console.error("Google Script Mail Error:", resData.message);
        return res.status(500).json({ message: "Failed to deliver email: " + (resData.message || "Unknown error") });
      }

      res.json({ message: "OTP sent to your email" });
    } catch (apiError) {
      console.error("Fetch Reset Error:", apiError);
      return res.status(500).json({ message: "Failed to connect to email webhook." });
    }
  } catch (error) {
    next(error);
  }
});

app.post("/auth/verify-otp", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const otp = String(req.body.otp || "").trim();
    const now = new Date().toISOString();
    const result = await readQuery(
      "MATCH (ot:OtpToken {email: $email, otp: $otp}) WHERE ot.expiresAt > $now RETURN ot",
      { email, otp, now }
    );
    if (!result.records.length) return res.status(400).json({ message: "Invalid or expired OTP" });

    // OTP is valid – delete it and issue a short-lived reset token
    await runQuery("MATCH (ot:OtpToken {email: $email}) DELETE ot", { email });
    const resetToken = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await runQuery("CREATE (rt:ResetToken {email: $email, token: $resetToken, expiresAt: $tokenExpiresAt})", { email, resetToken, tokenExpiresAt });
    res.json({ message: "OTP verified", resetToken });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const now = new Date().toISOString();
    const result = await readQuery("MATCH (rt:ResetToken {token: $token}) WHERE rt.expiresAt > $now RETURN rt", { token, now });
    if (!result.records.length) return res.status(400).json({ message: "Invalid or expired reset token" });
    const resetToken = result.records[0].get("rt").properties;
    const userResult = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email: resetToken.email });
    if (!userResult.records.length) return res.status(404).json({ message: "User not found" });
    const user = userResult.records[0].get("s").properties;
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await runQuery("MATCH (s:Student {id: $id}) SET s.passwordHash = $passwordHash", { id: user.id, passwordHash: hashedPassword });
    await runQuery("MATCH (rt:ResetToken {token: $token}) DELETE rt", { token });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

app.get("/users/me", requireAuth, async (req, res) => {
  res.json({ user: await getStudentById(req.user.id) });
});

app.patch("/users/me", requireAuth, async (req, res, next) => {
  try {
    const updates = {
      name: req.body.name || req.user.name,
      department: req.body.department || req.user.department,
      year: Number(req.body.year || req.user.year || 1),
      graduationYear: Number(req.body.graduationYear || req.user.graduationYear || new Date().getFullYear() + 1),
      goal: req.body.goal || req.user.goal || "Find project partners",
      availability: req.body.availability || req.user.availability || "Evenings",
      club: req.body.club || "",
      bio: req.body.bio || "",
      github: req.body.github || req.user.github || "",
      linkedin: req.body.linkedin || req.user.linkedin || "",
      instagram: req.body.instagram || req.user.instagram || "",
      updatedAt: new Date().toISOString()
    };
    await runQuery("MATCH (s:Student {id: $id}) SET s += $updates", { id: req.user.id, updates });
    await saveProfileRelationships(req.user.id, list(req.body.skills), list(req.body.interests), updates.department, updates.club);
    res.json({ user: await getStudentById(req.user.id) });
  } catch (error) {
    next(error);
  }
});

app.post("/users/me/avatar", requireAuth, upload.single("avatar"), async (req, res, next) => {
  try {
    const filename = req.file.filename;
    await runQuery("MATCH (s:Student {id: $id}) SET s.avatarUrl = $filename", { id: req.user.id, filename });
    res.json({ user: await getStudentById(req.user.id) });
  } catch (error) {
    next(error);
  }
});


app.delete("/users/me/avatar", requireAuth, async (req, res, next) => {
  try {
    await runQuery("MATCH (s:Student {id: $id}) REMOVE s.avatarUrl", { id: req.user.id });
    res.json({ user: await getStudentById(req.user.id) });
  } catch (error) {
    next(error);
  }
});
app.get("/users/search", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (me:Student {id: $id})
      MATCH (s:Student)
      WHERE s.id <> me.id AND coalesce(s.status, 'active') <> 'blocked' AND NOT EXISTS { MATCH (me)-[:BLOCKED]-(s) }
      WITH me, s,
           EXISTS { MATCH (me)-[:FRIEND_OF]-(s) } AS isFriend,
           EXISTS { MATCH (me)-[:REQUESTED_CONNECTION]->(s) } AS requestSent,
           EXISTS { MATCH (s)-[:REQUESTED_CONNECTION]->(me) } AS requestReceived,
           EXISTS { MATCH (me)-[:BLOCKED]-(s) } AS isBlocked
      WHERE isBlocked = false
      OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
      OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
      WITH s, isFriend, requestSent, requestReceived, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
      RETURN s { .*, skills: skills, interests: interests, connectionStatus: CASE WHEN isFriend THEN "friend" WHEN requestSent THEN "requestSent" WHEN requestReceived THEN "requestReceived" ELSE "none" END } AS student
      ORDER BY student.name
    `, { id: req.user.id });
    const users = result.records.map((record) => studentFromRecord(record));
    const filtered = users.filter((user) => {
      const q = String(req.query.q || "").toLowerCase();
      const skill = String(req.query.skill || "").toLowerCase();
      const department = String(req.query.department || "").toLowerCase();
      const year = String(req.query.year || "");
      const matchesQ = !q || user.name?.toLowerCase().includes(q) || user.regNumber?.toLowerCase().includes(q);
      return matchesQ && (!skill || user.skills?.some((item) => item.toLowerCase().includes(skill))) && (!department || user.department?.toLowerCase().includes(department)) && (!year || String(user.year) === year);
    });
    res.json({ users: filtered });
  } catch (error) {
    next(error);
  }
});

app.get("/users/recommendations", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (me:Student {id: $id})
      MATCH (s:Student)
      WHERE s.id <> me.id AND coalesce(s.status, 'active') <> 'blocked' AND NOT EXISTS { MATCH (me)-[:BLOCKED]-(s) }
      WITH me, s,
           EXISTS { MATCH (me)-[:FRIEND_OF]-(s) } AS isFriend,
           EXISTS { MATCH (me)-[:REQUESTED_CONNECTION]->(s) } AS requestSent,
           EXISTS { MATCH (s)-[:REQUESTED_CONNECTION]->(me) } AS requestReceived
      WHERE isFriend = false
      OPTIONAL MATCH (me)-[:HAS_SKILL]->(sharedSkill:Skill)<-[:HAS_SKILL]-(s)
      OPTIONAL MATCH (me)-[:INTERESTED_IN]->(sharedInterest:Interest)<-[:INTERESTED_IN]-(s)
      OPTIONAL MATCH (me)-[:FRIEND_OF]-(mutualFriend:Student)-[:FRIEND_OF]-(s)
      WITH me, s, requestSent, requestReceived, collect(DISTINCT sharedSkill.name) AS sharedSkills, collect(DISTINCT sharedInterest.name) AS sharedInterests, count(DISTINCT mutualFriend) AS mutualFriends
      OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
      OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
      WITH me, s, requestSent, requestReceived, sharedSkills, sharedInterests, mutualFriends, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
      WITH s, skills, interests, sharedSkills, sharedInterests, mutualFriends, requestSent, requestReceived, 
           size(sharedSkills) * 3 + size(sharedInterests) * 2 + mutualFriends + CASE WHEN s.department = me.department THEN 2 ELSE 0 END + CASE WHEN s.year = me.year THEN 1 ELSE 0 END AS score
      RETURN s { .*, skills: skills, interests: interests, score: score, 
                 connectionStatus: CASE WHEN requestSent THEN "requestSent" WHEN requestReceived THEN "requestReceived" ELSE "none" END,
                 reason: CASE WHEN size(sharedSkills) > 0 THEN "Shared skill: " + sharedSkills[0] WHEN size(sharedInterests) > 0 THEN "Shared interest: " + sharedInterests[0] WHEN mutualFriends > 0 THEN "Mutual friend path" WHEN score > 0 THEN "Same department or year" ELSE "New campus match" END } AS student
      ORDER BY student.score DESC, student.name
      LIMIT 6
    `, { id: req.user.id });
    res.json({ users: result.records.map((record) => studentFromRecord(record)) });
  } catch (error) {
    next(error);
  }
});

app.get("/connections", requireAuth, async (req, res, next) => {
  try {
    const requests = await readQuery(`
      MATCH (from:Student)-[:REQUESTED_CONNECTION]->(:Student {id: $id})
      OPTIONAL MATCH (from)-[:HAS_SKILL]->(skill:Skill)
      OPTIONAL MATCH (from)-[:INTERESTED_IN]->(interest:Interest)
      WITH from, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
      RETURN from { .*, skills: skills, interests: interests } AS student
    `, { id: req.user.id });
    const accepted = await readQuery(`
      MATCH (:Student {id: $id})-[:FRIEND_OF]-(friend:Student)
      OPTIONAL MATCH (friend)-[:HAS_SKILL]->(skill:Skill)
      OPTIONAL MATCH (friend)-[:INTERESTED_IN]->(interest:Interest)
      WITH friend, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
      RETURN DISTINCT friend { .*, skills: skills, interests: interests } AS student
    `, { id: req.user.id });
    res.json({ requests: requests.records.map((record) => studentFromRecord(record)), accepted: accepted.records.map((record) => studentFromRecord(record)) });
  } catch (error) {
    next(error);
  }
});

app.post("/connections/request", requireAuth, async (req, res, next) => {
  try {
    if (req.body.toUserId === req.user.id) return res.status(400).json({ message: "Cannot connect with yourself" });
    await runQuery(`
      MATCH (from:Student {id: $fromUserId}), (to:Student {id: $toUserId})
      WHERE NOT (from)-[:FRIEND_OF]-(to)
      MERGE (from)-[:REQUESTED_CONNECTION]->(to)
      CREATE (n:Notification {id: $notificationId, message: $message, createdAt: $createdAt})
      MERGE (to)-[:HAS_NOTIFICATION]->(n)
    `, { fromUserId: req.user.id, toUserId: req.body.toUserId, notificationId: randomUUID(), message: `${req.user.name} sent you a connection request`, createdAt: new Date().toISOString() });

    io.to(`user:${req.body.toUserId}`).emit("notification", { message: `${req.user.name} sent you a connection request` });

    // Push + email notification if recipient is offline
    if (!isUserOnline(req.body.toUserId)) {
      const toUser = await getStudentById(req.body.toUserId);
      sendPushToUser(req.body.toUserId, {
        title: 'New Connection Request',
        body: `${req.user.name} sent you a connection request`,
        url: '/connections'
      }).catch(() => {});
      if (toUser?.email) {
        sendEmailNotification(toUser.email, `${req.user.name} wants to connect on VITAP Connect`,
          `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#6366f1">New Connection Request</h2>
            <p><strong>${req.user.name}</strong> (${req.user.department}, Year ${req.user.year}) sent you a connection request on VITAP Connect.</p>
            <a href="${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'}/connections" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">View Request</a>
          </div>`
        ).catch(() => {});
      }
    }
    res.status(201).json({ message: "Connection request sent" });
  } catch (error) {
    next(error);
  }
});

app.post("/connections/cancel", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(:Student {id: $toUserId})
      DELETE request
    `, { fromUserId: req.user.id, toUserId: req.body.toUserId });
    res.json({ message: "Connection request cancelled" });
  } catch (error) {
    next(error);
  }
});

app.post("/connections/accept", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (from:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(to:Student {id: $toUserId})
      DELETE request
      MERGE (from)-[:FRIEND_OF]->(to)
      MERGE (to)-[:FRIEND_OF]->(from)
      WITH from, to
      OPTIONAL MATCH (to)-[:HAS_NOTIFICATION]->(n:Notification)
      WHERE n.message CONTAINS from.name AND n.message CONTAINS "connection request"
      DETACH DELETE n
    `, { fromUserId: req.body.fromUserId, toUserId: req.user.id });

    io.to(`user:${req.body.fromUserId}`).emit("notification", { message: `${req.user.name} accepted your connection request` });

    // Notify the requester that their request was accepted
    if (!isUserOnline(req.body.fromUserId)) {
      const fromUser = await getStudentById(req.body.fromUserId);
      sendPushToUser(req.body.fromUserId, {
        title: 'Connection Accepted!',
        body: `${req.user.name} accepted your connection request`,
        url: '/connections'
      }).catch(() => {});
      if (fromUser?.email) {
        sendEmailNotification(fromUser.email, `${req.user.name} accepted your connection request`,
          `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#6366f1">Connection Accepted 🎉</h2>
            <p><strong>${req.user.name}</strong> accepted your connection request on VITAP Connect. You can now message each other!</p>
            <a href="${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'}/chat" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">Start Chatting</a>
          </div>`
        ).catch(() => {});
      }
    }
    res.json({ message: "Connection accepted" });
  } catch (error) {
    next(error);
  }
});
app.post("/connections/reject", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (from:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(to:Student {id: $toUserId})
      DELETE request
      WITH from, to
      OPTIONAL MATCH (to)-[:HAS_NOTIFICATION]->(n:Notification)
      WHERE n.message CONTAINS from.name AND n.message CONTAINS "connection request"
      DETACH DELETE n
    `, { fromUserId: req.body.fromUserId, toUserId: req.user.id });
    res.json({ message: "Connection request rejected" });
  } catch (error) {
    next(error);
  }
});
app.post("/connections/remove", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (me:Student {id: $me}), (friend:Student {id: $friendId})
      OPTIONAL MATCH (me)-[a:FRIEND_OF]-(friend)
      DELETE a
    `, { me: req.user.id, friendId: req.body.friendId });
    res.json({ message: "Friend removed" });
  } catch (error) {
    next(error);
  }
});

app.post("/connections/block", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (me:Student {id: $me}), (friend:Student {id: $friendId})
      OPTIONAL MATCH (me)-[friendship:FRIEND_OF]-(friend)
      OPTIONAL MATCH (me)-[sent:REQUESTED_CONNECTION]->(friend)
      OPTIONAL MATCH (friend)-[received:REQUESTED_CONNECTION]->(me)
      DELETE friendship, sent, received
      MERGE (me)-[block:BLOCKED]->(friend)
      SET block.createdAt = $createdAt
    `, { me: req.user.id, friendId: req.body.friendId, createdAt: new Date().toISOString() });
    res.json({ message: "User blocked" });
  } catch (error) {
    next(error);
  }
});

app.get("/connections/mutual/:userId", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (:Student {id: $me})-[:FRIEND_OF]-(mutual:Student)-[:FRIEND_OF]-(:Student {id: $other})
      RETURN DISTINCT mutual { .* } AS student
    `, { me: req.user.id, other: req.params.userId });
    res.json({ mutual: result.records.map((record) => studentFromRecord(record)) });
  } catch (error) {
    next(error);
  }
});

app.get("/connections/path/:userId", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (me:Student {id: $me}), (other:Student {id: $other})
      MATCH path = shortestPath((me)-[:FRIEND_OF*..5]-(other))
      RETURN [student IN nodes(path) | student.name] AS path
    `, { me: req.user.id, other: req.params.userId });
    res.json({ path: result.records[0]?.get("path") || [] });
  } catch (error) {
    next(error);
  }
});

app.get("/projects", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (p:Project)
      OPTIONAL MATCH (p)<-[:CREATED_PROJECT]-(owner:Student)
      OPTIONAL MATCH (p)-[:NEEDS_SKILL]->(skill:Skill)
      OPTIONAL MATCH (p)<-[:WORKS_ON]-(member:Student)
      OPTIONAL MATCH (requester:Student)-[:REQUESTED_TO_JOIN]->(p)
      WITH p, owner, collect(DISTINCT skill.name) AS skills, collect(DISTINCT member { .id, .name }) AS members, collect(DISTINCT requester { .id, .name, .department, .year }) AS joinRequests
      RETURN p { .*, ownerId: owner.id, ownerName: owner.name, skills: skills, members: members, joinRequests: joinRequests, isOwner: owner.id = $userId, isMember: any(member IN members WHERE member.id = $userId), hasRequested: any(request IN joinRequests WHERE request.id = $userId) } AS project
      ORDER BY project.createdAt DESC
    `, { userId: req.user.id });
    res.json({ projects: result.records.map((record) => record.get("project")) });
  } catch (error) {
    next(error);
  }
});

app.post("/projects/create", requireAuth, async (req, res, next) => {
  try {
    const project = { id: randomUUID(), title: req.body.title, description: req.body.description || "", type: req.body.type || "Project", hackathonName: req.body.hackathonName || "", deadline: req.body.deadline || "", callRoomId: randomUUID(), createdAt: new Date().toISOString() };
    await runQuery(`
      MATCH (creator:Student {id: $userId})
      CREATE (p:Project) SET p = $project
      MERGE (creator)-[:CREATED_PROJECT]->(p)
      MERGE (creator)-[:WORKS_ON]->(p)
      FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (p)-[:NEEDS_SKILL]->(skill))
    `, { userId: req.user.id, project, skills: list(req.body.skills) });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

app.delete("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await runQuery(`
      MATCH (:Student {id: $userId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
      DETACH DELETE p
      RETURN count(p) AS deleted
    `, { userId: req.user.id, projectId: req.params.id });
    if (!integer(result.records[0].get("deleted")) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the project owner or an admin can delete this project" });
    }
    // Admin bypass delete (if not deleted by owner match above)
    if (req.user.role === "admin" && !integer(result.records[0].get("deleted"))) {
      await runQuery("MATCH (p:Project {id: $id}) DETACH DELETE p", { id: req.params.id });
    }
    if (await mongoReady) await ChatMessage.deleteMany({ projectId: req.params.id });
    res.json({ message: "Project deleted" });
  } catch (error) {
    next(error);
  }
});

app.post("/projects/request-join", requireAuth, async (req, res, next) => {
  try {
    const result = await runQuery(`
      MATCH (student:Student {id: $userId}), (p:Project {id: $projectId})
      WHERE NOT (student)-[:WORKS_ON]->(p)
      MERGE (student)-[:REQUESTED_TO_JOIN {createdAt: $createdAt}]->(p)
      WITH p, student
      MATCH (owner:Student)-[:CREATED_PROJECT]->(p)
      CREATE (n:Notification {id: $notificationId, message: $message, createdAt: $createdAt})
      MERGE (owner)-[:HAS_NOTIFICATION]->(n)
      RETURN owner.id AS ownerId
    `, { userId: req.user.id, projectId: req.body.projectId, createdAt: new Date().toISOString(), notificationId: randomUUID(), message: `${req.user.name} requested to join your project` });

    if (result.records.length > 0) {
      const ownerId = result.records[0].get("ownerId");
      io.to(`user:${ownerId}`).emit("notification", { message: `${req.user.name} requested to join your project` });
    }

    res.status(201).json({ message: "Join request sent" });
  } catch (error) {
    next(error);
  }
});

app.post("/projects/cancel-request", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (:Student {id: $userId})-[request:REQUESTED_TO_JOIN]->(:Project {id: $projectId})
      DELETE request
    `, { userId: req.user.id, projectId: req.body.projectId });
    res.json({ message: "Project request cancelled" });
  } catch (error) {
    next(error);
  }
});

app.post("/projects/accept", requireAuth, async (req, res, next) => {
  try {
    const result = await runQuery(`
      MATCH (:Student {id: $ownerId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
      MATCH (student:Student {id: $studentId})-[request:REQUESTED_TO_JOIN]->(p)
      DELETE request
      MERGE (student)-[:WORKS_ON]->(p)
      WITH student, p
      MATCH (owner:Student {id: $ownerId})
      OPTIONAL MATCH (owner)-[:HAS_NOTIFICATION]->(n:Notification)
      WHERE n.message CONTAINS student.name AND n.message CONTAINS "join your project"
      DETACH DELETE n
      RETURN student.name AS name
    `, { ownerId: req.user.id, projectId: req.body.projectId, studentId: req.body.studentId });
    if (!result.records.length) return res.status(403).json({ message: "Only the project owner can accept requests" });
    res.json({ message: "Student added to project" });
  } catch (error) {
    next(error);
  }
});

app.post("/projects/reject", requireAuth, async (req, res, next) => {
  try {
    const result = await runQuery(`
      MATCH (owner:Student {id: $ownerId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
      MATCH (student:Student {id: $studentId})-[request:REQUESTED_TO_JOIN]->(p)
      DELETE request
      WITH owner, student
      OPTIONAL MATCH (owner)-[:HAS_NOTIFICATION]->(n:Notification)
      WHERE n.message CONTAINS student.name AND n.message CONTAINS "join your project"
      DETACH DELETE n
      RETURN count(request) AS rejected
    `, { ownerId: req.user.id, projectId: req.body.projectId, studentId: req.body.studentId });
    if (!integer(result.records[0].get("rejected"))) return res.status(403).json({ message: "Only the project owner can reject requests" });
    res.json({ message: "Join request rejected" });
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:id/messages", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ messages: [] });
    const messages = await ChatMessage.find({ projectId: req.params.id }).sort({ createdAt: 1 }).limit(100).lean();
    res.json({ messages: messages.map((message) => serializeProjectMessage(message)) });
  } catch (error) {
    next(error);
  }
});

app.get("/projects/recommendations", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (me:Student {id: $id})-[:HAS_SKILL]->(skill:Skill)<-[:NEEDS_SKILL]-(p:Project)
      WHERE NOT (me)-[:WORKS_ON]->(p)
      WITH p, collect(DISTINCT skill.name) AS matchingSkills
      RETURN p { .*, matchingSkills: matchingSkills } AS project
      LIMIT 6
    `, { id: req.user.id });
    res.json({ projects: result.records.map((record) => record.get("project")) });
  } catch (error) {
    next(error);
  }
});

app.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (:Student {id: $id})-[:HAS_NOTIFICATION]->(n:Notification)
      RETURN n ORDER BY n.createdAt DESC LIMIT 15
    `, { id: req.user.id });
    const notifications = result.records.map((record) => {
      const n = record.get("n");
      return { ...n.properties, id: n.properties.id || n.elementId || n.identity?.toString() };
    });
    res.json({ notifications });
  } catch (error) { next(error); }
});

app.delete("/notifications/clear", requireAuth, async (req, res, next) => {
  try {
    await runQuery(`
      MATCH (:Student {id: $id})-[rel:HAS_NOTIFICATION]->(n:Notification)
      DETACH DELETE n
    `, { id: req.user.id });
    res.json({ message: "Notifications cleared" });
  } catch (error) { next(error); }
});

app.delete("/notifications/:id", requireAuth, async (req, res, next) => {
  try {
    // Resilient delete: check both the 'id' property and the internal elementId
    await runQuery(`
      MATCH (:Student {id: $userId})-[rel:HAS_NOTIFICATION]->(n:Notification)
      WHERE n.id = $id OR elementId(n) = $id OR toString(id(n)) = $id
      DETACH DELETE n
    `, { userId: req.user.id, id: String(req.params.id) });
    res.json({ message: "Notification deleted" });
  } catch (error) { next(error); }
});

app.get("/chat/conversations", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(
            `MATCH (:Student {id: $id})-[:FRIEND_OF]-(friend:Student)
      OPTIONAL MATCH (friend)-[:HAS_SKILL]->(skill:Skill)
      WITH friend, collect(DISTINCT skill.name) AS skills
      RETURN DISTINCT friend { .id, .name, .avatarUrl, .department, .year, skills: skills } AS conversation
      ORDER BY conversation.name`,
      { id: req.user.id }
    );

    let conversations = result.records.map((record) => ({
      ...record.get("conversation"),
      lastMessage: "Start a conversation",
      lastMessageAt: null,
      unreadCount: 0,
      isOnline: false
    }));

    if (await mongoReady) {
      const conversationIds = conversations.map((conversation) => directConversationId(req.user.id, conversation.id));
      const messages = await DirectMessage.find({ conversationId: { $in: conversationIds } }).sort({ createdAt: 1 }).lean();
      const summary = new Map();

      for (const message of messages) {
        const current = summary.get(message.conversationId) || { lastMessage: "Start a conversation", lastMessageAt: null, unreadCount: 0 };
        current.lastMessage = decryptMessage(message);
        current.lastMessageAt = message.createdAt;
        if (message.recipientId === req.user.id && !message.readBy?.includes(req.user.id)) {
          current.unreadCount += 1;
        }
        summary.set(message.conversationId, current);
      }

      conversations = conversations.map((conversation) => {
        const conversationSummary = summary.get(directConversationId(req.user.id, conversation.id));
        return {
          ...conversation,
          lastMessage: conversationSummary?.lastMessage || conversation.lastMessage,
          lastMessageAt: conversationSummary?.lastMessageAt || conversation.lastMessageAt,
          unreadCount: conversationSummary?.unreadCount || 0
        };
      });
    }

    const online = new Set(onlineUserIds());
    conversations = conversations.map((conversation) => ({
      ...conversation,
      isOnline: online.has(conversation.id)
    })).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

app.get("/chat/messages/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!(await areFriends(req.user.id, req.params.userId))) {
      return res.status(403).json({ message: "Direct chat is only available with accepted connections" });
    }
    if (!(await mongoReady)) return res.json({ messages: [] });

    const conversationId = directConversationId(req.user.id, req.params.userId);
    const messages = await DirectMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(200).lean();
    await DirectMessage.updateMany(
      { conversationId, recipientId: req.user.id, readBy: { $ne: req.user.id } },
      { $addToSet: { deliveredTo: req.user.id, readBy: req.user.id } }
    );

    res.json({ messages: messages.map((message) => serializeDirectMessage(message, req.user.id === message.senderId ? message.recipientId : req.user.id)) });
  } catch (error) {
    next(error);
  }
});

app.post("/chat/read/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ updated: 0 });
    const conversationId = directConversationId(req.user.id, req.params.userId);
    const result = await DirectMessage.updateMany(
      { conversationId, recipientId: req.user.id, readBy: { $ne: req.user.id } },
      { $addToSet: { deliveredTo: req.user.id, readBy: req.user.id } }
    );
    res.json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    next(error);
  }
});

app.delete("/chat/messages/:messageId", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Chat unavailable" });
    // Try DirectMessage first
    let message = await DirectMessage.findById(req.params.messageId);
    let Model = DirectMessage;
    
    if (!message) {
      message = await ChatMessage.findById(req.params.messageId);
      Model = ChatMessage;
    }

    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.senderId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await Model.deleteOne({ _id: req.params.messageId });
    const roomId = message.groupId ? `group:${message.groupId}` : `user:${message.senderId === req.user.id ? message.recipientId : message.senderId}`;
    io.to(roomId).emit("chat:message_deleted", { messageId: req.params.messageId });
    
    res.json({ message: "Message deleted" });
  } catch (error) { next(error); }
});

app.get("/analytics/summary", requireAuth, async (req, res, next) => {
  try {
    const result = await readQuery(`
      MATCH (student:Student)
      OPTIONAL MATCH (project:Project)
      OPTIONAL MATCH ()-[connection:FRIEND_OF]->()
      RETURN count(DISTINCT student) AS students, count(DISTINCT project) AS projects, count(DISTINCT connection) AS connections
    `);
    const record = result.records[0];
    res.json({ summary: { students: integer(record.get("students")), projects: integer(record.get("projects")), connections: integer(record.get("connections")) } });
  } catch (error) {
    next(error);
  }
});

app.get("/admin/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await getStudentList("true", {});
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/users/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status === "blocked" ? "blocked" : "active";
    await runQuery("MATCH (s:Student {id: $id}) SET s.status = $status", { id: req.params.id, status });
    res.json({ user: await getStudentById(req.params.id) });
  } catch (error) {
    next(error);
  }
});


io.use((socket, next) => {
  let token = socket.handshake.auth?.token;
  if (!token && socket.request.headers.cookie) {
    const cookies = socket.request.headers.cookie.split(';');
    const jwtCookie = cookies.find(c => c.trim().startsWith('jwt='));
    if (jwtCookie) {
      token = jwtCookie.split('=')[1];
    }
  }
  if (!token) return next(new Error("Unauthorized"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

function emitPresence() {
  io.emit("presence:update", { userIds: onlineUserIds() });
}

io.on("connection", (socket) => {
  const userId = socket.user.id;
  const activeSockets = onlineUsers.get(userId) || new Set();
  activeSockets.add(socket.id);
  onlineUsers.set(userId, activeSockets);
  socket.join(`user:${userId}`);
  emitPresence();

  socket.on("presence:join", ({ userName }) => {
    socket.data.userName = userName || socket.data.userName || "Student";
    removeSocketFromCallRooms(socket);
    emitPresence();
  });

  socket.on("direct:join", async ({ otherUserId }) => {
    if (!otherUserId) return;
    const conversationId = directConversationId(userId, otherUserId);
    socket.join(`direct:${conversationId}`);
    if (await mongoReady) {
      await DirectMessage.updateMany(
        { conversationId, recipientId: userId, deliveredTo: { $ne: userId } },
        { $addToSet: { deliveredTo: userId } }
      );
    }
    io.to(`direct:${conversationId}`).emit("direct:delivered", { conversationId, recipientId: userId });
    io.to(`user:${otherUserId}`).emit("direct:delivered", { conversationId, recipientId: userId });
  });

  socket.on("direct:typing", ({ recipientId, isTyping }) => {
    if (!recipientId) return;
    io.to(`direct:${directConversationId(userId, recipientId)}`).emit("direct:typing", {
      fromUserId: userId,
      userName: socket.data.userName || "Student",
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("direct:read", async ({ otherUserId }) => {
    if (!otherUserId) return;
    const conversationId = directConversationId(userId, otherUserId);
    if (await mongoReady) {
      await DirectMessage.updateMany(
        { conversationId, recipientId: userId, readBy: { $ne: userId } },
        { $addToSet: { deliveredTo: userId, readBy: userId } }
      );
    }
    io.to(`direct:${conversationId}`).emit("direct:read", { conversationId, readerId: userId });
    io.to(`user:${otherUserId}`).emit("direct:read", { conversationId, readerId: userId });
  });

  socket.on("direct:message", async ({ recipientId, text }) => {
    if (!recipientId || !text?.trim()) return;
    if (!(await areFriends(userId, recipientId))) return;

    const conversationId = directConversationId(userId, recipientId);
    const deliveredTo = isUserOnline(recipientId) ? [userId, recipientId] : [userId];
    const encrypted = encryptMessage(text.trim());
    const message = {
      id: randomUUID(),
      conversationId,
      participants: [userId, recipientId],
      senderId: userId,
      senderName: socket.data.userName || "Student",
      recipientId,
      deliveredTo,
      readBy: [userId],
      createdAt: new Date()
    };

    io.to(`direct:${conversationId}`).emit("direct:message", { ...message, text: text.trim(), status: deliveredTo.includes(recipientId) ? "delivered" : "sent" });
    io.to(`user:${recipientId}`).emit("direct:message", { ...message, text: text.trim(), status: deliveredTo.includes(recipientId) ? "delivered" : "sent" });

    if (await mongoReady) {
      DirectMessage.create({ ...message, ...encrypted }).catch((err) => console.error("Async DM save failed:", err));
    }

    // Push notification if recipient is offline
    if (!isUserOnline(recipientId)) {
      sendPushToUser(recipientId, {
        title: `New message from ${socket.data.userName || 'Someone'}`,
        body: text.trim().length > 60 ? text.trim().slice(0, 57) + '...' : text.trim(),
        url: '/chat'
      }).catch(() => {});
    }
  });

  socket.on("project:join", ({ projectId }) => {
    if (projectId) socket.join(`project:${projectId}`);
  });

  socket.on("project:typing", ({ projectId, isTyping }) => {
    if (!projectId) return;
    socket.to(`project:${projectId}`).emit("project:typing", {
      projectId,
      fromUserId: userId,
      userName: socket.data.userName || "Student",
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("project:message", async ({ projectId, text }) => {
    if (!projectId || !text?.trim()) return;
    const encrypted = encryptMessage(text.trim());
    const message = {
      id: randomUUID(),
      projectId,
      senderId: userId,
      senderName: socket.data.userName || "Student",
      deliveredTo: [userId],
      readBy: [userId],
      createdAt: new Date()
    };

    io.to(`project:${projectId}`).emit("project:message", { ...message, text: text.trim() });

    if (await mongoReady) {
      ChatMessage.create({ ...message, ...encrypted }).catch((err) => console.error("Async Project Msg save failed:", err));
    }
  });

  // ── Group Chat Socket Events ────────────────────────────────────────────────
  socket.on("group:join", async ({ groupId }) => {
    if (!groupId) return;
    if (!(await mongoReady)) return;
    const group = await GroupChat.findOne({ id: groupId, members: userId }).lean();
    if (group) socket.join(`group:${groupId}`);
  });

  socket.on("group:typing", ({ groupId, isTyping }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:typing", {
      groupId, fromUserId: userId,
      userName: socket.data.userName || "Student",
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("group:message", async ({ groupId, text }) => {
    if (!groupId || !text?.trim()) return;
    if (!(await mongoReady)) return;
    const group = await GroupChat.findOne({ id: groupId, members: userId }).lean();
    if (!group) return;
    const encrypted = encryptMessage(text.trim());
    const message = {
      id: randomUUID(),
      groupId,
      senderId: userId,
      senderName: socket.data.userName || "Student",
      createdAt: new Date()
    };

    io.to(`group:${groupId}`).emit("group:message", { ...message, text: text.trim() });

    GroupMessage.create({ ...message, ...encrypted }).catch((err) => console.error("Async Group Msg save failed:", err));
    // Push to offline members
    const offlineMembers = group.members.filter(m => m !== userId && !isUserOnline(m));
    for (const memberId of offlineMembers) {
      sendPushToUser(memberId, {
        title: `${socket.data.userName || 'Someone'} in ${group.name}`,
        body: text.trim().length > 60 ? text.trim().slice(0, 57) + '...' : text.trim(),
        url: '/chat'
      }).catch(() => {});
    }
  });

  socket.on("call:invite", async ({ toUserId, toUserName, roomId, callType, title }) => {
    if (!toUserId || !roomId) return;
    const invite = {
      roomId,
      toUserId,
      toUserName,
      fromUserId: userId,
      fromUserName: socket.data.userName || "Student",
      callType: callType || "video",
      title: title || "Private call"
    };

    if (pendingCallInvites.has(roomId)) {
      clearTimeout(pendingCallInvites.get(roomId).timeout);
      pendingCallInvites.delete(roomId);
    }

    await createCallLog(invite);
    io.to(`user:${toUserId}`).emit("call:invite", invite);
    io.to(`user:${userId}`).emit("call:ringing", invite);

    const timeout = setTimeout(async () => {
      pendingCallInvites.delete(roomId);
      await updateCallLog(roomId, { status: "missed", endedAt: new Date() });
      io.to(`user:${userId}`).emit("call:missed", { roomId, toUserId, toUserName, title: invite.title, callType: invite.callType });
      io.to(`user:${toUserId}`).emit("call:invite-expired", { roomId, fromUserId: userId, fromUserName: invite.fromUserName, title: invite.title });
    }, 30000);

    pendingCallInvites.set(roomId, { ...invite, timeout });
  });

  socket.on("call:invite-response", async ({ toUserId, roomId, accepted, callType, title }) => {
    if (!toUserId || !roomId) return;
    const pendingInvite = pendingCallInvites.get(roomId);
    if (pendingInvite?.timeout) {
      clearTimeout(pendingInvite.timeout);
      pendingCallInvites.delete(roomId);
    }
    if (accepted) {
      await updateCallLog(roomId, { status: "accepted", acceptedAt: new Date() });
    } else {
      await updateCallLog(roomId, { status: "declined", endedAt: new Date() });
    }
    io.to(`user:${toUserId}`).emit("call:invite-response", {
      roomId,
      fromUserId: userId,
      fromUserName: socket.data.userName || "Student",
      accepted: Boolean(accepted),
      callType: callType || "video",
      title: title || "Private call"
    });
  });

  socket.on("call:signal", ({ roomId, targetSocketId, payload }) => {
    if (!roomId || !payload) return;
    const message = {
      roomId,
      fromSocketId: socket.id,
      fromUserId: userId,
      fromUserName: socket.data.userName || "Student",
      payload
    };
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:signal", message);
      return;
    }
    socket.to(`call:${roomId}`).emit("call:signal", message);
  });

  socket.on("call:join", async ({ roomId, userName, callType, audioEnabled = true, videoEnabled = true, sharingScreen = false }) => {
    if (!roomId) return;
    socket.data.userName = userName || socket.data.userName || "Student";
    socket.join(`call:${roomId}`);
    const participants = callRooms.get(roomId) || new Map();
    const existingParticipants = Array.from(participants.values());
    const participant = {
      socketId: socket.id,
      userId,
      userName: socket.data.userName,
      callType: callType || "video",
      audioEnabled: Boolean(audioEnabled),
      videoEnabled: Boolean(videoEnabled),
      sharingScreen: Boolean(sharingScreen)
    };
    participants.set(socket.id, participant);
    callRooms.set(roomId, participants);
    await updateCallLog(roomId, { status: "in-progress", acceptedAt: new Date() });
    socket.emit("call:participants", { roomId, participants: existingParticipants });
    socket.to(`call:${roomId}`).emit("call:participant-joined", { roomId, participant });
  });

  socket.on("call:media-state", ({ roomId, audioEnabled, videoEnabled, sharingScreen }) => {
    if (!roomId) return;
    const participants = callRooms.get(roomId);
    if (!participants?.has(socket.id)) return;
    const participant = {
      ...participants.get(socket.id),
      audioEnabled: Boolean(audioEnabled),
      videoEnabled: Boolean(videoEnabled),
      sharingScreen: Boolean(sharingScreen)
    };
    participants.set(socket.id, participant);
    callRooms.set(roomId, participants);
    socket.to(`call:${roomId}`).emit("call:media-state", { roomId, participant });
  });

  socket.on("call:leave", async ({ roomId }) => {
    if (!roomId) return;
    const participants = callRooms.get(roomId);
    if (!participants?.has(socket.id)) return;
    const participant = participants.get(socket.id);
    participants.delete(socket.id);
    socket.leave(`call:${roomId}`);
    socket.to(`call:${roomId}`).emit("call:participant-left", { roomId, socketId: socket.id, userId: participant?.userId, userName: participant?.userName });
    if (participants.size === 0) {
      callRooms.delete(roomId);
      const call = await CallLog.findOne({ roomId }).sort({ startedAt: -1 }).lean();
      await updateCallLog(roomId, { endedAt: new Date(), status: call?.status === "missed" ? "missed" : "completed", durationSeconds: callDurationSeconds({ acceptedAt: call?.acceptedAt, endedAt: new Date() }) });
    } else {
      callRooms.set(roomId, participants);
    }
  });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, sockets);
      }
    }
    emitPresence();
  });
});
// ── Push Notification Subscription ──────────────────────────────────────────
app.get("/notifications/vapid-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.post("/notifications/subscribe", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ message: "Invalid subscription" });
    // Upsert by endpoint to avoid duplicates
    await PushSubscription.findOneAndUpdate(
      { userId: req.user.id, "subscription.endpoint": subscription.endpoint },
      { userId: req.user.id, subscription },
      { upsert: true, new: true }
    );
    res.json({ message: "Subscribed to push notifications" });
  } catch (error) { next(error); }
});

app.delete("/notifications/unsubscribe", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ message: "ok" });
    await PushSubscription.deleteMany({ userId: req.user.id });
    res.json({ message: "Unsubscribed from push notifications" });
  } catch (error) { next(error); }
});

// ── Group Chat ───────────────────────────────────────────────────────────────
app.post("/groups/create", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Chat unavailable" });
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Group name is required" });
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.filter(Boolean) : [];
    const allMembers = [...new Set([req.user.id, ...memberIds])];
    const group = await GroupChat.create({ id: randomUUID(), name, creatorId: req.user.id, members: allMembers });
    res.status(201).json({ group });
  } catch (error) { next(error); }
});

app.get("/groups", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ groups: [] });
    const groups = await GroupChat.find({ members: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ groups });
  } catch (error) { next(error); }
});

app.get("/groups/:groupId/messages", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.json({ messages: [] });
    const group = await GroupChat.findOne({ id: req.params.groupId, members: req.user.id }).lean();
    if (!group) return res.status(403).json({ message: "Not a member of this group" });
    const messages = await GroupMessage.find({ groupId: req.params.groupId }).sort({ createdAt: 1 }).limit(200).lean();
    res.json({ messages: messages.map((m) => ({ ...m, text: decryptMessage(m) })) });
  } catch (error) { next(error); }
});

app.post("/groups/:groupId/members", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
    const group = await GroupChat.findOne({ id: req.params.groupId, creatorId: req.user.id }).lean();
    if (!group) return res.status(403).json({ message: "Only the group creator can add members" });
    await GroupChat.updateOne({ id: req.params.groupId }, { $addToSet: { members: req.body.userId } });
    res.json({ message: "Member added" });
  } catch (error) { next(error); }
});

app.delete("/groups/:groupId/members/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
    const group = await GroupChat.findOne({ id: req.params.groupId }).lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    const canRemove = group.creatorId === req.user.id || req.params.userId === req.user.id;
    if (!canRemove) return res.status(403).json({ message: "Not allowed" });
    await GroupChat.updateOne({ id: req.params.groupId }, { $pull: { members: req.params.userId } });
    res.json({ message: "Member removed" });
  } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));


app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Server error", detail: process.env.NODE_ENV === "production" ? undefined : error.message });
});

initSchema()
  .then(() => server.listen(port, () => console.log(`VITAP Connect API running on port ${port}`)))
  .catch((error) => {
    console.error("Failed to initialize Neo4j schema", error);
    process.exit(1);
  });



























