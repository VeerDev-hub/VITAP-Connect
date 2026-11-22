import webPush from "web-push";
import { config } from "../config/env.js";
import { mongoReady } from "../db/mongo.js";
import { PushSubscription } from "../models/index.js";

const pushEnabled = Boolean(config.vapid.publicKey && config.vapid.privateKey);

if (pushEnabled) {
  webPush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
}

export async function sendPushToUser(userId, payload) {
  if (!(await mongoReady)) return;
  if (!pushEnabled) return;
  const subs = await PushSubscription.find({ userId }).lean();
  const results = await Promise.allSettled(
    subs.map((s) => webPush.sendNotification(s.subscription, JSON.stringify(payload)))
  );
  // Remove expired subscriptions (410 Gone)
  const expiredIds = results
    .map((result, i) => (result.status === "rejected" && result.reason?.statusCode === 410 ? subs[i]._id : null))
    .filter(Boolean);
  if (expiredIds.length) {
    await PushSubscription.deleteMany({ _id: { $in: expiredIds } });
  }
}
