//@ts-nocheck
import { Grid } from '@mui/material';

// ObjectFieldTemplate for DynamicFormV3. Same grid layout as
// CustomObjectFieldTemplate, but a field rendered with the 'hidden' widget
// hides its whole grid cell, so it doesn't leave an empty gap in the form.
export const ObjectFieldTemplateV3 = ({ properties }: any) => {
  return (
    <Grid container spacing={2}>
      {properties.map((prop: any) => {
        const fieldUiSchema = prop.content?.props?.uiSchema;
        const gridOptions = fieldUiSchema?.['ui:options']?.grid || {};
        const isHidden =
          prop.hidden || fieldUiSchema?.['ui:widget'] === 'hidden';

        return (
          <Grid
            item
            key={prop.name}
            xs={gridOptions.xs || 12}
            sm={gridOptions.sm || 12}
            md={gridOptions.md || 12}
            style={isHidden ? { display: 'none' } : undefined}
          >
            {prop.content}
          </Grid>
        );
      })}
    </Grid>
  );
};
