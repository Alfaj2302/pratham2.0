import { deleteApi } from '@shared-lib';
import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import API_ENDPOINTS from '../../utils/API/APIEndpoints';
import { PLACEMENT_FORM_CONTEXT } from './placements.config';

export interface PlacementFormBundle {
  schema: any;
  uiSchema: any;
}

// Same fetchForm() convention every other dynamic form in this app uses
// (see MentorAssignment.tsx, user-profile/[userId].tsx, villages/index.tsx):
// two identical form/read calls — one without a tenantId header, one with.
//
// Deliberately NOT running the result through filterSchema() (unlike those
// other call sites): that helper strips out any state/district/block/
// village properties on the assumption they're generic SDBV fields handled
// by a separate widget elsewhere on the page. The Placement Form's own
// `state`/`district` are real fields (the placement's job location), not
// that — and `district` is this schema's only `callType: 'dependent'`
// field. Stripping it made DynamicForm's own dependentApis.length check
// false, which skipped the whole block that re-applies the complete
// prefilled data on Update Placement — not just state/district, every
// field.
export const getPlacementForm = async (): Promise<PlacementFormBundle | null> => {
  const fetchUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${PLACEMENT_FORM_CONTEXT.context}&contextType=${PLACEMENT_FORM_CONTEXT.contextType}`;
  const responseForm: any = await fetchForm([
    { fetchUrl, header: {} },
    { fetchUrl, header: { tenantid: localStorage.getItem('tenantId') } },
  ]);
  if (!responseForm?.schema || !responseForm?.uiSchema) return null;

  const schema = responseForm.schema;
  const uiSchema = {
    ...responseForm.uiSchema,
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

  // state/district aren't wanted as visible Placement Form fields — but
  // they have to stay in the *schema* (see the comment above this
  // function): district is the schema's only callType:'dependent' field,
  // and removing it from schema.properties breaks DynamicForm's whole
  // prefill re-sync. `ui:widget: 'hidden'` hides the input control itself,
  // but this app's CustomObjectFieldTemplate may still render the field's
  // own schema `title` as a visible label regardless of the widget — so
  // also blank the title as a second, template-independent layer. Nothing
  // else reads this title (the learner-table columns that used to use it
  // already exclude state/district separately — see
  // PLACEMENT_TABLE_EXCLUDED_FIELDS), so blanking it is safe.
  ['state', 'district'].forEach((key) => {
    if (uiSchema[key]) {
      uiSchema[key] = { ...uiSchema[key], 'ui:widget': 'hidden' };
    }
    if (schema?.properties?.[key]) {
      schema.properties[key] = { ...schema.properties[key], title: '' };
    }
  });

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

// A field whose options come from an API (domain, placementPoperty, state,
// district — anything with `api.callType`) only shows a prefilled value as
// selected once its enumOptions actually contains that exact value — and
// that list is empty (just the ['Select'] placeholder) until the live API
// call resolves. Whether the async prefill re-sync (isReassign) happens to
// land after that call resolves is a timing race this app has already
// proven unreliable (see PlacementModal.tsx's own history). Sidestep the
// race entirely: inject the learner's already-known saved value as a
// guaranteed option into a *clone* of the schema before handing it to
// DynamicForm, so the widget can resolve it immediately at mount,
// independent of whether/when the real API call finishes. When the real
// options arrive later they simply extend the list (this fallback entry
// stays valid — the widget's own two-way choice still shows the current
// value regardless of which array `enum` ends up being).
export const buildUpdatePlacementSchema = (schema: any, learnerRow: any): any => {
  const cloned = JSON.parse(JSON.stringify(schema));
  Object.keys(cloned?.properties || {}).forEach((key) => {
    const originalProperty = schema?.properties?.[key];
    if (!originalProperty?.api) return; // only API-driven fields need this

    const value = getLearnerPlacementValue(schema, key, learnerRow);
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

// Delete Placement's real data-clearing step: DELETE /fields/values/delete
// with one {fieldId, itemId} entry per Placement Form field — itemId is the
// learner's cohortMembershipId (not userId; confirmed contract), fieldId is
// each field's own schema fieldId, so this can't drift from whatever fields
// the backend form config actually defines. updateCohortMemberStatus (kept
// separately, see DeletePlacementModal) still handles reverting `status`
// back to course_completed — this call only clears the customField values
// themselves, which that status-only call never touched.
export const deletePlacementFieldValues = async (
  schema: any,
  membershipId: string | number
): Promise<boolean> => {
  const fieldValues = Object.values(schema?.properties || {})
    .map((property: any) => property?.fieldId)
    .filter(Boolean)
    .map((fieldId: string) => ({ fieldId, itemId: membershipId }));
  if (fieldValues.length === 0) return true;

  try {
    await deleteApi(API_ENDPOINTS.fieldValuesDelete, { fieldValues });
    return true;
  } catch (error) {
    console.error('Error deleting placement field values:', error);
    return false;
  }
};
