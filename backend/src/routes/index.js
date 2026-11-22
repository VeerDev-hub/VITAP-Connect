import { Router } from "express";
import * as misc from "../controllers/misc.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import authRoutes from "./auth.routes.js";
import chatRoutes from "./chat.routes.js";
import connectionRoutes from "./connections.routes.js";
import groupRoutes from "./groups.routes.js";
import notificationRoutes from "./notifications.routes.js";
import projectRoutes from "./projects.routes.js";
import userRoutes from "./users.routes.js";

const router = Router();

router.get("/health", misc.health);

router.use("/auth", apiLimiter, authRoutes);
router.use("/users", apiLimiter, userRoutes);
router.use("/connections", apiLimiter, connectionRoutes);
router.use("/projects", apiLimiter, projectRoutes);
router.use("/chat", apiLimiter, chatRoutes);
router.use("/groups", apiLimiter, groupRoutes);
router.use("/notifications", apiLimiter, notificationRoutes);

router.get("/config/call", requireAuth, h(misc.callConfig));
router.get("/calls/history", requireAuth, h(misc.callHistory));

router.post("/feedback", requireAuth, h(misc.submitFeedback));
router.get("/feedback", requireAuth, requireAdmin, h(misc.listFeedback));

router.get("/analytics/summary", requireAuth, h(misc.analyticsSummary));

router.get("/admin/users", requireAuth, requireAdmin, h(misc.adminListUsers));
router.patch("/admin/users/:id/status", requireAuth, requireAdmin, h(misc.adminSetUserStatus));

export default router;
