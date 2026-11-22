import { randomUUID } from "node:crypto";
import { readQuery, runQuery } from "../db/neo4j.js";
import { mongoReady } from "../db/mongo.js";
import { ProjectMessage } from "../models/index.js";
import { emitToUser } from "../socket/io.js";
import { integer, list as toList } from "../utils/normalize.js";
import { serializeProjectMessage } from "../utils/messages.js";

export async function list(req, res) {
  const result = await readQuery(`
    MATCH (p:Project)
    OPTIONAL MATCH (p)<-[:CREATED_PROJECT]-(owner:Student)
    OPTIONAL MATCH (p)-[:NEEDS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (p)<-[:WORKS_ON]-(member:Student)
    OPTIONAL MATCH (requester:Student)-[:REQUESTED_TO_JOIN]->(p)
    WITH p, owner, collect(DISTINCT skill.name) AS skills, collect(DISTINCT member { .id, .name }) AS members, collect(DISTINCT requester { .id, .name, .department, .year }) AS joinRequests
    RETURN p { .*, ownerId: owner.id, ownerName: owner.name, skills: skills, members: members, joinRequests: joinRequests, isOwner: owner.id = $userId, isMember: any(member IN members WHERE member.id = $userId), hasRequested: any(request IN joinRequests WHERE request.id = $userId) } AS project
    ORDER BY project.createdAt DESC
  `, { userId: req.user.id });
  res.json({ projects: result.records.map((record) => record.get("project")) });
}

export async function create(req, res) {
  const project = {
    id: randomUUID(),
    title: req.body.title,
    description: req.body.description || "",
    type: req.body.type || "Project",
    hackathonName: req.body.hackathonName || "",
    deadline: req.body.deadline || "",
    callRoomId: randomUUID(),
    createdAt: new Date().toISOString()
  };
  await runQuery(`
    MATCH (creator:Student {id: $userId})
    CREATE (p:Project) SET p = $project
    MERGE (creator)-[:CREATED_PROJECT]->(p)
    MERGE (creator)-[:WORKS_ON]->(p)
    FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (p)-[:NEEDS_SKILL]->(skill))
  `, { userId: req.user.id, project, skills: toList(req.body.skills) });
  res.status(201).json({ project });
}

export async function remove(req, res) {
  const result = await runQuery(`
    MATCH (:Student {id: $userId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
    DETACH DELETE p
    RETURN count(p) AS deleted
  `, { userId: req.user.id, projectId: req.params.id });
  const deletedByOwner = integer(result.records[0].get("deleted")) > 0;

  if (!deletedByOwner) {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the project owner or an admin can delete this project" });
    }
    await runQuery("MATCH (p:Project {id: $id}) DETACH DELETE p", { id: req.params.id });
  }
  if (await mongoReady) await ProjectMessage.deleteMany({ projectId: req.params.id });
  res.json({ message: "Project deleted" });
}

export async function requestJoin(req, res) {
  const message = `${req.user.name} requested to join your project`;
  const createdAt = new Date().toISOString();
  const result = await runQuery(`
    MATCH (student:Student {id: $userId}), (p:Project {id: $projectId})
    WHERE NOT (student)-[:WORKS_ON]->(p)
    MERGE (student)-[:REQUESTED_TO_JOIN {createdAt: $createdAt}]->(p)
    WITH p, student
    MATCH (owner:Student)-[:CREATED_PROJECT]->(p)
    CREATE (n:Notification {id: $notificationId, message: $message, createdAt: $createdAt})
    MERGE (owner)-[:HAS_NOTIFICATION]->(n)
    RETURN owner.id AS ownerId
  `, { userId: req.user.id, projectId: req.body.projectId, createdAt, notificationId: randomUUID(), message });

  if (result.records.length > 0) {
    emitToUser(result.records[0].get("ownerId"), "notification", { message });
  }
  res.status(201).json({ message: "Join request sent" });
}

export async function cancelRequest(req, res) {
  await runQuery(`
    MATCH (:Student {id: $userId})-[request:REQUESTED_TO_JOIN]->(:Project {id: $projectId})
    DELETE request
  `, { userId: req.user.id, projectId: req.body.projectId });
  res.json({ message: "Project request cancelled" });
}

export async function accept(req, res) {
  const result = await runQuery(`
    MATCH (:Student {id: $ownerId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
    MATCH (student:Student {id: $studentId})-[request:REQUESTED_TO_JOIN]->(p)
    DELETE request
    MERGE (student)-[:WORKS_ON]->(p)
    WITH student, p
    MATCH (owner:Student {id: $ownerId})
    OPTIONAL MATCH (owner)-[:HAS_NOTIFICATION]->(n:Notification)
    WHERE n.message CONTAINS student.name AND n.message CONTAINS "join your project"
    DETACH DELETE n
    RETURN student.name AS name
  `, { ownerId: req.user.id, projectId: req.body.projectId, studentId: req.body.studentId });
  if (!result.records.length) return res.status(403).json({ message: "Only the project owner can accept requests" });
  res.json({ message: "Student added to project" });
}

export async function reject(req, res) {
  const result = await runQuery(`
    MATCH (owner:Student {id: $ownerId})-[:CREATED_PROJECT]->(p:Project {id: $projectId})
    MATCH (student:Student {id: $studentId})-[request:REQUESTED_TO_JOIN]->(p)
    DELETE request
    WITH owner, student
    OPTIONAL MATCH (owner)-[:HAS_NOTIFICATION]->(n:Notification)
    WHERE n.message CONTAINS student.name AND n.message CONTAINS "join your project"
    DETACH DELETE n
    RETURN count(request) AS rejected
  `, { ownerId: req.user.id, projectId: req.body.projectId, studentId: req.body.studentId });
  if (!integer(result.records[0].get("rejected"))) return res.status(403).json({ message: "Only the project owner can reject requests" });
  res.json({ message: "Join request rejected" });
}

export async function messages(req, res) {
  if (!(await mongoReady)) return res.json({ messages: [] });
  const docs = await ProjectMessage.find({ projectId: req.params.id }).sort({ createdAt: 1 }).limit(100).lean();
  res.json({ messages: docs.map((message) => serializeProjectMessage(message)) });
}

export async function recommendations(req, res) {
  const result = await readQuery(`
    MATCH (me:Student {id: $id})-[:HAS_SKILL]->(skill:Skill)<-[:NEEDS_SKILL]-(p:Project)
    WHERE NOT (me)-[:WORKS_ON]->(p)
    WITH p, collect(DISTINCT skill.name) AS matchingSkills
    RETURN p { .*, matchingSkills: matchingSkills } AS project
    LIMIT 6
  `, { id: req.user.id });
  res.json({ projects: result.records.map((record) => record.get("project")) });
}
