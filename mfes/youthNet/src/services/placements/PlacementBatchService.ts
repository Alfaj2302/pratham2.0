import { getCohortList as searchCohorts } from '../youthNet/Dashboard/VillageServices';

export interface PlacementBatch {
  cohortId: string;
  name: string;
}

const mapToPlacementBatch = (batch: any): PlacementBatch => ({
  cohortId: batch.cohortId,
  name: batch.name,
});

// Batches under a single, already Domain-scoped Center — no further
// domain/skill filtering needed (unlike BatchListService's Trainer-facing
// getMyTeachingCenterBatches, which has no Center concept at all and so
// filters by domain/skill directly).
export const getBatchesForCenter = async (centerId: string): Promise<PlacementBatch[]> => {
  const raw = await searchCohorts({
    limit: 200,
    offset: 0,
    filters: {
      type: 'BATCH',
      status: ['active'],
      parentId: [centerId],
    },
  });
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  const list = raw?.results?.cohortDetails || [];
  return list.map(mapToPlacementBatch);
};
