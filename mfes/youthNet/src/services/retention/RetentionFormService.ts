import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { filterSchema } from '../../utils/helper';
import {
  RETENTION_FORM_CONTEXT,
  RETENTION_MILESTONE_FIELD_IDS,
  RetentionMilestoneKey,
  RETENTION_MILESTONES,
} from './retention.config';

export interface RetentionFormBundle {
  schema: any;
  uiSchema: any;
}

// Same fetchForm()+filterSchema() convention as PlacementFormService — two
// identical form/read calls (one without a tenantId header, one with), then
// filterSchema() strips any state/district/block/village fields that
// shouldn't appear on this form.
export const getRetentionForm = async (): Promise<RetentionFormBundle | null> => {
  const fetchUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${RETENTION_FORM_CONTEXT.context}&contextType=${RETENTION_FORM_CONTEXT.contextType}`;
  const responseForm: any = await fetchForm([
    { fetchUrl, header: {} },
    { fetchUrl, header: { tenantid: localStorage.getItem('tenantId') } },
  ]);
  if (!responseForm?.schema || !responseForm?.uiSchema) return null;

  const { newSchema } = filterSchema(responseForm);
  const schema = newSchema?.schema;
  const uiSchema = {
    ...newSchema?.uiSchema,
    'ui:submitButtonOptions': { norender: true },
  };

  return { schema, uiSchema };
};

// A fresh (not-yet-completed) Retention Form opens with every field blank —
// nothing pre-selected — rather than the key being absent from formData
// altogether. That distinction matters for any field driving
// extra.skipAndHide (e.g. currentlyEmployed, which hides both
// monthlySalary and reasonForLeavingJob until answered): DynamicForm's own
// getSkipKeys only ever resolves a skipAndHide branch when `formData[key]`
// is *truthy* (see DynamicForm.tsx — unmodified; this is worked around at
// this layer instead, see applySkipAndHide below for the initial-render
// gap that leaves open regardless), so a genuinely missing key can never
// trigger the "" branch even though it's a valid skipAndHide entry. An
// empty array is truthy and stringifies to '' for that lookup, so it
// resolves correctly once the user's first interaction re-evaluates it.
export const getInitialRetentionFormData = (schema: any): Record<string, any> => {
  const initial: Record<string, any> = {};
  Object.entries(schema?.properties || {}).forEach(([key, property]: [string, any]) => {
    initial[key] = property?.type === 'array' ? [''] : '';
  });
  return initial;
};

// --- skipAndHide resolution -------------------------------------------
//
// Generic, schema-driven re-implementation of DynamicForm's own
// getSkipKeys/hideFieldsInUISchema (see DynamicForm.tsx — left unmodified),
// applied once up front when building the uiSchema we hand to DynamicForm,
// rather than relying on its internal effect timing. DynamicForm's own
// version only recomputes hidden fields on user interaction (handleChange)
// or, for a prefilled form, inside an effect that (for this form's shape —
// domain has an 'initial' API field but nothing 'dependent' on it) never
// actually runs — see getInitialRetentionFormData's comment. Either way,
// the very first render is left showing every field, including ones that
// should start hidden. Precomputing the hidden set ourselves from the
// schema's own extra.skipAndHide (not hardcoded to any particular field —
// works for currentlyEmployed or any other controlling field a form
// defines) closes that gap; DynamicForm's own live handleChange logic
// takes over correctly for every interaction after that.
export const applySkipAndHide = (
  schema: any,
  uiSchema: any,
  formData: Record<string, any>
): any => {
  const updated = { ...uiSchema };
  Object.entries(schema?.properties || {}).forEach(([key, property]: [string, any]) => {
    const skipAndHide = property?.extra?.skipAndHide;
    if (!skipAndHide) return;

    // Same value normalization DynamicForm's own getSkipKeys relies on
    // implicitly (an array used as an object key coerces via
    // Array.prototype.toString, which is equivalent to .join(',')) — [] and
    // [''] both resolve to '', matching skipAndHide's own "" entry for "no
    // value selected", instead of silently finding no match.
    const rawValue = formData?.[key];
    const lookupValue = Array.isArray(rawValue) ? rawValue.join(',') : rawValue ?? '';
    const fieldsToHide: string[] = skipAndHide[lookupValue] || [];

    fieldsToHide.forEach((hiddenKey) => {
      if (updated[hiddenKey]) {
        updated[hiddenKey] = { ...updated[hiddenKey], 'ui:widget': 'hidden' };
      }
    });
  });
  return updated;
};

// A read-only view of a Retention Form (used for a Completed Follow-Up):
// every field gets `ui:disabled: true` added to its own uiSchema entry —
// same per-field disable convention DynamicForm's username field already
// uses (see DynamicForm.tsx's `ui:disabled` checks) — rather than adding a
// new prop to the shared DynamicForm component.
export const getReadOnlyUiSchema = (schema: any, uiSchema: any): any => {
  const disabled: any = { ...uiSchema };
  Object.keys(schema?.properties || {}).forEach((key) => {
    disabled[key] = { ...disabled[key], 'ui:disabled': true };
  });
  return disabled;
};

// --- Per-milestone data storage -------------------------------------------
//
// Each of the 6 follow-ups has its own dedicated, backend-provided
// cohort-membership customField (RETENTION_MILESTONE_FIELD_IDS) — unlike
// Placements, which has no such per-milestone concept and just maps each
// form field to its own fieldId. A Retention submission stores the entire
// form's answers as that one milestone field's value, as a genuine JSON
// object/array — not a client-side-stringified string, and not wrapped in
// any envelope (no {formData, submittedAt} — just the form's own key/value
// pairs directly). updateCohortMemberStatus (LearnerListService) sends this
// through untouched; the backend does its own single JSON.stringify() when
// persisting into selectedValues[0], the same as every other customField.

const findLearnerCustomField = (learnerRow: any, fieldId: string) =>
  learnerRow?.customField?.find((field: any) => field.fieldId === fieldId);

// Undoes the backend's single JSON.stringify() to read the plain formData
// object back. selectedValues[0] can also already be a plain object (e.g.
// if a future backend response stops string-encoding it) — handled as-is.
const parseMilestoneFormData = (raw: any): Record<string, any> | undefined => {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || raw === '') return undefined;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const getMilestoneFormData = (
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): Record<string, any> | undefined => {
  const fieldId = RETENTION_MILESTONE_FIELD_IDS[milestoneKey];
  const raw = findLearnerCustomField(learnerRow, fieldId)?.selectedValues?.[0];
  return parseMilestoneFormData(raw);
};

export const isMilestoneCompleted = (
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): boolean => !!getMilestoneFormData(learnerRow, milestoneKey);

export const areAllMilestonesCompleted = (learnerRow: any): boolean =>
  RETENTION_MILESTONES.every((milestone) => isMilestoneCompleted(learnerRow, milestone.key));

// Reads a learner's previously submitted answers for one milestone back into
// RJSF formData — used to prefill the read-only view of a Completed
// Follow-Up. The inverse of buildRetentionSubmission.
export const extractRetentionFormData = (
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): Record<string, any> => getMilestoneFormData(learnerRow, milestoneKey) || {};

// Builds the single customField write for one Retention Follow-Up
// submission — that milestone's own dedicated field, holding the whole
// form's answers as a plain object (not JSON.stringify()'d here — see the
// module comment above). Also reports whether, counting this submission,
// every required milestone is now completed — the caller uses that to
// decide whether to additionally update the learner's status to
// retention_complete.
export const buildRetentionSubmission = (
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey,
  formData: Record<string, any>
): { customFields: { fieldId: string; value: Record<string, any> }[]; allMilestonesCompleted: boolean } => {
  const customFields = [{ fieldId: RETENTION_MILESTONE_FIELD_IDS[milestoneKey], value: formData }];

  const allMilestonesCompleted = RETENTION_MILESTONES.every((milestone) =>
    milestone.key === milestoneKey ? true : isMilestoneCompleted(learnerRow, milestone.key)
  );

  return { customFields, allMilestonesCompleted };
};

// --- Call Interval auto-select/lock ----------------------------------------
//
// The Retention Form's own callInterval field lets the Coordinator record
// which month this follow-up is for — but since that's already determined
// by which milestone box they clicked, it must be preset to the matching
// value and locked, not left for them to (mis)select.
const CALL_INTERVAL_FIELD_KEY = 'callInterval';

const RETENTION_MILESTONE_CALL_INTERVAL_VALUES: Record<RetentionMilestoneKey, string> = {
  '1m': '1-month',
  '2m': '2-months',
  '3m': '3-months',
  '6m': '6-months',
  '9m': '9-months',
  '12m': '12-months',
};

export const getCallIntervalValue = (milestoneKey: RetentionMilestoneKey): string[] => [
  RETENTION_MILESTONE_CALL_INTERVAL_VALUES[milestoneKey],
];

// Locks callInterval (ui:disabled) without touching any other field's
// editability — used for a fresh (not-yet-completed) submission, where
// every other field must stay editable. A Completed Follow-Up already
// disables every field via getReadOnlyUiSchema, callInterval included.
export const withCallIntervalLocked = (uiSchema: any): any => ({
  ...uiSchema,
  [CALL_INTERVAL_FIELD_KEY]: { ...uiSchema?.[CALL_INTERVAL_FIELD_KEY], 'ui:disabled': true },
});

// Initial formData for a brand-new (not-yet-completed) Follow-Up: every
// field blank (see getInitialRetentionFormData) except callInterval, preset
// to the milestone being filled (see the Call Interval section above).
export const getFreshRetentionFormData = (
  schema: any,
  milestoneKey: RetentionMilestoneKey
): Record<string, any> => ({
  ...getInitialRetentionFormData(schema),
  callInterval: getCallIntervalValue(milestoneKey),
});

// Same trick as PlacementFormService.buildUpdatePlacementSchema: guarantees
// an API-driven field's already-known value (e.g. domain: "Beauty") is
// present in its enum/enumNames from the very first render, so a Completed
// Follow-Up's prefilled selection doesn't depend on winning a race against
// DynamicForm's own async option-fetch — an unreliable race (fine on a warm
// connection, broken after a full page reload's cold one), the same one
// Placements' own Update flow already hit and fixed this same way.
export const buildRetentionSchemaWithKnownValues = (
  schema: any,
  formData: Record<string, any>
): any => {
  const cloned = JSON.parse(JSON.stringify(schema));
  Object.keys(cloned?.properties || {}).forEach((key) => {
    const originalProperty = schema?.properties?.[key];
    if (!originalProperty?.api) return; // only API-driven fields need this

    const value = formData?.[key];
    const rawValues = (Array.isArray(value) ? value : [value]).filter(
      (v) => typeof v === 'string' && v !== ''
    );
    if (rawValues.length === 0) return;

    const target = cloned.properties[key]?.items ?? cloned.properties[key];
    if (!target) return;
    const enumArr: any[] = Array.isArray(target.enum) ? target.enum : [];
    const enumNames: any[] = Array.isArray(target.enumNames) ? target.enumNames : [];
    rawValues.forEach((v: string) => {
      if (!enumArr.includes(v)) {
        enumArr.push(v);
        enumNames.push(v);
      }
    });
    target.enum = enumArr;
    target.enumNames = enumNames;
  });
  return cloned;
};
