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
