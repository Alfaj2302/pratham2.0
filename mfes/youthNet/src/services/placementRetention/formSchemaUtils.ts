// A field whose options come from an API (domain, placementPoperty, state,
// district — anything with `api`) only shows a prefilled value as selected
// once its enumOptions actually contains that exact value — and that list
// is empty until DynamicForm's own async option-fetch resolves, a timing
// race this app has already proven unreliable (fine on a warm connection,
// broken after a full reload's cold one). Sidestep it: inject the
// already-known saved values as guaranteed options into a *clone* of the
// schema before handing it to DynamicForm. When the real options arrive
// later they simply extend the list.
//
// Shared by the Update Placement and the Retention Follow-Up prefill.
export const withKnownApiOptionValues = (schema: any, formData: Record<string, any>): any => {
  const cloned = JSON.parse(JSON.stringify(schema));
  Object.keys(cloned?.properties || {}).forEach((key) => {
    if (!schema?.properties?.[key]?.api) return; // only API-driven fields need this

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
