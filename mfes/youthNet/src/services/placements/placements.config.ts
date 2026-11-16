import { LearnerProgressStatus } from '../../utils/Interfaces';
import { PLACEMENT_PROPERTY_FIELD_KEY } from '../placementRetention/placementRetention.config';

// The learner-progress statuses the Placements page shows (cohortmember/
// list's own core `status` field — same enum LearnerListService already
// reads for My Teaching Center). retention_complete is included so a learner
// who finished one placement's Retention can still be placed again.
export const PLACEMENT_LEARNER_STATUSES: LearnerProgressStatus[] = [
  'course_completed',
  'placed',
  'retention_complete',
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
// their current placement (matches the wireframe's "Un-place" behavior).
export const UNPLACED_STATUS: LearnerProgressStatus = 'course_completed';

// Placement Form fields shown under a different label than the form's own
// title: "Placement Property" reads as "Organization Name" everywhere a
// placement is listed (tables, Placement History).
export const PLACEMENT_FIELD_LABEL_OVERRIDES: Record<string, string> = {
  [PLACEMENT_PROPERTY_FIELD_KEY]: 'PLACEMENTS.ORGANIZATION_NAME',
};

// state/district are real Placement Form fields (the placement's job
// location) and must stay in the schema DynamicForm renders — but the
// learner table's own auto-generated Placement columns (see
// PlacementLearnerTable.tsx) shouldn't show them as separate columns.
export const PLACEMENT_TABLE_EXCLUDED_FIELDS = ['state', 'district'];
