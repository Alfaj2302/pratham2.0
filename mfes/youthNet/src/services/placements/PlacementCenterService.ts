import { getCohortList as searchCohorts } from '../youthNet/Dashboard/VillageServices';

export interface PlacementCenter {
  cohortId: string;
  name: string;
}

export interface SdbvFilters {
  state?: string;
  district?: string;
  block?: string;
}

// ASSUMPTION, not yet confirmed against the real backend (same caveat
// AllocateToBatchModal.tsx already carries for its own Batch-by-domain/skill
// filter): Center-type COHORT nodes are assumed to carry a DOMAIN
// customField, filterable via customFieldsName — mirroring
// BatchListService.searchBatchesForPair's own Batch-type filter by
// domain/skill. The state/district/block keys are similarly assumed to be
// accepted top-level filter keys on cohort/search for COHORT-type nodes; no
// existing caller in this codebase filters Centers by SDBV today. Both need
// confirmation once a real Placement Retention Coordinator account + data
// exists — adjust the `filters` shape below if the real contract differs.
const searchCentersForDomain = async (
  domain: string,
  sdbv: SdbvFilters
): Promise<any[]> => {
  const raw = await searchCohorts({
    limit: 200,
    offset: 0,
    filters: {
      type: 'COHORT',
      status: ['active'],
      customFieldsName: { domain },
      ...(sdbv.state && { state: sdbv.state }),
      ...(sdbv.district && { district: sdbv.district }),
      ...(sdbv.block && { block: sdbv.block }),
    },
  });
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  return raw?.results?.cohortDetails || [];
};

const mapToPlacementCenter = (center: any): PlacementCenter => ({
  cohortId: center.cohortId,
  name: center.name,
});

// One search call per Domain the Coordinator is assigned, deduped by
// cohortId — same fan-out shape as
// BatchListService.getMyTeachingCenterBatches.
export const getCentersForDomains = async (
  domains: string[],
  sdbv: SdbvFilters = {}
): Promise<PlacementCenter[]> => {
  if (domains.length === 0) return [];

  const results = await Promise.all(domains.map((domain) => searchCentersForDomain(domain, sdbv)));
  const flattened = results.flat();
  const deduped = Array.from(new Map(flattened.map((center: any) => [center.cohortId, center])).values());

  return deduped.map(mapToPlacementCenter);
};
