import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { filterSchema } from '../../utils/helper';
import { RETENTION_FORM_CONTEXT, RetentionMilestoneKey } from './retention.config';

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

  // The backend form config sends callingDate as a plain CustomTextFieldWidget
  // text box. Swap in the project's real date-picker widget instead — same
  // fieldId/required/validation on the schema side stay untouched, only how
  // the value is entered changes. Same fix PlacementFormService already
  // applies to dateOfJoining; CustomDateWidget already reads/writes this
  // field's `string` schema type as a plain 'YYYY-MM-DD' string, so no
  // schema change is needed for it to work.
  if (uiSchema.callingDate) {
    uiSchema.callingDate = {
      ...uiSchema.callingDate,
      'ui:widget': 'CustomDateWidget',
    };
  }

  return { schema, uiSchema };
};

// A fresh (not-yet-completed) Retention Form opens with every field blank —
// nothing pre-selected. DynamicFormV2 treats a blank controlling field as
// "no value selected", so e.g. currentlyEmployed's "" skipAndHide branch
// hides monthlySalary and reasonForLeavingJob from the first render.
//
// Deliberately [] and not [''] — AutoCompleteMultiSelectWidget disables
// every remaining option once `selectedValues.length >= maxSelection`
// (see its own getOptionDisabled). For a maxSelection:1 field like
// currentlyEmployed, a single placeholder element (even an empty string)
// already "fills" that one slot, so both Yes/No would render disabled
// before the Coordinator ever gets to pick one.
export const getInitialRetentionFormData = (schema: any): Record<string, any> => {
  const initial: Record<string, any> = {};
  Object.entries(schema?.properties || {}).forEach(([key, property]: [string, any]) => {
    initial[key] = property?.type === 'array' ? [] : '';
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

// Calling Date can't be before the day this Follow-Up became Due (its
// milestone target date, 'YYYY-MM-DD'). CustomDateWidget's minValue is
// inclusive, so the target date itself stays selectable.
export const withCallingDateMinimum = (uiSchema: any, minDate?: string): any =>
  minDate && uiSchema?.callingDate
    ? {
        ...uiSchema,
        callingDate: {
          ...uiSchema.callingDate,
          'ui:options': { ...uiSchema.callingDate['ui:options'], minValue: minDate },
        },
      }
    : uiSchema;

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
