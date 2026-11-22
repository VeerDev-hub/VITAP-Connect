import express from "express";
import multer from "multer";
import path from "node:path";
import { config } from "../config/env.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const avatarUpload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }).single("avatar");

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
const CONTENT_TYPES = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };

// Serves both legacy (extensionless) and new avatar files with image headers.
export const serveUploads = express.static(config.uploadDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!ext || IMAGE_EXTENSIONS.includes(ext)) {
      res.setHeader("Content-Type", CONTENT_TYPES[ext] || "image/jpeg");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  }
});
