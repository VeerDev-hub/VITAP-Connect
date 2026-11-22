import { readQuery, runQuery } from "../db/neo4j.js";
import { getStudentById, saveProfileRelationships, studentFromRecord } from "../services/students.js";
import { list } from "../utils/normalize.js";

export async function getMe(req, res) {
  res.json({ user: await getStudentById(req.user.id) });
}

export async function updateMe(req, res) {
  const updates = {
    name: req.body.name || req.user.name,
    department: req.body.department || req.user.department,
    year: Number(req.body.year || req.user.year || 1),
    graduationYear: Number(req.body.graduationYear || req.user.graduationYear || new Date().getFullYear() + 1),
    goal: req.body.goal || req.user.goal || "Find project partners",
    availability: req.body.availability || req.user.availability || "Evenings",
    club: req.body.club || "",
    bio: req.body.bio || "",
    github: req.body.github || req.user.github || "",
    linkedin: req.body.linkedin || req.user.linkedin || "",
    instagram: req.body.instagram || req.user.instagram || "",
    updatedAt: new Date().toISOString()
  };
  await runQuery("MATCH (s:Student {id: $id}) SET s += $updates", { id: req.user.id, updates });
  await saveProfileRelationships(req.user.id, list(req.body.skills), list(req.body.interests), updates.department, updates.club);
  res.json({ user: await getStudentById(req.user.id) });
}

export async function uploadAvatar(req, res) {
  await runQuery("MATCH (s:Student {id: $id}) SET s.avatarUrl = $filename", { id: req.user.id, filename: req.file.filename });
  res.json({ user: await getStudentById(req.user.id) });
}

export async function deleteAvatar(req, res) {
  await runQuery("MATCH (s:Student {id: $id}) REMOVE s.avatarUrl", { id: req.user.id });
  res.json({ user: await getStudentById(req.user.id) });
}

export async function search(req, res) {
  const result = await readQuery(`
    MATCH (me:Student {id: $id})
    MATCH (s:Student)
    WHERE s.id <> me.id AND coalesce(s.status, 'active') <> 'blocked' AND coalesce(s.role, 'student') <> 'admin' AND NOT EXISTS { MATCH (me)-[:BLOCKED]-(s) }
    WITH me, s,
         EXISTS { MATCH (me)-[:FRIEND_OF]-(s) } AS isFriend,
         EXISTS { MATCH (me)-[:REQUESTED_CONNECTION]->(s) } AS requestSent,
         EXISTS { MATCH (s)-[:REQUESTED_CONNECTION]->(me) } AS requestReceived
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH s, isFriend, requestSent, requestReceived, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN s { .*, skills: skills, interests: interests, connectionStatus: CASE WHEN isFriend THEN "friend" WHEN requestSent THEN "requestSent" WHEN requestReceived THEN "requestReceived" ELSE "none" END } AS student
    ORDER BY student.name
  `, { id: req.user.id });
  const users = result.records.map((record) => studentFromRecord(record));

  const q = String(req.query.q || "").toLowerCase().trim();
  const skill = String(req.query.skill || "").toLowerCase().trim();
  const department = String(req.query.department || "").toLowerCase().trim();
  const year = String(req.query.year || "");

  const filtered = users.filter((user) => {
    const matchesQ = !q || user.name?.toLowerCase().includes(q) || user.regNumber?.toLowerCase().includes(q);
    const matchesSkill = !skill || user.skills?.some((s) => s.toLowerCase().includes(skill));
    const matchesDept = !department || user.department?.toLowerCase().includes(department);
    const matchesYear = !year || String(user.year) === year;
    return matchesQ && matchesSkill && matchesDept && matchesYear;
  });

  res.json({ users: filtered });
}

export async function recommendations(req, res) {
  const result = await readQuery(`
    MATCH (me:Student {id: $id})
    MATCH (s:Student)
    WHERE s.id <> me.id AND coalesce(s.status, 'active') <> 'blocked' AND coalesce(s.role, 'student') <> 'admin' AND NOT EXISTS { MATCH (me)-[:BLOCKED]-(s) }
    WITH me, s,
         EXISTS { MATCH (me)-[:FRIEND_OF]-(s) } AS isFriend,
         EXISTS { MATCH (me)-[:REQUESTED_CONNECTION]->(s) } AS requestSent,
         EXISTS { MATCH (s)-[:REQUESTED_CONNECTION]->(me) } AS requestReceived
    WHERE isFriend = false
    OPTIONAL MATCH (me)-[:HAS_SKILL]->(sharedSkill:Skill)<-[:HAS_SKILL]-(s)
    OPTIONAL MATCH (me)-[:INTERESTED_IN]->(sharedInterest:Interest)<-[:INTERESTED_IN]-(s)
    OPTIONAL MATCH (me)-[:FRIEND_OF]-(mutualFriend:Student)-[:FRIEND_OF]-(s)
    WITH me, s, requestSent, requestReceived, collect(DISTINCT sharedSkill.name) AS sharedSkills, collect(DISTINCT sharedInterest.name) AS sharedInterests, count(DISTINCT mutualFriend) AS mutualFriends
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH me, s, requestSent, requestReceived, sharedSkills, sharedInterests, mutualFriends, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    WITH s, skills, interests, sharedSkills, sharedInterests, mutualFriends, requestSent, requestReceived,
         size(sharedSkills) * 3 + size(sharedInterests) * 2 + mutualFriends + CASE WHEN s.department = me.department THEN 2 ELSE 0 END + CASE WHEN s.year = me.year THEN 1 ELSE 0 END AS score
    RETURN s { .*, skills: skills, interests: interests, score: score,
               connectionStatus: CASE WHEN requestSent THEN "requestSent" WHEN requestReceived THEN "requestReceived" ELSE "none" END,
               reason: CASE WHEN size(sharedSkills) > 0 THEN "Shared skill: " + sharedSkills[0] WHEN size(sharedInterests) > 0 THEN "Shared interest: " + sharedInterests[0] WHEN mutualFriends > 0 THEN "Mutual friend path" WHEN score > 0 THEN "Same department or year" ELSE "New campus match" END } AS student
    ORDER BY student.score DESC, student.name
    LIMIT 6
  `, { id: req.user.id });
  res.json({ users: result.records.map((record) => studentFromRecord(record)) });
}
