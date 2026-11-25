// @ts-nocheck
import React from 'react';
import { WidgetProps } from '@rjsf/utils';
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  FormHelperText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const CustomRadioWidget = ({
  id,
  options,
  value,
  required,
  disabled,
  readonly,
  label,
  onChange,
  rawErrors = [],
}: WidgetProps) => {
  const { enumOptions = [] } = options;
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl
      component="fieldset"
      error={rawErrors.length > 0}
      required={required}
      fullWidth
    >
      {/* Hidden text input to force native validation — same approach as
          shared-lib-v2's CustomRadioWidget (used by the Center form), since
          a RadioGroup alone never triggers the browser's required check. */}
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
      <FormLabel
        component="legend"
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
      </FormLabel>
      <RadioGroup
        row // makes all options in one line, wraps automatically
        id={id}
        name={id}
        value={value ?? ''}
        onChange={handleChange}
        style={{ flexWrap: 'wrap' }}
      >
        {enumOptions.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={t(`FORM.${option.label}`, {
              defaultValue: option.label,
            })}
            disabled={disabled || readonly}
          />
        ))}
      </RadioGroup>
      {/* {rawErrors.length > 0 && (
        <FormHelperText>{rawErrors[0]}</FormHelperText>
      )} */}
    </FormControl>
  );
};

export default CustomRadioWidget;
