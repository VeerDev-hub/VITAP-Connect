import { config } from "../config/env.js";

const clientUrl = () => config.clientUrls[0] || "http://localhost:5173";

function otpEmail({ heading, intro, otp, footer }) {
  return `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#6366f1;margin-bottom:8px">VITAP Connect</h2>
            <h3 style="margin-bottom:16px">${heading}</h3>
            <p style="color:#475569">${intro} It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px;color:#1e293b;margin:24px 0">${otp}</div>
            <p style="color:#94a3b8;font-size:13px">${footer}</p>
          </div>
        `;
}

export const registerOtpEmail = (otp) => ({
  subject: "Verify your email – VITAP Connect",
  html: otpEmail({
    heading: "Verify your email address",
    intro: "Use this one-time code to complete your registration.",
    otp,
    footer: "If you did not attempt to register on VITAP Connect, please ignore this email."
  })
});

export const passwordResetOtpEmail = (otp) => ({
  subject: "Your Password Reset OTP – VITAP Connect",
  html: otpEmail({
    heading: "Password Reset OTP",
    intro: "Use the following one-time password to reset your account password.",
    otp,
    footer: "If you did not request a password reset, you can safely ignore this email."
  })
});

export const connectionRequestEmail = (sender) => ({
  subject: `${sender.name} wants to connect on VITAP Connect`,
  html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#6366f1">New Connection Request</h2>
            <p><strong>${sender.name}</strong> (${sender.department}, Year ${sender.year}) sent you a connection request on VITAP Connect.</p>
            <a href="${clientUrl()}/connections" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">View Request</a>
          </div>`
});

export const connectionAcceptedEmail = (accepter) => ({
  subject: `${accepter.name} accepted your connection request`,
  html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#6366f1">Connection Accepted 🎉</h2>
            <p><strong>${accepter.name}</strong> accepted your connection request on VITAP Connect. You can now message each other!</p>
            <a href="${clientUrl()}/chat" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">Start Chatting</a>
          </div>`
});
