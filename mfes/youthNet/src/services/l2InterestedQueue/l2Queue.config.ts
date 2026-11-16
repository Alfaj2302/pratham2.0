// Backend contract for the L2 Interested Queue (Trainer/Instructor) feature.
// The customField ids below were supplied directly against the dev backend
// (POST /interface/v1/user/list, PATCH /interface/v1/user/update/{userId}) —
// same backend as admin-app-repo's build of this same feature, do not
// change without confirming against that contract.
export const L2_FIELD_IDS = {
  DOMAIN: 'e5277d7b-e7ef-4a11-9a54-a8e6e7975383',
  // Replaces the earlier COURSES field (323d95c5-...). Reuses the same
  // fieldId as L2BatchCreate.ts's own `skills` field
  // (services/myTeachingCenter/myTeachingCenter.config.ts confirms this
  // fieldId/label pair against real API responses on a person profile), on
  // the same pattern DOMAIN already follows: one fieldId shared across the
  // Batch and Learner/Trainer entities in this backend.
  SKILLS: 'ed585a8c-8727-4bd5-a9c5-7642b2df774f',
  INTERACTION_NOTE: '3a74be4a-0e08-4cd6-84cb-f7d4f49ca33e',
  L2_INTERESTED: '3cd23569-3995-483e-9e0f-0ff6cbd9bad0',
};

export const L2_INTERESTED_VALUES = {
  INTERESTED: 'yes',
  ENROLLED: 'enrolled',
};
