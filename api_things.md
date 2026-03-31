# 🔌 DeployNova: The API & Connectivity Map

This document is the "Source of Truth" for how the **DeployNova Front-end (Client)** talks to the **DeployNova Back-end (Server)** and how the entire ecosystem is linked via APIs.

---

## 🛰️ 1. The Frontend-Backend Bridge
The **Client** (React/Vite Port 4001) connects to the **Server** (Express Port 4000) using two primary channels:

1. **Axios (HTTP)**: Used for all standard data requests (getting projects, logging in, creating rules). 
   - *Base URL*: `http://localhost:4000/api`
2. **Socket.io (WebSockets)**: Used for real-time build streaming. 
   - *Logic*: When you click "Deploy," the server starts a process and "emits" logs to the client instantly.

---

## 🗺️ 2. The API Map (Why, What, How)

### 🔐 Authentication (`/api/auth`)
| Endpoint | Method | Why (Purpose) | How (Details) |
| :--- | :--- | :--- | :--- |
| `/register` | POST | Create a new Master Account | Sends `name`, `email`, `password` |
| `/login` | POST | Securely enter the platform | Returns a **JWT Token** for future requests |
| `/me` | GET | Verify current user session | Requires **JWT** in the Header |
| `/github-token`| PUT | Link your GitHub account | Saves your Personal Access Token for repo access |

### 🏗️ Projects (`/api/projects`)
*All project routes support both JWT and Internal API Keys.*
| Endpoint | Method | Why (Purpose) | How (Details) |
| :--- | :--- | :--- | :--- |
| `/` | GET | List all your active projects | Returns an array of synced projects |
| `/` | POST | Create a new project | Takes `repoUrl`, `name`, and `framework` |
| `/:id` | GET | View project details | Returns metadata + project config |
| `/:id` | DELETE | Remove a project | Wipes project data and cloud sync |

### 🚀 Deployments (`/api/deploy`)
| Endpoint | Method | Why (Purpose) | How (Details) |
| :--- | :--- | :--- | :--- |
| `/:projectId` | POST | **TRIGGER DEPLOYMENT** | Starts the "Indestructible" build engine |
| `/detail/:id` | GET | Get specific build details | Fetches the commit info and status |
| `/logs/:id` | GET | Fetch permanent build logs | Retrieves logs from MongoDB Atlas audit trail |
| `/stop/:id` | POST | Force-kill a running build | Stops the system process and frees the port |

### 🧠 Automation (Internal Sync)
- **LifeOS ↔ DeployNova**: LifeOS uses a **Secret API Key** to talk to the Project APIs. This allows LifeOS to trigger "Automated Builds" without a user being logged in.

---

## ⚡ 3. Real-time Socket Events
When a deployment is running, the server emits these events to the Dashboard:
- `deploy:log`: Sends the latest terminal line (e.g., "npm install...").
- `deploy:stage`: Updates the progress bar (Cloning → Installing → Building → Live).
- `deploy:failed`: Notifies the UI if a build crashes with a full stack trace.

---

## 🛡️ 4. API Security (The Guard)
1. **JWT Header**: All requests from the UI must include `Authorization: Bearer <TOKEN>`.
2. **Validation Middleware**: Every request is audited by our "Sanity Check" middleware to prevent SQL injection or illegal characters in repo URLs.

**This API architecture ensures that DeployNova is not just a dashboard, but a professional, cross-connected deployment infrastructure.** 🏁💎🚀🌐🛸🏎️💨
