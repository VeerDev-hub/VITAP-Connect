import dns from "node:dns";
import mongoose from "mongoose";
import { config } from "../config/env.js";

if (config.mongoUri?.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

// Resolves to true when MongoDB is connected, false when chat storage is disabled.
export const mongoReady = config.mongoUri
  ? mongoose.connect(config.mongoUri).then(() => true).catch((error) => {
      console.warn("MongoDB chat disabled:", error.message);
      return false;
    })
  : Promise.resolve(false);
