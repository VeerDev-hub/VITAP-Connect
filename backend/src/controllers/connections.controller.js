import { randomUUID } from "node:crypto";
import { readQuery, runQuery } from "../db/neo4j.js";
import { connectionAcceptedEmail, connectionRequestEmail } from "../services/emailTemplates.js";
import { sendNotificationMail } from "../services/mail.js";
import { isUserOnline } from "../services/presence.js";
import { sendPushToUser } from "../services/push.js";
import { getStudentById, studentFromRecord } from "../services/students.js";
import { emitToUser } from "../socket/io.js";

// Push + email for a user who is not connected over sockets.
async function notifyOffline(userId, { push, email }) {
  if (isUserOnline(userId)) return;
  const user = await getStudentById(userId);
  sendPushToUser(userId, push).catch(() => {});
  if (user?.email) sendNotificationMail({ to: user.email, ...email });
}

export async function list(req, res) {
  const requests = await readQuery(`
    MATCH (from:Student)-[:REQUESTED_CONNECTION]->(:Student {id: $id})
    OPTIONAL MATCH (from)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (from)-[:INTERESTED_IN]->(interest:Interest)
    WITH from, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN from { .*, skills: skills, interests: interests } AS student
  `, { id: req.user.id });
  const accepted = await readQuery(`
    MATCH (:Student {id: $id})-[:FRIEND_OF]-(friend:Student)
    OPTIONAL MATCH (friend)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (friend)-[:INTERESTED_IN]->(interest:Interest)
    WITH friend, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN DISTINCT friend { .*, skills: skills, interests: interests } AS student
  `, { id: req.user.id });
  res.json({
    requests: requests.records.map((record) => studentFromRecord(record)),
    accepted: accepted.records.map((record) => studentFromRecord(record))
  });
}

export async function request(req, res) {
  const { toUserId } = req.body;
  if (toUserId === req.user.id) return res.status(400).json({ message: "Cannot connect with yourself" });
  const message = `${req.user.name} sent you a connection request`;

  await runQuery(`
    MATCH (from:Student {id: $fromUserId}), (to:Student {id: $toUserId})
    WHERE NOT (from)-[:FRIEND_OF]-(to)
    MERGE (from)-[:REQUESTED_CONNECTION]->(to)
    CREATE (n:Notification {id: $notificationId, message: $message, createdAt: $createdAt})
    MERGE (to)-[:HAS_NOTIFICATION]->(n)
  `, { fromUserId: req.user.id, toUserId, notificationId: randomUUID(), message, createdAt: new Date().toISOString() });

  emitToUser(toUserId, "notification", { message });
  await notifyOffline(toUserId, {
    push: { title: "New Connection Request", body: message, url: "/connections" },
    email: connectionRequestEmail(req.user)
  });
  res.status(201).json({ message: "Connection request sent" });
}

export async function cancel(req, res) {
  await runQuery(`
    MATCH (:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(:Student {id: $toUserId})
    DELETE request
  `, { fromUserId: req.user.id, toUserId: req.body.toUserId });
  res.json({ message: "Connection request cancelled" });
}

export async function accept(req, res) {
  const { fromUserId } = req.body;
  await runQuery(`
    MATCH (from:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(to:Student {id: $toUserId})
    DELETE request
    MERGE (from)-[:FRIEND_OF]->(to)
    MERGE (to)-[:FRIEND_OF]->(from)
    WITH from, to
    OPTIONAL MATCH (to)-[:HAS_NOTIFICATION]->(n:Notification)
    WHERE n.message CONTAINS from.name AND n.message CONTAINS "connection request"
    DETACH DELETE n
  `, { fromUserId, toUserId: req.user.id });

  const message = `${req.user.name} accepted your connection request`;
  emitToUser(fromUserId, "notification", { message });
  await notifyOffline(fromUserId, {
    push: { title: "Connection Accepted!", body: message, url: "/connections" },
    email: connectionAcceptedEmail(req.user)
  });
  res.json({ message: "Connection accepted" });
}

export async function reject(req, res) {
  await runQuery(`
    MATCH (from:Student {id: $fromUserId})-[request:REQUESTED_CONNECTION]->(to:Student {id: $toUserId})
    DELETE request
    WITH from, to
    OPTIONAL MATCH (to)-[:HAS_NOTIFICATION]->(n:Notification)
    WHERE n.message CONTAINS from.name AND n.message CONTAINS "connection request"
    DETACH DELETE n
  `, { fromUserId: req.body.fromUserId, toUserId: req.user.id });
  res.json({ message: "Connection request rejected" });
}

export async function remove(req, res) {
  await runQuery(`
    MATCH (me:Student {id: $me}), (friend:Student {id: $friendId})
    OPTIONAL MATCH (me)-[a:FRIEND_OF]-(friend)
    DELETE a
  `, { me: req.user.id, friendId: req.body.friendId });
  res.json({ message: "Friend removed" });
}

export async function block(req, res) {
  await runQuery(`
    MATCH (me:Student {id: $me}), (friend:Student {id: $friendId})
    OPTIONAL MATCH (me)-[friendship:FRIEND_OF]-(friend)
    OPTIONAL MATCH (me)-[sent:REQUESTED_CONNECTION]->(friend)
    OPTIONAL MATCH (friend)-[received:REQUESTED_CONNECTION]->(me)
    DELETE friendship, sent, received
    MERGE (me)-[block:BLOCKED]->(friend)
    SET block.createdAt = $createdAt
  `, { me: req.user.id, friendId: req.body.friendId, createdAt: new Date().toISOString() });
  res.json({ message: "User blocked" });
}

export async function mutual(req, res) {
  const result = await readQuery(`
    MATCH (:Student {id: $me})-[:FRIEND_OF]-(mutual:Student)-[:FRIEND_OF]-(:Student {id: $other})
    RETURN DISTINCT mutual { .* } AS student
  `, { me: req.user.id, other: req.params.userId });
  res.json({ mutual: result.records.map((record) => studentFromRecord(record)) });
}

export async function path(req, res) {
  const result = await readQuery(`
    MATCH (me:Student {id: $me}), (other:Student {id: $other})
    MATCH path = shortestPath((me)-[:FRIEND_OF*..5]-(other))
    RETURN [student IN nodes(path) | student.name] AS path
  `, { me: req.user.id, other: req.params.userId });
  res.json({ path: result.records[0]?.get("path") || [] });
}
