import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { originCheck } from "./middleware/originCheck.js";
import { serveUploads } from "./middleware/upload.js";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();
  const corsOptions = { origin: config.clientUrls, credentials: true };

  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", cors(corsOptions), serveUploads);
  app.use(originCheck);

  app.use(routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
