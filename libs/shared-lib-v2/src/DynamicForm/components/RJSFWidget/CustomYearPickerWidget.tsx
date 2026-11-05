// @ts-nocheck
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useTranslation } from 'libs/shared-lib-v2/src/lib/context/LanguageContext';

export const DEFAULT_MIN_YEAR = 1980;

// Years from maxYear down to minYear, latest first.
export const getYearOptions = (
  minYear = DEFAULT_MIN_YEAR,
  maxYear = new Date().getFullYear()
): string[] => {
  const years = [];
  for (let year = maxYear; year >= minYear; year--) {
    years.push(String(year));
  }
  return years;
};

// Switches the given fields to this widget and limits their schema to the
// selectable years, so an out-of-range or non-numeric value fails validation.
// The value stays a "YYYY" string, keeping prefill and payloads unchanged.
export const applyYearPickerFields = (
  schema: any,
  uiSchema: any,
  fieldKeys: string[]
) => {
  if (!schema?.properties) return { schema, uiSchema };
  const properties = { ...schema.properties };
  const updatedUiSchema = { ...(uiSchema) };
  fieldKeys.forEach((key) => {
    if (properties[key]) {
      properties[key] = { ...properties[key], enum: getYearOptions() };
      updatedUiSchema[key] = {
        ...updatedUiSchema[key],
        'ui:widget': 'CustomYearPickerWidget',
      };
    }
  });
  return { schema: { ...schema, properties }, uiSchema: updatedUiSchema };
};

// Date picker restricted to the year view. Stores the selected year as a
// "YYYY" string, so it is a drop-in replacement for a free-text year field.
const CustomYearPickerWidget = ({
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
    if (date ?? date?.isValid()) {
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
      <Box onKeyDownCapture={blockKeyboardInput}>
        <DatePicker
          disabled={isDisabled}
          label={t(`FORM.${label}`, { defaultValue: label })}
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
              fullWidth: true,
              variant: 'outlined',
              error: hasError,
              helperText: hasError ? errorText : '',
              required,
              inputProps: { readOnly: true },
              onClick: () => !isDisabled && setOpen(true),
              sx: { '& .MuiInputBase-root': { cursor: 'pointer' } },
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default CustomYearPickerWidget;
