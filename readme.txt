# Team Task Manager

A production-ready full-stack web app for teams to plan projects, assign tasks, and track progress with role-based access (Admin / Member).

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + lucide-react
- **Backend:** Node 20 + Express + TypeScript + zod validation
- **Auth:** Firebase Authentication (email/password + Google)
- **Database:** Cloud Firestore (accessed via firebase-admin SDK from the API)
- **Deployment:** Two services on Railway, each built from a Dockerfile in this monorepo
- **Local dev:** Docker Compose with hot reload, or plain `npm run dev`

---

## Features

- Email/password and Google sign-in (Firebase Auth)
- Create teams, invite members by email, assign Admin or Member role
- Create projects within a team, archive when finished
- Create tasks with title, description, priority, due date, assignee, and status
- Drag-and-drop Kanban board (`To do` / `In progress` / `Done`)
- Personal dashboard: tasks by status (donut chart), overdue list, due-soon list, recent activity
- Role-based access control enforced server-side (admin SDK bypasses Firestore rules; client rules are deny-all as defense-in-depth)
- Validation everywhere (zod on the API, react-hook-form + zod on the client)
- Optimistic updates on the kanban via React Query, with rollback on error
- Light/dark theme toggle, persisted in localStorage
- Hardened API: helmet, CORS allowlist, body-size limit, rate limiting, JSON-only error envelope

---

## App Workflow & Feature Guide

### 1. Authentication & Onboarding
- **Sign Up / Login**: Users authenticate using Email/Password or Google Sign-In.
- **Initial State**: Upon first login, users land on a personal Dashboard. If they aren't part of any team, they are prompted to create or join one.

### 2. Team Management
- **Create a Team**: Any user can create a team, automatically becoming its Owner/Admin.
- **Invite Members**: Team Admins can search for registered users by email and add them to the team.
- **Role Assignment**: Admins can assign roles (`Admin` or `Member`) and manage team access.

### 3. Project Management
- **Create Projects**: Admins can create new projects and assign them to one or more specific Teams.
- **Project Detail Page**: Acts as the command center for a project, featuring a Kanban board for tasks and a tab to view/manage Assigned Teams.
- **Link Existing Teams**: Admins can continuously link other existing teams to a project as it grows.

### 4. Task Management (Kanban)
- **Create Tasks**: Any member of a project's assigned team can create tasks. Tasks include a Title, Description, Status, Priority, Due Date, and multiple Assignees.
- **Smart Assignee Selection**: Assignees are grouped by their respective teams, allowing for fast, multi-user assignment via a sleek dropdown UI.
- **Drag-and-Drop Kanban**: Tasks are visualized in "To do", "In progress", and "Done" lanes. Users can intuitively drag and drop tasks between columns to update their status.
- **Task Permissions**: Admins and the original task creator have full editing/deletion rights. Members can update the status of tasks assigned to them.

### 5. Personal Dashboard
- **Analytics**: A dynamic donut chart visualizes the breakdown of the user's task statuses.
- **My Tasks View**: A dedicated section pulling all tasks specifically assigned to the logged-in user, across all projects and teams.
- **Priority Tracking**: Automatically highlights "Overdue" and "Due Soon" tasks to keep productivity focused.

---

## Architecture

```
┌────────────────┐  HTTPS   ┌──────────────────────┐   firebase-admin  ┌─────────────────┐
│ React (Vite)   │ ───────▶ │ Express API (TS)     │ ────────────────▶ │ Cloud Firestore │
│ Firebase Auth  │ ◀─────── │ verifies ID token    │                   │   (5 collections)│
│  client SDK    │   JSON   │ enforces RBAC        │                   └─────────────────┘
└────────────────┘          └──────────────────────┘
        │                              │
        └──── Firebase ID token (Bearer) on every request
```

The web app holds the user's Firebase ID token, sends it to the Express API on every request, and the API validates it with `firebase-admin` before performing any Firestore read/write. **All RBAC is enforced in the API.**

---

## Repository layout

```
team-task-manager/
├── apps/
│   ├── api/                 Express + TypeScript (Dockerized)
│   │   ├── src/
│   │   │   ├── config/      env loader, firebase-admin init
│   │   │   ├── middleware/  auth, rbac, validate, error
│   │   │   ├── repos/       Firestore data access
│   │   │   ├── routes/      REST endpoints
│   │   │   ├── schemas/     zod schemas
│   │   │   ├── utils/       ApiError, asyncHandler, logger
│   │   │   ├── app.ts       composes Express middleware + routers
│   │   │   └── server.ts    listens on PORT
│   │   └── Dockerfile
│   └── web/                 React + Vite + Tailwind (Dockerized → Nginx)
│       ├── src/
│       │   ├── components/  shadcn UI primitives + AppShell
│       │   ├── features/    auth, dashboard, teams, projects, tasks
│       │   ├── hooks/       React Query hooks per resource
│       │   └── lib/         api client, firebase init, utils
│       ├── Dockerfile
│       └── nginx.conf
├── docker-compose.yml       local dev: api + web with hot reload
├── firestore.indexes.json   composite indexes (firebase deploy)
├── firestore.rules          deny-all for direct client access (defense-in-depth)
├── firebase.json
├── .firebaserc
├── .env.example             root template (copy values into apps/*/env)
└── README.md
```

---

## Data model (Firestore)

| Collection | Purpose | Notable fields |
|---|---|---|
| `users/{uid}` | profile mirror of Firebase user | `email`, `displayName`, `photoURL` |
| `teams/{id}` | a workspace | `ownerId`, `memberIds[]`, `roles{uid:'admin'\|'member'}` |
| `projects/{id}` | scoped to a team | `teamId`, `name`, `status` |
| `tasks/{id}` | top-level for cross-project queries | `projectId`, `teamId`, `assigneeId`, `status`, `priority`, `dueDate` |

Composite indexes are declared in `firestore.indexes.json`. Deploy them with `firebase deploy --only firestore:indexes`.

---

## RBAC matrix

| Action | Admin | Member |
|---|:---:|:---:|
| Create team (caller becomes owner+admin) | ✓ | ✓ |
| Update / delete team | ✓ | ✗ |
| Add or remove members, change roles | ✓ | leave self only |
| Create / update / delete project | ✓ | ✗ |
| Create task | ✓ | ✓ |
| Assign task to someone else | ✓ | ✗ |
| Update status of a task assigned to you | ✓ | ✓ |
| Edit any task field | ✓ | only tasks they created, before assignment |
| Delete task | ✓ | only tasks they created |
| View team / project / tasks | ✓ | ✓ (member only) |

The team owner cannot have their role changed or be removed.

---

## REST API reference

All routes are prefixed with `/api`. Every route except `/api/health` requires an `Authorization: Bearer <Firebase-ID-token>` header. Error envelope: `{ error: { code, message, details? } }`.

| Method | Path | Auth | RBAC |
|---|---|---|---|
| GET | `/health` | — | — |
| POST | `/auth/sync` | required | — |
| GET | `/users/me` | required | — |
| PATCH | `/users/me` | required | — |
| GET | `/users/search?email=...` | required | — |
| GET | `/teams` | required | self only |
| POST | `/teams` | required | — |
| GET | `/teams/:teamId` | required | member |
| PATCH | `/teams/:teamId` | required | admin |
| DELETE | `/teams/:teamId` | required | owner |
| POST | `/teams/:teamId/members` | required | admin |
| PATCH | `/teams/:teamId/members/:uid` | required | admin |
| DELETE | `/teams/:teamId/members/:uid` | required | admin or self |
| GET | `/teams/:teamId/projects` | required | member |
| POST | `/teams/:teamId/projects` | required | admin |
| GET | `/projects/:projectId` | required | member |
| PATCH | `/projects/:projectId` | required | admin |
| DELETE | `/projects/:projectId` | required | admin |
| GET | `/projects/:projectId/tasks` | required | member |
| POST | `/projects/:projectId/tasks` | required | member |
| GET | `/tasks/:taskId` | required | member |
| PATCH | `/tasks/:taskId` | required | field-level RBAC |
| DELETE | `/tasks/:taskId` | required | admin or creator |
| GET | `/dashboard` | required | self only |

---

## Environment variables

### `apps/api/.env`

| Name | Required | Notes |
|---|:---:|---|
| `NODE_ENV` | ✓ | `development` / `production` |
| `PORT` | ✓ | default `4000` |
| `WEB_ORIGIN` | ✓ | comma-separated allowlist for CORS, e.g. `https://your-web.up.railway.app` |
| `LOG_LEVEL` | — | default `info` |
| `FIREBASE_PROJECT_ID` | ✓ | matches Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT_B64` | prod | base64-encoded service-account JSON. **Local dev:** drop `serviceAccount.json` next to `package.json` instead. |

### `apps/web/.env`

| Name | Required |
|---|:---:|
| `VITE_FIREBASE_API_KEY` | ✓ |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✓ |
| `VITE_FIREBASE_PROJECT_ID` | ✓ |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✓ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✓ |
| `VITE_FIREBASE_APP_ID` | ✓ |
| `VITE_API_BASE_URL` | ✓ | e.g. `http://localhost:4000/api` locally |

A documented template is at the repo root in `.env.example`.

---

## One-time Firebase setup

1. Sign in to https://console.firebase.google.com with the project owner account and create a project named **Team Task Management System**.
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
3. **Firestore Database:** create a database (Production mode) in your nearest region.
4. **Project settings → General → Your apps:** register a Web app and copy the config block into `apps/web/.env` as the `VITE_FIREBASE_*` values.
5. **Project settings → Service accounts:** click **Generate new private key**. Save the file as `apps/api/serviceAccount.json` (already gitignored).
6. (Optional, recommended) install the Firebase CLI and deploy indexes/rules from the repo root:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:indexes,firestore:rules
   ```

---

## Local development

### Option A — Docker (recommended)

```bash
cp .env.example apps/api/.env       # then fill in firebase project id, etc.
cp .env.example apps/web/.env       # fill in VITE_FIREBASE_* values
cp /path/to/serviceAccount.json apps/api/serviceAccount.json

docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health (returns `{ "ok": true }`)

Both services hot-reload on file changes.

### Option B — Plain `npm`

```bash
npm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env
cp /path/to/serviceAccount.json apps/api/serviceAccount.json

npm run dev
```

This runs `apps/api` and `apps/web` concurrently.

---

## Deploying to Railway

Railway will build two services from this single repo, each with its own Dockerfile. Steps:

1. Push the repo to GitHub.
2. In Railway, create a new project → **Deploy from GitHub** → select this repo.
3. **Add service `api`:**
   - Root directory: `apps/api`
   - Build: Dockerfile (auto-detected)
   - Variables:
     - `NODE_ENV=production`
     - `PORT=4000`
     - `WEB_ORIGIN=https://<your-web-service>.up.railway.app`
     - `FIREBASE_PROJECT_ID=team-task-management-system`
     - `FIREBASE_SERVICE_ACCOUNT_B64=` (paste the base64-encoded service-account JSON; on macOS/Linux: `base64 -w0 serviceAccount.json`; on PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('serviceAccount.json'))`)
   - Healthcheck path: `/api/health`
4. **Add service `web`:**
   - Root directory: `apps/web`
   - Build: Dockerfile
   - Variables (these are baked into the build via Docker `ARG`):
     - All `VITE_FIREBASE_*` from your Firebase Web app config
     - `VITE_API_BASE_URL=https://<your-api-service>.up.railway.app/api`
5. Once the services are up, copy the web service's URL and add it under **Firebase Console → Authentication → Settings → Authorized domains** so popup/redirect sign-in works in production.
6. Smoke test with the verification checklist below.

---

## End-to-end verification

Run this flow against your live URLs (and locally before deploying):

- [ ] `GET /api/health` returns `{ "ok": true }`
- [ ] Sign up as user A → land on the empty dashboard, "Create a team" CTA visible
- [ ] Create a team → user A appears as `admin` in the members tab
- [ ] In an incognito window, sign up as user B
- [ ] Back as A, invite user B by email → B appears as `member`
- [ ] As A, create a project, then a task; assign it to B with a due date in the past
- [ ] As B, the task shows up under "My tasks" and "Overdue" on the dashboard
- [ ] B drags the task across the Kanban columns → status persists after refresh
- [ ] B attempts `DELETE /api/projects/:id` from devtools → API returns 403
- [ ] Donut chart and stat cards on the dashboard match Firestore reality
- [ ] In Firebase Console → Firestore, confirm collections `users`, `teams`, `projects`, `tasks` and the expected docs

---

## Production hardening

- Helmet headers, CORS allowlist, JSON body limit `100kb`
- `express-rate-limit`: 600 requests / 15 minutes / IP
- All inputs validated with zod schemas; uniform error envelope
- Firestore client rules are deny-all — only the API (admin SDK) can read or write
- API container runs as a non-root user under tini; `/api/health` is a Docker healthcheck
- Web is served by Nginx with gzip, immutable cache headers on hashed assets, and SPA fallback

---

## Scripts

From the repo root:

| Script | What it does |
|---|---|
| `npm run dev` | Run API and Web concurrently (no Docker) |
| `npm run build` | Build both apps |
| `npm run typecheck` | TS check both apps |
| `npm run lint` | Lint where configured |
| `npm run docker:up` | `docker compose up --build` |
| `npm run docker:down` | `docker compose down` |

---

## License

Private — built as an assignment submission.
