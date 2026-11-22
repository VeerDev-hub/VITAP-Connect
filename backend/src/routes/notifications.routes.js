import { Router } from "express";
import * as notifications from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();

router.get("/vapid-key", notifications.vapidKey);
router.get("/", requireAuth, h(notifications.list));
router.post("/subscribe", requireAuth, h(notifications.subscribe));
router.delete("/unsubscribe", requireAuth, h(notifications.unsubscribe));
router.delete("/clear", requireAuth, h(notifications.clear));
router.delete("/:id", requireAuth, h(notifications.remove));

export default router;
