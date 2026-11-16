# Capability Catalog

> Scope: each capability is mapped to the frontend repos/MFEs and API calls it makes. Database
> tables and capability ownership live outside this repo and are omitted rather than guessed.
> "Known Issues" below are architectural caveats observed in the code/docs (things worth
> checking before assuming a bug is elsewhere), not a live bug tracker.

---

## Authentication & Login (incl. OTP, SSO)

- **Description**: Standard username/password login, learner OTP-based registration login,
  SSO ingestion, password reset/change/create.
- **Related Repos/MFEs**: `mfes/authentication`, `mfes/login`, `mfes/forget-password`,
  `apps/admin-app-repo`, `apps/teachers`, `apps/learner-web-app`, `libs/shared-lib-v2`
  (`AuthService`)
- **Primary APIs**: `POST /account/login`, `POST /user/auth/refresh`, `POST /user/send-otp`,
  `POST /user/verify-otp`
- **Related Programs**: All
- **Known Issues**:
  - Token-refresh/auth-header logic is duplicated in 7+ places (see
    [01-repositories.md](01-repositories.md)) — an auth bug in one app does not imply the same
    bug exists in the others.
  - SSO `/sso` route accepts `accessToken`/`userId`/`tenantId`/`roleId`/`ssoProvider` query
    params on all three portals; token must validate before anything is stored — check
    middleware validation first if SSO login "silently does nothing."

## Profile Management

- **Description**: Learner/user profile view and edit, password/username change.
- **Related Repos/MFEs**: `mfes/profile-manage`, `apps/learner-web-app`
  (`/profile`, `/profile-complition`, `/enroll-profile-completion`)
- **Primary APIs**: `GET/POST /user/read/:id`, `/user/update/:id`
- **Related Programs**: All

## Center & Cohort Management

- **Description**: Centers (COHORT type) and Batches (BATCH type, child of center); geographic
  master data (State/District/Block/Village).
- **Related Repos/MFEs**: `apps/admin-app-repo` (`/centers`, `/batch`, `/state`, `/district`,
  `/block`, `/village`), `mfes/scp-teacher-repo` (`/centers`, `/centers/[cohortId]`)
- **Primary APIs**: `/cohort/search`, `/cohort/create`, `/cohort/update/:id`
- **Related Programs**: SCP primarily (Board/Medium/Grade batch fields); shared mechanism
  across all tenants
- **Known Issues**: Cohort hierarchy is `STATE → DISTRICT → BLOCK → COHORT (center) → BATCH`.
  A center/batch not appearing may be an archive (soft-delete) state issue, not a data-loss bug
  — archive is always soft-delete with a mandatory reason, and restore is supported.

## User Management (incl. bulk import/export)

- **Description**: Create/edit/archive users across all roles; CSV bulk import/export;
  learner reassignment between centers/batches.
- **Related Repos/MFEs**: `apps/admin-app-repo`, `mfes/scp-teacher-repo`,
  `libs/shared-lib-v2` (DynamicForm, MapUser widgets: `CenterListWidget`, `BatchListWidget`,
  `MultipleBatchListWidget`, `LMPMultipleBatchListWidget`, `WorkingVillageAssignmentWidget`,
  `EditSearchUser`, `EmailSearchUser`)
- **Primary APIs**: `POST /user/create`, CSV import/export endpoints
- **Related Programs**: All
- **Known Issues**: All user-creation forms are schema-driven (`DynamicForm`) — fields differ
  per role and tenant and are fetched from the API, never hardcoded. A "missing field" bug is
  almost always a form-schema config issue on the backend, not frontend logic.

## Attendance Management

- **Description**: Daily/session-level attendance marking, bulk marking, attendance
  overview/history/comparison, low-attendance identification.
- **Related Repos/MFEs**: `mfes/scp-teacher-repo` (`MarkBulkAttendance.tsx`,
  `/attendance-overview`, `/attendance-history`, `/learner-attendance-history`)
- **Primary APIs**: attendance create/bulk-create endpoints, `classesMissedAttendancePercentList`
- **Related Programs**: SCP
- **Known Issues**: Attendance is **context-aware** — can be recorded at cohort (batch) level
  or event (session) level via `contextId`/`context` fields (`'cohort' | 'event'`). If
  attendance percentages look wrong, confirm which context the data was recorded against
  before assuming a calculation bug.

## Assessments (Digital, Manual, AI)

- **Description**: Pre/post digital assessments with per-learner status tracking; manual/
  offline assessment entry (including camera capture of answer sheets); AI-generated question
  sets and AI-graded answer-sheet uploads.
- **Related Repos/MFEs**: `mfes/scp-teacher-repo` (`/assessments`, `/manual-assessments`,
  `/ai-assessments`), `mfes/workspace` (AI generation flow: `SelectContent`, `SetParameters`,
  `AIGenerationDialog`, `ConfirmationDialog`)
- **Primary APIs**: `GET /tracking/assessment/search/status`
- **Related Programs**: SCP (Board Enrollment ties into assessment stage tracking)
- **Known Issues**: Status values are `NOT_STARTED | IN_PROGRESS | COMPLETED` — a stuck status
  is often a sync/tracking issue (see Progress Tracking capability) rather than an assessment-
  logic bug. Manual assessments have a separate marks-entry path (`QuestionMarksManualUpdate`)
  from digital ones — confirm which flow a bug report is about before searching for the code.

## Content Management (Authoring, Review, Publish)

- **Description**: Course/unit/content authoring via Sunbird editors; review → publish
  workflow; bulk import of content/question-sets/courses via Excel.
- **Related Repos/MFEs**: `mfes/workspace` (`/workspace/content/create`, bulk import —
  see `mfes/workspace/BULK_IMPORT_ARCHITECTURE.md`), `mfes/editors` (`CollectionEditor`,
  `GenericEditor`/`ecEditor`, `QuestionSetEditor`, `UploadEditor`), `libs/shared-lib`
  (Sunbird player/editor wrappers)
- **Primary APIs**: `/api/content/v1/read/:id`, `/action/composite/v3/search`,
  `/api/course/v1/hierarchy/:id`, `/action/questionset/v2/hierarchy/:id`, S3 multipart upload
  via `/api/multipart-upload/*`
- **Related Programs**: All (content is program-agnostic; tagged by framework/channel)
- **Known Issues**:
  - Status pipeline: `draft → submitted → under_review → published`, with `rejected` returning
    to `draft` with reviewer notes. A content item "stuck" is almost always sitting in one of
    these states — check status before assuming an authoring bug.
  - **All Sunbird content API calls must route through the workspace MFE proxy** (port 4104).
    If content fails to load/save in admin or teacher apps, confirm workspace is running before
    debugging the calling app.
  - Bulk import has its own dependency-resolution and retry/rollback layer
    (`bulkImportQueue.ts`) — a partial-import failure is expected to produce a per-row error
    report, not necessarily indicate a systemic bug.

## Course Planner

- **Description**: Monthly curriculum plan linking subjects to content resources, organized by
  state/board/medium/grade/subject; CSV-based bulk plan upload.
- **Related Repos/MFEs**: `apps/admin-app-repo` (`/course-planner`, `/importCsv`),
  `mfes/scp-teacher-repo` (`/curriculum-planner`, `/curriculum-planner/center/[cohortId]`,
  `/topic-detail-view`)
- **Primary APIs**: `NEXT_PUBLIC_COURSE_PLANNER_API_URL`-backed endpoints (separate service
  from the main middleware)
- **Related Programs**: SCP
- **Known Issues**: Requires an **active academic year** to be selected
  (`isActiveYearSelected` in the Zustand store) and the referenced framework taxonomy /
  content to already exist and be published. A planner page that appears empty is often
  missing one of those preconditions rather than a data-fetch bug.

## Progress Tracking & Certificates

- **Description**: Sunbird telemetry-driven content progress tracking (online and offline via
  service worker); certificate issuance on completion + assessment pass threshold.
- **Related Repos/MFEs**: `apps/learner-web-app/public/sw.js` (custom hand-written service
  worker — **not** Workbox), `libs/shared-lib-v2` (`trackingContentQueueLookup.ts`,
  `customIdbStore.ts` — IndexedDB `tracking-db`/`tracking-store`)
- **Primary APIs**: `POST /tracking/content/create`, `POST /tracking/content/course/status`,
  `POST /tracking/content/course/inprogress`, `GET /tracking/assessment/search/status`,
  `POST /tracking/certificate/issue`, `/tracking/certificate/render[-PDF]`
- **Related Programs**: All
- **Known Issues**:
  - **The entire certificate-issuance flow runs inside the service worker**, not the UI —
    errors in the SW fail silently from the user's perspective and will not surface a UI error.
    This is the first place to check for "learner completed the course but no certificate"
    reports.
  - The service worker **cannot read `localStorage`**; all config (API URLs, auth token,
    tenantId, userId) is pushed to it via `postMessage` from `ServiceWorkerRegister.tsx` every
    60 seconds. A stale/missing token in the SW is a sync-timing issue, not an auth bug.
  - Pass threshold is **40% by default**, **80% for tenant `914ca990-...`** — confirm which
    applies before treating a "certificate not issued despite passing" report as a bug.
  - Offline sync drains the IndexedDB queue with a max of 3 retry attempts per entry; a
    `__sync_in_progress__` mutex key guards concurrent syncs.

## Notification System

- **Description**: Notification template management (admin); triggered transactional
  notifications; push notifications via FCM (teacher app).
- **Related Repos/MFEs**: `mfes/notification`, `apps/admin-app-repo`
  (`/notification-templates`)
- **Primary APIs**: `/notification/send`, `/notification-templates`
- **Related Programs**: All
- **Known Issues**: Triggered notification keys include `onLearnerCreated`,
  `onContentReview`, `LEARNER_REASSIGNMENT_NOTIFICATION`, `LEARNER_PROFILE_UPDATE_ALERT`,
  `BLOCK_REASSIGNMENT_NOTIFICATION` — if a specific event's notification isn't firing, check
  that the corresponding key/template exists before assuming a delivery-layer bug. FCM push is
  configured entirely through `NEXT_PUBLIC_FCM_*` env vars — a push-notification outage is
  often a Firebase config/permission issue, not app logic.

## Content Player

- **Description**: Renders content by MIME type across PDF, video, audio, ePub, QuML
  (question sets), and legacy ECML/HTML-archive/YouTube content.
- **Related Repos/MFEs**: `mfes/players` (`Players.tsx` routes by MIME type), built separately
  for admin/teacher/learner stacks
- **Primary APIs**: content-read APIs (see Content Management)
- **Related Programs**: All
- **Known Issues**: Player routing is MIME-type based
  (`application/pdf` → `SunbirdPdfPlayer`, `video/mp4`/`webm` → `SunbirdVideoPlayer`,
  `application/epub` → `SunbirdEpubPlayer`, `application/vnd.sunbird.question` →
  `SunbirdQuMLPlayer`, ECML/HTML-archive/YouTube → legacy `V1Player`). Because `players` is
  built 3× (once per stack), a playback bug must be checked/fixed in all three builds.

## Survey & Observations

- **Description**: Structured observation forms for centers/facilitators/learners; YouthNet
  village/camp surveys; generic survey fill flows with role-specific (learner vs teacher)
  routing.
- **Related Repos/MFEs**: `mfes/survey-observations`, `mfes/survey-forms`, `mfes/youthNet`
  (surveys), `apps/learner-web-app` (`/observations/questionary`)
- **Primary APIs**: Observation form definitions from the Shikshalokam/MentorEd
  `targetSolution` external service; `mfes/survey-forms` response list/status endpoints via
  `NEXT_PUBLIC_MIDDLEWARE_URL`
- **Related Programs**: SCP, YouthNet, general (survey-forms is program-agnostic)
- **Known Issues**: `survey-forms` deliberately splits learner and teacher entry flows so host
  MFEs call role-specific routes (`/survey-list` vs `/teacher-survey-list` +
  `/teacher-survey-fill/[surveyId]/hub`) — a survey appearing in the wrong flow is usually a
  routing-resolution issue in `resolveSurveyFillRoute.ts`, not a data issue.

## YouthNet Village & Volunteer Management

- **Description**: Village list/detail, camp tracking, volunteer registration and status
  tracking, mentor/manager dashboards with course completion and registration analytics.
- **Related Repos/MFEs**: `mfes/youthNet`
- **Primary APIs**: shared middleware user/cohort/tracking endpoints, scoped to the YouthNet
  tenant
- **Related Programs**: YouthNet
- **Known Issues**: Same build-time feature-flag mechanism (`module.config.js`) as SCP — a
  missing YouthNet feature may be flagged out at build time.

## Taxonomy & Framework Management

- **Description**: Manages the content classification framework (channels, frameworks,
  categories, terms, associations) used across all programs.
- **Related Repos/MFEs**: `mfes/taxonomy-manager` (`/frameworks`, `/channels`)
- **Primary APIs**: `/api/framework/v1/read/:id`
- **Related Programs**: All (SCP's Board→Medium→Grade→Subject structure is the primary
  consumer)
- **Known Issues**: Course Planner and content-authoring flows both **depend on** the
  framework taxonomy already existing — a "can't create content/plan" report may trace back to
  a missing taxonomy entry here rather than a bug in the dependent feature.

## Localisation & Accessibility

- **Description**: 10-language i18n support (English, Hindi, Marathi, Gujarati, Odia, Urdu,
  Malayalam, Kannada, Tamil, Telugu; Urdu is RTL); learner-app accessibility toggles (font
  scaling, color inversion, underline-links, text-to-speech).
- **Related Repos/MFEs**: all apps/MFEs (translation files at `public/locales/{lang}/common.json`
  per project), `apps/learner-web-app` (accessibility contexts:
  `FontSizeContext`, `ColorInversionContext`, `UnderlineLinksContext`, `SpeechContext`)
- **Primary APIs**: none — client-side only, persisted to `localStorage`
- **Related Programs**: All
- **Known Issues**: Language and accessibility preferences are per-browser `localStorage`
  state — a "settings didn't save" report is almost always a different browser/device/private
  session, not a backend sync gap (there is no backend sync for these preferences).
