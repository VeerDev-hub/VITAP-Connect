import { Router } from "express";
import * as chat from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/conversations", h(chat.conversations));
router.get("/messages/:userId", h(chat.messages));
router.post("/read/:userId", h(chat.markRead));
router.delete("/messages/:messageId", h(chat.deleteMessage));

export default router;
