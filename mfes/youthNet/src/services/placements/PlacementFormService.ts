import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { filterSchema } from '../../utils/helper';
import { PLACEMENT_FORM_CONTEXT } from './placements.config';

export interface PlacementFormBundle {
  schema: any;
  uiSchema: any;
}

// Same fetchForm()+filterSchema() convention used by every other dynamic
// form in this app (see MentorAssignment.tsx, user-profile/[userId].tsx,
// villages/index.tsx): two identical form/read calls — one without a
// tenantId header, one with — then filterSchema() strips out any
// state/district/block/village fields (a no-op here, the Placement Form has
// none) and returns the remaining schema/uiSchema.
export const getPlacementForm = async (): Promise<PlacementFormBundle | null> => {
  const fetchUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${PLACEMENT_FORM_CONTEXT.context}&contextType=${PLACEMENT_FORM_CONTEXT.contextType}`;
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

  // The backend form config sends placementPoperty's option-list API call
  // with a `headers: { tenantid: '...' }` block (plural key, lowercase
  // "tenantid") — DynamicForm's own header-passing logic only ever reads
  // `api.header` (singular) and only ever substitutes the three fixed keys
  // tenantId/Authorization/academicyearid, so that block is silently
  // ignored as-is and the API call goes out with no tenant header at all.
  // Rather than change DynamicForm.tsx (a shared component used across many
  // other apps/forms), reshape just this field's `api.header` here into the
  // shape it already supports — '**' reuses its existing
  // localStorage.getItem('tenantId') substitution, so this always reflects
  // whichever tenant the Coordinator is actually logged into, not a
  // hardcoded id.
  const placementPropertyApi = schema?.properties?.placementPoperty?.api;
  if (placementPropertyApi?.headers?.tenantid) {
    placementPropertyApi.header = { tenantId: '**' };
    delete placementPropertyApi.headers;
  }

  // The backend form config sends dateOfJoining as a plain CustomTextFieldWidget
  // text box. Swap in the project's real date-picker widget here instead —
  // same fieldId/required/validation on the schema side stay untouched, only
  // how the value is entered changes. CustomDateWidget already reads/writes
  // this field's `string` schema type as a plain 'YYYY-MM-DD' string, so no
  // schema change is needed for it to work.
  if (uiSchema.dateOfJoining) {
    uiSchema.dateOfJoining = {
      ...uiSchema.dateOfJoining,
      'ui:widget': 'CustomDateWidget',
    };
  }

  return {
    schema,
    uiSchema,
  };
};

// The Placement Form's own fields become a learner's cohort-membership
// customFields (there is no separate Placement API — see the plan's
// "Persisting placement data" section). Field identity is the schema
// property's own `fieldId` (same fieldId-keyed convention
// LearnerListService.getOjtAddress / updateCohortMemberStatus already use),
// not the RJSF key name.
export const buildPlacementCustomFields = (schema: any, formData: Record<string, any>) => {
  return Object.entries(formData || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      fieldId: schema?.properties?.[key]?.fieldId,
      value,
    }))
    .filter((field) => !!field.fieldId);
};

// Confirmed against a real cohortmember/list response: a saved Placement
// customField's selectedValues[0] is itself a JSON.stringify() of the real
// value — "[\"full-time\"]" for an array-type field, "\"423\"" for a plain
// string field — same JSON-round-trip behavior LearnerListService.
// getOjtAddress already documents for OJT Address. Parse it back to the
// real value; fall back to the raw string untouched if it isn't actually
// JSON.
const parseCustomFieldValue = (raw: any): any => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

// Looks up one Placement Form property's saved value off a learner row —
// shared by extractPlacementFormData (RJSF prefill) and
// formatPlacementValueForDisplay (table column) so both read the exact same
// fieldId + JSON-parsing logic.
export const getLearnerPlacementValue = (schema: any, propertyKey: string, learnerRow: any): any => {
  const fieldId = schema?.properties?.[propertyKey]?.fieldId;
  if (!fieldId) return undefined;
  const match = learnerRow?.customField?.find((field: any) => field.fieldId === fieldId);
  const raw = match?.selectedValues?.[0];
  if (raw === undefined || raw === null || raw === '') return undefined;
  return parseCustomFieldValue(raw);
};

// Reads a learner row's existing Placement customFields back into RJSF
// formData for the Update Placement prefill — the inverse of
// buildPlacementCustomFields.
export const extractPlacementFormData = (schema: any, learnerRow: any): Record<string, any> => {
  const formData: Record<string, any> = {};
  Object.keys(schema?.properties || {}).forEach((key) => {
    const value = getLearnerPlacementValue(schema, key, learnerRow);
    if (value !== undefined) formData[key] = value;
  });
  return formData;
};

// One Placement Form field's saved value, formatted for a table cell. For a
// field with a fixed (non-API-driven) enum — e.g. employmentType,
// placementDetails — resolves the raw value to its enumNames label via the
// same `FORM.<label>` translation convention AutoCompleteMultiSelectWidget
// itself uses, so the table reads the same as the form. Fields whose
// options come from an API (domain, placementPoperty, state, district)
// have no static enum to resolve against here, so their raw saved value is
// shown as-is — still real data, just not label-translated.
export const formatPlacementValueForDisplay = (
  schema: any,
  propertyKey: string,
  learnerRow: any,
  t: (key: string, options?: any) => string
): string => {
  const property = schema?.properties?.[propertyKey];
  const value = getLearnerPlacementValue(schema, propertyKey, learnerRow);
  if (value === undefined) return '-';

  const resolveLabel = (raw: any): string => {
    const enumArr = property?.items?.enum || property?.enum;
    const enumNames = property?.items?.enumNames || property?.enumNames;
    if (Array.isArray(enumArr) && Array.isArray(enumNames)) {
      const idx = enumArr.indexOf(raw);
      const rawLabel = idx !== -1 ? enumNames[idx] : undefined;
      if (rawLabel && rawLabel !== 'Select') {
        return t(`FORM.${rawLabel}`, { defaultValue: String(raw) });
      }
    }
    return String(raw);
  };

  if (Array.isArray(value)) {
    return value.length ? value.map(resolveLabel).join(', ') : '-';
  }
  return resolveLabel(value);
};

// Field keys to render as Placement columns in the learner table, in the
// order the Placement Form itself presents them — reuses the form's own
// uiSchema['ui:order'] (falling back to schema property order) instead of a
// separately hardcoded column list, so the table can't drift from
// whatever fields the backend form config actually has.
export const getPlacementFieldOrder = (form: PlacementFormBundle | null): string[] => {
  const propertyKeys = Object.keys(form?.schema?.properties || {});
  const order: string[] | undefined = form?.uiSchema?.['ui:order'];
  if (!Array.isArray(order)) return propertyKeys;
  return order.filter((key) => propertyKeys.includes(key));
};
