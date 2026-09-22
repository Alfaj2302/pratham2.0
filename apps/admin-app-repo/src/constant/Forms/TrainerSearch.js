// Search/filter bar for the Trainer listing (user-trainer.tsx). Same
// geographic filter set (state/district/block/village) + name/sortBy/status
// as PlacementRetentionCoordinatorSearch.js's own search schema — Domain and
// Skill are shown as read-only table columns instead of search filters here,
// since (unlike /cohort/search's confirmed customFieldsName contract) there
// is no confirmed contract yet for filtering /user/list by those two
// customFields.
export const TrainerSearchSchema = {
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
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 5,
    },
    name: {
      type: 'string',
      title: 'Search Trainer',
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

export const TrainerSearchUISchema = {
  'ui:order': [
    'state',
    'district',
    'block',
    'village',
    'name',
    'sortBy',
    'tenantStatus',
  ],
  state: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
  },
  district: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
  },
  block: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
  },
  village: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
  },
  name: {
    'ui:widget': 'SearchTextFieldWidget',
  },
  sortBy: {
    'ui:widget': 'select',
  },
};
