import { LearnerProgressStatus } from '../../utils/Interfaces';

// The Placements page only ever shows these two learner-progress statuses
// (cohortmember/list's own core `status` field — same enum LearnerListService
// already reads for My Teaching Center). Confirmed against a real
// POST /cohortmember/list request: filters.status: ["course_completed","placed"].
export const PLACEMENT_LEARNER_STATUSES: LearnerProgressStatus[] = [
  'course_completed',
  'placed',
];

export const PLACEMENT_STATUS_LABEL_KEYS: Record<LearnerProgressStatus, string> = {
  in_training: 'PLACEMENTS.STATUS_IN_TRAINING',
  course_completed: 'PLACEMENTS.STATUS_COURSE_COMPLETED',
  placed: 'PLACEMENTS.STATUS_PLACED',
  retention_complete: 'PLACEMENTS.STATUS_RETENTION_COMPLETE',
  dropout: 'PLACEMENTS.STATUS_DROPOUT',
};

// Placement Form API: GET /interface/v1/form/read?context=PLACEMENT&contextType=PLACEMENT
export const PLACEMENT_FORM_CONTEXT = {
  context: 'PLACEMENT',
  contextType: 'PLACEMENT',
};

// Once placed, a learner reverts to this status when a Coordinator deletes
// their placement (matches the wireframe's "Un-place" behavior — the record
// is deactivated, not hard-deleted).
export const UNPLACED_STATUS: LearnerProgressStatus = 'course_completed';

// state/district are real Placement Form fields (the placement's job
// location) and must stay in the schema DynamicForm renders — but the
// learner table's own auto-generated Placement columns (see
// PlacementLearnerTable.tsx) shouldn't show them as separate columns.
export const PLACEMENT_TABLE_EXCLUDED_FIELDS = ['state', 'district'];
