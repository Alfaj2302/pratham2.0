import { fetchForm } from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import { enhanceUiSchemaWithGrid } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';

export interface TrainerMappingFormBundle {
  schema: any;
  uiSchema: any;
}

// Same Domain/Skills fieldId pair confirmed against the real backend by
// mfes/youthNet's L2BatchCreate.ts (Batch creation form) and
// l2Queue.config.ts's L2_FIELD_IDS (the L2 Interested Queue's Assign panel)
// — these are backend fieldIds, not app-specific, so the same two ids apply
// here. Kept as a local constant (rather than importing across the mfe
// boundary) since admin-app-repo and mfes/youthNet are separate apps.
const TRAINER_FIELD_IDS = {
  DOMAIN: 'e5277d7b-e7ef-4a11-9a54-a8e6e7975383',
  SKILLS: 'ed585a8c-8727-4bd5-a9c5-7642b2df774f',
};

// Renders the real USERS/INSTRUCTOR form exactly as the RJSF API returns it
// (name/dob/gender/email/mobile/state/district/block/village/domain/skills)
// — no field stripping. Same fetchForm()+FormContext.facilitator convention
// as this page's own sibling (user-instructor.tsx), plus that page's own
// established "backend sometimes duplicates entries in `required`" fixup.
export const getTrainerMappingForm =
  async (): Promise<TrainerMappingFormBundle | null> => {
    const fetchUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.facilitator.context}&contextType=${FormContext.facilitator.contextType}`;
    const responseForm: any = await fetchForm([
      { fetchUrl, header: {} },
      { fetchUrl, header: { tenantid: localStorage.getItem('tenantId') } },
    ]);

    const schema = responseForm?.schema;
    let uiSchema = responseForm?.uiSchema;
    if (!schema?.properties || !uiSchema) return null;

    if (Array.isArray(schema.required)) {
      schema.required = Array.from(new Set(schema.required));
    }

    // firstName/lastName/dob/email are disabled by default in the Trainer
    // form — same fixup user-instructor.tsx already applies to this same
    // form.
    if (uiSchema.firstName) {
      uiSchema.firstName = { ...uiSchema.firstName, 'ui:disabled': true };
    }
    if (uiSchema.lastName) {
      uiSchema.lastName = { ...uiSchema.lastName, 'ui:disabled': true };
    }
    if (uiSchema.dob) {
      uiSchema.dob = { ...uiSchema.dob, 'ui:disabled': true };
    }
    if (uiSchema.email) {
      uiSchema.email = { ...uiSchema.email, 'ui:disabled': true };
    }

    // Same 2-column grid layout user-instructor.tsx and
    // user-placement-retention-coordinator.tsx already apply to this same
    // form for their own Map New/Edit steps.
    uiSchema = enhanceUiSchemaWithGrid(uiSchema);

    return { schema, uiSchema };
  };

// The submitted Trainer Mapping form comes back through EmailSearchUser's
// onUserDetails() as DynamicForm's own `transformedFormData` shape — every
// coreField:0 property (both Domain and Skill are) lands in
// `customFields: [{fieldId, value}]`, keyed by fieldId, not by the RJSF
// property name. Reading it back out by TRAINER_FIELD_IDS keeps this
// independent of whatever the real property key names turn out to be.
export const extractDomainSkillValues = (
  customFields: Array<{ fieldId: string; value: any }> = []
): { domain: string | undefined; skills: string[] } => {
  const domainValue = customFields.find(
    (field) => field.fieldId === TRAINER_FIELD_IDS.DOMAIN
  )?.value;
  const skillValue = customFields.find(
    (field) => field.fieldId === TRAINER_FIELD_IDS.SKILLS
  )?.value;

  const domain = Array.isArray(domainValue) ? domainValue[0] : domainValue;
  const skills = Array.isArray(skillValue)
    ? skillValue
    : skillValue
    ? [skillValue]
    : [];

  return { domain, skills };
};
