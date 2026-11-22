import { Router } from "express";
import * as connections from "../controllers/connections.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", h(connections.list));
router.post("/request", h(connections.request));
router.post("/cancel", h(connections.cancel));
router.post("/accept", h(connections.accept));
router.post("/reject", h(connections.reject));
router.post("/remove", h(connections.remove));
router.post("/block", h(connections.block));
router.get("/mutual/:userId", h(connections.mutual));
router.get("/path/:userId", h(connections.path));

export default router;
