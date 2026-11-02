import { getCohortList as searchCohorts } from '../youthNet/Dashboard/VillageServices';
import { BATCH_DATE_FIELD_IDS } from '../myTeachingCenter/myTeachingCenter.config';

export interface PlacementBatch {
  cohortId: string;
  name: string;
  // 'YYYY-MM-DD' — the Placement Form's Date of Joining must fall after it
  // (see withDateOfJoiningAfter in PlacementFormService).
  endDate?: string;
}

// Same customFields lookup as BatchListService's getDateField.
const getEndDate = (batch: any): string | undefined => {
  const value = batch?.customFields?.find(
    (field: any) => field.fieldId === BATCH_DATE_FIELD_IDS.END_DATE
  )?.selectedValues?.[0];
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
};

const mapToPlacementBatch = (batch: any): PlacementBatch => ({
  cohortId: batch.cohortId,
  name: batch.name,
  endDate: getEndDate(batch),
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
