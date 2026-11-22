import { Router } from "express";
import * as users from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { avatarUpload } from "../middleware/upload.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/me", h(users.getMe));
router.patch("/me", h(users.updateMe));
router.post("/me/avatar", avatarUpload, h(users.uploadAvatar));
router.delete("/me/avatar", h(users.deleteAvatar));
router.get("/search", h(users.search));
router.get("/recommendations", h(users.recommendations));

export default router;
