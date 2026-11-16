// @ts-nocheck
import React from 'react';
import { WidgetProps } from '@rjsf/utils';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import { useTranslation } from 'react-i18next';

const CustomSingleSelectWidget = ({
  id,
  options,
  value = '',
  required,
  label,
  onChange,
  schema,
  uiSchema,
  rawErrors = [],
}: WidgetProps) => {
  const { enumOptions = [] } = options;
  const { t } = useTranslation();

  const isDisabled = uiSchema?.['ui:disabled'] === true;
  const isEmptyOptionIncluded = schema?.allowEmptyOption || false;

  const handleChange = (event: any) => {
    const selected = event.target.value;
    onChange(selected);
  };

  return (
    <FormControl
      fullWidth
      required={required}
      error={rawErrors.length > 0}
      disabled={
        isDisabled
        //bug fix for if zero value then no disable it not reflect in required if disable
        // ||
        // enumOptions.length === 0 ||
        // (enumOptions.length === 1 && enumOptions[0]?.value === 'Select')
      }
    >
      <InputLabel
        id={`${id}-label`}
        sx={{
          color: 'rgba(0, 0, 0, 0.6)', // same as TextField label (text.secondary)
          '&.Mui-error': {
            color: 'rgba(0, 0, 0, 0.6)', // override error red
          },
          '&.Mui-disabled': {
            color: 'rgba(0, 0, 0, 0.6)',
          }
        }}
      >
        {label}
      </InputLabel>
      <Select
        id={id}
        labelId={`${id}-label`}
        value={value}
        onChange={handleChange}
        displayEmpty
        sx={{
          // match TextField outline: grey by default, black on hover
          '& .MuiOutlinedInput-notchedOutline, &.Mui-error .MuiOutlinedInput-notchedOutline':
            {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
          '&:hover:not(.Mui-disabled):not(.Mui-focused) .MuiOutlinedInput-notchedOutline, &.Mui-error:hover:not(.Mui-disabled):not(.Mui-focused) .MuiOutlinedInput-notchedOutline':
            {
              borderColor: 'rgba(0, 0, 0, 0.87)',
            },
        }}
        label={
          value !== undefined && value !== null && value !== '' ? label : ''
        }
      >
        {isEmptyOptionIncluded && (
          <MenuItem value="">
            <em>
              {t('FORM.Select')}
              {required && '*'}
            </em>
          </MenuItem>
        )}

        {enumOptions
          .filter((option) => option.value !== 'Select')
          .map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(`FORM.${option.label}`, { defaultValue: option.label })}
            </MenuItem>
          ))}
      </Select>

      {/* Form submission error */}
      {/* {rawErrors.length > 0 && (
        <FormHelperText>{rawErrors[0]}</FormHelperText>
      )} */}
    </FormControl>
  );
};

export default CustomSingleSelectWidget;
