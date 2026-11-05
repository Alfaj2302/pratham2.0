// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { WidgetProps } from '@rjsf/utils';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import { useTranslation } from 'libs/shared-lib-v2/src/lib/context/LanguageContext';

// Switches the given fields to this widget, keeping their other ui options.
export const applyMultiSelectTopLabelFields = (
  uiSchema: any,
  fieldKeys: string[]
) => {
  const updatedUiSchema = { ...uiSchema };
  fieldKeys.forEach((key) => {
    if (updatedUiSchema[key]) {
      updatedUiSchema[key] = {
        ...updatedUiSchema[key],
        'ui:widget': 'CustomMultiSelectTopLabelWidget',
      };
    }
  });
  return updatedUiSchema;
};

// Same as CustomMultiSelectWidget, except the label sits above the field
// instead of inside it.
const CustomMultiSelectTopLabelWidget = ({
  id,
  options,
  value = [],
  required,
  label,
  onChange,
  schema,
  uiSchema,
  rawErrors = [],
}: WidgetProps) => {
  const { enumOptions = [] } = options;
  const maxSelections = schema.maxSelection || enumOptions.length;
  const { t } = useTranslation();

  const selectedValues = Array.isArray(value) ? value : [];

  const [isAllSelected, setIsAllSelected] = useState(
    selectedValues.length === enumOptions.length
  );

  const isDisabled = uiSchema?.['ui:disabled'] === true;
  const [open, setOpen] = useState(false);
  // The menu is kept to the field's width so long option labels wrap
  const selectRef = useRef<HTMLDivElement>(null);
  const [menuWidth, setMenuWidth] = useState<number>();

  useEffect(() => {
    setIsAllSelected(selectedValues.length === enumOptions.length);
  }, [selectedValues, enumOptions]);

  const handleChange = (event: any) => {
    const selected = event.target.value;

    if (selected.includes('selectAll')) {
      if (isAllSelected) {
        onChange([]);
      } else {
        const allValues = enumOptions.map((option) => option.value);
        onChange(allValues.slice(0, maxSelections));
      }
    } else {
      if (Array.isArray(selected)) {
        if (selected.length <= maxSelections) {
          onChange(selected.length > 0 ? selected : []);
          if (maxSelections === 1 && selected.length === 1) {
            setOpen(false);
          }
        }
      }
    }
  };

  return (
    <FormControl
      fullWidth
      error={rawErrors.length > 0}
      required={required}
      disabled={isDisabled}
    >
      <FormLabel htmlFor={id} sx={{ mb: 1 }}>
        {label}
      </FormLabel>
      <Select
        id={id}
        multiple
        value={selectedValues}
        ref={selectRef}
        open={open}
        onOpen={() => {
          setMenuWidth(selectRef.current?.clientWidth);
          setOpen(true);
        }}
        onClose={() => setOpen(false)}
        onChange={handleChange}
        renderValue={(selected) =>
          enumOptions
            .filter((option) => selected.includes(option.value))
            .map((option) =>
              t(`FORM.${option.label}`, { defaultValue: option.label })
            )
            .join(', ')
        }
        sx={{
          '& .MuiSelect-select': {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: '300px',
              ...(menuWidth && { width: menuWidth }),
            },
          },
        }}
      >
        {enumOptions.length > 1 && maxSelections >= enumOptions.length && (
          <MenuItem
            key="selectAll"
            value="selectAll"
            disabled={enumOptions.length === 1}
          >
            <Checkbox checked={isAllSelected} />
            <ListItemText
              primary={isAllSelected ? 'Deselect All' : 'Select All'}
            />
          </MenuItem>
        )}

        {enumOptions
          .filter((option) => option.value !== 'Select')
          .map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              sx={{ whiteSpace: 'normal', alignItems: 'center' }}
              disabled={
                selectedValues.length >= maxSelections &&
                !selectedValues.includes(option.value)
              }
            >
              <Checkbox checked={selectedValues.includes(option.value)} />
              <ListItemText
                primary={t(`FORM.${option.label}`, {
                  defaultValue: option.label,
                })}
                sx={{ wordBreak: 'break-word' }}
              />
            </MenuItem>
          ))}
      </Select>

      {/* Form submission error */}
      {rawErrors.length > 0 && <FormHelperText>{rawErrors[0]}</FormHelperText>}
    </FormControl>
  );
};

export default CustomMultiSelectTopLabelWidget;
