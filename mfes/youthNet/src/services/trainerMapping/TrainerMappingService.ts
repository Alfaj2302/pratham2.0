import {
  enhanceUiSchemaWithGrid,
  fetchForm,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { FormContext } from '@shared-lib-v2/DynamicForm/components/DynamicFormConstant';
import { post } from '@shared-lib';
import API_ENDPOINTS from '../../utils/API/APIEndpoints';
import { getCohortList as searchCohorts } from '../youthNet/Dashboard/VillageServices';
import { fetchCohortMemberList } from '../MyClassDetailsService';
import {
  getTrainerCenters,
  TrainerCenter as MyCenter,
} from '../myTeachingCenter/TrainerCentersService';
import { L2_FIELD_IDS } from '../l2InterestedQueue/l2Queue.config';
import { Role, Status } from '../../utils/app.constant';

// Center Head (Lead) Trainer Mapping — the youthNet-side counterpart of
// admin-app-repo's /user-trainer page (Central Lead / State Lead). Same
// form, same Domain/Skill -> Center matching, same enroll + Center-cohort
// membership writes; the one difference is Center visibility: a Center
// Head only ever sees the Centers they are themselves assigned to, and of
// those only the ones matching the Trainer's Domain/Skill.

export interface TrainerMappingFormBundle {
  schema: any;
  uiSchema: any;
}

// Same USERS/INSTRUCTOR form admin-app-repo's TrainerFormService renders
// (Trainer reuses the Instructor role), with the same fixups: dedupe
// `required`, lock name/dob/email, 2-column grid.
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

    ['firstName', 'lastName', 'dob', 'email'].forEach((key) => {
      if (uiSchema[key]) {
        uiSchema[key] = { ...uiSchema[key], 'ui:disabled': true };
      }
    });

    uiSchema = enhanceUiSchemaWithGrid(uiSchema);
    return { schema, uiSchema };
  };

// EmailSearchUser's onUserDetails() payload carries Domain/Skill in
// `customFields: [{fieldId, value}]` — read back by fieldId.
export const extractDomainSkillValues = (
  customFields: Array<{ fieldId: string; value: any }> = []
): { domain: string | undefined; skills: string[] } => {
  const domainValue = customFields.find(
    (field) => field.fieldId === L2_FIELD_IDS.DOMAIN
  )?.value;
  const skillValue = customFields.find(
    (field) => field.fieldId === L2_FIELD_IDS.SKILLS
  )?.value;

  const domain = Array.isArray(domainValue) ? domainValue[0] : domainValue;
  const skills = Array.isArray(skillValue)
    ? skillValue
    : skillValue
    ? [skillValue]
    : [];

  return { domain, skills };
};

// Domain/Skill are locked on Edit — Reassign Center is the flow for
// changing which Centers a Trainer belongs to.
export const disableDomainSkillFields = (schema: any, uiSchema: any): any => {
  const properties = schema?.properties || {};
  const lockedIds = [L2_FIELD_IDS.DOMAIN, L2_FIELD_IDS.SKILLS];
  const nextUiSchema = { ...uiSchema };
  Object.keys(properties).forEach((key) => {
    if (lockedIds.includes(properties[key]?.fieldId) && nextUiSchema[key]) {
      nextUiSchema[key] = { ...nextUiSchema[key], 'ui:disabled': true };
    }
  });
  return nextUiSchema;
};

export interface TrainerCenter {
  cohortId: string;
  name: string;
  state?: string;
  district?: string;
  block?: string;
  village?: string;
}

export interface TrainerCenterGeoFilters {
  state?: string[];
  district?: string[];
  block?: string[];
  village?: string[];
  name?: string;
}

// Ported from admin-app-repo's TrainerCenterService (the search behind the
// Central Lead's Center step): one /cohort/search per Skill (Domain is
// single-select), Domain/Skill via customFieldsName, geography as plain id
// arrays on `filters`, deduped by cohortId.
const searchCentersForSkill = async (
  domain: string,
  skill: string,
  geo: TrainerCenterGeoFilters
): Promise<any[]> => {
  const filters: any = {
    type: 'COHORT',
    status: ['active'],
    customFieldsName: { domain, skills: skill },
  };
  if (geo.state?.length) filters.state = geo.state;
  if (geo.district?.length) filters.district = geo.district;
  if (geo.block?.length) filters.block = geo.block;
  if (geo.village?.length) filters.village = geo.village;
  if (geo.name) filters.name = geo.name;

  const raw = await searchCohorts({ limit: 200, offset: 0, filters } as any);
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  return raw?.results?.cohortDetails || [];
};

const getLocationField = (center: any, label: string): string | undefined => {
  const field = center?.customFields?.find((f: any) => f.label === label);
  const selected = field?.selectedValues?.[0];
  return selected?.value || selected?.label || undefined;
};

const mapToTrainerCenter = (center: any): TrainerCenter => ({
  cohortId: center.cohortId,
  name: center.name,
  state: getLocationField(center, 'STATE'),
  district: getLocationField(center, 'DISTRICT'),
  block: getLocationField(center, 'BLOCK'),
  village: getLocationField(center, 'VILLAGE'),
});

export const getCentersForDomainSkills = async (
  domain: string | undefined,
  skills: string[],
  geo: TrainerCenterGeoFilters = {}
): Promise<TrainerCenter[]> => {
  if (!domain || skills.length === 0) return [];

  const results = await Promise.all(
    skills.map((skill) => searchCentersForSkill(domain, skill, geo))
  );
  const deduped = Array.from(
    new Map(results.flat().map((center: any) => [center.cohortId, center])).values()
  );
  return deduped.map(mapToTrainerCenter);
};

// The Center Head's own assigned Centers (top-level active COHORT nodes of
// their /cohort/mycohorts tree) — drives the Center dropdown and is the
// scope (allowedCenterIds) of every Center step on this page.
export const getCenterHeadCenters = async (): Promise<MyCenter[]> => {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];
  return getTrainerCenters(userId);
};

// Ported from admin-app-repo's TrainerCenterService: every Center this user
// is assigned to, flattened out of /cohort/geographical-hierarchy's
// State -> District -> Block -> Center tree. This API is USER-scoped, not
// role-scoped (a multi-role user gets every role's Centers mixed together),
// so it's only meaningful intersected with the Domain/Skill search below.
const fetchGeographicalHierarchyCenters = async (
  userId: string
): Promise<TrainerCenter[]> => {
  let response: any = null;
  try {
    response = await post(API_ENDPOINTS.cohortGeographicalHierarchy, { userId });
  } catch (error) {
    console.error('Error fetching geographical hierarchy:', error);
  }
  const geographicalData = response?.data?.result?.data || [];

  const centers: TrainerCenter[] = [];
  geographicalData.forEach((state: any) => {
    state.districts?.forEach((district: any) => {
      district.blocks?.forEach((block: any) => {
        block.centers?.forEach((center: any) => {
          centers.push({
            cohortId: center.centerId,
            name: center.centerName,
            state: state.stateName,
            district: district.districtName,
            block: block.blockName,
          });
        });
      });
    });
  });
  return centers;
};

// Reassign Center: same intersection admin-app-repo's
// getUserAssignedCenters does (/cohort/geographical-hierarchy Centers AND
// Centers matching the Trainer's Domain/Skill), additionally split by the
// Center Head's scope. In-scope Centers are editable; the rest are carried
// through untouched on save, so a Center Head never drops a Trainer from a
// Center they don't manage.
export const getTrainerCentersInScope = async (
  trainerUserId: string,
  domain: string | undefined,
  skills: string[],
  scopeCenterIds: string[]
): Promise<{ inScope: TrainerCenter[]; outOfScopeIds: string[] }> => {
  const [assignedCenters, domainSkillCenters] = await Promise.all([
    fetchGeographicalHierarchyCenters(trainerUserId),
    getCentersForDomainSkills(domain, skills),
  ]);
  const domainSkillIds = new Set(domainSkillCenters.map((center) => center.cohortId));
  const trainerCenters = assignedCenters.filter((center) =>
    domainSkillIds.has(center.cohortId)
  );
  const scopeIds = new Set(scopeCenterIds);
  return {
    inScope: trainerCenters.filter((center) => scopeIds.has(center.cohortId)),
    outOfScopeIds: trainerCenters
      .filter((center) => !scopeIds.has(center.cohortId))
      .map((center) => center.cohortId),
  };
};

// Active Trainers (Instructor role) in one Center — same cohortmember/list
// call the villages page uses for a Lead's Mobilizer list.
export const getCenterTrainers = async (centerId: string): Promise<any[]> => {
  if (!centerId) return [];
  const response = await fetchCohortMemberList({
    limit: 200,
    offset: 0,
    filters: {
      cohortId: centerId,
      role: Role.INSTRUCTOR,
      status: [Status.ACTIVE],
    },
  } as any);
  const users = response?.result?.userDetails || [];
  return [...users].sort((a: any, b: any) =>
    getTrainerName(a).localeCompare(getTrainerName(b))
  );
};

export const getTrainerName = (user: any): string =>
  [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || '-';

// cohortmember/list puts dynamic fields under `customField`, value(s) in
// `selectedValues` as plain strings or {id, value, label} objects.
export const getTrainerFieldValues = (user: any, fieldId: string): string[] => {
  const field = user?.customField?.find((f: any) => f.fieldId === fieldId);
  return (field?.selectedValues || [])
    .map((value: any) =>
      typeof value === 'string' ? value : value?.value ?? value?.label ?? value?.id
    )
    .filter(Boolean)
    .map(String);
};

const getTrainerFieldValuesByLabel = (user: any, label: string): string[] => {
  const field = user?.customField?.find((f: any) => f.label === label);
  return (field?.selectedValues || [])
    .map((value: any) =>
      typeof value === 'string' ? value : value?.value ?? value?.label
    )
    .filter(Boolean)
    .map(String);
};

// Same "State / District / Block / Village" Location column the Central
// Lead's Trainer list shows, read off cohortmember/list's `customField`.
export const getTrainerLocation = (user: any): string => {
  const parts = ['STATE', 'DISTRICT', 'BLOCK', 'VILLAGE']
    .map((label) => getTrainerFieldValuesByLabel(user, label)[0])
    .filter(Boolean);
  return parts.length ? parts.join(' / ') : '-';
};

// Gender is a core user field; fall back to a GENDER customField in case
// cohortmember/list only returns it there.
export const getTrainerGender = (user: any): string => {
  const raw = user?.gender || getTrainerFieldValuesByLabel(user, 'GENDER')[0];
  if (!raw) return '-';
  const text = String(raw).toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getTrainerDomainSkills = (
  user: any
): { domain: string | undefined; skills: string[] } => ({
  domain: getTrainerFieldValues(user, L2_FIELD_IDS.DOMAIN)[0],
  skills: getTrainerFieldValues(user, L2_FIELD_IDS.SKILLS),
});
