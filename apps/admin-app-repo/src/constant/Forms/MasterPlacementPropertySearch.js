export const MasterPlacementPropertySearchSchema = {
  type: 'object',
  properties: {
    propertyName: {
      type: 'string',
      title: 'Search Placement Property',
    },
    state: {
      type: 'string',
      title: 'State',
      enum: ['Select'],
      enumNames: ['Select'],
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
        method: 'POST',
        payload: { fieldName: 'state', sort: ['state_name', 'asc'] },
        options: {
          optionObj: 'result.values',
          label: 'label',
          value: 'value',
        },
        callType: 'initial',
      },
    },
    district: {
      type: 'string',
      title: 'District',
      enum: ['Select'],
      enumNames: ['Select'],
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
        method: 'POST',
        payload: {
          fieldName: 'district',
          // Wrapped in an array (not a bare '**') so DynamicForm's
          // replaceControllingField() substitutes the state value in place
          // inside the array, matching what the fields/options API expects.
          controllingfieldfk: ['**'],
          sort: ['district_name', 'asc'],
        },
        options: {
          optionObj: 'result.values',
          label: 'label',
          value: 'value',
        },
        callType: 'dependent',
        dependent: 'state',
      },
    },
    pincode: {
      type: 'string',
      title: 'Pincode',
    },
    industry: {
      type: 'string',
      title: 'Industry Type',
    },
    domain: {
      type: 'string',
      title: 'Domain',
      enum: ['Select'],
      enumNames: ['Select'],
      api: {
        url: `/api/dynamic-form/get-framework`,
        method: 'POST',
        options: {
          label: 'label',
          value: 'value',
          optionObj: 'options',
        },
        payload: {
          code: 'subDomain',
          fetchUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/framework/v1/read/pos-framework`,
          findcode: 'subject',
          selectedvalue: ['Career Exploration'],
        },
        callType: 'initial',
      },
    },
    status: {
      type: 'string',
      title: 'Status',
      enum: ['active', 'inactive'],
      enumNames: ['Active', 'Inactive'],
    },
  },
};

export const MasterPlacementPropertySearchUISchema = {
  'ui:order': [
    'propertyName',
    'state',
    'district',
    'pincode',
    'industry',
    'domain',
    'status',
  ],

  propertyName: {
    'ui:widget': 'SearchTextFieldWidget',
  },

  state: {
    'ui:widget': 'CustomSingleSelectWidget',
  },

  district: {
    'ui:widget': 'CustomSingleSelectWidget',
  },

  pincode: {
    'ui:widget': 'SearchTextFieldWidget',
  },

  industry: {
    'ui:widget': 'SearchTextFieldWidget',
  },

  domain: {
    'ui:widget': 'CustomSingleSelectWidget',
  },

  status: {
    'ui:widget': 'select',
  },
};
