import { Router } from "express";
import * as groups from "../controllers/groups.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", h(groups.list));
router.post("/create", h(groups.create));
router.get("/:groupId/messages", h(groups.messages));
router.post("/:groupId/members", h(groups.addMember));
router.delete("/:groupId/members/:userId", h(groups.removeMember));

export default router;
