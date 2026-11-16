// The single cohort-membership customField that holds a learner's complete
// Placement + Retention history as one JSON object (see
// PlacementRetentionDataService). Both the Placements and Retention flows
// read and write only this field — the Placement Form's own per-field
// fieldIds and the old per-milestone Retention fields are legacy, read once
// for migration only.
//
// Note: this is the same fieldId the old 1-month Retention milestone used
// (LEGACY_RETENTION_MILESTONE_FIELD_IDS[1] below), so a learner's existing
// value here may still be that legacy flat 1-month form answers object —
// the parser tells the two apart by the presence of a `placements` array.
export const PLACEMENT_RETENTION_FIELD_ID = '748be7e8-77bb-46ea-9efb-fddc7e0ec814';

export const PLACEMENT_RETENTION_DATA_VERSION = 1;

export type PlacementRecordStatus = 'active' | 'resigned';

// Placement Form property keys the data layer needs to read for its own
// bookkeeping (placementId generation, Retention date math, display
// headings). All other Placement Form fields are stored as-is in the
// placement's `formData`, never enumerated here.
export const PLACEMENT_DATE_FIELD_KEY = 'dateOfJoining';
export const PLACEMENT_PROPERTY_FIELD_KEY = 'placementPoperty';

// Pre-JSON storage: one customField per Retention milestone, each holding
// that milestone's whole Retention Form answers. Only read by the legacy
// migration in PlacementRetentionDataService — never written any more.
export const LEGACY_RETENTION_MILESTONE_FIELD_IDS: Record<number, string> = {
  1: '748be7e8-77bb-46ea-9efb-fddc7e0ec814',
  2: '358e636b-f8eb-4a56-9a3e-7f8321eb28fe',
  3: '578a50ed-1a33-4754-9e38-bcd31bae937d',
  6: '2b4ea885-067c-4e79-8f0b-b9d34b829683',
  9: '80a6b0b7-2ac9-4446-891c-f19ce0e85d8b',
  12: '83ef473f-5836-4a6a-b100-4d4af9272407',
};
