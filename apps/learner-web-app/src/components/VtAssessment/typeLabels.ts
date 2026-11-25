/**
 * Known assessment types get a translated label; anything else falls back to the
 * raw API value via `t(key, { defaultValue: type })`.
 */
const TYPE_LABEL_KEYS: Record<string, string> = {
  'Pre Test': 'LEARNER_APP.VT_ASSESSMENT.TYPE_PRE_TEST',
  'Post Test': 'LEARNER_APP.VT_ASSESSMENT.TYPE_POST_TEST',
  Other: 'LEARNER_APP.VT_ASSESSMENT.TYPE_OTHER',
  'Mock Test': 'LEARNER_APP.VT_ASSESSMENT.TYPE_MOCK_TEST',
  'Unit Test': 'LEARNER_APP.VT_ASSESSMENT.TYPE_UNIT_TEST',
};

export const getAssessmentTypeLabelKey = (type: string): string =>
  TYPE_LABEL_KEYS[type] ?? type;
