# VITAP Connect

A collaboration network for VIT-AP University students. Sign up with an `@vitapstudent.ac.in` email, list your skills, and find teammates. Then run projects, chat, and call from one place.

- **Discover** students by name, registration number, skill, department or year.
- **Recommendations** ranked by a Neo4j graph query: shared skills ×3, shared interests ×2, same department +2, mutual connections +1, same year +1. Each suggestion shows the reason it was made.
- **Collaborations**: post a project or hackathon team, list the skills you need, and accept join requests. Every project gets a team channel and a call room.
- **Messages**: direct chats, group chats and project rooms over Socket.io, with typing indicators and read receipts. Messages are encrypted at rest with AES-256-GCM.
- **Calls**: WebRTC voice and video with screen sharing, plus call history.
- **Notifications**: in-app, plus Web Push and email when you're offline.
- **Admin**: block or unblock students, remove projects, and read feedback.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router, react-hook-form, Socket.io client |
| Backend | Node.js, Express, Socket.io, web-push, nodemailer |
| Data | Neo4j (people, skills, projects, relationships) and MongoDB (messages, calls, feedback, push subscriptions) |
| Auth | Email OTP sign-up, JWT in an httpOnly cookie, one active session per account |

## Project layout

```
backend/
  src/
    app.js            Express app (middleware + routes)
    server.js         HTTP server + Socket.io bootstrap
    config/env.js     All environment configuration
    db/               Neo4j driver, MongoDB connection
    models/           Mongoose models
    middleware/       auth, rate limits, origin check, uploads, errors
    services/         mail, push, encryption, students, calls, presence
    controllers/      route handlers
    routes/           Express routers
    socket/           realtime handlers (direct, group, project, calls)
  scripts/            seedAdmin, seedDemoData, seedDemoAccount
frontend/
  src/
    components/ui/    design-system primitives (Avatar, TagInput, OtpInput…)
    components/layout AppLayout (sidebar + mobile tabs), PublicLayout, AuthLayout
    pages/            one file per route
docker-compose.yml    full offline stack
render.yaml           Render Blueprint (API + static site)
```

## Run locally with Docker (recommended)

Needs Docker Desktop. Nothing else is required, and the stack runs fully offline.

```bash
npm run docker:up     # builds and starts Neo4j, MongoDB, Mailpit, API and frontend
npm run docker:seed   # first run only: creates the admin account
```

| | |
| --- | --- |
| App | http://localhost:5173 |
| API | http://localhost:5000/health |
| Mailpit (OTP emails land here) | http://localhost:8025 |
| Neo4j Browser | http://localhost:7474 (`neo4j` / `vitap-local-dev`) |

Admin login: `admin@vitapconnect.local` / `Admin@12345`. Register students through the app; the codes land in Mailpit. There is no fake demo data any more.

To remove the old demo students (Aarav, Diya, Kabir, Meera, Rohan and `demo.23bce0001`) from a database, run `npm run remove-demo` in `backend/`. It previews by default; add `-- --apply` to delete. Real students are never touched.

Docker reads `backend/.env.docker`, which contains throwaway local values only. Your real `backend/.env` is never copied into an image.

## Run locally without Docker

Point `backend/.env` at your own Neo4j and MongoDB (see `backend/.env.example`), then:

```bash
npm run install:all
npm run dev           # API on :5000, frontend on :5173
npm run seed:admin
```

## Deploy (Render + Vercel)

The API runs on Render (`render.yaml`) and the website on Vercel (`frontend/vercel.json`). Step-by-step instructions, including how to keep all existing students and messages, are in `DEPLOY_RENDER_VERCEL.txt`.
