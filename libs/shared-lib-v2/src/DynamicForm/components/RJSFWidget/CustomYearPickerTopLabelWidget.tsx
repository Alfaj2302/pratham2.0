// @ts-nocheck
import React, { useState } from 'react';
import { Box, FormControl, FormLabel } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useTranslation } from 'libs/shared-lib-v2/src/lib/context/LanguageContext';
import {
  DEFAULT_MIN_YEAR,
  applyYearPickerFields,
} from './CustomYearPickerWidget';

// Same as applyYearPickerFields (year range, "YYYY" values), but renders the
// fields with this widget.
export const applyYearPickerTopLabelFields = (
  schema: any,
  uiSchema: any,
  fieldKeys: string[]
) => {
  const yearPickerForm = applyYearPickerFields(schema, uiSchema, fieldKeys);
  const updatedUiSchema = { ...yearPickerForm.uiSchema };
  fieldKeys.forEach((key) => {
    if (yearPickerForm.schema?.properties?.[key]) {
      updatedUiSchema[key] = {
        ...updatedUiSchema[key],
        'ui:widget': 'CustomYearPickerTopLabelWidget',
      };
    }
  });
  return { schema: yearPickerForm.schema, uiSchema: updatedUiSchema };
};

// Same as CustomYearPickerWidget, except the label sits above the field
// instead of inside it.
const CustomYearPickerTopLabelWidget = ({
  id,
  value,
  onChange,
  options,
  required,
  label,
  rawErrors = [],
  uiSchema = {},
}: any) => {
  const { t } = useTranslation();
  const minYear = Number(options?.minYear) || DEFAULT_MIN_YEAR;
  const maxYear = Number(options?.maxYear) || new Date().getFullYear();

  const isDisabled = uiSchema?.['ui:disabled'] === true;
  // Opened by clicking anywhere on the field, not only the calendar icon
  const [open, setOpen] = useState(false);

  const yearValue = Number(value);
  const isValidYear =
    /^\d{4}$/.test(String(value ?? '').trim()) &&
    yearValue >= minYear &&
    yearValue <= maxYear;
  const selectedYear = isValidYear ? dayjs(`${yearValue}-01-01`) : null;

  const handleYearChange = (date: any) => {
    if (date?.isValid()) {
      onChange(date.format('YYYY'));
    } else {
      onChange(undefined);
    }
  };

  const displayErrors = rawErrors.filter(
    (error) => !error.toLowerCase().includes('required')
  );
  const errorText = displayErrors?.[0] || '';
  const hasError =
    displayErrors && displayErrors.length > 0 && errorText.trim() !== '';

  // Block typing so a year can only be picked from the list
  const blockKeyboardInput = (e) => {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <input
        value={value ?? ''}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        style={{
          height: 1,
          padding: 0,
          border: 0,
          ...(value && { visibility: 'hidden' }),
        }}
        aria-hidden="true"
      />
      <FormControl
        fullWidth
        required={required}
        error={hasError}
        disabled={isDisabled}
      >
        <FormLabel htmlFor={id} sx={{ mb: 1 }}>
          {t(`FORM.${label}`, { defaultValue: label })}
        </FormLabel>
        <Box onKeyDownCapture={blockKeyboardInput}>
          <DatePicker
            disabled={isDisabled}
            value={selectedYear}
            onChange={handleYearChange}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            views={['year']}
            openTo="year"
            yearsOrder="desc"
            minDate={dayjs(`${minYear}-01-01`)}
            maxDate={dayjs(`${maxYear}-12-31`)}
            format="YYYY"
            slotProps={{
              textField: {
                id,
                fullWidth: true,
                variant: 'outlined',
                error: hasError,
                helperText: hasError ? errorText : '',
                inputProps: { readOnly: true },
                onClick: () => !isDisabled && setOpen(true),
                sx: { '& .MuiInputBase-root': { cursor: 'pointer' } },
              },
            }}
          />
        </Box>
      </FormControl>
    </LocalizationProvider>
  );
};

export default CustomYearPickerTopLabelWidget;
