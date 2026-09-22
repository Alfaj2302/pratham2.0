import { getCohortList as searchCohorts } from '../youthNet/Dashboard/VillageServices';

export interface TrainerCenter {
  cohortId: string;
  name: string;
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

  const raw = await searchCohorts({ limit: 200, offset: 0, filters });
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  return raw?.results?.cohortDetails || [];
};

const mapToTrainerCenter = (center: any): TrainerCenter => ({
  cohortId: center.cohortId,
  name: center.name,
});

// One search call per selected Skill (Domain is single-select, per the real
// form's own maxSelection), deduped by cohortId — same fan-out+dedupe shape
// PlacementCenterService.getCentersForDomains already uses for its own
// per-Domain fan-out. Geography filters (state/district/block/village) and
// a name search narrow every one of those calls identically.
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
