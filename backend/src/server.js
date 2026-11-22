import http from "node:http";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { initSchema } from "./db/neo4j.js";
import { createSocketServer } from "./socket/index.js";

const server = http.createServer(createApp());
createSocketServer(server);

initSchema()
  .then(() => server.listen(config.port, () => console.log(`VITAP Connect API running on port ${config.port}`)))
  .catch((error) => {
    console.error("Failed to initialize Neo4j schema", error);
    process.exit(1);
  });
