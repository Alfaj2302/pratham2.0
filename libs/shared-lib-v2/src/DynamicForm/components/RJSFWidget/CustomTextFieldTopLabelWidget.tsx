// @ts-nocheck
import React from 'react';
import { FormControl, FormLabel, TextField } from '@mui/material';
import { WidgetProps } from '@rjsf/utils';

// Fields for which spaces should be stripped entirely
const NO_SPACE_FIELDS = new Set(['firstName', 'lastName', 'middleName', 'username']);

// Switches the given fields to this widget, keeping their other ui options.
export const applyTextFieldTopLabelFields = (
  uiSchema: any,
  fieldKeys: string[]
) => {
  const updatedUiSchema = { ...uiSchema };
  fieldKeys.forEach((key) => {
    if (updatedUiSchema[key]) {
      updatedUiSchema[key] = {
        ...updatedUiSchema[key],
        'ui:widget': 'CustomTextFieldTopLabelWidget',
      };
    }
  });
  return updatedUiSchema;
};

// Same as CustomTextFieldWidget, except the label sits above the field
// instead of inside it.
const CustomTextFieldTopLabelWidget = ({
  id,
  label,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  rawErrors = [],
  placeholder,
  options = {},
  uiSchema = {},
}: WidgetProps) => {
  // Derive the field name from the RJSF id (e.g. "root_firstName" -> "firstName")
  const fieldName = id ? id.replace(/^root[_.]/, '') : '';
  const isNoSpaceField = NO_SPACE_FIELDS.has(fieldName);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = event.target.value;
    if (isNoSpaceField) {
      val = val.replaceAll(/\s/g, ''); // Remove all whitespace characters
    }
    onChange(val === '' ? undefined : val);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    let val = event.target.value;
    if (isNoSpaceField) {
      val = val.replaceAll(/\s/g, '');
    }
    onBlur(id, val);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) =>
    onFocus(id, event.target.value);

  // Reflect stripped value in the displayed input for no-space fields
  const displayValue = isNoSpaceField
    ? (value ?? '').replaceAll(/\s/g, '')
    : (value ?? '');

  // Filter out 'is a required property' messages
  const displayErrors = rawErrors.filter(
    (error) => !error.toLowerCase().includes('required')
  );

  // Get helper text from options (RJSF merges ui:options into options prop)
  // Also check uiSchema directly as fallback
  const helperTextFromOptions =
    options?.helperText ||
    options?.note ||
    uiSchema?.['ui:options']?.helperText ||
    uiSchema?.['ui:options']?.note ||
    '';

  // Combine error and helper text - show error if exists, otherwise show helper text
  const helperText =
    displayErrors.length > 0 ? displayErrors[0] : helperTextFromOptions;

  const isDisabled = disabled || readonly;

  return (
    <FormControl
      fullWidth
      required={required}
      error={displayErrors.length > 0}
      disabled={isDisabled}
    >
      <FormLabel htmlFor={id} sx={{ mb: 1 }}>
        {label}
      </FormLabel>
      <TextField
        fullWidth
        id={id}
        value={displayValue}
        required={required}
        disabled={isDisabled}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        error={displayErrors.length > 0}
        helperText={helperText}
        variant="outlined"
        autoComplete="new-password"
        inputProps={{
          autoComplete: 'new-password',
          autoCorrect: 'off',
          spellCheck: false,
        }}
      />
    </FormControl>
  );
};

export default CustomTextFieldTopLabelWidget;
