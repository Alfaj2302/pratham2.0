import { getCohortList as getMyCohorts } from '../GetCohortList';

export interface TrainerCenter {
  id: string;
  name: string;
}

// A Trainer can be assigned to more than one Center — mycohorts (GET
// /cohort/mycohorts/{userId}) returns the Trainer's whole cohort tree; a
// Center is a top-level (no parentId), active COHORT/CENTER-type node.
// Same fetch + filter shape already confirmed and used for the Center
// picker in AllocateToBatchModal.tsx (L2 Interested Queue's batch
// allocation flow) — reused here rather than re-deriving it.
export const getTrainerCenters = async (userId: string): Promise<TrainerCenter[]> => {
  const raw = await getMyCohorts(userId, true, true);
  if (!raw || raw?.isAxiosError || raw instanceof Error) return [];
  const list = Array.isArray(raw?.result) ? raw.result : [];
  return list
    .filter(
      (c: any) =>
        (c.type === 'COHORT' || c.type === 'CENTER') &&
        !c.parentId &&
        (c.cohortStatus ?? c.status)?.toLowerCase() === 'active'
    )
    .map((c: any) => ({ id: c.cohortId, name: c.cohortName || c.name }));
};
