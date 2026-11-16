import axios from 'axios';
import { getCohortList as searchCohorts } from '@/services/CohortService/cohortService';

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

// Confirmed against the real /cohort/search contract via
// MultipleBatchListWidget.tsx's own Center search (the widget behind
// Instructor Mapping's own Center/Batch step): `filters.type` is a plain
// string ('COHORT'), not an array — sending it as an array is what produced
// the "filters.type must be a string" 400. State/District/Block/Village are
// plain arrays of ids directly on `filters` (not customFieldsName-wrapped —
// that wrapper is only for Domain/Skill, per the ticket's own example).
const searchCentersForSkill = async (
  domain: string,
  skill: string,
  geo: TrainerCenterGeoFilters
): Promise<any[]> => {
  // admin-app-repo's own `cohortListData` type only declares `filter`
  // (singular, unused/stale) — the real /cohort/search contract takes
  // `filters`, same as every other caller of this endpoint in this repo
  // (PlacementCenterService, AllocateToBatchModal, etc). Building the
  // payload as `any` sidesteps that stale type without touching the shared
  // cohortService.ts interface.
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

  const payload: any = { limit: 200, offset: 0, filters };
  const raw = await searchCohorts(payload);
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  return raw?.results?.cohortDetails || [];
};

// Same customFields -> location extraction MultipleCenterListWidgetNew.tsx
// (the Team Leader / user-leader.tsx Center picker) already uses, so the
// location breadcrumb on each Trainer Center card matches that widget.
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

// One search call per selected Skill (Domain is single-select, per the real
// form's own maxSelection), deduped by cohortId. Geography filters
// (state/district/block/village) and a name search narrow every one of
// those calls identically.
export const getCentersForDomainSkills = async (
  domain: string | undefined,
  skills: string[],
  geo: TrainerCenterGeoFilters = {}
): Promise<TrainerCenter[]> => {
  if (!domain || skills.length === 0) return [];

  const results = await Promise.all(
    skills.map((skill) => searchCentersForSkill(domain, skill, geo))
  );
  const flattened = results.flat();
  const deduped = Array.from(
    new Map(flattened.map((center: any) => [center.cohortId, center])).values()
  );

  return deduped.map(mapToTrainerCenter);
};

// /cohort/geographical-hierarchy is USER-scoped, not role-scoped: a user
// holding multiple roles (e.g. Mobilizer AND Instructor) gets every Center
// from every role mixed into one tree, with no field marking which role
// each Center belongs to. So it can't be used alone to find "this Trainer's
// Centers" — e.g. a user with 1 Center under one role and 2 under another
// gets all 3 back with no way to tell them apart from this response alone.
const fetchGeographicalHierarchyCenters = async (
  userId: string
): Promise<TrainerCenter[]> => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    tenantId: localStorage.getItem('tenantId') || '',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    academicyearid: localStorage.getItem('academicYearId') || '',
  };
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/cohort/geographical-hierarchy`;

  let response: any = null;
  try {
    response = await axios.post(apiUrl, { userId }, { headers });
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
            // villageName isn't present on this hierarchy's center nodes —
            // same gap user-leader.tsx's own centerObject documents
            // (village: null).
          });
        });
      });
    });
  });
  return centers;
};

// A Trainer's actual Centers are the INTERSECTION of two API calls, not
// either one alone:
//  - /cohort/geographical-hierarchy: every Center this user is assigned to,
//    across every role they hold (role-blind — see above).
//  - /cohort/search (getCentersForDomainSkills, already used by the Map New
//    step): every Center matching the Trainer's own Domain/Skill, anywhere
//    — this is what's role-*specific*, since Domain/Skill is what
//    identifies the Trainer slice of an otherwise role-mixed user, but on
//    its own it isn't scoped to this particular user at all (it would match
//    plenty of Centers this user was never assigned to).
// Intersecting the two — "Centers this user is actually in" AND "Centers
// matching their Trainer Domain/Skill" — is what correctly narrows a
// multi-role user's full Center list down to just the ones relevant to
// Trainer Reassign, dropping e.g. a Center they hold only via an unrelated
// Mobilizer assignment.
export const getUserAssignedCenters = async (
  userId: string,
  domain: string | undefined,
  skills: string[]
): Promise<TrainerCenter[]> => {
  const [assignedCenters, domainSkillCenters] = await Promise.all([
    fetchGeographicalHierarchyCenters(userId),
    getCentersForDomainSkills(domain, skills),
  ]);

  const domainSkillIds = new Set(domainSkillCenters.map((center) => center.cohortId));
  return assignedCenters.filter((center) => domainSkillIds.has(center.cohortId));
};

// States a State Lead is assigned to, read off the logged-in user's own
// WORKING_STATE custom field (the same field useAccountSwitch.ts and
// sso/index.tsx read `stateId` from) — every selected value, not just the
// first, so a State Lead covering several States gets all of them. Falls
// back to the single `stateId` already stored at login.
export const getAssignedStateIds = (): string[] => {
  try {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
    const workingState = adminInfo?.customFields?.find(
      (field: { label: string }) => field?.label === 'WORKING_STATE'
    );
    const ids = (workingState?.selectedValues || [])
      .map((value: any) => value?.id)
      .filter((id: any) => id !== undefined && id !== null && id !== '')
      .map(String);
    if (ids.length > 0) return ids;
  } catch (error) {
    console.error('Error reading assigned States:', error);
  }
  const stateId = localStorage.getItem('stateId');
  return stateId ? [stateId] : [];
};
