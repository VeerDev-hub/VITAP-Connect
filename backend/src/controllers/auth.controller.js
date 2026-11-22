import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { config } from "../config/env.js";
import { readQuery, runQuery } from "../db/neo4j.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../middleware/auth.js";
import { passwordResetOtpEmail, registerOtpEmail } from "../services/emailTemplates.js";
import { MailDeliveryError, sendTransactionalMail } from "../services/mail.js";
import { findStudentByEmail, getStudentById, saveProfileRelationships } from "../services/students.js";
import { list } from "../utils/normalize.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const COLLEGE_EMAIL_MESSAGE = `Use your VIT-AP student email ending with ${config.collegeEmailDomain}`;

const normalizeEmail = (value) => String(value || "").toLowerCase().trim();
const isCollegeEmail = (email) => email.endsWith(config.collegeEmailDomain);
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Stores a fresh OTP node (replacing any pending one) and emails it.
// Returns true when sent; otherwise it has already written an error response.
async function issueOtp(res, { label, email, template }) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await runQuery(`MATCH (ot:${label} {email: $email}) DELETE ot`, { email });
  await runQuery(`CREATE (ot:${label} {email: $email, otp: $otp, expiresAt: $expiresAt})`, { email, otp, expiresAt });

  try {
    await sendTransactionalMail({ to: email, ...template(otp) });
    return true;
  } catch (error) {
    if (error instanceof MailDeliveryError) {
      console.error("Mail delivery error:", error.message);
      res.status(500).json({ message: "Failed to deliver email: " + error.message });
    } else {
      console.error("Mail transport error:", error);
      res.status(500).json({ message: "Failed to connect to email service." });
    }
    return false;
  }
}

export function debug(req, res) {
  res.json({ user: req.user, env: { API_BASE_URL: process.env.API_BASE_URL, NODE_ENV: process.env.NODE_ENV } });
}

export async function sendRegisterOtp(req, res) {
  const email = normalizeEmail(req.body.email);
  if (!isCollegeEmail(email)) return res.status(400).json({ message: COLLEGE_EMAIL_MESSAGE });
  if (await findStudentByEmail(email)) return res.status(409).json({ message: "Email already registered" });

  if (await issueOtp(res, { label: "RegOtpToken", email, template: registerOtpEmail })) {
    res.json({ message: "OTP sent to your email" });
  }
}

export async function register(req, res) {
  const skills = list(req.body.skills);
  const interests = list(req.body.interests);
  if (req.body.confirmPassword && req.body.password !== req.body.confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  const email = normalizeEmail(req.body.email);
  if (!isCollegeEmail(email)) return res.status(400).json({ message: COLLEGE_EMAIL_MESSAGE });
  if (await findStudentByEmail(email)) return res.status(409).json({ message: "Email already registered" });

  const otp = String(req.body.otp || "").trim();
  const otpResult = await readQuery(
    "MATCH (ot:RegOtpToken {email: $email, otp: $otp}) WHERE ot.expiresAt > $now RETURN ot",
    { email, otp, now: new Date().toISOString() }
  );
  if (!otpResult.records.length) return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
  await runQuery("MATCH (ot:RegOtpToken {email: $email}) DELETE ot", { email });

  const now = new Date().toISOString();
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
    verifiedAt: now,
    createdAt: now,
    jwtVersion: randomUUID()
  };

  await runQuery("CREATE (s:Student) SET s = $user", { user });
  await saveProfileRelationships(user.id, skills, interests, user.department, req.body.club || "");
  const created = await getStudentById(user.id);
  setAuthCookie(res, signToken(created));
  res.status(201).json({ user: created });
}

export async function login(req, res) {
  const user = await findStudentByEmail(normalizeEmail(req.body.email));
  if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status === "blocked") return res.status(403).json({ message: "Account blocked by admin" });

  // Rotating jwtVersion logs out sessions on other devices.
  await runQuery("MATCH (s:Student {id: $id}) SET s.jwtVersion = $version", { id: user.id, version: randomUUID() });

  const safe = await getStudentById(user.id);
  setAuthCookie(res, signToken(safe));
  res.json({ user: safe });
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
}

export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);
  if (!isCollegeEmail(email)) return res.status(400).json({ message: "Use your VIT-AP student email" });
  if (!(await findStudentByEmail(email))) return res.status(404).json({ message: "No account found with this email" });

  if (await issueOtp(res, { label: "OtpToken", email, template: passwordResetOtpEmail })) {
    res.json({ message: "OTP sent to your email" });
  }
}

export async function verifyOtp(req, res) {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();
  const result = await readQuery(
    "MATCH (ot:OtpToken {email: $email, otp: $otp}) WHERE ot.expiresAt > $now RETURN ot",
    { email, otp, now: new Date().toISOString() }
  );
  if (!result.records.length) return res.status(400).json({ message: "Invalid or expired OTP" });

  // OTP is valid – delete it and issue a short-lived reset token
  await runQuery("MATCH (ot:OtpToken {email: $email}) DELETE ot", { email });
  const resetToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  await runQuery("CREATE (rt:ResetToken {email: $email, token: $resetToken, expiresAt: $tokenExpiresAt})", { email, resetToken, tokenExpiresAt });
  res.json({ message: "OTP verified", resetToken });
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  const result = await readQuery("MATCH (rt:ResetToken {token: $token}) WHERE rt.expiresAt > $now RETURN rt", { token, now: new Date().toISOString() });
  if (!result.records.length) return res.status(400).json({ message: "Invalid or expired reset token" });

  const user = await findStudentByEmail(result.records[0].get("rt").properties.email);
  if (!user) return res.status(404).json({ message: "User not found" });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await runQuery("MATCH (s:Student {id: $id}) SET s.passwordHash = $passwordHash", { id: user.id, passwordHash });
  await runQuery("MATCH (rt:ResetToken {token: $token}) DELETE rt", { token });
  res.json({ message: "Password reset successfully" });
}
