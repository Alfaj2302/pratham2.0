 //@ts-nocheck
import { Grid } from '@mui/material';

export const CustomObjectFieldTemplate = ({ properties }: any) => {
    return (
      <Grid container spacing={2}>
        {properties.map((prop: any) => {
          const fieldUiSchema = prop.content?.props?.uiSchema;
          // Hidden fields (e.g. via skipAndHide) render nothing visible —
          // skip their Grid item so its spacing doesn't leave a blank gap.
          if (prop.hidden || fieldUiSchema?.['ui:widget'] === 'hidden') {
            return null;
          }
          const gridOptions = fieldUiSchema?.['ui:options']?.grid || {};

          return (
            <Grid
              item
              key={prop.name}
              xs={gridOptions.xs || 12}
              sm={gridOptions.sm || 12}
              md={gridOptions.md || 12}
            >
              {prop.content}
            </Grid>
          );
        })}
      </Grid>
    );
  };
  
