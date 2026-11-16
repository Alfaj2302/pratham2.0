# Platform Overview

> Scope note: this knowledge base is built from the `pratham2.0` repository only — the
> frontend NX monorepo. Backend/API services (interface gateway, Sunbird/Knowlg content
> platform, Keycloak, course planner service, etc.) are external systems this repo talks to,
> not code this repo owns. Where a fact would require knowledge of those systems or of
> org/deployment state not recorded in this repo, it is intentionally omitted rather than
> guessed — flag it to a backend/DevOps owner instead of inferring it here.

## What is PLP?

**Pratham 2.0** (internally "PLP" — Pratham Learning Platform) is the frontend platform for
Pratham's digital education programs. It provides the web UI for learner enrollment, content
delivery, attendance tracking, assessments, and program administration across several distinct
Pratham programs (see [03-programs.md](03-programs.md)).

It is a single **NX monorepo** containing three deployable host applications, thirteen
micro-frontends (MFEs), and two shared component libraries — see
[01-repositories.md](01-repositories.md) for the full breakdown.

## Three Application Portals

| Portal | Repo Path | Users | Local Port |
|---|---|---|---|
| **Admin App** | `apps/admin-app-repo` | Admins, State Leads, Content Creators/Reviewers | 3002 |
| **Teacher App (shell)** | `apps/teachers` | Facilitators, Team Leaders, Mentors, Mobilizers (redirects into SCP/YouthNet MFEs) | 3001 |
| **Learner App** | `apps/learner-web-app` | Students / Learners | 3003 |

## High-Level Architecture

- **NX monorepo**, 3 host Next.js apps + 13 MFEs + 2 shared libraries.
- Each host app composes its MFEs at runtime/build time using **three different integration
  patterns simultaneously** — full detail in [01-repositories.md](01-repositories.md):
  - **Pattern A — Middleware URL rewriting** (primary): each host's `middleware.ts` proxies URL
    prefixes to the right MFE port so the browser only ever sees one origin.
  - **Pattern B — Webpack Module Federation**: only used by `scp-teacher-repo` consuming the
    `editor` remote exposed by `workspace`.
  - **Pattern C — Static build-time path aliases**: the learner app imports `mfes/content` and
    `mfes/players` components directly at build time via `tsconfig` path aliases.
- The codebase is physically split into **three independent deployment stacks** — Admin,
  Teacher, Learner — each with its own Dockerfile, PM2 ecosystem config, and CI pipeline. A
  change to shared code requires rebuilding every stack that consumes it.

## Technology Stack (summary)

- **React 18.3.1**, **Next.js 14.2.16** (Pages Router for admin/teachers/scp/youthNet, App
  Router for learner-web-app), **TypeScript ~5.6.2**.
- **MUI 5** + Emotion for styling; `stylis-plugin-rtl` for Urdu RTL support.
- **Zustand** (with `persist` → localStorage) for client state — **no Redux anywhere**.
- **TanStack React Query** for server state caching.
- **Axios**, wrapped in a hand-rolled Interceptor/RestClient pattern duplicated across ~7
  modules (a known source of inconsistent auth-header behavior — see
  [04-capabilities.md](04-capabilities.md)).
- **RJSF (`@rjsf/core` + `@rjsf/mui`)** — all dynamic forms are schema-driven from the backend,
  never hardcoded per tenant.
- **Sunbird platform packages** (`@project-sunbird/*`) — PDF/video/QuML/ePub players, the
  collection editor web component, and client-services — power all content authoring/playback.
- **Firebase (FCM)** for push notifications (teacher app).
- **AWS S3** (`@aws-sdk/client-s3`, multipart upload) for content/file storage.
- **i18next / next-i18next** for localisation; 10 languages supported, Urdu is RTL.
- Full reference: [01-repositories.md](01-repositories.md) and existing
  `Project_Tech_Arch_UI_UX/TECH_ARCHITECTURE.md`.

## User Roles

| Role ID | Display Name | Description |
|---|---|---|
| `STUDENT` / `LEARNERS` | Learner | End-user receiving education |
| `TEACHER` | Facilitator / Instructor | Conducts sessions, marks attendance |
| `TEAM_LEADER` | Team Leader (Lead) | Manages facilitators, reviews performance |
| `ADMIN` | State Lead | State-level administration |
| `CENTRAL_ADMIN` | Central Lead / Central Head | National-level administration |
| `SCTA` / `CONTENT_CREATOR` | State Content Creator | Creates content for review |
| `CCTA` / `CONTENT_REVIEWER` | Central Content Reviewer | Reviews and publishes content |
| `MOBILIZER` | Mobilizer / Mentor | Field outreach, volunteer registration |

Role-to-feature access and tenant-specific sidebar visibility are documented in
`Project_Tech_Arch_UI_UX/PROJECT_REQUIREMENTS.md` §2.

## Authentication Flow

1. Standard login: `POST /account/login` → `{ access_token, refresh_token }`, stored in
   `localStorage` (`token`, `refreshToken`, `userId`, `tenantId`, `role`).
2. User is routed to the correct portal based on role + tenant (Learner App, SCP Teacher MFE,
   Admin App, Workspace MFE, or YouthNet MFE).
3. **Token refresh**: an Axios response interceptor calls `POST /user/auth/refresh` on 401;
   on refresh failure the user is redirected to `/logout`.
4. **SSO ingestion** (`/sso`, all three portals): accepts `accessToken`, `userId`, `tenantId`,
   `roleId`, `ssoProvider` as query params, validates with the middleware, then routes by
   role/tenant. A multi-account scenario shows `SwitchAccountDialog`.
5. **Backend SSO provider**: Keycloak, realm `pratham`. The frontend **never calls Keycloak
   directly** — all auth flows through the middleware API gateway
   (`NEXT_PUBLIC_MIDDLEWARE_URL`).
6. Tenant resolution differs per app: Admin uses a `TenantService` singleton reading a
   `js-cookie` `tenantId` cookie; Teacher/SCP and Learner read `localStorage.tenantId` (Learner
   can also derive it from `window.location.origin`).

Full detail (including route-guard mechanisms per app): `TECH_ARCHITECTURE.md` §8.

## Deployment Environments

Three environments — **Dev, QA, Prod** — each triggered by a dedicated git branch per stack
(9 GitHub Actions workflows total: 3 environments × 3 stacks). Full branch/pipeline mapping is
in [02-deployments.md](02-deployments.md). Concrete environment URLs, database, Redis, and
release/version tracking are **not recorded in this repository** and must be sourced from
DevOps directly.

## External Integrations (consumed by this repo)

These are systems the frontend calls or embeds — this repo does not own their code:

| Integration | Purpose | Reference |
|---|---|---|
| Interface API gateway (`NEXT_PUBLIC_MIDDLEWARE_URL`) | Primary backend API gateway for all user/cohort/tracking/notification calls | `TECH_ARCHITECTURE.md` §9 |
| Sunbird / Knowlg content backend (`NEXT_PUBLIC_BASE_URL`) | Content, course, framework, question-set APIs | `TECH_ARCHITECTURE.md` §9 |
| Keycloak (`pratham` realm) | SSO/identity backend behind the middleware | `TECH_ARCHITECTURE.md` §8 |
| Course Planner service (`NEXT_PUBLIC_COURSE_PLANNER_API_URL`) | Monthly curriculum plan data | `TECH_ARCHITECTURE.md` §9 |
| Firebase / FCM | Push notifications (teacher app) | `TECH_ARCHITECTURE.md` §4, §16 |
| AWS S3 (`knowlg-public` bucket, `ap-south-1`) | Content/file storage, multipart upload | `TECH_ARCHITECTURE.md` §4, §16 |
| JotForm | Embedded support-ticket forms | `PROJECT_REQUIREMENTS.md` §17 |
| Google Analytics 4 | Product analytics | `TECH_ARCHITECTURE.md` §4 |
| Shikshalokam / MentorEd (`targetSolution`) | Observation form definitions consumed by Survey & Observations | `PROJECT_REQUIREMENTS.md` §12.1 |

## Related Documents in This KB

- [01-repositories.md](01-repositories.md) — internal repo/MFE catalog
- [02-deployments.md](02-deployments.md) — deployment stacks, branches, CI/CD
- [03-programs.md](03-programs.md) — Pratham programs running on PLP
- [04-capabilities.md](04-capabilities.md) — capability-to-code map
- [05-environments.md](05-environments.md) — per-environment config and feature flags

Also see the existing, more implementation-detailed docs this KB is derived from:
`Project_Tech_Arch_UI_UX/TECH_ARCHITECTURE.md` and
`Project_Tech_Arch_UI_UX/PROJECT_REQUIREMENTS.md`.
