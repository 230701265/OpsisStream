# OPSIS — Full Project Specification: Frontend + Backend + UI/UX

This document provides a structured, future‑proof technical description of OPSIS with recommended tech stacks, architecture diagrams (conceptual), API contract examples, data models, deployment and testing plans, and an integrated UI/UX summary (compact) for rapid implementation.

---

## 0. Summary

- **Purpose:** Deliver an accessible online/offline exam platform focused on blind and low‑vision users.
- **Scope:** Frontend (React + TypeScript), Backend (Node.js/TypeScript + Drizzle + PostgreSQL), Accessibility-first UI/UX, Dev tooling, CI/CD, monitoring, and infra guidance for Neon/Postgres and serverless deployments.

---

## 1. Goals & Non‑Goals

### Goals
- Provide robust accessible exam experience with TTS, voice input, keyboard navigation and WCAG AA compliance.
- Scalable, secure backend supporting role-based authentication and audited exam sessions.
- Future-forward stack with strong TypeScript typing, infra-as-code readiness, and extensibility for AI-driven features.

### Non‑Goals (v1)
- Full-blown proctoring or biometric identification (can be added as opt-in later).
- Native mobile apps (progressive web app recommended first).

---

## 2. High-Level Architecture

- **Client (browser):** React + TypeScript, Vite, PWAs for offline support. UI using Tailwind + shadcn + Radix UI primitives.
- **API layer:** Node.js (Cloudflare Workers/Node on Fly/Serverless) or Remix/Next API routes depending on SSR needs. Express + TypeScript for simple deployments.
- **DB:** PostgreSQL (Neon or managed Postgres). Drizzle ORM for typesafe queries/migrations.
- **Auth:** Clerk/Auth.js/Firebase Auth with session cookies + server session management for exam timing integrity.
- **Storage:** S3-compatible object store (Supabase Storage, DigitalOcean Spaces, or AWS S3) for attachments and transcripts.
- **Speech/ASR:** Browser SpeechRecognition (for client voice), optional server-side ASR (Whisper/AssemblyAI/GCP) for higher accuracy and analytics.
- **Realtime:** WebSocket or server-sent events (SSE) for timer sync, collaboration, and live announcements. Use Phoenix/Realtime service or Supabase Realtime if preferred.
- **CI/CD & Infra:** GitHub Actions/Ling; Terraform or Pulumi for infra; Docker for local containers.

---

## 3. Frontend — Structured Description

### 3.1 Tech Stack (Frontend)
- **Language:** TypeScript (strict mode).
- **Framework:** React (latest stable) + Vite. Consider SolidJS for low-overhead in future, but React has ecosystem maturity for accessibility.
- **UI primitives:** Radix UI + shadcn components for accessible primitives.
- **Styling:** Tailwind CSS with CSS variables (design tokens), PostCSS.
- **Forms & Validation:** React Hook Form + Zod (schema-driven forms).
- **State Management:** TanStack Query for server state, Zustand for lightweight UI state when needed.
- **Routing:** React Router or Remix (if SSR is desired for performance/SEO). Use simple SPA routing for exam flows to ensure predictable client behavior offline.
- **PWA / Offline:** Workbox or Vite PWA plugin for offline cache and background sync (store attempts locally and sync).
- **TTS/ASR:** Web Speech API (SpeechSynthesis & SpeechRecognition) with a fallback to server-side ASR.
- **Testing:** Jest + React Testing Library; axe-core for accessibility tests; Playwright for E2E including screen reader and keyboard flows.

### 3.2 Folder Structure (suggested)
```
/src
  /components    # shared accessible components (Button, Input, Dialog, TTSBar)
  /features      # domain modules (exam-taking, authoring, grading)
  /hooks         # custom hooks (useTTS, useVoiceInput, useFocusTrap)
  /lib           # api clients, utils, types
  /pages         # route entry points
  /styles        # tokens and tailwind overrides
  /tests         # integration/e2e configs
```

### 3.3 Important Frontend Patterns
- Keep exam-taking UI client-first and deterministic (no surprises from SSR).
- Persist accessibility preferences in localStorage and sync with server on auth.
- Use optimistic updates with TanStack Query but enforce server truth for final scoring.
- Isolate TTS and voice inputs into small, testable components with clear ARIA roles.

---

## 4. Backend — Structured Description

### 4.1 Tech Stack (Backend)
- **Language:** TypeScript (strict).
- **Runtime:** Node.js 20+ with ES modules. Consider Deno or Bun for future performance gains; Node remains more supported today.
- **Framework:** Express or Fastify (Fastify recommended for speed and schema support).
- **ORM:** Drizzle ORM (Postgres) for type safety and migrations.
- **Auth Provider:** Clerk (recommended) / Auth0 / Supabase Auth — must support session cookies and server verification.
- **Storage:** S3-compatible for attachments and transcripts.
- **Queue:** Redis + BullMQ or serverless background jobs (for heavy ASR/processing).
- **Realtime:** WebSocket server (Socket.io or native ws) or use Supabase Realtime.
- **Testing:** Vitest or Jest for unit tests; Supertest for API integration.

### 4.2 API Design Principles
- RESTful JSON endpoints (or GraphQL if complex queries needed later). Keep endpoints small and well-versioned (`/api/v1`).
- Strict schema validation for request/response with Zod.
- Role-based middleware that ensures instructors cannot impersonate students and vice versa.
- Time integrity: server issues authoritative start timestamp and enforces server-side timers for final submission validation.

### 4.3 Example Endpoints
- `POST /api/v1/auth/session` — create session
- `GET /api/v1/exams/:id` — exam meta (permissions checked)
- `POST /api/v1/exams/:id/attempts` — start attempt (server issues attemptId, start timestamp)
- `PUT /api/v1/attempts/:attemptId/answers` — save answers (partial save)
- `POST /api/v1/attempts/:attemptId/submit` — final submit (server validates time window)
- `GET /api/v1/instructor/exams` — list exams for instructor

### 4.4 Data Model (Concise)
- Users: id, name, email, role, preferences
- Exams: id, title, sections, timeLimit, published
- Questions: id, type, content(json/html), attachments
- Attempts: id, examId, userId, startedAt, endedAt, answers(json), status
- AuditLog: id, userId, action, metadata, createdAt

---

## 5. Infrastructure & Deployment

### 5.1 Environments
- **Dev:** Local with Docker Compose for Postgres + Redis + LocalStack for S3.
- **Staging:** Same infra in cloud; run CI E2E.
- **Prod:** Managed Postgres (Neon), object storage (S3), serverless functions or small Node cluster behind load balancer.

### 5.2 CI/CD
- GitHub Actions pipeline: lint, unit tests, axe checks, build, deploy to staging, run E2E, deploy to prod on tag.
- Use feature branches and PR templates with accessibility checklist.

### 5.3 Observability
- Logs: structured JSON logs (Pino). Centralize in Datadog/LogDNA.
- Metrics: Prometheus + Grafana or Datadog for request latency, job queue, DB connections.
- Error tracking: Sentry for front and back.

---

## 6. Security & Compliance
- HTTPS everywhere, HSTS.
- Encrypt sensitive data at rest (PG column encryption) and in transit.
- Rate limit endpoints (esp. ASR and auth).
- Regular backups of DB and storage, with retention policy.
- Data minimization: keep transcripts only as long as needed; provide deletion workflows.

---

## 7. Scalability & Performance
- Horizontal scale for stateless API servers. Use connection pooling for Postgres.
- Cache read-heavy resources (question banks) via CDN or edge cache.
- Use background workers for heavy tasks (ASR, transcript post-processing).

---

## 8. Accessibility & QA Integration
- Integrate axe-core in CI with thresholds; fail PRs that reduce accessibility score.
- Playwright E2E to automate keyboard-only flows and TTS smoke tests.
- Regular manual testing schedule for NVDA/VoiceOver.

---

## 9. Dev Tools & Local Setup
- `dev` script runs Vite, backend with ts-node-dev, Postgres via Docker Compose.
- Seed scripts for demo accounts (instructor + student) and sample exam.
- Debugging utilities: feature flags to disable server timers in dev, TTS test harness.

---

## 10. UI/UX Summary (Compact)

The full UI/UX spec is available in a separate design doc; here is a compact summary of UI/UX deliverables included:

- Accessible design tokens, themes (default & high‑contrast), and typography scale.
- Core components (Buttons, Inputs, Toggle, Tabs, Dialogs, DataTable) implemented using Radix + shadcn with ARIA-first behavior.
- Exam UI: Toolbar (Timer, TTS, Quick Prefs), Question Navigator, Main Question Pane, Right Context Panel (TTS & Notes).
- Authoring UI: Stepper for exam creation, rich question editor with accessibility helper and preview mode.
- Keyboard shortcuts, skip links, and `aria-live` regions for dynamic announcements.

---

## 11. Roadmap (Next 6–12 months)
1. MVP: Exam taking, authoring, grading, accessibility baseline, PWA offline sync. (0–3 months)
2. Analytics and advanced ASR integration; export/reporting (3–6 months)
3. AI-assisted authoring (auto‑generate distractors, summary TTS), proctoring as opt-in (6–12 months)

---

## 12. Deliverables I Can Produce Now
- Detailed DB schema & Drizzle migration files.
- REST API contract (OpenAPI spec) and sample Express/Fastify server scaffolding.
- React component starter kit (Tailwind + tokens + TTS & voice components).
- Playwright E2E testing scripts covering core accessible flows.

---

If you want any of the above deliverables, tell me which and I’ll generate it right here (e.g., OpenAPI spec, DB schema, React starter components, or an infra Terraform template).

