// Ported verbatim from apps/admin-app-repo/src/constant/Forms/L2BatchCreate.js
// (same field ids/titles) — the Vocational Training Batch creation form.
// domain/skills' `api` config here (framework-taxonomy fetch) is overridden
// away at render time in CreateBatchModal.tsx, restricting both fields to
// the Trainer's own assigned Domain/Course set instead.
export const L2BatchCreate = {
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'BATCH_NAME',
        coreField: 1,
        fieldId: null,
        field_type: 'text',
        pattern: "^[a-zA-Z0-9 !@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?`~]+$"
      },
      batch_type: {
        type: 'string',
        title: 'TYPE_OF_BATCH',
        coreField: 0,
        fieldId: '0417d8fd-47ae-4ec4-9b3b-3f8fdca31625',
        field_type: 'radio',
        isRequired: true,
        enum: ['regular', 'remote', 'hybrid'],
        enumNames: ['REGULAR', 'REMOTE', 'HYBRID'],
      },
      startdate: {
        type: 'string',
        title: 'START_DATE',
        coreField: 0,
        fieldId: '526ef5e9-667f-4790-98a8-e789ce9d5be0',
        field_type: 'text',
        isRequired: true,
        format: 'date',
      },
      enddate: {
        type: 'string',
        title: 'END_DATE',
        coreField: 0,
        fieldId: '5344eb96-810e-4696-ae98-1d9c2b7574b3',
        field_type: 'text',
        isRequired: true,
        format: 'date',
        // Must be strictly after startdate (sibling-field $data reference).
        formatExclusiveMinimum: { $data: '1/startdate' },
      },
      domain: {
        type: 'array',
        title: 'DOMAIN',
        coreField: 0,
        fieldId: 'e5277d7b-e7ef-4a11-9a54-a8e6e7975383',
        field_type: 'drop_down',
        maxSelection: 1,
        isMultiSelect: true,
        uniqueItems: true,
        isRequired: true,
        items: {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        },
        api: {
          url: '/api/dynamic-form/get-framework',
          method: 'POST',
          options: {
            label: 'label',
            value: 'value',
            optionObj: 'options',
          },
          payload: {
            code: 'subDomain',
            fetchUrl:
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/framework/v1/read/pos-framework`,
            findcode: 'subject',
            selectedvalue: ['Career Exploration'],
          },
          callType: 'initial',
        },
      },
      skills: {
        type: 'array',
        title: 'SKILLS',
        coreField: 0,
        fieldId: 'ed585a8c-8727-4bd5-a9c5-7642b2df774f',
        field_type: 'drop_down',
        maxSelection: 1,
        isMultiSelect: true,
        uniqueItems: true,
        isRequired: true,
        items: {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        },
        api: {
          url: '/api/dynamic-form/get-framework',
          method: 'POST',
          options: {
            label: 'label',
            value: 'value',
            optionObj: 'options',
          },
          payload: {
            code: 'subject',
            fetchUrl:
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/framework/v1/read/pos-framework`,
            findcode: 'skills',
            selectedvalue: '**',
          },
          callType: 'dependent',
          dependent: 'domain',
        },
      },
      // Same fieldId/title as admin-app-repo's L2BatchCreate.js `assessments`
      // field. Stored as the selected Assessments' do_ids. No `api` config:
      // the options (Practice Question Sets for the batch's Domain + Skill)
      // are fetched by CreateBatchModal.tsx itself, since Domain/Skills
      // there are prefilled/locked (Create) or hidden (Edit) and so never
      // trigger the form's own dependent-field fetch.
      assessments: {
        type: 'array',
        title: 'ASSESSMENTS',
        coreField: 0,
        fieldId: 'bf8d78c0-ea90-4e27-98ab-d7e5fac46576',
        field_type: 'drop_down',
        maxSelection: 20,
        isMultiSelect: true,
        uniqueItems: true,
        isRequired: false,
        items: {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        },
      },
    },
    required: ['name', 'batch_type', 'domain', 'skills', 'startdate', 'enddate'],
  },
  uiSchema: {
    name: {
      'ui:widget': 'CustomTextFieldWidget',
      'ui:options': {
        validateOnBlur: true,
        hideError: true,
      },
    },
    batch_type: {
      'ui:widget': 'CustomRadioWidget',
      'ui:options': {
        hideError: true,
      },
    },
    domain: {
      'ui:widget': 'AutoCompleteMultiSelectWidget',
      'ui:options': {
        multiple: true,
        uniqueItems: true,
        hideError: false,
      },
    },
    skills: {
      'ui:widget': 'AutoCompleteMultiSelectWidget',
      'ui:options': {
        multiple: true,
        uniqueItems: true,
        hideError: false,
      },
    },
    assessments: {
      'ui:widget': 'AutoCompleteMultiSelectWidget',
      'ui:options': {
        multiple: true,
        uniqueItems: true,
        hideError: false,
      },
    },
    startdate: {
      'ui:widget': 'CustomDateWidget',
      'ui:options': {
        validateOnBlur: true,
        hideError: true,
      },
    },
    enddate: {
      'ui:widget': 'CustomDateWidget',
      'ui:options': {
        validateOnBlur: true,
        hideError: true,
      },
    },
    'ui:order': [
      'name',
      'batch_type',
      'domain',
      'skills',
      'assessments',
      'startdate',
      'enddate',
    ],
  },
};
