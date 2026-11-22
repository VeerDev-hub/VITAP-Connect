import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { apiLimiter, authLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();

router.get("/debug", requireAuth, auth.debug);
router.post("/send-register-otp", apiLimiter, h(auth.sendRegisterOtp));
router.post("/register", authLimiter, h(auth.register));
router.post("/login", authLimiter, h(auth.login));
router.post("/logout", auth.logout);
router.post("/forgot-password", h(auth.forgotPassword));
router.post("/verify-otp", h(auth.verifyOtp));
router.post("/reset-password", h(auth.resetPassword));

export default router;
