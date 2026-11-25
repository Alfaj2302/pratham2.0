import { Role } from './app.constant';
import {
  CourseListFilters,
  CourseStatusChipConfig,
  CourseStatusCounts,
  CourseStatusKey,
  FilterPillOption,
  HighAttemptFilter,
  ManagerDashboardNavItem,
  ManagerDashboardTabKey,
  NormalizedStatus,
  StatusConfigItem,
} from './Interface';

export const AttendanceAPILimit: number = 300;
export const lowLearnerAttendanceLimit: number = 32;
export const avgLearnerAttendanceLimit: number = 66;
export const dashboardDaysLimit: number = 30;
export const modifyAttendanceLimit: number = 6;
export const eventDaysLimit: number = 7;
export const toastAutoHideDuration: number = 5000; // 5 seconds
export const idealTimeForSession: string = '120';
export const timeZone: string = 'Asia/Kolkata';
export const SIDEBAR_WIDTH_EXPANDED: number = 350;
export const SIDEBAR_WIDTH_COLLAPSED: number = 80;
// export const jotFormId = '250065095006449';

export const dropoutReasons = [
  {
    label: 'UNABLE_TO_COPE_WITH_STUDIES',
    value: 'Unable to cope with studies',
  },
  { label: 'FAMILY_RESPONSIBILITIES', value: 'Family responsibility' },
  {
    label: 'NEED_TO_GO_TO_WORK_OWN_WORK',
    value: 'Need to go to work/ own work',
  },
  { label: 'MARRIAGE', value: 'Marriage' },
  { label: 'ILLNESS', value: 'Illness' },
  { label: 'MIGRATION', value: 'Migration' },
  { label: 'PREGNANCY', value: 'Pregnancy' },
  { label: 'DOCUMENT_ISSUE', value: 'Document issue' },
  { label: 'DISTANCE_ISSUE', value: 'Distance issue' },
  { label: 'SCHOOL_ADMISSION', value: 'School admission' },
];

export const accessControl: { [key: string]: Role[] } = {
  accessDashboard: [Role.TEACHER, Role.TEAM_LEADER],
  accessAttendanceHistory: [Role.TEACHER, Role.TEAM_LEADER],
  accessAttendanceOverview: [Role.TEACHER, Role.TEAM_LEADER],
  accessProfile: [Role.TEACHER, Role.TEAM_LEADER],
  accessLearnerProfile: [Role.TEACHER, Role.TEAM_LEADER],
  accessLearnerAttendanceHistory: [Role.TEACHER, Role.TEAM_LEADER],
  showTeachingCenter: [Role.TEAM_LEADER],
  showBlockLevelCohort: [Role.TEAM_LEADER],
  showTeacherCohorts: [Role.TEACHER],
  showBlockLevelData: [Role.TEAM_LEADER],
  showCreateCenterButton: [Role.TEAM_LEADER],
  showBlockLevelCenterData: [Role.TEAM_LEADER],
  showTeacherLevelCenterData: [Role.TEACHER],
  accessCoursePlanner: [Role.TEACHER, Role.TEAM_LEADER],
  accessCoursePlannerDetails: [Role.TEACHER, Role.TEAM_LEADER],
  // Trainer-only: the YouthNet Assessments and Manual Assessment (Trainer) flows are built for the
  // Trainer role. Narrowed from the [TEACHER, TEAM_LEADER] value inherited from scp-teacher-repo;
  // this key had no consumer in YouthNet before `utils/hoc/withAccessControl`.
  accessAssessments: [Role.TEACHER],
  accessCenters: [Role.TEACHER, Role.TEAM_LEADER],
};

export const fullWidthPages = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/404',
  '/500',
  '/offline',
  '/unauthorized',
  '/create-password',
  '/sso',
];

export const DaysOfWeek = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const Program = ['Second Chance'];
export const loggedInProgram =  ['Vocational Training'];

export const tenantId =
  typeof window !== 'undefined' && localStorage.getItem('tenantId');

if (!tenantId && typeof window !== 'undefined') {
  console.warn(
    'NEXT_PUBLIC_TENANT_ID is not set in the environment variables.'
  );
}

export const frameworkId = process.env.NEXT_PUBLIC_FRAMEWORK_ID || '';
if (!frameworkId) {
  console.warn(
    'NEXT_PUBLIC_FRAMEWORK_ID is not set in the environment variables.'
  );
}

export enum AssessmentType {
  PRE_TEST = 'Pre Test',
  POST_TEST = 'Post Test',
  OTHER = 'Other',
}
export const RequisiteType = {
  PRE_REQUISITES: 'prerequisite',
  POST_REQUISITES: 'postrequisite',
  FACILITATOR_REQUISITE: 'facilitator-requisite',
};

export const COURSE_TYPE = {
  COURSE: 'Course',
  FOUNDATION_COURSE: 'Foundation Course',
};

export const entityList = {
  TEAM_LEADER: ['center', 'facilitator', 'learner'],
  TEACHER: ['center', 'learner'],
};

export const MIME_TYPE = {
  QUESTION_SET_MIME_TYPE: 'application/vnd.sunbird.questionset',
  INTERACTIVE_MIME_TYPE: [
    'application/vnd.ekstep.h5p-archive',
    'application/vnd.ekstep.html-archive',
  ],
};

export const TENANT_DATA = {
  TENANT_NAME: 'tenantName',
  SECOND_CHANCE_PROGRAM: 'Second Chance Program',
  PRATHAM_SCP: 'pratham SCP',
  YOUTHNET: 'Vocational Training',
  MENTOR: 'mentor',
  LEADER: 'leader',
  CAMP_TO_CLUB : 'Camp to Club',
  POS : 'Open School',
  PRAGYANPATH :'Pragyanpath',
  SUMMER_CAMP : 'Summer Camp',

}; 
export const TENANT_TYPE = {
  VOLUNTEER_ONBOARDING: 'VolunteerOnboarding',
};
export const DASHBOARD_TYPE = {
  INDIVIDUAL_VOLUNTEER: 'individualVolunteer',
  ORGANISATION_VOLUNTEER: 'organisationVolunteer',
  ORGANISATION: 'organisation',
};

export const jotFormId = process.env.NEXT_PUBLIC_JOTFORM_ID || '';
if (!jotFormId) {
  console.warn(
    'NEXT_PUBLIC_JOTFORM_ID is not set in the environment variables.'
  );
}

export const BOTTOM_DRAWER_CONSTANTS = {
  MARK_VOLUNTEER: 'Marked as Volunteer',
  UNMARK_VOLUNTEER: 'Unmark as Volunteer',
  ADD_REASSIGN: 'Add or Reassign',
  REQUEST_REASSIGN: 'Request to Reassign',
  DELETE: 'Delete User',
  UNKNOWN_ACTION: 'Unknown Action',
};

// ---------------------------------------------------------------------------------------------
// Manager Dashboard (Overview / Team / Courses tabs) — config & static data. Business logic
// lives in utils/managerDashboardHelpers.ts; TypeScript types live in utils/Interface.ts; only
// constant values belong here.
// ---------------------------------------------------------------------------------------------

// Single source of truth for the Manager Dashboard's side-menu items and header tabs so both
// stay in sync automatically.
export const MANAGER_DASHBOARD_NAV_ITEMS: ManagerDashboardNavItem[] = [
  {
    key: 'dashboard',
    menuLabelKey: 'DASHBOARD.DASHBOARD',
    tabLabelKey: 'DASHBOARD_TABS.OVERVIEW',
  },
  {
    key: 'team',
    menuLabelKey: 'DASHBOARD_TABS.MY_TEAM',
    tabLabelKey: 'DASHBOARD_TABS.TEAM',
  },
  {
    key: 'courses',
    menuLabelKey: 'DASHBOARD_TABS.COURSES',
    tabLabelKey: 'DASHBOARD_TABS.COURSES',
  },
];

export const DEFAULT_MANAGER_DASHBOARD_TAB: ManagerDashboardTabKey = 'dashboard';

// Manager Dashboard's Team view groups/filters learners by these custom fields — a fetched user
// with none of them has nothing to show there, so useManagerDashboardData drops them.
export const MANAGER_DASHBOARD_CUSTOM_FIELD_LABELS = ['JOB_FAMILY', 'PSU', 'EMP_GROUP'];

// The same 3 labels, but as they appear on a Course object (composite search result) instead of
// a user's customFields — used to match a course's declared audience against a user/filter's
// JOB_FAMILY / PSU / EMP_GROUP values.
export const MANAGER_DASHBOARD_CUSTOM_FIELD_COURSE_KEYS: Record<string, string> = {
  JOB_FAMILY: 'jobFamily',
  PSU: 'psu',
  EMP_GROUP: 'groupMembership',
};

// Payload is not finalized yet on the backend side — passed through to `fetchCourses` as-is so
// it stays easy to adjust without touching the service layer. Fetches both Mandatory and
// Optional (non-mandatory) courses, and all live courses (no limit/offset — pagination and the
// Course Type/Language/Course Name filters are handled entirely on the frontend).
export const COURSE_CATALOGUE_FILTERS = {
  primaryCategory: ['Course'],
  courseType: ['Optional', 'Mandatory'],
  status: ['live'],
  channel: 'pragyanpath',
};

export const COURSES_PER_PAGE = 10;

export const DEFAULT_COURSE_LIST_FILTERS: CourseListFilters = {
  courseType: '',
  language: '',
  courseNames: [],
};

// Fixed rather than derived from the currently-loaded courses — Hindi should always be
// selectable even before any Hindi course has been fetched/paged into view.
export const COURSE_LANGUAGE_OPTIONS: FilterPillOption[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
];

// Single source of truth for the 5 status chips rendered per course row — add/remove/reorder a
// status by editing this array only, no JSX duplication needed.
export const COURSE_STATUS_CHIP_CONFIG: CourseStatusChipConfig[] = [
  { key: 'notStarted', labelKey: 'MANAGER_OVERVIEW.STATUS_NOT_STARTED', colorToken: 'notStarted' },
  { key: 'inProgress', labelKey: 'MANAGER_OVERVIEW.STATUS_IN_PROGRESS', colorToken: 'inProgress' },
  { key: 'completed', labelKey: 'MANAGER_OVERVIEW.STATUS_COMPLETED', colorToken: 'completed' },
  {
    key: 'certificateIssued',
    labelKey: 'MANAGER_OVERVIEW.STATUS_CERTIFICATE_ISSUED',
    colorToken: 'certificateIssued',
  },
  { key: 'highAttempts', labelKey: 'MANAGER_OVERVIEW.STATUS_HIGH_ATTEMPTS', colorToken: 'highAttempts' },
];

// Same 5 keys as above, used by the Status Details Modal's title/subtitle text.
export const COURSE_STATUS_LABEL_KEYS: Record<CourseStatusKey, string> = {
  notStarted: 'MANAGER_OVERVIEW.STATUS_NOT_STARTED',
  inProgress: 'MANAGER_OVERVIEW.STATUS_IN_PROGRESS',
  completed: 'MANAGER_OVERVIEW.STATUS_COMPLETED',
  certificateIssued: 'MANAGER_OVERVIEW.STATUS_CERTIFICATE_ISSUED',
  highAttempts: 'MANAGER_OVERVIEW.STATUS_HIGH_ATTEMPTS',
};

export const EMPTY_COURSE_STATUS_COUNTS: CourseStatusCounts = {
  notStarted: 0,
  inProgress: 0,
  completed: 0,
  certificateIssued: 0,
  highAttempts: 0,
};

// Backend status strings -> the 4 mutually-exclusive UI statuses. Unknown/missing values fall
// back to 'notStarted' rather than throwing or silently dropping the learner from every count.
// The real /tracking/content/course/status endpoint's actual status strings are
// not_started / inprogress / completed / viewCertificate — not the underscored
// not_started/in_progress/completed/certificate_issued guessed before the endpoint existed.
// Both spellings are kept mapped here (single source of truth) so either shape normalizes
// correctly everywhere in the dashboard.
export const STATUS_NORMALIZATION_MAP: Record<string, NormalizedStatus> = {
  not_started: 'notStarted',
  in_progress: 'inProgress',
  inprogress: 'inProgress',
  completed: 'completed',
  certificate_issued: 'certificateIssued',
  viewCertificate: 'certificateIssued',
};

// A learner needs this many attempts (or more) on a course's assessment to be flagged as
// "high attempts" — single source of truth, referenced by course-row counts, the High Quiz
// Attempt section, and its 3/4/5+ filter.
export const HIGH_ATTEMPT_THRESHOLD = 3;

export const ATTEMPT_FILTER_OPTIONS: HighAttemptFilter[] = ['3', '4', '5+'];

// --- My Team / Individual Progress ------------------------------------------------------------

export const EMPLOYEES_PER_PAGE = 10;

// The 4 status chips shown in a My Team progress-bar summary, in the fixed display order used by
// the design (Certificate Issued -> Completed -> In Progress -> Not Started) — deliberately not
// reusing `COURSE_STATUS_CHIP_CONFIG` since that's ordered/labeled for the Course List, includes
// `highAttempts`, and uses full labels rather than the abbreviated ones shown per-employee here.
export const INDIVIDUAL_PROGRESS_STATUS_CONFIG: StatusConfigItem[] = [
  { key: 'certificateIssued', icon: '✓', labelKey: 'MANAGER_OVERVIEW.STATUS_SUMMARY_CERT', colorToken: 'certificateIssued' },
  { key: 'completed', icon: '◆', labelKey: 'MANAGER_OVERVIEW.STATUS_SUMMARY_COMPLETED', colorToken: 'completed' },
  { key: 'inProgress', icon: '▶', labelKey: 'MANAGER_OVERVIEW.STATUS_SUMMARY_IN_PROGRESS', colorToken: 'inProgress' },
  { key: 'notStarted', icon: '○', labelKey: 'MANAGER_OVERVIEW.STATUS_SUMMARY_NOT_STARTED', colorToken: 'notStarted' },
];

export const HIGH_ATTEMPT_FLAG_ICON = '⚡';

// --- Courses / Course Breakdown ----------------------------------------------------------------

// Same 4 statuses/order/icons as `INDIVIDUAL_PROGRESS_STATUS_CONFIG`, but using the full
// "Certificate Issued"/"Completed"/etc. labels (COURSE_STATUS_LABEL_KEYS) instead of My Team's
// abbreviated "cert"/"completed" wording — the Course Card design spells statuses out in full.
export const COURSE_CARD_STATUS_CONFIG: StatusConfigItem[] = [
  { key: 'certificateIssued', icon: '✓', labelKey: 'MANAGER_OVERVIEW.STATUS_CERTIFICATE_ISSUED', colorToken: 'certificateIssued' },
  { key: 'completed', icon: '◆', labelKey: 'MANAGER_OVERVIEW.STATUS_COMPLETED', colorToken: 'completed' },
  { key: 'inProgress', icon: '▶', labelKey: 'MANAGER_OVERVIEW.STATUS_IN_PROGRESS', colorToken: 'inProgress' },
  { key: 'notStarted', icon: '○', labelKey: 'MANAGER_OVERVIEW.STATUS_NOT_STARTED', colorToken: 'notStarted' },
];
