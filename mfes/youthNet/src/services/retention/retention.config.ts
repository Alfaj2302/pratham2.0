// The Retention page's own learner-progress status values. Matches the
// existing shared LearnerProgressStatus spelling ('retention_complete', no
// trailing "d") used across Placements/My Teaching Center — confirmed as the
// correct value over the spec's own 'retention_completed' wording.
export type RetentionLearnerStatus = 'placed' | 'retention_complete';

export const RETENTION_LEARNER_STATUSES: RetentionLearnerStatus[] = [
  'placed',
  'retention_complete',
];

export const RETENTION_STATUS_LABEL_KEYS: Record<RetentionLearnerStatus, string> = {
  placed: 'RETENTION.STATUS_PLACED',
  retention_complete: 'RETENTION.STATUS_RETENTION_COMPLETED',
};

// Retention Form API: GET /interface/v1/form/read?context=RETENTION&contextType=RETENTION
export const RETENTION_FORM_CONTEXT = {
  context: 'RETENTION',
  contextType: 'RETENTION',
};

export type RetentionMilestoneKey = '1m' | '2m' | '3m' | '6m' | '9m' | '12m';

export interface RetentionMilestoneDef {
  key: RetentionMilestoneKey;
  months: number;
  labelKey: string;
}

// The six required follow-ups, in order, each a fixed number of months after
// the learner's Placement Date (see RetentionFormService for the date math).
export const RETENTION_MILESTONES: RetentionMilestoneDef[] = [
  { key: '1m', months: 1, labelKey: 'RETENTION.MILESTONE_1M' },
  { key: '2m', months: 2, labelKey: 'RETENTION.MILESTONE_2M' },
  { key: '3m', months: 3, labelKey: 'RETENTION.MILESTONE_3M' },
  { key: '6m', months: 6, labelKey: 'RETENTION.MILESTONE_6M' },
  { key: '9m', months: 9, labelKey: 'RETENTION.MILESTONE_9M' },
  { key: '12m', months: 12, labelKey: 'RETENTION.MILESTONE_12M' },
];

export type RetentionFollowUpState = 'upcoming' | 'due' | 'completed';

// Backend-provided cohort-membership customField, one per milestone — the
// entire Retention Form submission for that milestone is JSON-encoded into
// this single field's value (see RetentionFormService). These are fixed,
// backend-assigned ids, not derived from the Retention Form's own schema.
export const RETENTION_MILESTONE_FIELD_IDS: Record<RetentionMilestoneKey, string> = {
  '1m': '748be7e8-77bb-46ea-9efb-fddc7e0ec814',
  '2m': '358e636b-f8eb-4a56-9a3e-7f8321eb28fe',
  '3m': '578a50ed-1a33-4754-9e38-bcd31bae937d',
  '6m': '2b4ea885-067c-4e79-8f0b-b9d34b829683',
  '9m': '80a6b0b7-2ac9-4446-891c-f19ce0e85d8b',
  '12m': '83ef473f-5836-4a6a-b100-4d4af9272407',
};
