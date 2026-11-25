// Search/filter bar for the Trainer listing (user-trainer.tsx). Same
// geographic filter set (state/district/block/village) + Center + name/
// sortBy/status as TeamLeaderSearch.js (/user-leader) — Domain and
// Skill are shown as read-only table columns instead of search filters here,
// since (unlike /cohort/search's confirmed customFieldsName contract) there
// is no confirmed contract yet for filtering /user/list by those two
// customFields.
import { Role } from '@/utils/app.constant';

// State Lead: State is fixed to their assigned State and locked — same
// pattern as TeamLeaderSearch.js (/user-leader): a single static State
// option instead of the State options API, District loaded up front from
// that State, and the State field disabled in the UI schema.
const stateId =
  typeof window !== 'undefined' ? localStorage.getItem('stateId') : null;
const stateName =
  typeof window !== 'undefined' ? localStorage.getItem('stateName') : null;
const userRole =
  typeof window !== 'undefined' ? localStorage.getItem('roleName') : null;
const isStateLocked = userRole === Role.ADMIN && !!stateId;

export const TrainerSearchSchema = {
  type: 'object',
  properties: {
    state: {
      type: 'array',
      title: 'State',
      items: {
        type: 'string',
        enum: isStateLocked ? [stateId] : ['Select'],
        enumNames: isStateLocked ? [stateName] : ['Select'],
      },
      api: isStateLocked
        ? undefined
        : {
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
          controllingfieldfk: isStateLocked ? [stateId] : '**',
          sort: ['district_name', 'asc'],
        },
        options: {
          optionObj: 'result.values',
          label: 'label',
          value: 'value',
        },
        callType: isStateLocked ? 'initial' : 'dependent',
        ...(isStateLocked ? {} : { dependent: 'state' }),
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
    center: {
      type: 'array',
      title: 'CENTER',
      items: {
        type: 'string',
        enum: ['Select'],
        enumNames: ['Select'],
      },
      field_type: 'drop_down',
      api: {
        url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/cohort/search`,
        header: {
          tenantId: '**',
          Authorization: '**',
          academicyearid: '**',
        },
        method: 'POST',
        options: {
          label: 'name',
          value: 'cohortId',
          optionObj: 'result.results.cohortDetails',
        },
        payload: {
          limit: 200,
          offset: 0,
          filters: {
            type: 'COHORT',
            status: ['active'],
            block: '**',
          },
        },
        callType: 'dependent',
        dependent: 'block',
      },
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1000,
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
    status: {
      type: 'string',
      title: 'Status',
      enum: ['active', 'archived'],
      enumNames: ['Active', 'Archived'],
    },
  },
};

export const TrainerSearchUISchema = {
  'ui:order': [
    'state',
    'district',
    'block',
    'village',
    'center',
    'name',
    'sortBy',
    'status',
  ],
  state: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
    ...(isStateLocked ? { 'ui:disabled': true } : {}),
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
  center: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
  },
  name: {
    'ui:widget': 'SearchTextFieldWidget',
  },
  sortBy: {
    'ui:widget': 'select',
  },
  status: {
    'ui:widget': 'select',
  },
};
