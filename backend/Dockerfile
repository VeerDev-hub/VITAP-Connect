# ── Base: dependencies manifest ──────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ── Dev: all deps + nodemon (source is bind-mounted by docker-compose) ───────
FROM base AS dev
RUN npm ci
COPY . .
RUN mkdir -p uploads
EXPOSE 5000
CMD ["npm", "run", "dev:docker"]

# ── Prod: runtime deps only, non-root ────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
