// Removes the fake demo students (and everything they created) from a
// database, leaving real students untouched.
//
// Demo data came from the old seed scripts: five students with fixed emails,
// the "demo.23bce0001" demo account, their projects, groups and messages.
//
//   node scripts/removeDemoData.js            dry run: shows what would be deleted
//   node scripts/removeDemoData.js --apply    deletes it
//
// Uses the normal settings (backend/.env, or ENV_FILE=... to point elsewhere).
import mongoose from "mongoose";
import { mongoReady } from "../src/db/mongo.js";
import { closeDriver, readQuery, runQuery } from "../src/db/neo4j.js";
import { CallLog, DirectMessage, Feedback, GroupChat, GroupMessage, ProjectMessage, PushSubscription } from "../src/models/index.js";
import { config } from "../src/config/env.js";

const APPLY = process.argv.includes("--apply");
const DEMO_EMAILS = [
  "aarav.menon@vitapstudent.ac.in", "diya.sharma@vitapstudent.ac.in", "kabir.reddy@vitapstudent.ac.in",
  "meera.nair@vitapstudent.ac.in", "rohan.iyer@vitapstudent.ac.in", "demo.23bce0001@vitapstudent.ac.in"
];
const tag = APPLY ? "  " : "  [dry-run]";

try {
  console.log(`Database: ${config.neo4j.uri}`);
  console.log(APPLY ? "Mode: APPLY (deleting)\n" : "Mode: DRY RUN (nothing is deleted; add --apply)\n");

  const users = await readQuery("MATCH (s:Student) WHERE s.email IN $emails OR s.id = 'demo-student-0001' RETURN s.id AS id, s.name AS name, s.email AS email", { emails: DEMO_EMAILS });
  const ids = users.records.map((r) => r.get("id"));
  console.log(`Demo students found: ${ids.length}`);
  users.records.forEach((r) => console.log(`${tag} ${r.get("name")} <${r.get("email")}>`));
  if (!ids.length) {
    console.log("\nNothing to remove. This database has no demo students.");
    process.exit(0);
  }

  // Only projects CREATED by a demo student (real students' projects are kept,
  // even if a demo student had joined them).
  const projects = await readQuery(`
    MATCH (s:Student)-[:CREATED_PROJECT]->(p:Project) WHERE s.id IN $ids
    RETURN p.id AS id, p.title AS title, COUNT { (r:Student)-[:WORKS_ON]->(p) WHERE NOT r.id IN $ids } AS realMembers`, { ids });
  const projectIds = projects.records.map((r) => r.get("id")).concat("demo-project-campus-events");
  console.log(`\nDemo projects: ${projects.records.length}`);
  projects.records.forEach((r) => {
    const real = r.get("realMembers").toNumber?.() ?? r.get("realMembers");
    console.log(`${tag} ${r.get("title")}${real ? `  (warning: ${real} real student(s) had joined; it is still deleted)` : ""}`);
  });

  if (APPLY) {
    await runQuery("MATCH (p:Project) WHERE p.id IN $projectIds DETACH DELETE p", { projectIds });
    await runQuery("MATCH (s:Student) WHERE s.id IN $ids OPTIONAL MATCH (s)-[:HAS_NOTIFICATION]->(n:Notification) DETACH DELETE n, s", { ids });
  }

  if (await mongoReady) {
    const demoGroups = await GroupChat.find({ $or: [{ creatorId: { $in: ids } }, { id: "demo-group-hackathon-squad" }] }).lean();
    const groupIds = demoGroups.map((g) => g.id);
    const counts = {
      "direct messages": await DirectMessage.countDocuments({ participants: { $in: ids } }),
      "group chats": groupIds.length,
      "group messages": await GroupMessage.countDocuments({ $or: [{ groupId: { $in: groupIds } }, { senderId: { $in: ids } }] }),
      "project messages": await ProjectMessage.countDocuments({ $or: [{ projectId: { $in: projectIds } }, { senderId: { $in: ids } }] }),
      "call logs": await CallLog.countDocuments({ $or: [{ callerId: { $in: ids } }, { calleeId: { $in: ids } }] }),
      feedback: await Feedback.countDocuments({ userId: { $in: ids } })
    };
    console.log("\nChat history:");
    for (const [k, v] of Object.entries(counts)) console.log(`${tag} ${v} ${k}`);

    if (APPLY) {
      await DirectMessage.deleteMany({ participants: { $in: ids } });
      await GroupMessage.deleteMany({ $or: [{ groupId: { $in: groupIds } }, { senderId: { $in: ids } }] });
      await GroupChat.deleteMany({ id: { $in: groupIds } });
      // Real groups a demo student was added to: just take them out.
      await GroupChat.updateMany({ members: { $in: ids } }, { $pull: { members: { $in: ids } } });
      await ProjectMessage.deleteMany({ $or: [{ projectId: { $in: projectIds } }, { senderId: { $in: ids } }] });
      await CallLog.deleteMany({ $or: [{ callerId: { $in: ids } }, { calleeId: { $in: ids } }] });
      await Feedback.deleteMany({ userId: { $in: ids } });
      await PushSubscription.deleteMany({ userId: { $in: ids } });
    }
  } else {
    console.log("\n(MongoDB not reachable: chat history was not checked.)");
  }

  console.log(APPLY ? "\nDone. Demo data removed; real students untouched." : "\nDry run finished. Run again with --apply to delete.");
} finally {
  await closeDriver();
  await mongoose.disconnect();
}
