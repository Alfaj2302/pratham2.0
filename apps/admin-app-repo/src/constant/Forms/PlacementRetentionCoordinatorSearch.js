export const PlacementRetentionCoordinatorSearchSchema = {
  type: 'object',
  properties: {
    state: {
      type: 'array',
      title: 'State',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
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
      //for multiselect
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1,
    },
    district: {
      type: 'array',
      title: 'District',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
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
        callType: 'dependent',
        dependent: 'state',
      },
      //for multiselect
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1,
    },
    block: {
      type: 'array',
      title: 'Block',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
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
        callType: 'dependent',
        dependent: 'district',
      },
      //for multiselect
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1,
    },
    village: {
      type: 'array',
      title: 'Village',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
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
        callType: 'dependent',
        dependent: 'block',
      },
      //for multiselect
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 5,
    },
    // Sent as filters.domain (array of domain names) to /user/list.
    domain: {
      type: 'array',
      title: 'Domain',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
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
      //for multiselect
      uniqueItems: true,
      isMultiSelect: true,
    },
    name: {
      type: 'string',
      title: 'Search Placement Retention Coordinator',
    },
    sortBy: {
      type: 'string',
      title: 'Sort By',
      enum: ['asc', 'desc'],
      enumNames: ['A-Z', 'Z-A'],
    },
    tenantStatus: {
      type: 'string',
      title: 'Status',
      enum: ['all', 'active', 'archived'],
      enumNames: ['All', 'Active', 'Archived'],
    },
  },
};

export const PlacementRetentionCoordinatorUISchema = {
  'ui:order': [
    'state',
    'district',
    'block',
    'village',
    'domain',
    'name',
    'sortBy',
    'tenantStatus',
  ],

  state: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': {
      multiple: true,
      uniqueItems: true,
    },
  },
  district: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': {
      multiple: true,
      uniqueItems: true,
    },
  },
  block: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': {
      multiple: true,
      uniqueItems: true,
    },
  },
  village: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': {
      multiple: true,
      uniqueItems: true,
    },
  },
  domain: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': {
      multiple: true,
      uniqueItems: true,
    },
  },
  firstName: {
    'ui:widget': 'SearchTextFieldWidget',
  },

  sortBy: {
    'ui:widget': 'select',
  },
  search: {
    'ui:widget': 'select',
  },
};
