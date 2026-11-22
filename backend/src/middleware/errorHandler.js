import { config } from "../config/env.js";

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({ message: "Server error", detail: config.isProduction ? undefined : error.message });
}
