import { TFunction } from 'i18next';


export const limit: number = 200;
export const metaTags = {
  title: 'Pratham Admin Management App',
};

// export enum Role {
//   STUDENT = "Learner",
//   TEACHER = "Instructor",
//   TEAM_LEADER = "Team Leader",
//   TEAM_LEADERS = "Team Leaders",

//   ADMIN = "State Admin",
//   CENTRAL_ADMIN = "Central Admin",
//   LEARNERS = "Learners",
//   FACILITATORS = "Facilitators",
//   CONTENT_CREATOR = "Content Creator",
//   CONTENT_REVIEWER = "Content Reviewer",
//   SCTA = "State Content Team Associate (SCTA)",
//   CCTA = "Central Content Team Associate (CCTA)"

// };

export enum Role {
  STUDENT = 'Learner',
  TEACHER = 'Instructor',
  TEAM_LEADER = 'Lead',
  ADMIN = 'State Lead',
  CENTRAL_ADMIN = 'Central Lead',
  LEARNERS = 'Learner',
  FACILITATORS = 'Facilitators',
  TEAM_LEADERS = 'Team Leaders',
  CONTENT_CREATOR = 'Content Creator',
  CONTENT_REVIEWER = 'Content Reviewer',
  SCTA = 'Content creator',
  CCTA = 'Content reviewer',
}

export enum TenantName {
  SECOND_CHANCE_PROGRAM = 'Second Chance Program',
  SECOND_CHANCE_PROGRAM_PATHWAYS = 'Pathways',
  YOUTHNET = 'Vocational Training',
  POS = 'Open School',
  PRAGYANPATH = 'Pragyanpath',
  CAMP_TO_CLUB = 'Camp to Club',
  LEARNING_AND_DEVELOPMENT = 'Learning and Development',
  CREATIVITY_CLUB = 'Creativity Club',
  EARLY_CHILDHOOD_EDUCATION = 'Early Childhood Education',
  INCLUSIVE_EDUCATION = 'Inclusive Education (ENABLE)',
  ELEMENTARY = 'Elementary',
  ANNUAL_STATUS_OF_EDUCATION_REPORT = 'Annual Status of Education Report',
}
export enum FilterKey {
  GROUP_MEMBERSHIP = 'groupMembership',
  JOB_FAMILY = 'jobFamily',
  PSU = 'psu',
}
export enum Status {
  ARCHIVED = 'archived',
  ARCHIVED_LABEL = 'Archived',
  ACTIVE = 'active',
  ACTIVE_LABEL = 'Active',
  ALL_LABEL = 'All',
  INACTIVE = 'InActive',
  PUBLISHED = 'published',
  DRAFT = 'draft',
  UNPUBLISHED = 'Unpublished',
  ISSUED = 'Issued',
  NOT_ISSUED = 'Not Issued',
}
export enum SORT {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export enum Storage {
  USER_DATA = 'userData',
  NAME = 'name',
  USER_ID = 'userId',
}
export enum FormContext {
  USERS = 'USERS',
  COHORTS = 'cohorts',
}
export enum TelemetryEventType {
  CLICK = 'CLICK',
  SEARCH = 'SEARCH',
  VIEW = 'VIEW',
  RADIO = 'RADIO',
}
export enum FormContextType {
  STUDENT = 'LEARNER',
  TEACHER = 'INSTRUCTOR',
  TEAM_LEADER = 'LEAD',
  ADMIN = 'State Lead',
  ADMIN_CENTER = 'Central Lead',
  COHORT = 'COHORT',
  CONTENT_CREATOR = 'CONTENT CREATOR',
}

export enum RoleId {
  STUDENT = 'eea7ddab-bdf9-4db1-a1bb-43ef503d65ef',
  TEACHER = 'a5f1dbc9-2ad4-442c-b762-0e3fc1f6c6da',
  TEAM_LEADER = 'c4454929-954e-4c51-bb7d-cca834ab9375',
  ADMIN = '4a3493aa-a4f7-4e2b-b141-f213084b5599',
  SCTA = '45b8b0d7-e5c6-4f3f-a7bf-70f86e9357ce',
  CONTENT_CREATOR = '45b8b0d7-e5c6-4f3f-a7bf-70f86e9357ce',
  CONTENT_REVIEWER = '2dc13fcc-29c4-42c1-b125-82d3dcaa4b42',
  STATE_LEAD = '4a3493aa-a4f7-4e2b-b141-f213084b5599',
}

export enum RoleName {
  CONTENT_CREATOR = 'Content creator',
  CONTENT_REVIEWER = 'Content reviewer',
  STATE_LEAD = 'State Lead',
}



export enum CohortTypes {
  BATCH = 'BATCH',
  COHORT = 'COHORT',
  BLOCK = 'BLOCK',
  DISTRICT = 'DISTRICT',
  STATE = 'STATE',
}

export enum FormValues {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  REGULAR = 'REGULAR',
  REMOTE = 'REMOTE',
  TRANSGENDER = 'TRANSGENDER',
}

// Custom field used to record that the learner has confirmed interest in the L2 course.
export const L2_INTEREST_FIELD_ID = '3cd23569-3995-483e-9e0f-0ff6cbd9bad0';


