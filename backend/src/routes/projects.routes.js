import { Router } from "express";
import * as projects from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", h(projects.list));
router.get("/recommendations", h(projects.recommendations));
router.post("/create", h(projects.create));
router.post("/request-join", h(projects.requestJoin));
router.post("/cancel-request", h(projects.cancelRequest));
router.post("/accept", h(projects.accept));
router.post("/reject", h(projects.reject));
router.get("/:id/messages", h(projects.messages));
router.delete("/:id", h(projects.remove));

export default router;
