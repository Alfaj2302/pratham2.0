import { LearnerProgressStatus } from '../../utils/Interfaces';
import { L2BatchCreate } from '../../constant/Forms/L2BatchCreate';

// Derived from L2BatchCreate.ts (the real Batch-create form, ported from
// apps/admin-app-repo/src/constant/Forms/L2BatchCreate.js) rather than
// hardcoded a second time, so the two can't drift. Used by BatchListService
// to read Start/End Date back off an already-created batch's customFields.
export const BATCH_DATE_FIELD_IDS = {
  START_DATE: L2BatchCreate.schema.properties.startdate.fieldId,
  END_DATE: L2BatchCreate.schema.properties.enddate.fieldId,
};

// A Batch's course customField carries the label 'SKILLS' (per
// L2BatchCreate's `skills` field, fieldId ed585a8c-...). Confirmed against
// real API responses that a Trainer's own user profile carries a customField
// with this exact same label/fieldId too, both holding the same plain,
// human-readable display string (e.g. "Sewing Machine Operator (SMO)") —
// so Trainer and Batch values are directly comparable, unlike the person-only
// 'COURSES' field (fieldId 323d95c5-..., used by L2 Interested Queue for a
// Learner's tagged course id), which is a different, unrelated field.
export const BATCH_SKILLS_LABEL = 'SKILLS';

// The batch's ASSESSMENTS customField (selected Assessment do_ids).
export const BATCH_ASSESSMENTS_FIELD_ID = L2BatchCreate.schema.properties.assessments.fieldId;

// Real fieldId confirmed. Note the read path (LearnerListService.getOjtAddress)
// matches on this fieldId rather than a `label` string — the label wasn't
// given/confirmed, and fieldId is the reliable identifier for both the
// cohortmember/update write and reading the value back off a learner row.
export const OJT_ADDRESS_FIELD_ID = 'f3433736-1395-44c6-bacd-f92b2a31f4bd';

// Confirmed: for this Trainer/Vocational-Training context, cohortmember/list's
// own core `status` field (not a customField) carries these 5 values
// directly — a different contract from the generic active/dropout/archived
// cohort-membership `Status` enum (app.constant.ts) that L2/SCP flows use on
// the same endpoint. `dropout` is included here (it's a real status value
// for this enum too, distinct from the other flows' dropout semantics).
export const LEARNER_STATUS_LABEL_KEYS: Record<LearnerProgressStatus, string> = {
  in_training: 'MY_TEACHING_CENTER.STATUS_IN_TRAINING',
  course_completed: 'MY_TEACHING_CENTER.STATUS_COURSE_COMPLETED',
  placed: 'MY_TEACHING_CENTER.STATUS_PLACED',
  retention_complete: 'MY_TEACHING_CENTER.STATUS_RETENTION_COMPLETE',
  dropout: 'MY_TEACHING_CENTER.STATUS_DROPOUT',
};

export const LEARNER_STATUS_OPTIONS: LearnerProgressStatus[] = [
  'in_training',
  'course_completed',
  'placed',
  'retention_complete',
  'dropout',
];

// Sent as `filters.status` when "All Status" is selected (i.e. no specific
// status filter) — every value except the old generic 'active', per spec.
export const ALL_LEARNER_STATUSES: LearnerProgressStatus[] = LEARNER_STATUS_OPTIONS;
