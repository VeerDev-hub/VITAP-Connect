# VITAP Connect

VITAP Connect is a full-stack Web Technology project that uses React, Express, and Neo4j AuraDB to help students discover peers, form project groups, manage connections, and explain graph database use cases during viva.

## Stack

- Frontend: React, Vite, React Router, Tailwind CSS, Axios, Framer Motion, React Hook Form, react-hot-toast, react-force-graph
- Backend: Node.js, Express, Neo4j driver, JWT, bcrypt, multer, helmet, CORS, dotenv
- Database: Neo4j AuraDB
- Deployment target: Vercel frontend, Render backend, Neo4j AuraDB cloud

## Setup

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix backend install
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
npm.cmd --prefix backend run seed:admin
```

Run locally:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
```

PowerShell may block `npm.ps1`; use `npm.cmd` commands as shown.


