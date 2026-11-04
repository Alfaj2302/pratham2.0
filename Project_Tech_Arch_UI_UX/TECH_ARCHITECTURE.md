# Pratham 2.0 — Technical Architecture Reference

> Single source of truth for architecture decisions, infrastructure, integrations, and code patterns.
> Use this document when creating new features, fixing bugs, onboarding developers, or planning technical tasks.

---

## 1. Repository Overview

| Property | Value |
|----------|-------|
| **Repo type** | NX Monorepo |
| **NX version** | 20.2.2 |
| **Package name** | `@shikshav2.0/source` |
| **React** | 18.3.1 |
| **Next.js** | 14.2.16 |
| **TypeScript** | ~5.6.2 |
| **Node (Docker)** | 20 |

### Top-Level Structure

```
pratham2.0/
├── apps/                    # 3 host shell applications
├── mfes/                    # 13 micro-frontend applications
├── libs/                    # 2 shared component libraries
├── nx.json                  # NX workspace config
├── package.json             # Root dependencies
├── tsconfig.base.json       # TS config (teachers group)
├── tsconfig.admin.base.json # TS config (admin group)
├── tsconfig.learner.json    # TS config (learner group)
├── Dockerfile.admin-app-repo
├── Dockerfile.teachers
├── Dockerfile.learner-web-app
├── docker-compose.*.yml
├── ecosystem.*.config.js    # PM2 configs
├── .github/workflows/       # 9 GitHub Actions workflows
├── Jenkinsfile              # Jenkins QA deployment
└── sonar-project.properties
```

---

## 2. Applications & MFEs

### Host Applications

| App | Port | Router | Description |
|-----|------|--------|-------------|
| `apps/admin-app-repo` | 3002 | Pages Router | Admin portal — manage users, centers, content |
| `apps/teachers` | 3001 | Pages Router | Teacher shell — thin wrapper, redirects to SCP/YouthNet MFEs |
| `apps/learner-web-app` | 3003 | **App Router** | Learner portal — courses, player, registration |

### Micro-Frontend Applications

| MFE | Base Path | Port | Description |
|-----|-----------|------|-------------|
| `mfes/authentication` | `/authentication` | 4101 | Login/logout pages |
| `mfes/scp-teacher-repo` | `/scp-teacher-repo` | 4102 | SCP Teacher experience (primary teacher UI) |
| `mfes/youthNet` | `/youthnet` | 4103 | YouthNet module |
| `mfes/workspace` | `/mfe_workspace` | 4104 | Content creation workspace + API proxy |
| `mfes/taxonomy-manager` | `/taxonomy-manager` | 4114 | Taxonomy / framework manager |
| `mfes/players` (admin) | `/sbplayer` | 4106 | Sunbird content player |
| `mfes/players` (teachers) | `/sbplayer` | 4107 | Sunbird content player |
| `mfes/players` (learner) | `/sbplayer` | 4108 | Sunbird content player |
| `mfes/forget-password` | `/forget-password` | 4109 | Forgot / reset password flow |
| `mfes/content` | `/mfe_content` | — | Content browsing (imported as path alias) |
| `mfes/editors` | — | — | Sunbird collection/questionset/generic editors |
| `mfes/notification` | — | — | Push notification module |
| `mfes/survey-observations` | — | — | Survey and observation forms |

### Shared Libraries

| Library | Package Alias | Purpose |
|---------|---------------|---------|
| `libs/shared-lib` | `@shared-lib` | V1 — UI primitives, Sunbird player/editor wrappers, services |
| `libs/shared-lib-v2` | `@shared-lib-v2/*` | V2 — DynamicForm engine, MapUser widgets, AuthService, IndexedDB, TTS |

---

## 3. Micro-Frontend Integration Patterns

Three integration patterns are used simultaneously:

### Pattern A — Next.js Middleware URL Rewriting (primary)

Each host app's `middleware.ts` transparently rewrites URL prefixes to MFE ports. The browser sees one origin; requests are proxied server-side.

**Admin** (`apps/admin-app-repo/src/middleware.ts`):
```
/mfe_workspace/*     →  http://localhost:4104
/sbplayer/*          →  http://localhost:4106
/taxonomy-manager/*  →  http://localhost:4105
```

**Teachers** (`apps/teachers/src/middleware.ts`):
```
/scp-teacher-repo/*  →  http://localhost:4102
/youthnet/*          →  http://localhost:4103
/sbplayer/*          →  http://localhost:4107
```

**Learner** (`apps/learner-web-app/src/middleware.ts`):
```
/sbplayer/*          →  http://localhost:4108
/forget-password/*   →  http://localhost:4109
```

### Pattern B — Webpack Module Federation

Used only in `mfes/scp-teacher-repo` consuming the `editor` remote from `mfes/workspace`:

```js
// mfes/scp-teacher-repo/next.config.mjs
import { NextFederationPlugin } from '@module-federation/nextjs-mf'; // v8.5.5
new NextFederationPlugin({
  name: 'admin',
  filename: 'static/chunks/remoteEntry.js',
  remotes: {
    editor: `editor@${NEXT_PUBLIC_WORKSPACE_BASE_URL}/_next/static/${location}/remoteEntry.js`
  }
})
```

### Pattern C — Static Build-Time Path Aliases

The learner app directly imports `mfes/content/*` and `mfes/players/*` components at build time via `tsconfig.json` path aliases:

```json
{
  "@Content": ["mfes/content/src/components"],
  "@ContentPlayer": ["mfes/content/src/components/players"],
  "@players/*": ["mfes/players/src/*"],
  "@content-mfes/*": ["mfes/content/src/*"]
}
```

---

## 4. Tech Stack Reference

### Core Framework
- **React 18.3.1** with concurrent features
- **Next.js 14.2.16** — Pages Router (admin/teachers/scp/youthNet), App Router (learner)

### UI & Styling
- **Material UI (MUI) 5.15.21** — `@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`
- **Emotion 11.11.x** — `@emotion/react`, `@emotion/styled`
- **stylis-plugin-rtl 2.1.1** — RTL CSS transformation (for Urdu language)

### State Management
- **Zustand 4.5.4** with `persist` middleware (writes to `localStorage`)
- **TanStack React Query 5.45.1** — server state; `gcTime: 24h`, `staleTime: 24h`
- **React Context API** — accessibility features (font size, color inversion) in learner app

> No Redux anywhere in the codebase.

### HTTP / API
- **Axios 1.6.8** — wrapped in Interceptor (see Section 8)

### Forms
- **react-hook-form 7.54.2** + `@hookform/resolvers`
- **@rjsf/core + @rjsf/mui 5.18.5** — JSON Schema Form (dynamic forms served from API)
- **yup 1.6.1** — schema validation

### Internationalisation
- **i18next 24.1.2** + `react-i18next` + `next-i18next 15.4.1`
- Translations: `public/locales/{lang}/common.json`
- RTL: `useDirection` hook for Urdu

### Analytics & Telemetry
- **@project-sunbird/telemetry-sdk 1.3.0** — IMPRESSION/INTERACT/ASSESS/END events
- **react-ga4** + **@google-analytics/data** — Google Analytics 4

### Notifications
- **Firebase 9.0.0** — FCM push notifications
- Custom `NotificationService` in `mfes/editors`

### Content / Sunbird Platform
- **@project-sunbird/sunbird-pdf-player-v9**
- **@project-sunbird/sunbird-video-player**
- **@project-sunbird/sunbird-quml-player**
- **@project-sunbird/sunbird-epub-player**
- **@project-sunbird/sunbird-collection-editor-web-component 1.6.0**
- **@project-sunbird/client-services 7.0.6**
- **questionnaire-webcomponent 3.1.6**

### Storage
- **idb-keyval 6.2.1** — IndexedDB wrapper
- Custom `customIdbStore.ts` — hand-written IndexedDB for tracking queue (shared-lib-v2)

### Cloud / File Upload
- **@aws-sdk/client-s3** + **s3-request-presigner** — multipart upload to S3 (`knowlg-public` bucket, `ap-south-1`)

### PWA
- **next-pwa 5.6.0** — used in `scp-teacher-repo`; custom hand-written SW in learner app

### Security
- **@fingerprintjs/fingerprintjs 4.5.1** — device fingerprinting

### Other Notable Libraries
- `recharts ^2.12.7` — charts (YouthNet dashboard)
- `react-pdf/renderer ^4.3.0` — PDF generation (assessment reports)
- `xlsx ^0.18.5` — spreadsheet export
- `mammoth ^1.11.0` — Word doc conversion
- `react-circular-progressbar ^2.1.0` — circular progress indicators
- `swiper ^11.1.10` — carousels
- `react-toastify ^10.0.5` — toast notifications
- `react-select ^5.8.0` — enhanced select
- `ka-table ^11.0.2` — data tables
- `react-joyride ^2.8.2` — onboarding tours

---

## 5. NX Build System

### Plugins Used
- `@nx/next/plugin` — Next.js build/dev/start/serve-static
- `@nx/jest/plugin` — test target
- `@nx/eslint/plugin` — lint target
- `@nx/vite/plugin` — Vite build/test/serve

### TypeScript Groups (3 separate tsconfigs)

| tsconfig | Group | Path alias |
|----------|-------|------------|
| `tsconfig.base.json` | teachers, scp, youthNet | — |
| `tsconfig.admin.base.json` | admin | `@/* → apps/admin-app-repo/src/*` |
| `tsconfig.learner.json` | learner | `@learner/* → apps/learner-web-app/src/*` |

### Build Commands
```bash
# Build single project
npx nx run <project>:build

# Build multiple projects
npx nx run-many --target=build --projects=admin-app-repo,workspace,players,taxonomy-manager

# Run dev
npx nx run <project>:dev

# Run all tests
npx nx run-many --target=test
```

---

## 6. Three Deployment Stacks

The project is split into three independent deployments — each has its own Dockerfile, PM2 config, and CI pipeline.

### Stack 1: Admin

| Component | Port |
|-----------|------|
| admin-app-repo | 3002 |
| workspace (MFE + API proxy) | 4104 |
| players | 4106 |
| taxonomy-manager | 4114 |

**Docker:** `Dockerfile.admin-app-repo`
**PM2 config:** `ecosystem.admin-app-repo.config.js`

### Stack 2: Teachers

| Component | Port |
|-----------|------|
| teachers | 3001 |
| authentication | 4101 |
| scp-teacher-repo | 4102 |
| youthNet | 4103 |
| players | 4107 |

**Docker:** `Dockerfile.teachers`
**PM2 config:** `ecosystem.teachers.config.js`

### Stack 3: Learner

| Component | Port |
|-----------|------|
| learner-web-app | 3003 |
| players | 4108 |
| forget-password | 4109 |

**Docker:** `Dockerfile.learner-web-app`
**PM2 config:** `ecosystem.learner-web-app.config.js`

> **Note:** The `players` MFE is built three times (once per stack) with different ports.

---

## 7. CI/CD Pipeline

### GitHub Actions

9 workflows in `.github/workflows/` — 3 environments × 3 apps (Dev, QA, Prod).

**Trigger branches:**
- `main-admin` → admin workflows
- `main-teacher` → teacher workflows
- `main-learner` → learner workflows

**Pipeline steps:**
1. Checkout code
2. Write `.env` from GitHub Secret (`DEV_LAP_ENV` / `QA_LAP_ENV` / `PROD_LAP_ENV`)
3. `docker build -f Dockerfile.<app>` — full NX workspace built inside Docker
4. `aws ecr get-login-password` + `docker push` to AWS ECR
5. SSH to EC2 (`appleboy/ssh-action@v0.1.10`) → pull new image → `docker-compose up --force-recreate`
6. `sudo systemctl restart nginx`

### Jenkins

`Jenkinsfile` — SSH-based QA deployment for teacher branch:
```
git clone → docker-compose -f docker-compose.teachers.yml up -d
```

### Process Manager
**PM2 6.0.8** manages all Next.js processes inside each Docker container.

---

## 8. Authentication Architecture

### Login Flow
1. POST `/account/login` with `{ username, password }`
2. Response: `{ result: { access_token, refresh_token } }`
3. Store in `localStorage`: `token`, `refreshToken`, `userId`, `tenantId`, `role`, `adminInfo`

### Token Refresh (automatic)
Axios response interceptor:
1. On 401 → call POST `/user/auth/refresh` with `{ refresh_token }`
2. New tokens overwrite `localStorage.token` + `localStorage.refreshToken`
3. Retry original request with new token
4. On refresh failure → redirect to `/logout`

### Axios Interceptor Pattern (every app independently)

```typescript
// Request interceptor adds:
Authorization: `Bearer ${localStorage.token}`
academicyearid: localStorage.academicYearId
tenantid: localStorage.tenantId  // or TenantService (admin)
```

**Important:** Identical `Interceptor.ts` / `RestClient.ts` exists separately in admin, teachers, scp-teacher-repo, workspace, editors, shared-lib, and shared-lib-v2 — high code duplication.

### Keycloak (SSO backend)
- Realm: `pratham` at `https://qa-keycloak.prathamdigital.org/auth/realms/pratham`
- Frontend never calls Keycloak directly — all auth goes through middleware
- JWT bearer tokens issued by Keycloak, validated by middleware

### Tenant Resolution
| App | Method |
|-----|--------|
| Admin | `TenantService` singleton reads `js-cookie` `tenantId` cookie |
| Teachers/SCP | `localStorage.tenantId` |
| Learner | `localStorage.tenantId` or derived from `window.location.origin` |

### Route Protection
| App | Method |
|-----|--------|
| Admin | `RouteGuard.tsx` + `ProtectedRoute.js` + `PUBLIC_ROUTES` config |
| Teachers/SCP | Middleware + page-level `useEffect` redirect |
| Learner | Page-level redirect (middleware only does port rewrites) |

---

## 9. API Architecture

### Primary API Gateway
```
NEXT_PUBLIC_MIDDLEWARE_URL = https://dev-interface.prathamdigital.org/interface/v1
```
All frontend API calls go through this single gateway.

### Key API Endpoint Categories

| Category | Prefix | Description |
|----------|--------|-------------|
| Auth | `/account/login`, `/user/auth/refresh` | Token management |
| User | `/user/list`, `/user/read/:id`, `/user/update/:id` | User CRUD |
| User OTP | `/user/send-otp`, `/user/verify-otp` | OTP flows |
| Cohort | `/cohort/search`, `/cohort/create`, `/cohort/update/:id` | Center/batch management |
| Cohort Member | `/cohortmember/list`, `/cohortmember/bulkCreate` | Learner-center assignment |
| Tenant | `/tenant/read`, `/tenant/search` | Program/tenant data |
| Form Schema | `/form/read?context=&contextType=` | Dynamic form schemas |
| Fields | `/fields/options/read`, `/fields/update/:id` | Custom fields config |
| Academic Year | `/academicyears/list` | Academic year management |
| Notification | `/notification/send`, `/notification-templates` | Push notifications |
| Tracking | `/tracking/content/create`, `/tracking/content/course/status` | Progress tracking |
| Certificate | `/tracking/certificate/issue`, `/tracking/certificate/render-PDF` | Certificates |
| Assessment | `/tracking/assessment/search/status` | Assessment tracking |
| Content (Sunbird) | `/api/content/v1/read/:id`, `/action/composite/v3/search` | Content metadata |
| Course | `/api/course/v1/hierarchy/:id`, `/action/content/v3/hierarchy` | Course hierarchy |
| Framework | `/api/framework/v1/read/:id` | Taxonomy frameworks |
| Question Set | `/action/questionset/v2/hierarchy/:id` | Question sets |

### Course Planner Service (separate)
```
NEXT_PUBLIC_COURSE_PLANNER_API_URL = https://project.prathamdigital.org/project/v1
```

### API Proxy (Workspace MFE)
`mfes/workspace/next.config.js` rewrites all Sunbird API calls:
```
/action/*    →  /api/proxy?path=...
/api/*       →  /api/proxy?path=...
/assets/*    →  NEXT_PUBLIC_BASE_URL/assets/*
```
The admin and teacher apps route all content API calls through `NEXT_PUBLIC_WORKSPACE_BASE_URL` (port 4104) which acts as the proxy.

---

## 10. State Management

All stores use **Zustand** with `persist` middleware (localStorage) unless noted.

### Admin App Stores
| Store | Key | State |
|-------|-----|-------|
| `useStore` | `adminAppStore` | `pid`, `isActiveYearSelected` |
| `coursePlannerStore` | `adminApp` | taxonomy/board/frame data |
| `manageUserStore` | — | user management state |
| `tanonomyStore` | — | taxonomy filter state |
| `useUserIdStore` | — | userId |

### Teacher / SCP Stores
| Store | Key | State |
|-------|-----|-------|
| `useStore` | `teacherApp` | `accessToken`, `userRole`, `cohorts`, `block` |
| `coursePlannerStore` | — | course planner data |
| `manageUserStore` | — | user management |
| `reassignLearnerStore` | — | reassignment state |
| `boardEnrollmentStore` | — | board enrollment |

### Cross-MFE Store
| Store | Location | State |
|-------|----------|-------|
| `useSharedStore` | `mfes/shared-store.ts` | `fetchContentAPI`, `contentArray` (shared between editors and workspace) |

### Learner App (React Context, no Zustand)
- `FontSizeContext` — font size scale (0.8–1.4)
- `ColorInversionContext` — high-contrast mode
- `UnderlineLinksContext` — underline links accessibility
- `LanguageContext` — selected language
- `SpeechContext` — text-to-speech state

---

## 11. Service Worker & Offline Architecture

**Location:** `apps/learner-web-app/public/sw.js`

The learner app has a **custom hand-written service worker** (not Workbox) for offline content tracking.

### IndexedDB Schema
- **Database:** `tracking-db`
- **Store:** `tracking-store`
- **Key pattern:** `<userId>_<contentId>_<timestamp>`
- **Reserved keys:** prefixed `__` (e.g., `__sync_in_progress__` mutex lock)

### Sync Flow
1. `ServiceWorkerRegister.tsx` registers SW and sends config via `postMessage` every 60 seconds
2. Config includes: all API URLs, auth token, tenantId, userId (SW cannot read localStorage)
3. SW listens for: `activate`, `online` event, 10-second interval
4. On sync: drains queue, max 3 retry attempts per entry

### Post-Completion Logic (inside SW)
After successful content tracking POST:
1. Calls course status API
2. Calculates completion %
3. If 100% → checks assessment pass threshold:
   - Default: **40%**
   - Specific tenant `914ca990-...`: **80%**
4. Calls `/tracking/certificate/issue` if criteria met

### SCP Teacher Service Worker
`mfes/scp-teacher-repo` uses **next-pwa** with config:
```js
{ dest: 'public', register: true, skipWaiting: false, disable: NODE_ENV === 'development' }
```

---

## 12. Routing Reference

### Admin App Pages (Pages Router)
```
/                     → redirect to dashboard
/login, /logout
/dashboard
/centers              → center management
/batch                → batch management
/state, /district, /block, /village  → geographic master data
/facilitator, /learners
/team-leader, /state-lead, /central-head
/user-leader, /user-mobilizer, /user-instructor, /user-state-lead
/content-creator, /content-reviewer, /content-users
/programs             → tenant/program management
/course-planner       → course planning
/mainCourse, /resourceList
/importCsv, /csvDetails
/qp                   → question paper
/notification-templates
/notification-templates/create, /notification-templates/update/[key]
/certificate-issuance
/support-request
/faqs
/sso                  → SSO ingestion
/unauthorized
/taxonomy-manager     → embedded taxonomy MFE
/mfe_workspace        → embedded workspace MFE
/sbplayer             → embedded player MFE
```

### SCP Teacher MFE Pages (basePath: `/scp-teacher-repo`)
```
/dashboard
/centers, /centers/[cohortId]
/attendance-overview, /attendance-history, /learner-attendance-history
/learner/[userId], /user-profile/[userId]
/board-enrollment, /board-enrollment/student-detail/[userId]
/assessments, /assessments/user/[userId]/subject/[subjectId]
/manual-assessments/[assessmentId]/[userId]
/ai-assessments/[assessmentId]/[userId]/upload-files
/curriculum-planner, /curriculum-planner/center/[cohortId]
/observation, /observation/[observationId]/questionary
/play/content/[identifier]
/topic-detail-view
/user-registration-list
/youthboard/*          → YouthNet embedded pages
/support-request, /faqs, /unauthorized
/login, /logout, /create-password, /edit-password
```

### Learner App Pages (App Router)
```
/home, /landing, /login, /logout, /registration
/sso, /account-selection, /change-password, /change-username
/profile, /profile-complition, /enroll-profile-completion
/programs, /explore, /skill-center
/home-courses, /courses-contents/[courseId]/[unitId]/[identifier]
/content/[courseId]/[unitId]/[identifier]
/player/[identifier]
/in-progress, /knowledge-bank
/manual-assessment, /observations/questionary
/scp-dashboard, /navapatham
/support-request, /faqs, /unauthorized, /cmslink
/pos/*                 → Pratham Open School sub-app
/themantic/*           → Thematic content browser
```

---

## 13. Dynamic Form System

All user/cohort creation and editing uses **RJSF (React JSON Schema Form)** with backend-served schemas.

### Schema Fetch
```
GET /form/read?context=<context>&contextType=<contextType>
```
Context examples: `USER`, `COHORT`, `CENTER`, `BATCH`, `TENANT`

### Key Form Components
- `DynamicForm` — main RJSF wrapper in `shared-lib-v2`
- `StepperForm` — multi-step form for registration/complex workflows
- **Custom RJSF Widgets** (`RJSFWidgets`): `BatchListWidget`, `CenterListWidget`, `MultipleBatchListWidget`, `EditSearchUser`, `EmailSearchUser`, `LMPMultipleBatchListWidget`, `WorkingVillageAssignmentWidget`

### Form Context Constants (from `app.constant.ts`)
```typescript
enum FormContext {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  COHORT = 'cohort',
  // ...per tenant + role + action combos
}
```

---

## 14. Content Player Architecture

### Player Routing (by MIME type)
File: `mfes/players/src/components/players/Players.tsx`

| MIME Type | Player Component |
|-----------|-----------------|
| `application/pdf` | `SunbirdPdfPlayer` |
| `video/mp4`, `video/webm` | `SunbirdVideoPlayer` |
| `audio/mp3`, `audio/wav`, `audio/mpeg` | `SunbirdVideoPlayer` |
| `application/epub` | `SunbirdEpubPlayer` |
| `application/vnd.sunbird.question` | `SunbirdQuMLPlayer` |
| `video/x-youtube` | `V1Player` |
| `application/vnd.ekstep.ecml-archive` | `V1Player` |
| `application/vnd.ekstep.html-archive` | `V1Player` |

### Content Hierarchy
```
Course (collection)
  └── Unit (chapter/section)
        └── Content Item (video/pdf/quiz/epub/etc.)
```

### Content Workflow States
```
draft → submitted → under_review → published
              ↓
          rejected (back to draft)
```

---

## 15. Feature Flags

Both `scp-teacher-repo` and `youthNet` use `module.config.js`:
```javascript
// mfes/scp-teacher-repo/module.config.js
module.exports = {
  skippedFeatures: ['Assessments', 'Events'],
  skippedComponents: ['ComponentName']
}
```
This conditionally excludes pages/components at **build time** — not runtime toggles.

---

## 16. Environment Variables

All variables prefixed `NEXT_PUBLIC_` are exposed client-side.

### API Endpoints
```bash
NEXT_PUBLIC_MIDDLEWARE_URL          # Primary API gateway
NEXT_PUBLIC_BASE_URL                # Sunbird backend
NEXT_PUBLIC_WORKSPACE_BASE_URL      # Workspace MFE (proxy target)
NEXT_PUBLIC_TELEMETRY_URL           # Telemetry endpoint
NEXT_PUBLIC_CLOUD_STORAGE_URL       # S3 CDN
CLOUD_STORAGE_URL                   # S3 (server-side)
NEXT_PUBLIC_COURSE_PLANNER_API_URL  # Course planner service
NEXT_PUBLIC_SURVEY_URL              # Survey service
NEXT_PUBLIC_RESET_PASSWORD_URL      # Password reset service
```

### Auth & Tenant
```bash
AUTH_API_TOKEN                      # Server-side API token
NEXT_PUBLIC_TENANT_ID               # Default tenant ID
NEXT_PUBLIC_FRAMEWORK_ID            # Taxonomy framework ID
NEXT_PUBLIC_CHANNEL_ID              # Sunbird channel ID
```

### MFE URLs (cross-app routing)
```bash
NEXT_PUBLIC_SCP_PROJECT             # e.g. http://localhost:3001/scp-teacher-repo
NEXT_PUBLIC_YOUTHNET_PROJECT        # e.g. http://localhost:3001/youthnet
NEXT_PUBLIC_LOGIN_URL               # Auth MFE URL
NEXT_PUBLIC_ADMIN_LOGIN_URL         # Admin login URL
NEXT_PUBLIC_ADMIN_SBPLAYER          # http://localhost:3002/sbplayer
NEXT_PUBLIC_TEACHER_SBPLAYER        # http://localhost:3001/sbplayer
NEXT_PUBLIC_LEARNER_SBPLAYER        # http://localhost:3003/sbplayer
NEXT_PUBLIC_WORKSPACE               # http://localhost:3002/mfe_workspace
NEXT_PUBLIC_WORKSPACE_ROUTES        # Allowed workspace routes
```

### Firebase / FCM
```bash
NEXT_PUBLIC_FCM_API_KEY
NEXT_PUBLIC_FCM_VAPID_KEY
NEXT_PUBLIC_FCM_AUTH_DOMAIN
NEXT_PUBLIC_FCM_PROJECT_FCM_ID
NEXT_PUBLIC_FCM_STORAGE_BUCKET
NEXT_PUBLIC_FCM_MESSAGING_SENDER
NEXT_PUBLIC_FCM_FCM_APP_ID
NEXT_PUBLIC_FCM_MEASUREMENT_ID
```

### AWS
```bash
AWS_ACCESS_KEY_ID                   # (private — server-side only)
AWS_ACCESS_SECRET_KEY               # (private — server-side only)
AWS_BUCKET_NAME                     # knowlg-public
AWS_REGION                          # ap-south-1
```

### JotForm (Support)
```bash
NEXT_PUBLIC_JOTFORM_ID
NEXT_PUBLIC_JOTFORM_URL
NEXT_PUBLIC_CONTENT_DOWNLOAD_JOTFORM_ID
```

### Misc
```bash
NEXT_PUBLIC_PRODUCTION              # 'true' removes console.log in scp-teacher-repo
NEXT_PRIVATE_LOCAL_WEBPACK          # true
VITE_FRAMEWORK_ID                   # For Vite-built projects
VITE_TENANT_ID
NEXT_PUBLIC_MEASUREMENT_ID_ADMIN    # GA4 Measurement ID
```

---

## 17. Testing Configuration

### Unit / Integration — Jest
- Root: `jest.config.ts` using `getJestProjectsAsync()` (discovers all projects)
- Each project: `jest.config.ts` using `next/jest` (`createJestConfig`)
- Environment: `jsdom`
- Libraries: `@testing-library/react ^15.0.6` + `@testing-library/jest-dom ^6.4.6`
- Coverage: `v8` provider → `coverage/`
- Module mapper: `^@/(.*)$ → <rootDir>/src/$1`

### E2E — Cypress
- `cypress ^13.12.0`
- Only `mfes/scp-teacher-repo/cypress.config.ts` configured (no tests written yet)

### Linting
- ESLint 9 flat config
- Plugins: `eslint-plugin-react`, `react-hooks`, `testing-library`, `jest-dom`
- Stylelint with `stylelint-config-rational-order`

### SonarQube
- `sonar-project.properties` configured
- Exclusion: `mfes/content/public/content/**`

---

## 18. Key File Reference

| Purpose | Path |
|---------|------|
| Admin/Teacher MUI theme | `apps/admin-app-repo/src/styles/customTheme.tsx` |
| Learner MUI theme | `apps/learner-web-app/src/assets/theme/MuiThemeProvider.tsx` |
| Admin Axios interceptor | `apps/admin-app-repo/src/services/Interceptor.ts` |
| Admin API endpoints | `apps/admin-app-repo/src/utils/APIEndpoints.ts` |
| App constants / enums | `apps/admin-app-repo/src/utils/app.constant.ts` |
| Shared constants (v2) | `libs/shared-lib-v2/src/utils/app.constant.ts` |
| Sidebar menu items | `apps/admin-app-repo/src/components/layouts/sidebar/MenuItems.js` |
| Admin Zustand store | `apps/admin-app-repo/src/store/store.js` |
| Teacher Zustand store | `apps/teachers/src/store/store.js` |
| Cross-MFE shared store | `mfes/shared-store.ts` |
| Player routing | `mfes/players/src/components/players/Players.tsx` |
| Learner service worker | `apps/learner-web-app/public/sw.js` |
| SW registration | `apps/learner-web-app/src/components/ServiceWorkerRegister.tsx` |
| DynamicForm engine | `libs/shared-lib-v2/src/DynamicForm/DynamicForm.tsx` |
| AuthService | `libs/shared-lib-v2/src/AuthService/AuthService.ts` |
| Tracking queue lookup | `libs/shared-lib-v2/src/utils/trackingContentQueueLookup.ts` |
| Custom IndexedDB | `libs/shared-lib-v2/src/utils/customIdbStore.ts` |
| Feature flags (SCP) | `mfes/scp-teacher-repo/module.config.js` |
| Feature flags (YouthNet) | `mfes/youthNet/module.config.js` |
| Admin Docker | `Dockerfile.admin-app-repo` |
| Teachers Docker | `Dockerfile.teachers` |
| Learner Docker | `Dockerfile.learner-web-app` |
| Admin PM2 | `ecosystem.admin-app-repo.config.js` |

---

## 19. Known Architecture Notes (Important for New Development)

1. **Three independent stacks** — Admin, Teachers, Learner are separate Docker images. A change to a shared component requires rebuilding the relevant stack.

2. **`players` MFE built 3×** — one instance per stack with different port numbers. Keep all three in sync when changing player code.

3. **No Redux** — use Zustand for new global state. Use React Query for server state caching.

4. **Workspace MFE is the API proxy** — all Sunbird content API calls from admin/teachers go through port 4104 (workspace). The workspace must be running for content to load.

5. **Interceptor duplication** — `Interceptor.ts` / `RestClient.ts` exist independently in 7+ places. When adding new auth headers, update in all locations or route through `shared-lib-v2`.

6. **Dynamic forms are tenant-aware** — form schemas come from the API and differ per `context` + `contextType`. Never hardcode form fields.

7. **Service worker cannot access localStorage** — all auth tokens must be passed via `postMessage` from `ServiceWorkerRegister.tsx`.

8. **Feature flags at build time** — `module.config.js` in scp/youthNet excludes features at build time, not runtime. Changing a feature flag requires a rebuild.

9. **Content completion → certificate** — the entire certificate issuance flow runs inside the service worker, not the UI. Errors in SW will silently prevent certificate generation.

10. **Two shared libs** — prefer `shared-lib-v2` for new components. `shared-lib` (v1) is the legacy library.
