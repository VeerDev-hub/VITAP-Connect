import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { fileURLToPath } from "node:url";
import path from "node:path";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
dotenv.config({ path: envPath });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

export async function runQuery(cypher, params = {}) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE || "neo4j" });
  try {
    return await session.executeWrite((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

export async function readQuery(cypher, params = {}) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE || "neo4j" });
  try {
    return await session.executeRead((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

export async function initSchema() {
  await runQuery("CREATE CONSTRAINT student_id IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE");
  await runQuery("CREATE CONSTRAINT student_email IF NOT EXISTS FOR (s:Student) REQUIRE s.email IS UNIQUE");
  await runQuery("CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE");
  await runQuery("CREATE CONSTRAINT interest_name IF NOT EXISTS FOR (i:Interest) REQUIRE i.name IS UNIQUE");
  await runQuery("CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE");
}

export async function closeDriver() {
  await driver.close();
}
