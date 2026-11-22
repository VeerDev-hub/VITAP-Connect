import nodemailer from "nodemailer";
import { config } from "../config/env.js";

// Thrown when the mail provider responds but reports a delivery failure.
export class MailDeliveryError extends Error {}

let smtpTransport;
let gmailTransport;

function getSmtpTransport() {
  const { smtp } = config.mail;
  if (!smtp.host) return null;
  smtpTransport ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
  });
  return smtpTransport;
}

function getGmailTransport() {
  if (!config.mail.gmailUser || !config.mail.gmailPass) return null;
  gmailTransport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.mail.gmailUser, pass: config.mail.gmailPass }
  });
  return gmailTransport;
}

/**
 * Transactional mail (OTPs). Must be delivered, so failures throw.
 * Uses SMTP when SMTP_HOST is set (e.g. Mailpit locally), otherwise the
 * Google Apps Script webhook (cloud hosts block outbound SMTP).
 */
export async function sendTransactionalMail({ to, subject, html }) {
  const smtp = getSmtpTransport();
  if (smtp) {
    await smtp.sendMail({ from: config.mail.from, to, subject, html });
    return;
  }

  const response = await fetch(config.mail.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html })
  });
  const data = await response.json();
  if (data.status !== "success") throw new MailDeliveryError(data.message || "Unknown error");
}

/** Best-effort notification mail. Never throws. */
export async function sendNotificationMail({ to, subject, html }) {
  const transport = getSmtpTransport() || getGmailTransport();
  if (!transport) return;
  try {
    await transport.sendMail({ from: config.mail.from, to, subject, html });
  } catch (error) {
    console.warn("Email notification failed:", error.message);
  }
}
