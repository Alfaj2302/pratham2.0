//@ts-nocheck
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import Form from '@rjsf/mui';
import { customizeValidator } from '@rjsf/validator-ajv8';

// $data enables cross-field schema constraints (e.g. enddate's formatMinimum
// referencing startdate's value via a relative JSON pointer).
const validator = customizeValidator({ ajvOptionsOverrides: { $data: true } });
import axios from 'axios';
import Grid from '@mui/material/Grid';
import { Box, Alert } from '@mui/material';
import { TextField, Container, Typography } from '@mui/material';
import { Layout as SharedLayout } from '@shared-lib';
import _ from 'lodash'; // Lodash for deep comparison
import CustomMultiSelectWidget from './RJSFWidget/CustomMultiSelectWidget';
import AutoCompleteMultiSelectWidget from './RJSFWidget/AutoCompleteMultiSelectWidget';
import CustomCheckboxWidget from './RJSFWidget/CustomCheckboxWidget';
import CustomDateWidget from './RJSFWidget/CustomDateWidget';
import SearchTextFieldWidget from './RJSFWidget/SearchTextFieldWidget';
import CustomSingleSelectWidget from './RJSFWidget/CustomSingleSelectWidget';
import CustomRadioWidget from './RJSFWidget/CustomRadioWidget';
import CustomTextFieldWidget from './RJSFWidget/CustomTextFieldWidget';
import CustomFileUpload from './RJSFWidget/CustomFileUpload';
import CustomCenterListWidget from './RJSFWidget/CustomCenterListWidget';
import CatchmentAreaWidget from './RJSFWidget/CatchmentAreaWidget';
import WorkingLocationWidget from './RJSFWidget/WorkingLocationWidget';
//custom form
import SubProgramListWidget from './RJSFWidget/CustomForm/SubProgramListWidget';
import ChildPocsoFraudPolicyAcknowledgementWidget from './RJSFWidget/CustomForm/ChildPocsoFraudPolicyAcknowledgementWidget';
import NdaPolicyAcknowledgementWidget from './RJSFWidget/CustomForm/NdaPolicyAcknowledgementWidget';
import PTMNameWidget from './RJSFWidget/CustomForm/PTMNameWidget';
import OrganizationSearchWidget from './RJSFWidget/CustomForm/OrganizationSearchWidget';
import POCNameSelectWidget from './RJSFWidget/CustomForm/POCNameSelectWidget';
import RegisterTypeWidget from './RJSFWidget/CustomForm/RegisterTypeWidget';
import VolunteerTypeWidget from './RJSFWidget/CustomForm/VolunteerTypeWidget';
import OrganizationRegistredWidget from './RJSFWidget/CustomForm/OrganizationRegistredWidget';

import {
  calculateAgeFromDate,
  toPascalCase,
  transformLabel,
} from '../utils/helper';
import { CustomObjectFieldTemplate } from './FormTemplate/ObjectFieldTemplate';
import { useTranslation } from '../../lib/context/LanguageContext';
import SecurityIcon from '@mui/icons-material/Security';
import { showToastMessage } from './Toastify';
import {
  applyHiddenFieldsToSchema,
  applyHiddenFieldsToUiSchema,
  extractVisibilityRules,
  getHiddenFields,
  removeHiddenFieldValues,
} from '../utils/conditionalVisibility';

// API-sourced options can repeat a value (e.g. two placement properties
// with the same propertyName). Duplicate entries make `enum` invalid JSON
// Schema, and AJV then rejects validation of the whole form — so keep only
// the first option for each value.
const uniqueOptionsByValue = (data: any, valueKey: string) => {
  if (!Array.isArray(data)) return data;
  const seen = new Set<string>();
  return data.filter((item) => {
    const optionValue = String(item?.[valueKey]);
    if (seen.has(optionValue)) return false;
    seen.add(optionValue);
    return true;
  });
};

// DynamicFormV2: same behaviour as DynamicForm, except conditional field
// visibility. Instead of pushing 'hidden' into formUiSchema from individual
// handlers, visibility is derived from the current formData on every render
// using the schema's extra.skipAndHide / extra.skipAndShow rules (see
// utils/conditionalVisibility). That covers the first render, prefilled
// data, every change, clearing a selection and resetForm alike. Hidden
// fields are dropped from `required`, and their values are cleared as soon
// as they become hidden so they can't drive other fields or be submitted.
const DynamicFormV2 = forwardRef(({
  schema,
  uiSchema,
  SubmitaFunction,
  isCallSubmitInHandle,
  prefilledFormData,
  FormSubmitFunction,
  extraFields,
  hideSubmit,
  type,
  isCompleteProfile = false,
  isReassign = false,
  createNew = true,
  forEditedschema,
  mobileAddUiSchema = {},
  mobileSchema = {},
  parentDataAddUiSchema = {},
  parentDataSchema = {},
  id,
  mobileNumber="",
  onFormDataChange,
  valueSelectedChange=null,
  // isCallSubmitInHandle renders one <Form> per field, which drops the
  // schema's `required` list — so widgets never get `required` and show no
  // "*". Opt-in (to leave existing forms untouched) to carry each field's
  // required flag into its own per-field schema.
  showRequiredIndicator = false,
}: any, ref) => {
  console.log('schema=======>', schema);
  console.log('uiSchema=======>', uiSchema);
  const { t } = useTranslation();
  const hasPrefilled = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef(null);
  // const [formData, setFormData] = useState({});
  const [dependentSchema, setDependentSchema] = useState([]);
  const [isInitialCompleted, setIsInitialCompleted] = useState(false);
  const [isRenderCompleted, setIsRenderCompleted] = useState(false);

  const getInitialFormData = () => {
    console.log('prefilledFormData dob', prefilledFormData);

    // Handle case where prefilledFormData is null or undefined
    if (!prefilledFormData) {
      return {};
    }

    let cleaned = { ...prefilledFormData };

    if (!prefilledFormData.class) {
      console.log('prefilledFormData class', prefilledFormData);
      delete cleaned.class;
    }

    if (!prefilledFormData.marital_status) {
      delete cleaned.marital_status;
    }
    if (!prefilledFormData.dob) {
      delete cleaned.dob;
    }

    // Remove family member fields if family_member_details is not provided
    if (!prefilledFormData.family_member_details) {
      if (!prefilledFormData.mother_name) {
        delete cleaned.mother_name;
      }
      if (!prefilledFormData.father_name) {
        delete cleaned.father_name;
      }
      if (!prefilledFormData.spouse_name) {
        delete cleaned.spouse_name;
      }
      delete cleaned.family_member_details;
    }

    return cleaned;
  };

  // The family member fields get stripped from the schema whenever nothing is selected and are
  // rebuilt by addField, which used to lose the fieldId / coreField that transformFormData needs
  // to route the value into customFields - without them the name was sent at the root of the
  // payload and silently dropped. Stash the original definitions so addField can restore them.
  // Captured before getInitialSchema runs, because it shallow-copies and therefore deletes these
  // straight out of the schema prop.
  const familyMemberFieldNames = ['father_name', 'mother_name', 'spouse_name'];
  const originalFamilyMemberSchemaRef = useRef<Record<string, any>>({});
  const rememberFamilyMemberSchema = (properties: any) => {
    if (!properties) return;
    familyMemberFieldNames.forEach((fieldKey) => {
      if (
        properties[fieldKey] &&
        !originalFamilyMemberSchemaRef.current[fieldKey]
      ) {
        originalFamilyMemberSchemaRef.current[fieldKey] = {
          ...properties[fieldKey],
        };
      }
    });
  };
  rememberFamilyMemberSchema(schema?.properties);

  const getInitialSchema = () => {
    if (!prefilledFormData || !prefilledFormData.family_member_details) {
      const cleanedSchema = { ...schema };
      if (cleanedSchema.properties) {
        delete cleanedSchema.properties.mother_name;
        delete cleanedSchema.properties.father_name;
        delete cleanedSchema.properties.spouse_name;
      }
      if (Array.isArray(cleanedSchema.required)) {
        cleanedSchema.required = cleanedSchema.required.filter(
          (key) =>
            key !== 'mother_name' &&
            key !== 'father_name' &&
            key !== 'spouse_name'
        );
      }
      return cleanedSchema;
    }
    return schema;
  };

  const getInitialUiSchema = () => {
    let initialUiSchema = uiSchema;

    if (!prefilledFormData || !prefilledFormData.family_member_details) {
      const cleanedUiSchema = { ...uiSchema };
      delete cleanedUiSchema.mother_name;
      delete cleanedUiSchema.father_name;
      delete cleanedUiSchema.spouse_name;
      initialUiSchema = cleanedUiSchema;
    }

    // Add note to lastName field in initial uiSchema
    if (
      initialUiSchema.lastName &&
      !initialUiSchema.lastName['ui:options']?.note
    ) {
      initialUiSchema = {
        ...initialUiSchema,
        lastName: {
          ...initialUiSchema.lastName,
          'ui:options': {
            ...(initialUiSchema.lastName['ui:options'] || {}),
            note: t('NAVAPATHAM.NO_LAST_NAME_INSTRUCTION'),
          },
        },
      };
    }

    return initialUiSchema;
  };
  // Initialize state based on createNewLearner flag
  const [formSchema, setFormSchema] = useState(
    createNew ? schema : getInitialSchema()
  );
  // Helper to add lastName note to uiSchema
  const addLastNameNote = (uischema: any) => {
    if (uischema?.lastName && !uischema.lastName['ui:options']?.note) {
      return {
        ...uischema,
        lastName: {
          ...uischema.lastName,
          'ui:options': {
            ...(uischema.lastName['ui:options'] || {}),
            note: t('NAVAPATHAM.NO_LAST_NAME_INSTRUCTION'),
          },
        },
      };
    }
    return uischema;
  };

  const [formUiSchemaOriginal, setFormUiSchemaOriginal] = useState(
    createNew ? addLastNameNote(uiSchema) : getInitialUiSchema()
  );
  const [formUiSchema, setFormUiSchema] = useState(
    createNew ? addLastNameNote(uiSchema) : getInitialUiSchema()
  );
  const [formData, setFormData] = useState(
    createNew ? prefilledFormData : getInitialFormData()
  );

  console.log('formUiSchema', formUiSchema);

  // Add note for lastName field - applies to all forms
  useEffect(() => {
    if (formUiSchema?.lastName) {
      const currentNote = formUiSchema.lastName['ui:options']?.note;
      if (!currentNote) {
        console.log('Adding note to lastName field', formUiSchema.lastName);
        setFormUiSchema((prevUiSchema) => {
          // Check again to avoid unnecessary updates
          if (
            prevUiSchema?.lastName &&
            !prevUiSchema.lastName['ui:options']?.note
          ) {
            const updatedUiSchema = {
              ...prevUiSchema,
              lastName: {
                ...prevUiSchema.lastName,
                'ui:options': {
                  ...(prevUiSchema.lastName['ui:options'] || {}),
                  note: t('NAVAPATHAM.NO_LAST_NAME_INSTRUCTION'),
                },
              },
            };
            console.log(
              'Updated uiSchema with note:',
              updatedUiSchema.lastName
            );
            return updatedUiSchema;
          }
          return prevUiSchema;
        });
      } else {
        console.log('lastName note already exists:', currentNote);
      }
    } else {
      console.log('lastName field not found in formUiSchema');
    }
  }, [formUiSchema]);

  // Helper function to reorder fields in UI schema
  const reorderUiSchemaFields = (uiSchema: any, moveField: any, afterField: any) => {
    if (!uiSchema['ui:order']) {
      return uiSchema;
    }
    const order = [...uiSchema['ui:order']];
    const filteredOrder = order.filter((item) => item !== moveField);
    const index = filteredOrder.indexOf(afterField);

    if (index !== -1) {
      filteredOrder.splice(index + 1, 0, moveField);
    }

    return {
      ...uiSchema,
      'ui:order': filteredOrder,
    };
  };

  // Store original mobile field configuration
  const originalMobileSchemaRef = useRef(null);
  const originalMobileUiSchemaRef = useRef(null);

  //custom validation on formData for learner fields hide on dob
  useEffect(() => {
    if (type == 'learner' && !isReassign) {
      let uischema = { ...formUiSchema };

      if (Object.keys(mobileAddUiSchema).length > 0) {
        uischema.mobile = mobileAddUiSchema;
      }

      // Handle parent data fields (parent_phone, guardian_relation, guardian_name)
      if (Object.keys(parentDataAddUiSchema).length > 0) {
        if (parentDataAddUiSchema.parent_phone) {
          uischema.parent_phone = parentDataAddUiSchema.parent_phone;
        }
        if (parentDataAddUiSchema.guardian_relation) {
          uischema.guardian_relation = parentDataAddUiSchema.guardian_relation;
        }
        if (parentDataAddUiSchema.guardian_name) {
          uischema.guardian_name = parentDataAddUiSchema.guardian_name;
        }
      }

      let schemaa = { ...formSchema, properties: { ...formSchema.properties } };

      if (Object.keys(mobileSchema).length > 0) {
        mobileSchema.title = t('phone_number');
        schemaa.properties.mobile = mobileSchema;
      }

      // Handle parent data schema fields
      if (Object.keys(parentDataSchema).length > 0) {
        if (parentDataSchema.parent_phone) {
          parentDataSchema.parent_phone.title = t('PARENT_GUARDIAN_PHONE_NO');
          schemaa.properties.parent_phone = parentDataSchema.parent_phone;
        }
        if (parentDataSchema.guardian_relation) {
          parentDataSchema.guardian_relation.title = t(
            'RELATION_WITH_GUARDIAN'
          );
          schemaa.properties.guardian_relation =
            parentDataSchema.guardian_relation;
        }
        if (parentDataSchema.guardian_name) {
          parentDataSchema.guardian_name.title = t('NAME_OF_GUARDIAN');
          schemaa.properties.guardian_name = parentDataSchema.guardian_name;
        }
      }

      // Store original mobile field configuration
      if (schemaa.properties.mobile && !originalMobileSchemaRef.current) {
        originalMobileSchemaRef.current = { ...schemaa.properties.mobile };
      }
      if (uischema.mobile && !originalMobileUiSchemaRef.current) {
        originalMobileUiSchemaRef.current = { ...uischema.mobile };
      }

      // Capture before the family member selector below strips these from the schema
      rememberFamilyMemberSchema(schemaa.properties);

      setFormSchema(schemaa);
      setFormUiSchema(uischema);
      // ...existing code...
      let requiredKeys = ['parent_phone', 'guardian_relation', 'guardian_name'];
      let requiredKeys2 = ['mobile'];
      console.log('formDatadynamicform', formData.family_member_details);
      console.log('updatedUiSchema------', formUiSchema);

      if (formData?.dob) {
        let age = calculateAgeFromDate(formData?.dob);
        let oldFormSchema = schemaa; // ✅ Use schemaa instead of formSchema
        let oldFormUiSchema = uischema; // ✅ Use uischema instead of formUiSchema
        let requiredArray = oldFormSchema?.required;

        //if learner form then only apply
        if (oldFormSchema?.properties?.guardian_relation || isCompleteProfile) {
          if (age < 18) {
            //    delete formData?.mobile;
            // Merge only missing items from required2 into required1 guardian details
            requiredKeys.forEach((item) => {
              if (!requiredArray.includes(item)) {
                requiredArray.push(item);
              }
            });

            // remove from required mobile
            requiredArray = requiredArray?.filter(
              (key) => !requiredKeys2.includes(key)
            );

            //set ui schema show
            const updatedUiSchema = { ...oldFormUiSchema };

            // Add guardian information field to schema as a display-only field
            updatedUiSchema['guardian_info_note'] = {
              'ui:field': 'GuardianInfoField',
              'ui:options': {
                grid: { xs: 12, sm: 12, md: 12 },
              },
            };

            // Clone each key's config and set widget to 'CustomTextFieldWidget' with full width
            requiredKeys.forEach((key) => {
              if (updatedUiSchema.hasOwnProperty(key)) {
                updatedUiSchema[key] = {
                  ...updatedUiSchema[key],
                  'ui:widget': 'CustomTextFieldWidget',
                  'ui:options': {
                    ...updatedUiSchema[key]?.['ui:options'],
                    grid: { xs: 12, sm: 12, md: 12 }, // Full width for guardian fields
                  },
                };
              }
            });

            //hide mobile - remove from schema completely
            requiredKeys2.forEach((key) => {
              delete updatedUiSchema[key];
              if (oldFormSchema.properties && oldFormSchema.properties[key]) {
                delete oldFormSchema.properties[key];
              }
            });

            // Add guardian info note to schema
            oldFormSchema.properties = {
              ...oldFormSchema.properties,
              guardian_info_note: {
                type: 'string',
                title: '',
              },
            };

            // Reorder guardian fields to appear right after DOB
            let reorderedUiSchema = updatedUiSchema;

            // Ensure ui:order exists and add guardian_info_note to it if not present
            if (!reorderedUiSchema['ui:order']) {
              reorderedUiSchema['ui:order'] = Object.keys(oldFormSchema.properties);
            }

            // Only add guardian_info_note to ui:order if it's not already there
            if (!reorderedUiSchema['ui:order'].includes('guardian_info_note')) {
              const dobIndex = reorderedUiSchema['ui:order'].indexOf('dob');
              if (dobIndex !== -1) {
                reorderedUiSchema['ui:order'].splice(dobIndex + 1, 0, 'guardian_info_note');
              } else {
                reorderedUiSchema['ui:order'].push('guardian_info_note');
              }
            }

            reorderedUiSchema = reorderUiSchemaFields(reorderedUiSchema, 'guardian_name', 'guardian_info_note');
            reorderedUiSchema = reorderUiSchemaFields(reorderedUiSchema, 'guardian_relation', 'guardian_name');
            reorderedUiSchema = reorderUiSchemaFields(reorderedUiSchema, 'parent_phone', 'guardian_relation');

            oldFormUiSchema = reorderedUiSchema;

            if (mobileNumber && formData?.parent_phone !== mobileNumber) {
              setFormData((prev: any) => ({ ...prev, parent_phone: mobileNumber }));
            }
          } else {
            delete formData?.parent_phone;
            delete formData?.guardian_relation;
            delete formData?.guardian_name;

            // remove from required
            requiredArray = requiredArray?.filter(
              (key) => !requiredKeys.includes(key)
            );

            // Merge only missing items from required2 into required1 guardian details
            requiredKeys2.forEach((item) => {
              if (!requiredArray.includes(item)) {
                requiredArray.push(item);
              }
            });

            //set ui schema hide
            const updatedUiSchema = { ...oldFormUiSchema };
            // Clone each key's config and set widget to 'hidden'
            requiredKeys.forEach((key) => {
              if (updatedUiSchema.hasOwnProperty(key)) {
                updatedUiSchema[key] = {
                  ...updatedUiSchema[key],
                  'ui:widget': 'hidden',
                };
              }
            });

            //show mobile - add back to schema if not present
            requiredKeys2.forEach((key) => {
              // Add mobile field back to schema using stored original configuration
              if (!oldFormSchema.properties[key] && key === 'mobile') {
                if (originalMobileSchemaRef.current) {
                  oldFormSchema.properties[key] = {
                    ...originalMobileSchemaRef.current,
                    title: t('phone_number'), // Ensure translated title
                  };
                } else if (Object.keys(mobileSchema).length > 0) {
                  oldFormSchema.properties[key] = {
                    ...mobileSchema,
                    title: t('phone_number'), // Ensure translated title
                  };
                }
              }

              // Add mobile field back to UI schema using stored original configuration
              if (!updatedUiSchema[key] && key === 'mobile') {
                if (originalMobileUiSchemaRef.current) {
                  updatedUiSchema[key] = {
                    ...originalMobileUiSchemaRef.current,
                  };
                } else if (Object.keys(mobileAddUiSchema).length > 0) {
                  updatedUiSchema[key] = { ...mobileAddUiSchema };
                } else {
                  updatedUiSchema[key] = {
                    'ui:widget': 'CustomTextFieldWidget',
                  };
                }
              } else if (updatedUiSchema[key]) {
                updatedUiSchema[key] = {
                  ...updatedUiSchema[key],
                  'ui:widget': 'CustomTextFieldWidget',
                };
              }
            });

            // Remove guardian info note from schema and UI schema
            delete updatedUiSchema['guardian_info_note'];
            if (
              oldFormSchema.properties &&
              oldFormSchema.properties.guardian_info_note
            ) {
              delete oldFormSchema.properties.guardian_info_note;
            }
            oldFormUiSchema = updatedUiSchema;
          }
          oldFormSchema.required = requiredArray;
          setFormSchema(oldFormSchema);
          setFormUiSchema(oldFormUiSchema);
          if (isCompleteProfile) setFormUiSchemaOriginal(oldFormUiSchema);
        }
      } else {
        //initially hide all
        let oldFormSchema = formSchema;
        let oldFormUiSchema = formUiSchema;
        let requiredArray = oldFormSchema?.required;

        // remove from required
        requiredArray = requiredArray?.filter(
          (key) => !requiredKeys.includes(key)
        );
        requiredArray = requiredArray?.filter(
          (key) => !requiredKeys2.includes(key)
        );

        //set ui schema hide
        const updatedUiSchema = { ...oldFormUiSchema };
        // Clone each key's config and set widget to 'hidden'
        requiredKeys.forEach((key) => {
          if (updatedUiSchema.hasOwnProperty(key)) {
            updatedUiSchema[key] = {
              ...updatedUiSchema[key],
              'ui:widget': 'hidden',
            };
          }
        });
        requiredKeys2.forEach((key) => {
          delete updatedUiSchema[key];
          if (oldFormSchema.properties && oldFormSchema.properties[key]) {
            delete oldFormSchema.properties[key];
          }
        });
        // Remove guardian info note from schema and UI schema initially
        delete updatedUiSchema['guardian_info_note'];
        if (
          oldFormSchema.properties &&
          oldFormSchema.properties.guardian_info_note
        ) {
          delete oldFormSchema.properties.guardian_info_note;
        }
        oldFormUiSchema = updatedUiSchema;
        oldFormSchema.required = requiredArray;
        setFormSchema(oldFormSchema);
        setFormUiSchema(oldFormUiSchema);
        //  setFormUiSchemaOriginal(oldFormUiSchema);
      }

      if (!formData.family_member_details) {
        // Remove all three fields if nothing is selected
        setFormUiSchema((prevUiSchema) => {
          const updatedUiSchema = { ...prevUiSchema };
          delete updatedUiSchema.mother_name;
          delete updatedUiSchema.father_name;
          delete updatedUiSchema.spouse_name;
          return updatedUiSchema;
        });
        setFormUiSchemaOriginal((prevUiSchema) => {
          const updatedUiSchema = { ...prevUiSchema };
          delete updatedUiSchema.mother_name;
          delete updatedUiSchema.father_name;
          delete updatedUiSchema.spouse_name;
          return updatedUiSchema;
        });
        setFormSchema((prevSchema) => {
          const updatedSchema = { ...prevSchema };
          if (updatedSchema.properties) {
            updatedSchema.properties = { ...updatedSchema.properties };
            delete updatedSchema.properties.mother_name;
            delete updatedSchema.properties.father_name;
            delete updatedSchema.properties.spouse_name;
          }
          if (Array.isArray(updatedSchema.required)) {
            updatedSchema.required = updatedSchema.required.filter(
              (key) =>
                key !== 'mother_name' &&
                key !== 'father_name' &&
                key !== 'spouse_name'
            );
          }
          return updatedSchema;
        });
      } else {
        // Helper to add a field
        const addField = (fieldKey, title) => {
          // Check if isForNavaPatham is true to add helper text
          const isForNavaPatham =
            typeof window !== 'undefined'
              ? localStorage.getItem('isForNavaPatham') === 'true'
              : false;

          // Prepare ui:options with helper text if needed
          const uiOptions: any = {
            validateOnBlur: true,
            hideError: true,
          };

          // Add helper text for CustomTextFieldWidget if isForNavaPatham is true
          if (isForNavaPatham) {
            uiOptions.helperText = t('NAVAPATHAM.TYPE_IN_ENGLISH');
          }

          setFormUiSchema((prevUiSchema) => ({
            ...prevUiSchema,
            [fieldKey]: {
              'ui:widget': 'CustomTextFieldWidget',
              'ui:options': uiOptions,
            },
          }));
          setFormUiSchemaOriginal((prevUiSchema) => ({
            ...prevUiSchema,
            [fieldKey]: {
              'ui:widget': 'CustomTextFieldWidget',
              'ui:options': uiOptions,
            },
          }));

          setFormSchema((prevSchema) => {
            const updatedSchema = { ...prevSchema };
            if (updatedSchema.properties) {
              updatedSchema.properties = { ...updatedSchema.properties };
              // Carry over fieldId / coreField, otherwise transformFormData treats this as a
              // core field and sends the name at the root of the payload instead of inside
              // customFields, where it is silently dropped by the user service.
              const originalField =
                originalFamilyMemberSchemaRef.current[fieldKey] || {};
              updatedSchema.properties[fieldKey] = {
                type: 'string',
                title,
                ...(originalField.fieldId !== undefined && {
                  fieldId: originalField.fieldId,
                }),
                ...(originalField.coreField !== undefined && {
                  coreField: originalField.coreField,
                }),
              };
            }
            if (
              Array.isArray(updatedSchema.required) &&
              !updatedSchema.required.includes(fieldKey)
            ) {
              updatedSchema.required = [...updatedSchema.required, fieldKey];
            }
            return updatedSchema;
          });
        };
        console.log('editlearner', formUiSchema);

        // Remove the other two fields
        const removeFields = (fields) => {
          console.log('removeFields', fields);
          setFormUiSchema((prevUiSchema) => {
            const updatedUiSchema = { ...prevUiSchema };
            fields.forEach((field) => delete updatedUiSchema[field]);
            console.log('updatedUiSchema', updatedUiSchema);

            return updatedUiSchema;
          });
          setFormUiSchemaOriginal((prevUiSchema) => {
            const updatedUiSchema = { ...prevUiSchema };
            fields.forEach((field) => delete updatedUiSchema[field]);
            console.log('updatedUiSchema', updatedUiSchema);

            return updatedUiSchema;
          });

          setFormSchema((prevSchema) => {
            const updatedSchema = { ...prevSchema };
            if (updatedSchema.properties) {
              updatedSchema.properties = { ...updatedSchema.properties };
              fields.forEach((field) => delete updatedSchema.properties[field]);
            }
            if (Array.isArray(updatedSchema.required)) {
              updatedSchema.required = updatedSchema.required.filter(
                (key) => !fields.includes(key)
              );
            }

            return updatedSchema;
          });
        };
        if (formData.family_member_details === 'mother') {
          addField('mother_name', t('FORM.MOTHER_NAME'));
          removeFields(['father_name', 'spouse_name']);
          setFormData((prev) => ({
            ...prev,
            mother_name: !hasPrefilled.current
              ? prefilledFormData?.mother_name || prev.mother_name || ''
              : prev.mother_name || '',
            father_name: undefined,
            spouse_name: undefined,
          }));
          hasPrefilled.current = true;
        } else if (formData.family_member_details === 'father') {
          addField('father_name', t('FORM.FATHER_NAME'));
          removeFields(['mother_name', 'spouse_name']);
          setFormData((prev) => ({
            ...prev,
            father_name: !hasPrefilled.current
              ? prefilledFormData?.father_name || prev.father_name || ''
              : prev.father_name || '',
            mother_name: undefined,
            spouse_name: undefined,
          }));
          hasPrefilled.current = true;
        } else if (formData.family_member_details === 'spouse') {
          addField('spouse_name', t('FORM.SPOUSE_NAME'));
          removeFields(['mother_name', 'father_name']);
          setFormData((prev) => ({
            ...prev,
            spouse_name: !hasPrefilled.current
              ? prefilledFormData?.spouse_name || prev.spouse_name || ''
              : prev.spouse_name || '',
            mother_name: undefined,
            father_name: undefined,
          }));
          hasPrefilled.current = true;
        }
      }

      console.log('editlearner', formUiSchema);

      // Remove the other two fields
      const removeFields = (fields) => {
        console.log('removeFields', fields);
        setFormUiSchema((prevUiSchema) => {
          const updatedUiSchema = { ...prevUiSchema };
          fields.forEach((field) => delete updatedUiSchema[field]);
          console.log('updatedUiSchema', updatedUiSchema);

          return updatedUiSchema;
        });
        setFormUiSchemaOriginal((prevUiSchema) => {
          const updatedUiSchema = { ...prevUiSchema };
          fields.forEach((field) => delete updatedUiSchema[field]);
          console.log('updatedUiSchema', updatedUiSchema);

          return updatedUiSchema;
        });

        setFormSchema((prevSchema) => {
          const updatedSchema = { ...prevSchema };
          if (updatedSchema.properties) {
            updatedSchema.properties = { ...updatedSchema.properties };
            fields.forEach((field) => delete updatedSchema.properties[field]);
          }
          if (Array.isArray(updatedSchema.required)) {
            updatedSchema.required = updatedSchema.required.filter(
              (key) => !fields.includes(key)
            );
          }

          return updatedSchema;
        });
      };

      if (formData.phone_type_accessible === 'nophone') {
        if (formSchema.properties?.own_phone_check) {
          removeFields(['own_phone_check']);
        }
      } else if (formData.phone_type_accessible) {
        // Add back to schema if missing
        setFormSchema((prevSchema) => {
          if (!prevSchema.properties?.own_phone_check) {
            return {
              ...prevSchema,
              properties: {
                ...prevSchema.properties,
                own_phone_check: {
                  type: 'string',
                  title: t('DOES_THIS_PHONE_BELONG_TO_YOU'),
                  coreField: 0,
                  fieldId: 'd119d92f-fab7-4c7d-8370-8b40b5ed23dc',
                  field_type: 'radio',
                  isRequired: true,
                  enum: ['yes', 'no'],
                  enumNames: ['YES', 'NO'],
                },
              },
              required: prevSchema.required?.includes('own_phone_check')
                ? prevSchema.required
                : [...(prevSchema.required || []), 'own_phone_check'],
            };
          }
          return prevSchema;
        });

        const ownPhoneCheckUiEntry = {
          'ui:widget': 'CustomRadioWidget',
          'ui:options': {
            hideError: true,
          },
        };

        const addOwnPhoneCheckToUiSchema = (prevUiSchema) => {
          const updated = { ...prevUiSchema, own_phone_check: ownPhoneCheckUiEntry };
          if (Array.isArray(updated['ui:order']) && !updated['ui:order'].includes('own_phone_check')) {
            const newOrder = [...updated['ui:order']];
            const phoneTypeIndex = newOrder.indexOf('phone_type_accessible');
            if (phoneTypeIndex !== -1) {
              newOrder.splice(phoneTypeIndex + 1, 0, 'own_phone_check');
            } else {
              newOrder.push('own_phone_check');
            }
            updated['ui:order'] = newOrder;
          }
          return updated;
        };

        // Add back to uiSchema
        setFormUiSchema(addOwnPhoneCheckToUiSchema);

        // Add back to original uiSchema so it survives hide/show recalculations
        setFormUiSchemaOriginal(addOwnPhoneCheckToUiSchema);
      }
    }
  }, [formData]);

  const widgets = {
    CustomMultiSelectWidget,
    AutoCompleteMultiSelectWidget,
    CustomCheckboxWidget,
    CustomDateWidget,
    SearchTextFieldWidget,
    CustomSingleSelectWidget,
    CustomRadioWidget,
    CustomTextFieldWidget,
    CustomFileUpload,
    CustomCenterListWidget,
    //custom widget
    CatchmentAreaWidget,
    WorkingLocationWidget,
    //custom form
    SubProgramListWidget,
    ChildPocsoFraudPolicyAcknowledgementWidget,
    NdaPolicyAcknowledgementWidget,
    PTMNameWidget,
    OrganizationSearchWidget,
    POCNameSelectWidget,
    RegisterTypeWidget,
    VolunteerTypeWidget,
    OrganizationRegistredWidget
  };

  // Custom field for Guardian Information Note
  const GuardianInfoField = () => {
    return (
      <Alert
        icon={<SecurityIcon />}
        severity="info"
        sx={{
          backgroundColor: '#E3F2FD',
          color: '#1E3A8A',
          mb: 2,
          '& .MuiAlert-icon': {
            color: '#1E3A8A',
          },
        }}
      >
        {t('GUARDIAN_INFORMATION_NOTE')}
      </Alert>
    );
  };

  const customFields = {
    GuardianInfoField,
  };

  useImperativeHandle(ref, () => ({
      resetForm: (newFormData) => {
        setFormData(newFormData);
        handleChange({ formData: newFormData });
      },
      // Lets a caller push a fresh set of {label, value} choices into a
      // field's own enum/enumNames, same shape the built-in dependent-field
      // cascade above already writes into formSchema. Needed when a caller
      // resolves a field's valid options itself (e.g. via an association
      // graph walk the generic cascade doesn't do) - without this, a value
      // set via resetForm that isn't already in the field's enum wouldn't
      // render as selected, since the widget only shows/checks values that
      // are present in its own enumOptions.
      setFieldOptions: (fieldKey, fieldOptions) => {
        setFormSchema((prevSchema) => {
          const targetField = prevSchema.properties?.[fieldKey];
          if (!targetField) return prevSchema;
          const enumValues = (fieldOptions || []).map((opt) => opt.value);
          const enumNames = (fieldOptions || []).map((opt) => opt.label);
          const updatedField =
            targetField.isMultiSelect === true
              ? {
                  ...targetField,
                  items: { type: 'string', enum: enumValues, enumNames },
                }
              : { ...targetField, enum: enumValues, enumNames };
          return {
            ...prevSchema,
            properties: { ...prevSchema.properties, [fieldKey]: updatedField },
          };
        });
      },
    }));
  useEffect(() => {
    if (isInitialCompleted === true) {
      // setFormData;
      //fix for auto submit and render
      if (!prefilledFormData || Object.keys(prefilledFormData).length === 0) {
        if (isCallSubmitInHandle == undefined || isCallSubmitInHandle == null || isCallSubmitInHandle == false || type === 'centers')
        {
          if (type !== 'centers') prefilledFormData = { test: 'test' };
          else prefilledFormData = { type: 'COHORT' };
        }
      }
      renderPrefilledForm();
    }
  }, [isInitialCompleted, type]);

  useEffect(() => {
    if (isCallSubmitInHandle) {
      SubmitaFunction(formData);
    }
  }, [formData]);

  useEffect(() => {
    if (isRenderCompleted === true && isReassign) {
      //commented below to fix bug of no district load
      handleChange({ formData: prefilledFormData });
    }
  }, [isRenderCompleted]);

  const visibilityRules = useMemo(() => extractVisibilityRules(schema), [schema]);
  const hiddenFields = useMemo(
    () => getHiddenFields(visibilityRules, formData),
    [visibilityRules, formData]
  );
  const visibleFormSchema = useMemo(
    () => applyHiddenFieldsToSchema(formSchema, hiddenFields),
    [formSchema, hiddenFields]
  );
  const visibleFormUiSchema = useMemo(
    () => applyHiddenFieldsToUiSchema(formUiSchema, hiddenFields),
    [formUiSchema, hiddenFields]
  );

  const prevFormData = useRef({});

  useEffect(() => {
    const fetchApiData = async (schema) => {
      const initialApis = extractApiProperties(schema, 'initial');
      const dependentApis = extractApiProperties(schema, 'dependent');
      setDependentSchema(dependentApis);
      // // console.log('!!!', initialApis);
      try {
        const apiRequests = initialApis.map((field) => {
          const { api } = field;
          // If header exists, replace values with localStorage values
          let customHeader = api?.header
            ? {
              tenantId:
                api.header.tenantId === '**'
                  ? localStorage.getItem('tenantId') || ''
                  : api.header.tenantId,
              Authorization:
                api.header.Authorization === '**'
                  ? `Bearer ${localStorage.getItem('token') || ''}`
                  : api.header.Authorization,
              academicyearid:
                api.header.academicyearid === '**'
                  ? localStorage.getItem('academicYearId') || ''
                  : api.header.academicyearid,
            }
            : {};
          const config = {
            method: api.method,
            url: api.url,
            headers: { 'Content-Type': 'application/json', ...customHeader },
            ...(api.method === 'POST' && { data: api.payload }),
          };
          return axios(config)
            .then((response) => ({
              fieldKey: field.key,
              data: getNestedValue(response.data, api.options.optionObj),
            }))
            .catch((error) => ({
              error: error,
              fieldKey: field.key,
            }));
        });

        const responses = await Promise.all(apiRequests);
        // console.log('API Responses:', responses);
        // Update schema dynamically
        if (!responses[0]?.error) {
          setFormSchema((prevSchema) => {
            const updatedProperties = { ...prevSchema.properties };
            responses.forEach(({ fieldKey, data }) => {
              // // console.log('Data:', data);
              // // console.log('fieldKey:', fieldKey);
              let label = prevSchema.properties[fieldKey].api.options.label;
              let value = prevSchema.properties[fieldKey].api.options.value;
              data = uniqueOptionsByValue(data, value);
              if (updatedProperties[fieldKey]?.isMultiSelect === true) {
                updatedProperties[fieldKey] = {
                  ...updatedProperties[fieldKey],
                  items: {
                    type: 'string',
                    enum: data
                      ? data?.map((item) => item?.[value].toString())
                      : ['Select'],
                    enumNames: data
                      ? data?.map((item) =>
                        transformLabel(item?.[label].toString())
                      )
                      : ['Select'],
                  },
                };
              } else {
                updatedProperties[fieldKey] = {
                  ...updatedProperties[fieldKey],
                  enum: data
                    ? data?.map((item) => item?.[value].toString())
                    : ['Select'],
                  enumNames: data
                    ? data?.map((item) =>
                      transformLabel(item?.[label].toString())
                    )
                    : ['Select'],
                };
              }
            });
            return { ...prevSchema, properties: updatedProperties };
          });
        } else {
          setFormSchema((prevSchema) => {
            const updatedProperties = { ...prevSchema.properties };
            let fieldKey = responses[0]?.fieldKey;
            if (updatedProperties[fieldKey]?.isMultiSelect === true) {
              updatedProperties[fieldKey] = {
                ...updatedProperties[fieldKey],
                items: {
                  type: 'string',
                  enum: ['Select'],
                  enumNames: ['Select'],
                },
              };
            } else {
              updatedProperties[fieldKey] = {
                ...updatedProperties[fieldKey],
                enum: ['Select'],
                enumNames: ['Select'],
              };
            }
            return { ...prevSchema, properties: updatedProperties };
          });
        }

        //setIsInitialCompleted
        setIsInitialCompleted(true);
      } catch (error) {
        // console.error("Error fetching API data:", error);
      }
    };

    const getNestedValue = (obj, path) => {
      // // console.log("@@@@", obj)
      // // console.log("path", path)
      if (path === '') {
        return obj;
      } else {
        return path.split('.').reduce((acc, key) => acc && acc[key], obj);
      }
    };

    // Call the function
    fetchApiData(schema);

    // console.log('formSchema !!!!!', formSchema);
    //replace title with language constant
    const updateSchemaTitles = (schema, t) => {
      if (!schema || typeof schema !== 'object') return schema;

      const updatedSchema = { ...schema };

      if (updatedSchema.title) {
        updatedSchema.title = t(updatedSchema.title);
      }

      if (updatedSchema.properties) {
        updatedSchema.properties = Object.keys(updatedSchema.properties).reduce(
          (acc, key) => {
            acc[key] = updateSchemaTitles(updatedSchema.properties[key], t);
            return acc;
          },
          {}
        );
      }

      return updatedSchema;
    };
    // Dynamically update schema titles
    const translatedSchema = updateSchemaTitles(formSchema, t);
    setFormSchema(translatedSchema);
  }, []);

  // console.log('schema', schema)
  const extractApiProperties = (schema, callType) => {
    return Object.entries(schema.properties)
      .filter(([_, value]) => value.api && value.api.callType === callType)
      .map(([key, value]) => ({ key, ...value }));
  };

  // Function to extract village IDs from working_location data structure
  const extractVillageIdsFromWorkingLocation = (
    workingLocation: any
  ): string[] | null => {
    if (!workingLocation || !Array.isArray(workingLocation)) {
      return null;
    }

    const villageIds: string[] = [];

    // Iterate through all states -> districts -> blocks -> villages
    for (const state of workingLocation) {
      if (state.districts && Array.isArray(state.districts)) {
        for (const district of state.districts) {
          if (district.blocks && Array.isArray(district.blocks)) {
            for (const block of district.blocks) {
              if (block.villages && Array.isArray(block.villages)) {
                for (const village of block.villages) {
                  if (village.id) {
                    villageIds.push(String(village.id));
                  }
                }
              }
            }
          }
        }
      }
    }

    // Return null if no villages found, otherwise return array of IDs
    return villageIds.length > 0 ? villageIds : null;
  };

  const renderPrefilledForm = () => {
    const temp_prefilled_form = { ...prefilledFormData };
    // console.log('temp', temp_prefilled_form);
    const dependentApis = extractApiProperties(schema, 'dependent');
    const initialApis = extractApiProperties(schema, 'initial');
    // // console.log('initialApis', initialApis);
    // console.log('dependentFields', dependentApis);
    if (dependentApis.length > 0 && initialApis.length > 0) {
      let initialKeys = initialApis.map((item) => item.key);
      let dependentKeys = dependentApis.map((item) => item.key);
      dependentKeys = [...initialKeys, ...dependentKeys];
      // console.log('dependentKeys', dependentKeys);
      // console.log('prefilledFormData', temp_prefilled_form);
      const removeDependentKeys = (formData, keysToRemove) => {
        const updatedData = { ...formData };
        keysToRemove.forEach((key) => delete updatedData[key]);
        return updatedData;
      };
      let updatedFormData = removeDependentKeys(
        temp_prefilled_form,
        dependentKeys
      );
      // // console.log('updatedFormData', updatedFormData);
      setFormData(updatedFormData);

      //prefill other dependent keys
      const filterDependentKeys = (
        formData: Record<string, any>,
        keysToKeep: string[]
      ) => {
        return Object.fromEntries(
          Object.entries(formData).filter(([key]) => keysToKeep.includes(key))
        );
      };
      let filteredFormData = filterDependentKeys(
        temp_prefilled_form,
        dependentKeys
      );
      // console.log('filteredFormData', filteredFormData);
      const filteredFormDataKey = Object.keys(filteredFormData);
      // console.log('filteredFormDataKey', filteredFormDataKey);
      let filterDependentApis = [];
      for (let i = 0; i < filteredFormDataKey.length; i++) {
        filterDependentApis.push({
          key: filteredFormDataKey[i],
          data: schema.properties[filteredFormDataKey[i]],
        });
      }
      // console.log('filterDependentApis', filterDependentApis);
      //dependent calls
      const workingSchema = filterDependentApis;

      const getNestedValue = (obj, path) => {
        if (path === '') {
          return obj;
        } else {
          return path.split('.').reduce((acc, key) => acc && acc[key], obj);
        }
      };

      const fetchDependentApis = async () => {
        // Filter only the dependent APIs based on the changed field
        const dependentApis = workingSchema;
        try {
          // console.log('dependentApis dependentApis', dependentApis);
          const apiRequests = dependentApis.map((realField) => {
            const field = realField?.data;
            const { api } = realField?.data;
            const key = realField?.key;

            // console.log('API field:', field);

            const changedField = field?.api?.dependent;
            const changedFieldValue = temp_prefilled_form[changedField];
            let isMultiSelect = field?.isMultiSelect;
            let updatedPayload = replaceControllingField(
              api.payload,
              changedFieldValue,
              isMultiSelect,
              temp_prefilled_form
            );
            // Replace "**" in the payload with changedFieldValue
            // const updatedPayload = JSON.parse(
            //   JSON.stringify(api.payload).replace(/\*\*/g, changedFieldValue)
            // );
            // If header exists, replace values with localStorage values
            let customHeader = api?.header
              ? {
                tenantId:
                  api.header.tenantId === '**'
                    ? localStorage.getItem('tenantId') || ''
                    : api.header.tenantId,
                Authorization:
                  api.header.Authorization === '**'
                    ? `Bearer ${localStorage.getItem('token') || ''}`
                    : api.header.Authorization,
                academicyearid:
                  api.header.academicyearid === '**'
                    ? localStorage.getItem('academicYearId') || ''
                    : api.header.academicyearid,
              }
              : {};
            const config = {
              method: api.method,
              url: api.url,
              headers: { 'Content-Type': 'application/json', ...customHeader },
              ...(api.method === 'POST' && { data: updatedPayload }),
            };
            if (key) {
              const changedField = key;

              // // console.log(`Field changed: ${changedField}, New Value: ${formData[changedField]}`);
              // // console.log('dependentSchema', dependentSchema);
              const workingSchema1 = dependentSchema?.filter(
                (item) => item.api && item.api.dependent === changedField
              );
              // // console.log('workingSchema1', workingSchema1);
              if (workingSchema1.length > 0) {
                const changedFieldValue = temp_prefilled_form[changedField];

                const getNestedValue = (obj, path) => {
                  if (path === '') {
                    return obj;
                  } else {
                    return path
                      .split('.')
                      .reduce((acc, key) => acc && acc[key], obj);
                  }
                };

                const fetchDependentApis = async () => {
                  // Filter only the dependent APIs based on the changed field
                  const dependentApis = workingSchema1;
                  try {
                    const apiRequests = dependentApis.map((field) => {
                      const { api, key } = field;

                      let isMultiSelect = field?.isMultiSelect;
                      let updatedPayload = replaceControllingField(
                        api.payload,
                        changedFieldValue,
                        isMultiSelect,
                        temp_prefilled_form
                      );
                      // Replace "**" in the payload with changedFieldValue
                      // const updatedPayload = JSON.parse(
                      //   JSON.stringify(api.payload).replace(
                      //     /\*\*/g,
                      //     changedFieldValue
                      //   )
                      // );

                      // If header exists, replace values with localStorage values
                      let customHeader = api?.header
                        ? {
                          tenantId:
                            api.header.tenantId === '**'
                              ? localStorage.getItem('tenantId') || ''
                              : api.header.tenantId,
                          Authorization:
                            api.header.Authorization === '**'
                                ? `Bearer ${
                                    localStorage.getItem('token') || ''
                              }`
                              : api.header.Authorization,
                          academicyearid:
                            api.header.academicyearid === '**'
                              ? localStorage.getItem('academicYearId') || ''
                              : api.header.academicyearid,
                        }
                        : {};
                      const config = {
                        method: api.method,
                        url: api.url,
                        headers: {
                          'Content-Type': 'application/json',
                          ...customHeader,
                        },
                        ...(api.method === 'POST' && { data: updatedPayload }),
                      };
                      return axios(config)
                        .then((response) => ({
                          fieldKey: field.key,
                          data: getNestedValue(
                            response.data,
                            api.options.optionObj
                          ),
                        }))
                        .catch((error) => ({
                          error: error,
                          fieldKey: field.key,
                        }));
                    });

                    const responses = await Promise.all(apiRequests);
                    // // console.log('API Responses:', responses);
                    if (!responses[0]?.error) {
                      setFormSchema((prevSchema) => {
                        const updatedProperties = { ...prevSchema.properties };
                        responses.forEach(({ fieldKey, data }) => {
                          // // console.log('Data:', data);
                          // // console.log('fieldKey:', fieldKey);
                          let label =
                            prevSchema.properties[fieldKey].api.options.label;
                          let value =
                            prevSchema.properties[fieldKey].api.options.value;
                          data = uniqueOptionsByValue(data, value);
                          if (
                            updatedProperties[fieldKey]?.isMultiSelect === true
                          ) {
                            updatedProperties[fieldKey] = {
                              ...updatedProperties[fieldKey],
                              items: {
                                type: 'string',
                                enum: data?.map((item) =>
                                  item?.[value].toString()
                                ),
                                enumNames: data?.map((item) =>
                                  transformLabel(item?.[label].toString())
                                ),
                              },
                            };
                          } else {
                            updatedProperties[fieldKey] = {
                              ...updatedProperties[fieldKey],
                              enum: data?.map((item) =>
                                item?.[value].toString()
                              ),
                              enumNames: data?.map((item) =>
                                transformLabel(item?.[label].toString())
                              ),
                            };
                          }
                        });

                        return { ...prevSchema, properties: updatedProperties };
                      });
                    } else {
                      setFormSchema((prevSchema) => {
                        const updatedProperties = { ...prevSchema.properties };
                        let fieldKey = responses[0]?.fieldKey;
                        if (
                          updatedProperties[fieldKey]?.isMultiSelect === true
                        ) {
                          updatedProperties[fieldKey] = {
                            ...updatedProperties[fieldKey],
                            items: {
                              type: 'string',
                              enum: ['Select'],
                              enumNames: ['Select'],
                            },
                          };
                        } else {
                          updatedProperties[fieldKey] = {
                            ...updatedProperties[fieldKey],
                            enum: ['Select'],
                            enumNames: ['Select'],
                          };
                        }
                        return { ...prevSchema, properties: updatedProperties };
                      });
                    }
                  } catch (error) {
                    console.error('Error fetching dependent APIs:', error);
                  }
                };

                // Call the function
                fetchDependentApis();
              }
            }

            return axios(config).then((response) => ({
              fieldKey: key,
              data: getNestedValue(response.data, api.options.optionObj),
            }));
          });

          const responses = await Promise.all(apiRequests);
          // console.log('API Responses:', responses);
          setFormSchema((prevSchema) => {
            const updatedProperties = { ...prevSchema.properties };
            responses.forEach(({ fieldKey, data }) => {
              // console.log('Data:', data);
              // console.log('fieldKey:', fieldKey);
              let label = prevSchema.properties[fieldKey].api.options.label;
              let value = prevSchema.properties[fieldKey].api.options.value;
              data = uniqueOptionsByValue(data, value);
              if (updatedProperties[fieldKey]?.isMultiSelect === true) {
                updatedProperties[fieldKey] = {
                  ...updatedProperties[fieldKey],
                  items: {
                    type: 'string',
                    enum: data?.map((item) => item?.[value].toString()),
                    enumNames: data?.map((item) =>
                      transformLabel(item?.[label].toString())
                    ),
                  },
                };
              } else {
                updatedProperties[fieldKey] = {
                  ...updatedProperties[fieldKey],
                  enum: data?.map((item) => item?.[value].toString()),
                  enumNames: data?.map((item) =>
                    transformLabel(item?.[label].toString())
                  ),
                };
              }
            });

            return { ...prevSchema, properties: updatedProperties };
          });
        } catch (error) {
          console.error('Error fetching dependent APIs:', error);
        }
      };

      // Call the function
      fetchDependentApis();

      // Sync working_village with working_location if present in prefilled data
      if (temp_prefilled_form?.working_location !== undefined) {
        const villageIds = extractVillageIdsFromWorkingLocation(
          temp_prefilled_form?.working_location
        );
        // Convert array to comma-separated string for backend
        temp_prefilled_form.working_village =
          villageIds && villageIds.length > 0 ? villageIds.join(', ') : null;
      }

      //setFormData
      // skipAndHide / skipAndShow visibility is derived from formData on
      // render (see hiddenFields), so nothing to apply to the uiSchema here.
      setFormData(temp_prefilled_form);
    }
    //Code patch: bug solved for prefilled dependent field options render
    setIsRenderCompleted(true);
  };

  const getDependentKeys = (schema, startKey) => {
    const properties = schema.properties;
    const dependentKeys = [];

    const findDependencies = (key) => {
      Object.keys(properties).forEach((propKey) => {
        const field = properties[propKey];
        if (field.api && field.api.dependent === key) {
          dependentKeys.push(propKey);
          findDependencies(propKey); // Recursively check deeper dependencies
        }
      });
    };

    findDependencies(startKey);
    return dependentKeys;
  };

  const hasObjectChanged = (oldObj, newObj) => {
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (let key of keys) {
      const oldValue = oldObj[key] || [];
      const newValue = newObj[key] || [];

      // Handle array comparison
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        if (oldValue.length !== newValue.length) return true;
        const isDifferent = oldValue.some(
          (val, index) => val !== newValue[index]
        );
        if (isDifferent) return true;
      }
      // Handle normal value comparison
      else if (oldValue !== newValue) {
        return true;
      }
    }

    return false;
  };

  // const replaceControllingField = (
  //   payload,
  //   changedFieldValue,
  //   isMultiSelect
  // ) => {
  //   // Clone the payload to avoid mutating original object
  //   let updatedPayload = { ...payload };
  //   console.log(updatedPayload)

  //   // Replace ** with value based on isMultiSelect
  //   const newValue = isMultiSelect
  //     ? changedFieldValue
  //     : String(changedFieldValue);

  //   // Iterate through the object keys and replace "**" wherever found
  //   Object.keys(updatedPayload).forEach((key) => {
  //     if (updatedPayload[key] === '**') {
  //       updatedPayload[key] = newValue;
  //     }
  //   });

  //   return updatedPayload;
  // };
  const replaceControllingField = (
    payload,
    changedFieldValue,
    isMultiSelect,
    formValues = {}
  ) => {
    // Deep clone to avoid modifying the original object
    const updatedPayload = JSON.parse(JSON.stringify(payload));
    // Determine new value based on type
    const newValue = isMultiSelect
      ? Array.isArray(changedFieldValue)
        ? [...changedFieldValue]
        : [changedFieldValue]
      : changedFieldValue;

    // "**" is the controlling (dependent) field's value; "**:<fieldKey>"
    // is another form field's current value, always sent as an array.
    const resolvePlaceholder = (item) => {
      if (item === '**') return newValue;
      if (typeof item === 'string' && item.startsWith('**:')) {
        const value = formValues?.[item.slice(3)];
        if (value === undefined || value === null) return [];
        return Array.isArray(value) ? [...value] : [value];
      }
      return item;
    };
    const isPlaceholder = (item) =>
      typeof item === 'string' && (item === '**' || item.startsWith('**:'));

    // Recursive function to replace ** in nested objects/arrays
    const replaceNested = (obj) => {
      if (Array.isArray(obj)) {
        // If array, iterate through each element
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            replaceNested(item); // Recursive call for nested objects/arrays
          } else if (isPlaceholder(item)) {
            obj[index] = resolvePlaceholder(item);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        // If object, iterate through keys
        Object.keys(obj).forEach((key) => {
          if (isPlaceholder(obj[key])) {
            obj[key] = resolvePlaceholder(obj[key]);
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            replaceNested(obj[key]); // Recursive call for nested objects/arrays
          }
        });
      }
    };

    // Start recursion from the root
    replaceNested(updatedPayload);

    return updatedPayload;
  };
  const getChangedField = (
    formData: Record<string, any>,
    prevFormData: Record<string, any>
  ) => {
    return Object.keys(formData).find((key) => {
      const newValue = formData[key];
      const oldValue = prevFormData[key];

      if (Array.isArray(newValue) && Array.isArray(oldValue)) {
        // Check if arrays have different elements (added/removed values)
        return (
          newValue.length !== oldValue.length ||
          !newValue.every((val) => oldValue.includes(val))
        );
      } else {
        // Check for primitive value changes
        return newValue !== oldValue;
      }
    });
  };

  const handleChange = ({
    formData,
    errors,
  }: {
    formData: any;
    errors: any;
  }) => {
    // Sync working_village with working_location changes
    if (formData?.working_location !== undefined) {
      const villageIds = extractVillageIdsFromWorkingLocation(
        formData.working_location
      );
      // Convert array to comma-separated string for backend
      formData.working_village =
        villageIds && villageIds.length > 0 ? villageIds.join(',') : null;
    }

    // const changedField = Object.keys(formData).find(
    //   (key) => formData[key] !== prevFormData.current[key]
    // );
    const changedField = getChangedField(formData, prevFormData.current);
    // console.log('hasObjectChanged prevFormData.current', prevFormData.current);
    console.log('hasObjectChanged formData', formData);
    // console.log(
    //   'hasObjectChanged hasObjectChanged(prevFormData.current, formData)',
    //   hasObjectChanged(prevFormData.current, formData)
    // );
    // console.log('hasObjectChanged changedField', changedField);

    if (hasObjectChanged(prevFormData.current, formData)) {
      console.log('hasObjectChanged in 1 formData', formData);
      if (changedField) {
        //error set
        console.log('errors', errors);
        setSubmitted(false);
        //find out all dependent keys
        const dependentKeyArray = getDependentKeys(schema, changedField);
        console.log('hasObjectChanged in 2 formData', formData);
        // console.log('hasObjectChanged dependent keys:', dependentKeyArray);
        dependentKeyArray.forEach((key) => {
          delete formData[key]; // Remove the key from formData
        });
        // console.log('hasObjectChanged formData', formData);

        setFormSchema((prevSchema) => {
          const updatedProperties = { ...prevSchema.properties };

          dependentKeyArray.forEach((key) => {
            if (updatedProperties[key]) {
              if (updatedProperties[key]?.isMultiSelect === true) {
                updatedProperties[key] = {
                  ...updatedProperties[key],
                  items: {
                    type: 'string',
                    enum: ['Select'], // Clear the enum
                    enumNames: ['Select'], // Clear the enumNames
                  },
                };
              } else {
                updatedProperties[key] = {
                  ...updatedProperties[key],
                  enum: ['Select'], // Clear the enum
                  enumNames: ['Select'], // Clear the enumNames
                };
              }
            }
          });

          return { ...prevSchema, properties: updatedProperties };
        });

        // // console.log(`Field changed: ${changedField}, New Value: ${formData[changedField]}`);
        // // console.log('dependentSchema', dependentSchema);
        const workingSchema = dependentSchema?.filter(
          (item) => item.api && item.api.dependent === changedField
        );
        // // console.log('workingSchema', workingSchema);
        if (workingSchema.length > 0) {
          const changedFieldValue = formData[changedField];

          const getNestedValue = (obj, path) => {
            if (path === '') {
              return obj;
            } else {
              return path.split('.').reduce((acc, key) => acc && acc[key], obj);
            }
          };

          const fetchDependentApis = async () => {
            // Filter only the dependent APIs based on the changed field
            const dependentApis = workingSchema;
            try {
              const apiRequests = dependentApis.map((field) => {
                const { api, key } = field;
                let isMultiSelect = field?.isMultiSelect;
                let updatedPayload = replaceControllingField(
                  api.payload,
                  changedFieldValue,
                  isMultiSelect,
                  formData
                );
                // console.log('updatedPayload', updatedPayload);

                // let changedFieldValuePayload = changedFieldValue;
                // if (field?.isMultiSelect == true) {
                //   // changedFieldValuePayload
                // }
                // // console.log(
                //   'field multiselect changedFieldValuePayload',
                //   changedFieldValuePayload
                // );
                // // console.log('field multiselect api.payload', api.payload);

                // // Replace "**" in the payload with changedFieldValue
                // const updatedPayload = JSON.parse(
                //   JSON.stringify(api.payload).replace(
                //     /\*\*/g,
                //     changedFieldValuePayload
                //   )
                // );

                // If header exists, replace values with localStorage values
                let customHeader = api?.header
                  ? {
                    tenantId:
                      api.header.tenantId === '**'
                        ? localStorage.getItem('tenantId') || ''
                        : api.header.tenantId,
                    Authorization:
                      api.header.Authorization === '**'
                        ? `Bearer ${localStorage.getItem('token') || ''}`
                        : api.header.Authorization,
                    academicyearid:
                      api.header.academicyearid === '**'
                        ? localStorage.getItem('academicYearId') || ''
                        : api.header.academicyearid,
                  }
                  : {};
                const config = {
                  method: api.method,
                  url: api.url,
                  headers: {
                    'Content-Type': 'application/json',
                    ...customHeader,
                  },
                  ...(api.method === 'POST' && { data: updatedPayload }),
                };
                return axios(config)
                  .then((response) => ({
                    fieldKey: field.key,
                    data: getNestedValue(response.data, api.options.optionObj),
                  }))
                  .catch((error) => ({ error: error, fieldKey: field.key }));
              });

              const responses = await Promise.all(apiRequests);
              // console.log('State API Responses:', responses);
              if (!responses[0]?.error) {
                setFormSchema((prevSchema) => {
                  const updatedProperties = { ...prevSchema.properties };
                  responses.forEach(({ fieldKey, data }) => {
                    // // console.log('Data:', data);
                    // // console.log('fieldKey:', fieldKey);
                    let label =
                      prevSchema.properties[fieldKey].api.options.label;
                    let value =
                      prevSchema.properties[fieldKey].api.options.value;
                    data = uniqueOptionsByValue(data, value);
                    if (updatedProperties[fieldKey]?.isMultiSelect === true) {
                      updatedProperties[fieldKey] = {
                        ...updatedProperties[fieldKey],
                        items: {
                          type: 'string',
                          enum: data?.map((item) => item?.[value].toString()),
                          enumNames: data?.map((item) =>
                            transformLabel(item?.[label].toString())
                          ),
                        },
                      };
                    } else {
                      updatedProperties[fieldKey] = {
                        ...updatedProperties[fieldKey],
                        enum: data?.map((item) => item?.[value].toString()),
                        enumNames: data?.map((item) =>
                          transformLabel(item?.[label].toString())
                        ),
                      };
                    }
                  });

                  return { ...prevSchema, properties: updatedProperties };
                });
              } else {
                setFormSchema((prevSchema) => {
                  const updatedProperties = { ...prevSchema.properties };
                  let fieldKey = responses[0]?.fieldKey;
                  if (updatedProperties[fieldKey]?.isMultiSelect === true) {
                    updatedProperties[fieldKey] = {
                      ...updatedProperties[fieldKey],
                      items: {
                        type: 'string',
                        enum: ['Select'],
                        enumNames: ['Select'],
                      },
                    };
                  } else {
                    updatedProperties[fieldKey] = {
                      ...updatedProperties[fieldKey],
                      enum: ['Select'],
                      enumNames: ['Select'],
                    };
                  }
                  return { ...prevSchema, properties: updatedProperties };
                });
              }
            } catch (error) {
              console.error('Error fetching dependent APIs:', error);
            }
          };

          // Call the function
          fetchDependentApis();
        }
      }

      // Protect username from being updated if it's disabled
      // Preserve the existing username value if username field is disabled
      const isUsernameDisabled =
        formUiSchema?.username?.['ui:disabled'] === true;
      if (isUsernameDisabled && prevFormData.current?.username) {
        // Keep the existing username value when username field is disabled
        formData.username = prevFormData.current.username;
      }

      // Protect parent_phone when mobileNumber prop is provided and learner is under 18
      if (mobileNumber && formData?.dob && calculateAgeFromDate(formData?.dob) < 18) {
        formData.parent_phone = mobileNumber;
      }

      // Clear values of fields hidden by skipAndHide / skipAndShow so a stale
      // answer can't drive other fields or be submitted.
      getHiddenFields(visibilityRules, formData).forEach((field) => {
        delete formData[field];
      });

      prevFormData.current = formData;
      // console.log('Form data changed:', formData);
      // live error
      setFormData(formData);
      if (changedField && onFormDataChange) {
        onFormDataChange(formData, changedField);
      }

      //submit new form data
      if(valueSelectedChange){
        valueSelectedChange(formData)
      }
    }
  };
  const prevNameRef = useRef({ firstName: '', lastName: '' });

  const handleFirstLastNameBlur = async (id: any, value: any) => {
    // Extract field name from id (RJSF uses formats like "root_firstName", "root.lastName", or just "firstName")
    // Handle different ID formats: "root_firstName", "root.firstName", "firstName", etc.
    let fieldName = '';
    if (id) {
      // Remove "root_" prefix if present
      fieldName = id.replace(/^root[_.]/, '').replace(/^root/, '');
      // Handle nested paths like "root.firstName" -> "firstName"
      const parts = fieldName.split('.');
      fieldName = parts[parts.length - 1];
    }

    // Only proceed if the blurred field is firstName or lastName
    if (fieldName !== 'firstName' && fieldName !== 'lastName') {
      return;
    }

    if (
      formData?.firstName !== undefined &&
      formData?.lastName !== undefined &&
      type === 'learner'
    ) {
      // Check if username field is disabled - don't update if disabled
      const isUsernameDisabled =
        formUiSchema?.username?.['ui:disabled'] === true;

      if (isUsernameDisabled) {
        // Username is disabled, don't update it
        return;
      }

      // Only update if firstName or lastName actually changed
      const firstNameChanged =
        formData.firstName !== prevNameRef.current.firstName;
      const lastNameChanged =
        formData.lastName !== prevNameRef.current.lastName;

      if (firstNameChanged || lastNameChanged) {
        const randomTwoDigit = Math.floor(10 + Math.random() * 90);
        const newUserName = `${formData.firstName}${formData.lastName}${randomTwoDigit}`;
        if (formData.username !== newUserName) {
          setFormData({
            ...formData,
            username: newUserName,
          });
        }
        // Update the ref to current values
        prevNameRef.current = {
          firstName: formData.firstName,
          lastName: formData.lastName,
        };
      }
    }
  };
  const handleSubmit = ({ formData }: { formData: any }) => {
    console.log('########### issue debug formData', formData);

    //step-1 : Check and remove skipped Data
    function filterFormData(formData) {
      const updatedFormData = removeHiddenFieldValues(
        formData,
        getHiddenFields(visibilityRules, formData)
      );

      // Remove guardian info note field from submission
      delete updatedFormData.guardian_info_note;

      return updatedFormData;
    }
    const filteredData = filterFormData(formData);
    // console.log('######### filteredData', JSON.stringify(filteredData));
    const cleanedData = Object.fromEntries(
      Object.entries(filteredData).filter(
        ([_, value]) => !Array.isArray(value) || value.length > 0
      )
    );
    //step-2 : Validate the form data
    function transformFormData(
      formData: Record<string, any>,
      schema: any,
      extraFields: Record<string, any> = {} // Optional root-level custom fields
    ) {
      // schema=forEditedschema
      if (schema.properties.family_member_details) {
        schema.properties = {
          ...schema.properties,
          ...(forEditedschema?.father_name && {
            father_name: forEditedschema.father_name,
          }),
          ...(forEditedschema?.mother_name && {
            mother_name: forEditedschema.mother_name,
          }),
          ...(forEditedschema?.spouse_name && {
            spouse_name: forEditedschema.spouse_name,
          }),
        };
      }

      const transformedData: Record<string, any> = {
        ...extraFields, // Add optional root-level custom fields dynamically
        customFields: [],
      };

      for (const key in formData) {
        if (schema.properties[key]) {
          const fieldSchema = schema.properties[key];

          if (fieldSchema.coreField === 0 && fieldSchema.fieldId) {
            // Use fieldId for custom fields
            transformedData.customFields.push({
              fieldId: fieldSchema.fieldId,
              value: formData[key] || '',
            });
          } else {
            // Use the field name for core fields
            transformedData[key] = formData[key] || '';
          }
        }
      }

      return transformedData;
    }

    // Optional extra root-level fields
    // Extra Field for cohort creation

    const transformedFormData = transformFormData(
      cleanedData,
      formSchema,
      extraFields
    );

    //add name in always lower case
    if (transformedFormData?.name) {
      transformedFormData.name = transformedFormData.name.toLowerCase();
    }

    // // console.log('formSchema', transformedFormData);
    // console.log('Form Data Submitted:', filteredData);
    console.log('########## debug formattedFormData', transformedFormData);
    if (!isCallSubmitInHandle) {
      FormSubmitFunction(cleanedData, transformedFormData);
    }

    //live validate error fix
    setSubmitted(true);
    // Get first error field and scroll into view
    setTimeout(() => {
      const errorField = document.querySelector('.field-error');
      if (errorField) {
        errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  // console.log(formSchema);

  // Regex to Error Mapping
  const patternErrorMessages = {
    '^(?=.*[a-zA-Z])[a-zA-Z ]+$':
      'FORM_ERROR_MESSAGES.NUMBER_AND_SPECIAL_CHARACTERS_NOT_ALLOWED',
    '^[a-zA-Z][a-zA-Z ]*[a-zA-Z]$':
      'FORM_ERROR_MESSAGES.NUMBER_AND_SPECIAL_CHARACTERS_NOT_ALLOWED',
    '^[a-zA-Z0-9.@]+$':
      'FORM_ERROR_MESSAGES.SPACE_AND_SPECIAL_CHARACTERS_NOT_ALLOWED',
    '^[0-9]{10}$': 'FORM_ERROR_MESSAGES.ENTER_VALID_NUMBER',
    '^d{10}$':
      'FORM_ERROR_MESSAGES.CHARACTERS_AND_SPECIAL_CHARACTERS_NOT_ALLOWED',
  };

  // Dynamic custom validation
  const customValidate = (formData, errors) => {
    Object.keys(formSchema.properties).forEach((key) => {
      const field = formSchema.properties[key];
      const value = formData[key];

      // Skip clearing errors for working_village - it's handled by custom validation
      if (key === 'working_village') {
        // Don't clear working_village errors here, let custom validation handle it
      } else {
        // Ensure errors[key] is defined
        if (!errors[key]) {
          errors[key] = {};
        }
        // ✅ Clear error if field is empty or invalid
        if (!value || value === '' || value === null || value === undefined) {
          if (errors[key]?.__errors) {
            console.log('####### field', field);
            console.log('####### value', value);
            console.log('####### key', key);
            errors[key].__errors = []; // ✅ Clear existing errors
          }
          delete errors[key]; // ✅ Completely remove errors if empty
        } else if (field.pattern && typeof value === 'string') {
          // ✅ Validate pattern only if the field has a value.
          // `pattern` is only meaningful for string values — an array-typed
          // (multi-select) field coerces to a joined string when tested
          // against a RegExp, which fails a numeric/anchored pattern for
          // any non-empty selection. Skip pattern checks for non-strings
          // (e.g. multi-select arrays) instead of false-failing them.
          const patternRegex = new RegExp(field.pattern);
          if (!patternRegex.test(value)) {
            const errorMessage =
              t(patternErrorMessages?.[field.pattern]) ||
              `Invalid format for ${field.title || key}.`;

            // ✅ Add only if pattern does not match
            if (!errors[key].__errors) {
              errors[key].__errors = [];
            }
            errors[key].__errors = [errorMessage];
          } else {
            // ✅ Clear errors if pattern matches
            if (errors[key]?.__errors) {
              errors[key].__errors = [];
            }
            delete errors[key]; // ✅ Remove errors if valid
          }
        }
      }
    });

    return errors;
  };
  // const customValidate = (formData, errors) => {
  //   console.log('########### issue debug errors customvalidator ', JSON.stringify(errors));

  //   Object.keys(formSchema.properties).forEach((key) => {
  //     const field = formSchema.properties[key];
  //     const value = formData[key];

  //     if (field.pattern && value) {
  //       const patternRegex = new RegExp(field.pattern);
  //       if (!patternRegex.test(value)) {
  //         const errorMessage =
  //           t(patternErrorMessages?.[field.pattern]) ||
  //           `Invalid format for ${field.title || key}.`;

  //         if (!errors[key].__errors) {
  //           errors[key].__errors = [];
  //         }
  //         errors[key].__errors.push(errorMessage);
  //       }
  //     }
  //   });

  //   return errors;
  // };

  // Custom transformErrors to suppress required errors before submit
  const transformErrors = (errors) => {
    // console.log('########### issue debug errors 123 ', JSON.stringify(errors));
    let updatedError = errors;
    if (!submitted) {
      // updatedError = errors.filter((error) => error.name !== 'required');
    }
    if (!submitted) {
      updatedError = updatedError.filter((error) => error.name !== 'pattern');
    }
    // Friendlier messages for AJV date-range keywords — schema-driven date
    // validation (startdate/enddate) uses formatMinimum/formatExclusiveMinimum,
    // whose default AJV message ("should be > 2026-09-23") is too technical.
    updatedError = updatedError.map((error) => {
      if (error.name === 'formatMinimum' || error.name === 'formatExclusiveMinimum') {
        const fieldKey = error.property?.replace(/^\./, '');
        if (fieldKey === 'enddate' && error.name === 'formatExclusiveMinimum') {
          error.message = t('FORM_ERROR_MESSAGES.END_DATE_AFTER_START_DATE', {
            defaultValue: 'Please select an End Date that is after the Start Date.',
          });
        } else if (fieldKey === 'startdate' || fieldKey === 'enddate') {
          error.message = t('FORM_ERROR_MESSAGES.DATE_CANNOT_BE_IN_PAST', {
            defaultValue: 'Please select today or a future date.',
          });
        }
      }
      return error;
    });
    // Suppress enum errors for fields with no value selected (empty string / undefined)
    updatedError = updatedError.filter((error) => {
      if (error.name === 'enum') {
        const fieldKey = error.property?.replace(/^\./, '');
        const fieldValue = formData[fieldKey];
        if (fieldValue === '' || fieldValue === null || fieldValue === undefined) {
          return false;
        }
      }
      return true;
    });
    // Suppress required errors for fields currently hidden by skip/hide logic —
    // the user can't fill them, and handleSubmit drops their values anyway.
    updatedError = updatedError.filter((error) => {
      if (error.name === 'required') {
        const fieldKey =
          error.params?.missingProperty || error.property?.replace(/^\./, '');
        if (visibleFormUiSchema?.[fieldKey]?.['ui:widget'] === 'hidden') {
          return false;
        }
      }
      return true;
    });
    // Filter errors for UI display, but keep working_village errors for onSubmit handler
    return updatedError.filter(
      (err) =>
        !err?.property?.startsWith?.('.catchment_area') &&
        !err?.property?.startsWith?.('.working_location')
    );
    // console.log('########### issue debug updatedError 123 ', JSON.stringify(updatedError));
    // return updatedError;
  };

  return (
    <>
      {!isCallSubmitInHandle ? (
        <Form
          ref={formRef}
          schema={visibleFormSchema}
          uiSchema={visibleFormUiSchema}
          formData={formData}
          onChange={handleChange}
          onBlur={handleFirstLastNameBlur}
          // onSubmit={handleSubmit}
          onSubmit={({ formData, errors }) => {
            // console.log("########### issue debug SUBMIT", formData);
            // console.log("########### issue debug ERRORS", errors);
            if (errors.length > 0) {
              // Block submission if there are validation errors
              return;
            }
            handleSubmit({ formData });
          }}
          validator={validator}
          //noHtml5Validate //disable auto error pop up to field location
          showErrorList={false} // Hides the error list card at the top
          liveValidate //all validate live
          // liveValidate={submitted} // Only validate on submit or typing
          // onChange={() => setSubmitted(true)} // Show validation when user starts typing
          customValidate={customValidate} // Dynamic Validation
          transformErrors={transformErrors} // ✅ Suppress default pattern errors
          widgets={widgets}
          fields={customFields}
          id={id ||"dynamic-form-id"}
          // template
          templates={{ ObjectFieldTemplate: CustomObjectFieldTemplate }}
        >
          <button
            type="submit"
            style={{ display: hideSubmit ? 'none' : 'block' }}
          >
            Submit
          </button>
        </Form>
      ) : (
        <Grid container spacing={2}>
          {Object.keys(formSchema.properties).map((key) => (
            <Grid item xs={12} md={4} lg={3} key={key} sx={{ mb: '-40px' }}>
              <Form
                ref={formRef}
                schema={{
                  type: 'object',
                  properties: { [key]: formSchema.properties[key] },
                  ...(showRequiredIndicator && visibleFormSchema.required?.includes(key)
                    ? { required: [key] }
                    : {}),
                }}
                uiSchema={{ [key]: visibleFormUiSchema[key] }}
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                validator={validator}
                // submitButtonProps={{
                //   style: { display: !isCallSubmitInHandle ? 'none' : 'block' },
                // }}
                // noHtml5Validate //disable auto error pop up to field location
                showErrorList={false} // Hides the error list card at the top
                liveValidate //all validate live
                // liveValidate={submitted} // Only validate on submit or typing
                // onChange={() => setSubmitted(true)} // Show validation when user starts typing
                // {...(isCallSubmitInHandle
                //   ? { submitButtonProps: { style: { display: 'none' } } }
                //   : {})}
                customValidate={customValidate} // Dynamic Validation
                transformErrors={transformErrors} // ✅ Suppress default pattern errors
                widgets={widgets}
                fields={customFields}
              >
                {!isCallSubmitInHandle ? null : (
                  <button type="submit" style={{ display: 'none' }}>
                    Submit
                  </button>
                )}
              </Form>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
});

export default DynamicFormV2;

/*
below are sample json


    const schema = {
        type: 'object',
        properties: {
          studentName: {
            type: 'string',
            title: 'Student Name',
            pattern: '^[A-Za-z ]+$',
          },
          rollNo: {
            type: 'string',
            title: 'Roll No',
            pattern: '^[0-9]{1,6}$',
          },
          gender: {
            type: 'string',
            title: 'Gender',
            enum: ['Male', 'Female', 'Other'],
          },
          lastEducation: {
            type: 'string',
            title: 'Last Completed Education',
            enum: ['SSC', 'HSC', 'Degree'],
          },
          state: {
            type: 'number',
            title: 'State',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: 'https://dev-interface.prathamdigital.org/interface/v1/fields/options/read',
              method: 'POST',
              payload: { fieldName: 'state', sort: ['state_name', 'asc'] },
              options: {
                optionObj: 'result.values',
                label: 'label',
                value: 'value',
              },
              callType: 'initial', // initial or dependent
            },
          },
          district: {
            type: 'number',
            title: 'District',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: 'https://dev-interface.prathamdigital.org/interface/v1/fields/options/read',
              method: 'POST',
              payload: {
                fieldName: 'district',
                controllingfieldfk: '**',
                sort: ['district_name', 'asc'],
              },
              options: {
                optionObj: 'result.values',
                label: 'label',
                value: 'value',
              },
              callType: 'dependent', // initial or dependent,
              dependent: 'state',
            },
          },
          block: {
            type: 'number',
            title: 'Block',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: 'https://dev-interface.prathamdigital.org/interface/v1/fields/options/read',
              method: 'POST',
              payload: {
                fieldName: 'block',
                controllingfieldfk: '**',
                sort: ['block_name', 'asc'],
              },
              options: {
                optionObj: 'result.values',
                label: 'label',
                value: 'value',
              },
              callType: 'dependent', // initial or dependent,
              dependent: 'district',
            },
          },
          village: {
            type: 'number',
            title: 'Village',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: 'https://dev-interface.prathamdigital.org/interface/v1/fields/options/read',
              method: 'POST',
              payload: {
                fieldName: 'village',
                controllingfieldfk: '**',
                sort: ['village_name', 'asc'],
              },
              options: {
                optionObj: 'result.values',
                label: 'label',
                value: 'value',
              },
              callType: 'dependent', // initial or dependent,
              dependent: 'block',
            },
          },
          board: {
            type: 'string',
            title: 'Board',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: '/api/dynamic-form/get-framework',
              method: 'POST',
              payload: {
                code: 'board',
                fetchUrl:
                  'https://qa-lap.prathamdigital.org/api/framework/v1/read/scp-framework',
              },
              options: {
                optionObj: 'options',
                label: 'label',
                value: 'value',
              },
              callType: 'initial', // initial or dependent,
            },
          },
          medium: {
            type: 'string',
            title: 'Medium',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: '/api/dynamic-form/get-framework',
              method: 'POST',
              payload: {
                code: 'board',
                findcode: 'medium',
                selectedvalue: '**',
                fetchUrl:
                  'https://qa-lap.prathamdigital.org/api/framework/v1/read/scp-framework',
              },
              options: {
                optionObj: 'options',
                label: 'label',
                value: 'value',
              },
              callType: 'dependent', // initial or dependent,
              dependent: 'board',
            },
          },
          grade: {
            type: 'string',
            title: 'Grade',
            enum: ['Select'], // Clear the enum
            enumNames: ['Select'], // Clear the enumNames
            api: {
              url: '/api/dynamic-form/get-framework',
              method: 'POST',
              payload: {
                code: 'medium',
                findcode: 'gradeLevel',
                selectedvalue: '**',
                fetchUrl:
                  'https://qa-lap.prathamdigital.org/api/framework/v1/read/scp-framework',
              },
              options: {
                optionObj: 'options',
                label: 'label',
                value: 'value',
              },
              callType: 'dependent', // initial or dependent,
              dependent: 'medium',
            },
          },
        },
        dependencies: {
          lastEducation: {
            oneOf: [
              {
                properties: {
                  lastEducation: { const: 'SSC' },
                  schoolName: { type: 'string', title: 'School Name' },
                  percentage: {
                    type: 'number',
                    title: 'Percentage',
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
              {
                properties: {
                  lastEducation: { const: 'HSC' },
                  collegeName: { type: 'string', title: 'College Name' },
                  percentage: {
                    type: 'number',
                    title: 'Percentage',
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
              {
                properties: {
                  lastEducation: { const: 'Degree' },
                  degreeCollege: {
                    type: 'string',
                    title: "Model's Degree College",
                  },
                  modelGrade: {
                    type: 'string',
                    title: 'Model Grade Received',
                    enum: ['A', 'B', 'C', 'D'],
                  },
                },
              },
            ],
          },
        },
      };
      
const uiSchema = {
    studentName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
      'ui:options': { liveValidate: true },
    },
    rollNo: {
      'ui:options': { liveValidate: true },
    },
    lastEducation: {
      'ui:order': [
        'lastEducation',
        'schoolName',
        'collegeName',
        'degreeCollege',
        'percentage',
        'modelGrade',
      ],
    },
    percentage: {
      'ui:options': { liveValidate: true },
    },
    state: { 'ui:widget': 'select' },
    phoneDetails: { 'ui:widget': 'select' },
    district: { 'ui:widget': 'select' },
  };
  */