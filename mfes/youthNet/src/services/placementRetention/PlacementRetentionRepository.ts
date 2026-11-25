import { fetchCohortMemberList } from '../MyClassDetailsService';
import { Role } from '../../utils/app.constant';
import { ALL_LEARNER_STATUSES } from '../myTeachingCenter/myTeachingCenter.config';
import { isMutationSuccess, updateCohortMemberStatus } from '../myTeachingCenter/LearnerListService';
import { LearnerProgressStatus } from '../../utils/Interfaces';
import { PLACEMENT_RETENTION_FIELD_ID } from './placementRetention.config';
import {
  PlacementRetentionData,
  readLearnerPlacementRetentionData,
  serializePlacementRetentionData,
} from './PlacementRetentionDataService';

// The read → modify → write cycle for the unified Placement + Retention
// field, shared by every Placement and Retention save. Because the whole
// history lives in one field, each write must start from the latest saved
// value rather than whatever the table happened to load earlier — otherwise
// e.g. a Retention save made from a stale row would silently undo a
// Placement change made after that row was loaded.

// Re-reads one learner's current cohort-membership row. cohortmember/list
// has no confirmed single-member filter, so the same name search the
// learner tables use narrows the batch down, and the learner is then matched
// exactly by cohortMembershipId. Falls back to the row the caller already
// has only if they can't be found in the fresh response (logged, so it's
// visible if it ever happens).
const fetchLatestLearnerRow = async (batchCohortId: string, learnerRow: any): Promise<any> => {
  const filters: any = {
    cohortId: batchCohortId,
    role: Role.STUDENT,
    status: ALL_LEARNER_STATUSES,
  };
  if (learnerRow?.firstName) filters.name = learnerRow.firstName;
  const resp = await fetchCohortMemberList({ limit: 100, offset: 0, filters });
  const latest = (resp?.result?.userDetails || []).find(
    (row: any) => row?.cohortMembershipId === learnerRow?.cohortMembershipId
  );
  if (!latest) {
    console.warn('Placement/Retention save: latest learner row not found, using loaded row');
    return learnerRow;
  }
  return latest;
};

// Saves for the same learner are chained, so two saves fired close together
// from this tab each read the result of the one before instead of racing.
const pendingWrites = new Map<string, Promise<unknown>>();

const runExclusive = <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = pendingWrites.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  pendingWrites.set(key, run);
  run.finally(() => {
    if (pendingWrites.get(key) === run) pendingWrites.delete(key);
  });
  return run;
};

export interface SavePlacementRetentionParams<R> {
  batchCohortId: string;
  learnerRow: any;
  // Needed only to migrate a learner still on the old per-field storage.
  placementSchema: any;
  // Applies the one requested change to the latest data. Throwing aborts the
  // save without writing anything.
  mutate: (current: PlacementRetentionData) => { data: PlacementRetentionData; result?: R };
  // Optional learner status to set in the same request, computed from the
  // updated data (e.g. 'retention_complete' once every milestone is done).
  memberStatus?: (
    next: PlacementRetentionData,
    latestRow: any
  ) => LearnerProgressStatus | undefined;
}

export interface SavePlacementRetentionResult<R> {
  ok: boolean;
  data?: PlacementRetentionData;
  result?: R;
}

export const savePlacementRetentionData = <R = void>({
  batchCohortId,
  learnerRow,
  placementSchema,
  mutate,
  memberStatus,
}: SavePlacementRetentionParams<R>): Promise<SavePlacementRetentionResult<R>> =>
  runExclusive(String(learnerRow?.cohortMembershipId), async () => {
    try {
      const latestRow = await fetchLatestLearnerRow(batchCohortId, learnerRow);
      const current = readLearnerPlacementRetentionData(latestRow, placementSchema);
      const { data: next, result } = mutate(current);
      const value = serializePlacementRetentionData(next);
      const status = memberStatus?.(next, latestRow);

      const response = await updateCohortMemberStatus({
        membershipId: learnerRow.cohortMembershipId,
        ...(status && status !== latestRow?.status && { memberStatus: status }),
        dynamicBody: { customFields: [{ fieldId: PLACEMENT_RETENTION_FIELD_ID, value }] },
      });
      if (!isMutationSuccess(response)) return { ok: false };
      return { ok: true, data: next, result };
    } catch (error) {
      console.error('Error saving placement/retention data:', error);
      return { ok: false };
    }
  });
