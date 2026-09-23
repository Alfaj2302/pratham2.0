import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { filterSchema } from '../../utils/helper';
import { RETENTION_FORM_CONTEXT, RetentionMilestoneKey, RETENTION_MILESTONES } from './retention.config';

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
// nothing pre-selected, including currentlyEmployed — rather than the key
// being absent from formData altogether. That distinction matters for any
// field driving extra.skipAndHide (currentlyEmployed hides both
// monthlySalary and reasonForLeavingJob until answered): DynamicForm's own
// getSkipKeys only ever resolves a skipAndHide branch when `formData[key]`
// is *truthy* (see DynamicForm.tsx), so a genuinely missing key can never
// trigger the "" branch even though it's a valid skipAndHide entry, and
// both dependent fields would wrongly show up on first render. An empty
// array is truthy and stringifies to '' for that lookup, so it resolves
// correctly.
export const getInitialRetentionFormData = (schema: any): Record<string, any> => {
  const initial: Record<string, any> = {};
  Object.entries(schema?.properties || {}).forEach(([key, property]: [string, any]) => {
    initial[key] = property?.type === 'array' ? [""] : '';
  });
  return initial;
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
// The Retention Form has no dedicated backend endpoint of its own — like
// Placements, its fields are saved as the learner's cohort-membership
// customFields (PUT /cohortmember/update, keyed by each field's own
// fieldId). Placements only ever needs one value per field; Retention needs
// six independent submissions per field (1/2/3/6/9/12 months). So each
// field's stored value is itself a JSON object keyed by milestone:
//   { "1m": { value: <answer>, submittedAt: <ISO date> }, "2m": {...}, ... }
// Every submission writes this same shape to *every* field in the form
// (not just the ones the Coordinator filled in), so completion for a given
// milestone can be read off any single field — see ANCHOR_FIELD below —
// without depending on which fields happened to be optional/blank.

interface MilestoneEntry {
  value: any;
  submittedAt: string;
}
type FieldMilestoneBlob = Partial<Record<RetentionMilestoneKey, MilestoneEntry>>;

const parseFieldBlob = (raw: any): FieldMilestoneBlob => {
  if (typeof raw !== 'string' || raw === '') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const findLearnerCustomField = (learnerRow: any, fieldId: string) =>
  learnerRow?.customField?.find((field: any) => field.fieldId === fieldId);

const getFieldBlob = (schema: any, propertyKey: string, learnerRow: any): FieldMilestoneBlob => {
  const fieldId = schema?.properties?.[propertyKey]?.fieldId;
  if (!fieldId) return {};
  const raw = findLearnerCustomField(learnerRow, fieldId)?.selectedValues?.[0];
  return parseFieldBlob(raw);
};

// The single field whose blob is treated as authoritative for "has this
// milestone been completed" — the first schema property, in a fixed,
// deterministic order. Every submission writes to every field (see
// buildRetentionCustomFields below), so any field would do; picking one
// consistently avoids relying on which fields the Coordinator chose to fill.
const getAnchorPropertyKey = (schema: any): string | undefined =>
  Object.keys(schema?.properties || {})[0];

export const getMilestoneEntry = (
  schema: any,
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): MilestoneEntry | undefined => {
  const anchorKey = getAnchorPropertyKey(schema);
  if (!anchorKey) return undefined;
  return getFieldBlob(schema, anchorKey, learnerRow)[milestoneKey];
};

export const isMilestoneCompleted = (
  schema: any,
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): boolean => !!getMilestoneEntry(schema, learnerRow, milestoneKey);

export const areAllMilestonesCompleted = (schema: any, learnerRow: any): boolean =>
  RETENTION_MILESTONES.every((milestone) => isMilestoneCompleted(schema, learnerRow, milestone.key));

// Reads a learner's previously submitted answers for one milestone back into
// RJSF formData — used to prefill the read-only view of a Completed
// Follow-Up. The inverse of buildRetentionCustomFields.
export const extractRetentionFormData = (
  schema: any,
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey
): Record<string, any> => {
  const formData: Record<string, any> = {};
  Object.keys(schema?.properties || {}).forEach((key) => {
    const entry = getFieldBlob(schema, key, learnerRow)[milestoneKey];
    if (entry) formData[key] = entry.value;
  });
  return formData;
};

// Builds the customFields payload for one Retention Follow-Up submission:
// every schema field's existing milestone blob, with this milestone's entry
// merged in (added or overwritten, all earlier milestones left untouched).
// Also reports whether, after this merge, every required milestone would be
// completed — the caller uses that to decide whether to additionally update
// the learner's status to retention_complete.
export const buildRetentionSubmission = (
  schema: any,
  learnerRow: any,
  milestoneKey: RetentionMilestoneKey,
  formData: Record<string, any>
): { customFields: { fieldId: string; value: string }[]; allMilestonesCompleted: boolean } => {
  const submittedAt = new Date().toISOString();
  const propertyKeys = Object.keys(schema?.properties || {});

  const customFields = propertyKeys
    .map((key) => {
      const fieldId = schema.properties[key]?.fieldId;
      if (!fieldId) return null;
      const existingBlob = getFieldBlob(schema, key, learnerRow);
      const newBlob: FieldMilestoneBlob = {
        ...existingBlob,
        [milestoneKey]: { value: formData?.[key] ?? null, submittedAt },
      };
      return { fieldId, value: JSON.stringify(newBlob) };
    })
    .filter((field): field is { fieldId: string; value: string } => !!field);

  const anchorKey = getAnchorPropertyKey(schema);
  const anchorBlobAfterSave: FieldMilestoneBlob = anchorKey
    ? { ...getFieldBlob(schema, anchorKey, learnerRow), [milestoneKey]: { value: null, submittedAt } }
    : {};
  const allMilestonesCompleted = RETENTION_MILESTONES.every(
    (milestone) => !!anchorBlobAfterSave[milestone.key]
  );

  return { customFields, allMilestonesCompleted };
};
