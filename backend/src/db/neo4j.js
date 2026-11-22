import neo4j from "neo4j-driver";
import { config } from "../config/env.js";

const driver = neo4j.driver(config.neo4j.uri, neo4j.auth.basic(config.neo4j.username, config.neo4j.password));

export async function runQuery(cypher, params = {}) {
  const session = driver.session({ database: config.neo4j.database });
  try {
    return await session.executeWrite((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

export async function readQuery(cypher, params = {}) {
  const session = driver.session({ database: config.neo4j.database });
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
  await runQuery("CREATE CONSTRAINT notification_id IF NOT EXISTS FOR (n:Notification) REQUIRE n.id IS UNIQUE");
}

export async function closeDriver() {
  await driver.close();
}
