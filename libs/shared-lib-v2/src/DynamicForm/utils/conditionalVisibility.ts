// Schema-driven conditional visibility used by DynamicFormV2.
//
// A controlling field declares its rules under `extra`:
//
//   skipAndHide: { "<option>": [fieldsToHide], "": [fieldsToHideWhenEmpty] }
//     -> the listed fields are hidden while <option> is selected. The ""
//        key applies while the controlling field has no selected value.
//
//   skipAndShow: { "<option>": [fieldsToShow] }
//     -> the listed fields are hidden unless <option> is selected. A field
//        listed under several options of the same controlling field stays
//        visible while any one of them is selected.
//
// Values may be scalars or arrays (multi-select drop downs); both are
// normalised to a list of selected options before the rules are applied.

export interface VisibilityRule {
  skipAndHide?: Record<string, string[]>;
  skipAndShow?: Record<string, string[]>;
}

export type VisibilityRules = Record<string, VisibilityRule>;

export const extractVisibilityRules = (schema: any): VisibilityRules => {
  const rules: VisibilityRules = {};
  Object.entries(schema?.properties || {}).forEach(
    ([key, property]: [string, any]) => {
      const { skipAndHide, skipAndShow } = property?.extra || {};
      if (skipAndHide || skipAndShow) {
        rules[key] = { skipAndHide, skipAndShow };
      }
    }
  );
  return rules;
};

export const getSelectedValues = (value: any): string[] => {
  if (value === undefined || value === null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map((v) => String(v));
};

const collectHiddenFields = (
  rule: VisibilityRule,
  selected: string[],
  hidden: Set<string>
) => {
  const { skipAndHide, skipAndShow } = rule;

  if (skipAndHide) {
    if (selected.length === 0) {
      (skipAndHide[''] || []).forEach((field) => hidden.add(field));
    } else {
      selected.forEach((option) =>
        (skipAndHide[option] || []).forEach((field) => hidden.add(field))
      );
      // Same comma-joined key the original DynamicForm matched for a
      // multi-value selection, kept so existing configs keep working.
      if (selected.length > 1) {
        (skipAndHide[selected.join(',')] || []).forEach((field) =>
          hidden.add(field)
        );
      }
    }
  }

  if (skipAndShow) {
    const shown = new Set<string>();
    selected.forEach((option) =>
      (skipAndShow[option] || []).forEach((field) => shown.add(field))
    );
    Object.values(skipAndShow).forEach((fields) =>
      (fields || []).forEach((field) => {
        if (!shown.has(field)) hidden.add(field);
      })
    );
  }
};

// A hidden controlling field is treated as having no value, so a stale
// selection on it can't keep its own dependents visible (e.g. a hidden
// "reason" drop down still holding "other" must not show its "other" text
// box). Re-evaluated until the hidden set stops changing.
export const getHiddenFields = (
  rules: VisibilityRules,
  formData: Record<string, any> = {}
): Set<string> => {
  const controllingKeys = Object.keys(rules);
  let hidden = new Set<string>();

  for (let pass = 0; pass <= controllingKeys.length; pass++) {
    const next = new Set<string>();
    controllingKeys.forEach((key) => {
      const selected = hidden.has(key) ? [] : getSelectedValues(formData?.[key]);
      collectHiddenFields(rules[key], selected, next);
    });

    const isStable =
      next.size === hidden.size && [...next].every((field) => hidden.has(field));
    hidden = next;
    if (isStable) break;
  }

  return hidden;
};

export const applyHiddenFieldsToUiSchema = (
  uiSchema: any,
  hiddenFields: Set<string>
): any => {
  if (hiddenFields.size === 0) return uiSchema;
  const updated = { ...uiSchema };
  hiddenFields.forEach((field) => {
    updated[field] = { ...updated[field], 'ui:widget': 'hidden' };
  });
  return updated;
};

// Hidden fields can't be filled in, so they must not be required either.
export const applyHiddenFieldsToSchema = (
  schema: any,
  hiddenFields: Set<string>
): any => {
  if (hiddenFields.size === 0 || !Array.isArray(schema?.required)) return schema;
  return {
    ...schema,
    required: schema.required.filter((key: string) => !hiddenFields.has(key)),
  };
};

export const removeHiddenFieldValues = (
  formData: Record<string, any> = {},
  hiddenFields: Set<string>
): Record<string, any> => {
  const updated = { ...formData };
  hiddenFields.forEach((field) => delete updated[field]);
  return updated;
};
