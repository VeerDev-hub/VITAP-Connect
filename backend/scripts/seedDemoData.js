import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { closeDriver, initSchema, readQuery, runQuery } from "../src/db.js";

const passwordHash = await bcrypt.hash("Student@12345", 12);
const now = new Date().toISOString();

const students = [
  {
    id: randomUUID(),
    name: "Aarav Menon",
    email: "aarav.menon@vitapstudent.ac.in",
    department: "Computer Science",
    year: 3,
    graduationYear: 2027,
    club: "AI Club",
    skills: ["React", "Node.js", "Neo4j", "Tailwind CSS"],
    interests: ["AI", "Web Development", "Hackathons"],
    goal: "Find project partners",
    availability: "Evenings",
    bio: "Full-stack learner building graph-powered student collaboration tools."
  },
  {
    id: randomUUID(),
    name: "Diya Sharma",
    email: "diya.sharma@vitapstudent.ac.in",
    department: "Information Technology",
    year: 2,
    graduationYear: 2028,
    club: "Design Studio",
    skills: ["UI Design", "React", "Figma", "Data Analysis"],
    interests: ["Startups", "Mobile Apps", "Open Source"],
    goal: "Build portfolio projects",
    availability: "Weekends",
    bio: "Product-minded UI designer who enjoys turning rough ideas into polished interfaces."
  },
  {
    id: randomUUID(),
    name: "Rohan Iyer",
    email: "rohan.iyer@vitapstudent.ac.in",
    department: "Electronics",
    year: 4,
    graduationYear: 2026,
    club: "Robotics Club",
    skills: ["Python", "Machine Learning", "IoT", "Java"],
    interests: ["Research", "AI", "Cybersecurity"],
    goal: "Join hackathon teams",
    availability: "After classes",
    bio: "Electronics student exploring intelligent hardware systems and ML prototypes."
  },
  {
    id: randomUUID(),
    name: "Meera Nair",
    email: "meera.nair@vitapstudent.ac.in",
    department: "Computer Science",
    year: 3,
    graduationYear: 2027,
    club: "Cloud Community",
    skills: ["Express", "MongoDB", "Cloud", "Node.js"],
    interests: ["Cloud", "Open Source", "Web Development"],
    goal: "Learn from seniors",
    availability: "Flexible",
    bio: "Backend-focused student interested in scalable APIs, cloud deployment, and team projects."
  },
  {
    id: randomUUID(),
    name: "Kabir Reddy",
    email: "kabir.reddy@vitapstudent.ac.in",
    department: "Mechanical",
    year: 2,
    graduationYear: 2028,
    club: "Innovation Lab",
    skills: ["Python", "Data Analysis", "UI Design", "Machine Learning"],
    interests: ["Hackathons", "Startups", "Research"],
    goal: "Find project partners",
    availability: "Weekends",
    bio: "Mechanical student who likes data-driven product ideas and interdisciplinary hackathons."
  }
].map((student) => ({ ...student, passwordHash, role: "student", status: "active", emailVerified: true, verifiedAt: now, createdAt: now }));

const projects = [
  {
    id: randomUUID(),
    title: "VITAP Skill Graph",
    type: "Project",
    description: "A graph-based recommendation tool for finding classmates by skills and interests.",
    skills: ["React", "Neo4j", "Node.js"],
    ownerEmail: "aarav.menon@vitapstudent.ac.in",
    memberEmails: ["diya.sharma@vitapstudent.ac.in", "meera.nair@vitapstudent.ac.in"],
    deadline: "2026-05-15",
    hackathonName: ""
  },
  {
    id: randomUUID(),
    title: "HackFest AI Mentor",
    type: "Hackathon",
    description: "A hackathon team building an AI mentor that suggests project tasks and teammates.",
    skills: ["Python", "Machine Learning", "UI Design"],
    ownerEmail: "rohan.iyer@vitapstudent.ac.in",
    memberEmails: ["kabir.reddy@vitapstudent.ac.in"],
    deadline: "2026-04-30",
    hackathonName: "VITAP HackFest"
  }
];

try {
  await initSchema();
  // Removed destructive global deletes to prevent data loss.
  // MERGE will be used below to update or create students without wiping others.

  for (const student of students) {
    await runQuery(`
      CREATE (s:Student) SET s = $student
      WITH s
      MERGE (department:Department {name: $student.department})
      MERGE (s)-[:BELONGS_TO]->(department)
      MERGE (club:Club {name: $student.club})
      MERGE (s)-[:MEMBER_OF]->(club)
      FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (s)-[:HAS_SKILL]->(skill))
      FOREACH (name IN $interests | MERGE (interest:Interest {name: name}) MERGE (s)-[:INTERESTED_IN]->(interest))
    `, { student, skills: student.skills, interests: student.interests });
  }

  await runQuery(`
    MATCH (a:Student {email: "aarav.menon@vitapstudent.ac.in"}), (d:Student {email: "diya.sharma@vitapstudent.ac.in"}), (m:Student {email: "meera.nair@vitapstudent.ac.in"}), (r:Student {email: "rohan.iyer@vitapstudent.ac.in"}), (k:Student {email: "kabir.reddy@vitapstudent.ac.in"})
    MERGE (a)-[:FRIEND_OF]->(d) MERGE (d)-[:FRIEND_OF]->(a)
    MERGE (a)-[:FRIEND_OF]->(m) MERGE (m)-[:FRIEND_OF]->(a)
    MERGE (r)-[:FRIEND_OF]->(k) MERGE (k)-[:FRIEND_OF]->(r)
    MERGE (k)-[:REQUESTED_CONNECTION]->(d)
  `);

  for (const project of projects) {
    await runQuery(`
      MATCH (owner:Student {email: $ownerEmail})
      CREATE (p:Project {id: $project.id, title: $project.title, type: $project.type, description: $project.description, deadline: $project.deadline, hackathonName: $project.hackathonName, callRoomId: $callRoomId, createdAt: $createdAt})
      MERGE (owner)-[:CREATED_PROJECT]->(p)
      MERGE (owner)-[:WORKS_ON]->(p)
      FOREACH (name IN $skills | MERGE (skill:Skill {name: name}) MERGE (p)-[:NEEDS_SKILL]->(skill))
    `, { project, ownerEmail: project.ownerEmail, skills: project.skills, callRoomId: randomUUID(), createdAt: now });

    for (const email of project.memberEmails) {
      await runQuery(`
        MATCH (member:Student {email: $email}), (p:Project {id: $projectId})
        MERGE (member)-[:WORKS_ON]->(p)
      `, { email, projectId: project.id });
    }
  }

  await runQuery(`
    MATCH (student:Student {email: "meera.nair@vitapstudent.ac.in"}), (p:Project {title: "HackFest AI Mentor"})
    MERGE (student)-[:REQUESTED_TO_JOIN {createdAt: $createdAt}]->(p)
  `, { createdAt: now });

  const summary = await readQuery(`
    MATCH (s:Student)
    OPTIONAL MATCH (p:Project)
    RETURN count(DISTINCT s) AS students, count(DISTINCT p) AS projects
  `);
  const record = summary.records[0];
  console.log(`Demo data ready: ${record.get("students").toNumber()} students including admin, ${record.get("projects").toNumber()} projects.`);
  console.log("Student password for all demo members: Student@12345");
} finally {
  await closeDriver();
}
