import { addDays, format } from 'date-fns';
import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { PLACEMENT_FIELD_LABEL_OVERRIDES, PLACEMENT_FORM_CONTEXT } from './placements.config';

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

  return {
    schema,
    uiSchema,
  };
};

// Date of Joining must be strictly after the selected Batch's End Date.
// CustomDateWidget's minValue is inclusive, so it gets End Date + 1 day.
// Dates are handled as local 'YYYY-MM-DD' (no UTC parse) to avoid an
// off-by-one in negative/positive timezone offsets. UI-only restriction —
// the schema is untouched so an older saved placement can still be updated.
export const withDateOfJoiningAfter = (
  form: PlacementFormBundle | null,
  batchEndDate?: string
): PlacementFormBundle | null => {
  if (!form?.uiSchema?.dateOfJoining || !batchEndDate) return form;
  const [year, month, day] = batchEndDate.split('-').map(Number);
  if (!year || !month || !day) return form;
  const minValue = format(addDays(new Date(year, month - 1, day), 1), 'yyyy-MM-dd');
  return {
    ...form,
    uiSchema: {
      ...form.uiSchema,
      dateOfJoining: {
        ...form.uiSchema.dateOfJoining,
        'ui:options': { ...form.uiSchema.dateOfJoining['ui:options'], minValue },
      },
    },
  };
};

// One Placement Form field's saved value (from a placement record's
// formData — see PlacementRetentionDataService), formatted for display. For a
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
  value: any,
  t: (key: string, options?: any) => string
): string => {
  const property = schema?.properties?.[propertyKey];
  if (value === undefined || value === null || value === '') return '-';

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
  // Dates (e.g. dateOfJoining) are stored as 'YYYY-MM-DD' — show them as
  // 'DD-MM-YYYY', same as CustomDateWidget displays them in the form.
  const isoDate = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[3]}-${isoDate[2]}-${isoDate[1]}`;
  return resolveLabel(value);
};

// Display label for one Placement Form field — the schema's own title,
// except where the UI deliberately renames a field (see
// PLACEMENT_FIELD_LABEL_OVERRIDES). Shared by the learner table columns and
// the Placement History modal so both always read the same.
export const getPlacementFieldLabel = (
  schema: any,
  propertyKey: string,
  t: (key: string, options?: any) => string
): string =>
  t(PLACEMENT_FIELD_LABEL_OVERRIDES[propertyKey] || schema?.properties?.[propertyKey]?.title || propertyKey);

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
