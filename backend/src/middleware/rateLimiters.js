import rateLimit from "express-rate-limit";

const common = { standardHeaders: true, legacyHeaders: false };

export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Please try again in 15 minutes." }
});

export const otpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please wait 15 minutes." }
});

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  max: 120,
  message: { message: "Too many requests. Please slow down." }
});

export const messageLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Sending messages too fast. Please slow down." }
});
