import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "../config/env.js";

// AES-256-GCM encryption at rest for chat messages.
const key = createHash("sha256").update(config.chatKeySource).digest();

export function encryptMessage(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const cipherText = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
  return { cipherText, iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

export function decryptMessage(message) {
  if (message?.text) return message.text;
  if (!message?.cipherText || !message?.iv || !message?.authTag) return "";
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(message.iv, "base64"));
  decipher.setAuthTag(Buffer.from(message.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(message.cipherText, "base64")), decipher.final()]).toString("utf8");
}
