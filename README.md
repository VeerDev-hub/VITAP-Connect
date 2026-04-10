# 🚀 VITAP Connect
### The Ultimate Campus Collaboration Hub for VIT-AP University

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🌟 Overview

**VITAP Connect** is a next-generation social networking and collaboration platform specifically tailored for VIT-AP students. It moves beyond traditional texting by using a **Neo4j-powered Graph Relationship Model** to visually map connections, shared interests, and skill overlaps, making it effortless to find the perfect teammate for your next hackathon or research project.

---

## ✨ Key Features

### 🧩 Smart Matching Engine (Neo4j)
- Visualize your campus network through an interactive **Graph Showcase**.
- Get personalized collaborator recommendations based on skill sets, department, and academic goals.

### 💬 Military-Grade Secure Chat
- **Secure Messaging**: Peer-to-peer and group messaging powered by **Socket.io**.
- **Message Prioritization**: Active conversations and new messages are automatically sorted to the top of your sidebar.
- **Privacy First**: Built with session-based authentication to keep your conversations private between you and your connections.

---

## 🔐 Advanced Encryption (AES-256-GCM)

We take student privacy seriously. All chat messages in **VITAP Connect** are secured using a robust encryption layer before they are stored in the database.

### How it Works:
1.  **AES-256-GCM Algorithm**: We use the Advanced Encryption Standard (AES) with a 256-bit key in **Galois/Counter Mode (GCM)**. This provides both confidentiality and **integrity** (ensuring the message hasn't been tampered with).
2.  **Unique IV & AuthTag**: Every single message is encrypted with a unique **Initialization Vector (IV)**. A dedicated **Authentication Tag** is generated to verify the authenticity of the message during decryption.
3.  **Key Derivation**: Secure keys are managed server-side to ensure that even if a database snapshot is leaked, the actual message contents remain unreadable without the master encryption key.

### 🕵️‍♂️ Technical Transparency
Students are encouraged to review our security implementation:
- **Encryption Logic**: [server.js L213](https://github.com/VeerDev-hub/VITAP-Connect/blob/master/backend/src/server.js#L213)
- **Decryption Logic**: [server.js L220](https://github.com/VeerDev-hub/VITAP-Connect/blob/master/backend/src/server.js#L220)

---

## 📅 Dashboard Widgets (New!)

Stay organized and campus-ready with our premium dashboard widgets:
- **📍 Live Weather Hub**: Real-time temperature and conditions for **Amaravati/Vijayawada** (University Location).
- **⏰ Smart Clock**: Precise local IST time with elegant glassmorphic visuals.
- **📊 Profile Strength**: Detailed analytics on your profile completeness.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Tailwind CSS, Framer Motion, Lucide React |
| **Backend** | Node.js, Express, Socket.io, Web Push API |
| **Databases** | Neo4j (Graph), MongoDB (Messages), Redis (Cache ready) |
| **Auth** | JWT (JSON Web Tokens) with Cookie-based persistence |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Neo4j AuraDB (or local)
- MongoDB Atlas (or local)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/VeerDev-hub/VITAP-Connect.git

# Setup Backend
cd backend
npm install
# Create .env file with your credentials

# Setup Frontend
cd ../frontend
npm install
```

### 3. Run Locally
```bash
# Backend
cd backend
node src/server.js

# Frontend
cd frontend
npm run dev
```

---

## 🔒 Security First
- All sensitive student data is hashed using `bcryptjs`.
- CSRF protection via Origin validation on all mutating requests.
- Secure, HTTP-only cookie-based authentication.

---

## 🤝 Contributing
We welcome contributions from fellow VIT-APians! 
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

### 👨‍💻 Developed by Veer Pratap Singh
Built with ❤️ for a more connected campus.
