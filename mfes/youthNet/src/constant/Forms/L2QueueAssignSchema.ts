// Domain/Skill/Note fields used inside the "Review & assign interest" side
// panel. Same api-driven cascade shape as L2QueueSearchSchema's
// taggedDomain/taggedSkill fields, just under plain `domain`/`skill` keys.
// `fieldId` on each property lets extractMatchingKeys() (shared-lib-v2)
// prefill this schema from an already-tagged learner's customFields.
//
// Skill replaces the earlier Course field, and uses the get-framework proxy
// (same mechanism as `domain` below) with a *confirmed* real contract —
// matching apps/admin-app-repo's/L2BatchCreate.ts's own Domain+Skills pair
// exactly: code 'subject', fetchUrl pos-framework, findcode 'skills',
// dependent on domain via '**' substitution. NOTE: L2BatchCreate.ts's own
// Domain field also sources from pos-framework (findcode 'subject'), while
// this Domain field still sources from youthnet-framework (findcode
// 'stream') — left unchanged since it's the earlier already-verified
// source. If Skill comes back empty, the two frameworks likely don't share
// term values and Domain's source needs to switch to pos-framework too.
import { L2_FIELD_IDS } from '../../services/l2InterestedQueue/l2Queue.config';

export const L2QueueAssignSchema = {
  type: 'object',
  required: ['domain', 'skill'],
  properties: {
    domain: {
      type: 'array',
      title: 'Domain',
      fieldId: L2_FIELD_IDS.DOMAIN,
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
          fetchUrl:
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/framework/v1/read/pos-framework`,
          findcode: 'subject',
          selectedvalue: ['Career Exploration'],
        },
        callType: 'initial',
      },
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1,
    },
    skill: {
      type: 'array',
      title: 'Skill',
      fieldId: L2_FIELD_IDS.SKILLS,
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
          code: 'subject',
          fetchUrl:
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/framework/v1/read/pos-framework`,
          findcode: 'skills',
          selectedvalue: '**',
        },
        callType: 'dependent',
        dependent: 'domain',
      },
      uniqueItems: true,
      isMultiSelect: true,
      maxSelection: 1,
    },
    note: {
      type: 'string',
      title: 'Interaction note',
      fieldId: L2_FIELD_IDS.INTERACTION_NOTE,
    },
  },
};

export const L2QueueAssignUISchema = {
  'ui:order': ['domain', 'skill', 'note'],
  domain: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
    'ui:placeholder': 'Select a domain',
  },
  skill: {
    'ui:widget': 'AutoCompleteMultiSelectWidget',
    'ui:options': { multiple: true, uniqueItems: true },
    'ui:placeholder': 'Choose a domain first',
  },
  note: {
    'ui:widget': 'textarea',
    'ui:placeholder': 'What was discussed with the learner?',
  },
};
