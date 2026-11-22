import { readQuery, runQuery } from "../db/neo4j.js";
import { integer, sanitizeStudent } from "../utils/normalize.js";

export function studentFromRecord(record, key = "student") {
  return sanitizeStudent(record.get(key));
}

export async function getStudentById(id) {
  const result = await readQuery(`
    MATCH (s:Student {id: $id})
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH s, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN s { .*, skills: skills, interests: interests } AS student
  `, { id });
  return result.records[0] ? studentFromRecord(result.records[0]) : null;
}

// `where` is interpolated into Cypher: only pass trusted, hard-coded fragments.
export async function getStudentList(where = "s.id <> $id", params = {}) {
  const result = await readQuery(`
    MATCH (s:Student)
    WHERE ${where}
    OPTIONAL MATCH (s)-[:HAS_SKILL]->(skill:Skill)
    OPTIONAL MATCH (s)-[:INTERESTED_IN]->(interest:Interest)
    WITH s, collect(DISTINCT skill.name) AS skills, collect(DISTINCT interest.name) AS interests
    RETURN s { .*, skills: skills, interests: interests } AS student
    ORDER BY student.name
  `, params);
  return result.records.map((record) => studentFromRecord(record));
}

export async function findStudentByEmail(email) {
  const result = await readQuery("MATCH (s:Student {email: $email}) RETURN s", { email });
  return result.records[0]?.get("s").properties || null;
}

export async function areFriends(userId, otherUserId) {
  const result = await readQuery(`
    MATCH (:Student {id: $userId})-[friend:FRIEND_OF]-(:Student {id: $otherUserId})
    RETURN count(friend) AS count
  `, { userId, otherUserId });
  return integer(result.records[0]?.get("count")) > 0;
}

export async function saveProfileRelationships(userId, skills, interests, department, club) {
  await runQuery(`
    MATCH (s:Student {id: $userId})
    OPTIONAL MATCH (s)-[r:HAS_SKILL|INTERESTED_IN|BELONGS_TO|MEMBER_OF]->()
    DELETE r
    WITH s
    FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (s)-[:HAS_SKILL]->(skill))
    FOREACH (name IN $interests | MERGE (interest:Interest {name: name}) MERGE (s)-[:INTERESTED_IN]->(interest))
    FOREACH (_ IN CASE WHEN $department <> "" THEN [1] ELSE [] END | MERGE (department:Department {name: $department}) MERGE (s)-[:BELONGS_TO]->(department))
    FOREACH (_ IN CASE WHEN $club <> "" THEN [1] ELSE [] END | MERGE (club:Club {name: $club}) MERGE (s)-[:MEMBER_OF]->(club))
  `, { userId, skills, interests, department: department || "", club: club || "" });
}
