import { config } from "../config/env.js";
import { mongoReady } from "../db/mongo.js";
import { readQuery, runQuery } from "../db/neo4j.js";
import { PushSubscription } from "../models/index.js";

export async function list(req, res) {
  const result = await readQuery(`
    MATCH (:Student {id: $id})-[:HAS_NOTIFICATION]->(n:Notification)
    RETURN n ORDER BY n.createdAt DESC LIMIT 15
  `, { id: req.user.id });
  const notifications = result.records.map((record) => {
    const n = record.get("n");
    return { ...n.properties, id: n.properties.id || n.elementId || n.identity?.toString() };
  });
  res.json({ notifications });
}

export async function clear(req, res) {
  await runQuery(`
    MATCH (:Student {id: $id})-[:HAS_NOTIFICATION]->(n:Notification)
    DETACH DELETE n
  `, { id: req.user.id });
  res.json({ message: "Notifications cleared" });
}

export async function remove(req, res) {
  // Match on the 'id' property or the internal element id (legacy notifications).
  await runQuery(`
    MATCH (:Student {id: $userId})-[:HAS_NOTIFICATION]->(n:Notification)
    WHERE n.id = $id OR elementId(n) = $id OR toString(id(n)) = $id
    DETACH DELETE n
  `, { userId: req.user.id, id: String(req.params.id) });
  res.json({ message: "Notification deleted" });
}

export function vapidKey(req, res) {
  res.json({ publicKey: config.vapid.publicKey || null });
}

export async function subscribe(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ message: "Invalid subscription" });
  // Upsert by endpoint to avoid duplicates
  await PushSubscription.findOneAndUpdate(
    { userId: req.user.id, "subscription.endpoint": subscription.endpoint },
    { userId: req.user.id, subscription },
    { upsert: true, new: true }
  );
  res.json({ message: "Subscribed to push notifications" });
}

export async function unsubscribe(req, res) {
  if (!(await mongoReady)) return res.json({ message: "ok" });
  await PushSubscription.deleteMany({ userId: req.user.id });
  res.json({ message: "Unsubscribed from push notifications" });
}
