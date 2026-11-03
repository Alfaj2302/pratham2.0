import { getAcademicYear } from '@learner/utils/API/AcademicYearService';
import { getCohortList } from '@learner/utils/API/CohortService';
import { TenantName } from '@learner/utils/app.constant';

export interface VtBatchCustomField {
  label?: string;
  type?: string;
  selectedValues?: Array<string | { id?: string; label?: string }>;
}

export interface VtBatch {
  cohortId?: string;
  cohortName?: string;
  type?: string;
  cohortStatus?: string;
  cohortMemberStatus?: string;
  customField?: VtBatchCustomField[];
  [key: string]: unknown;
}

// Any active batch the learner belongs to counts, whatever their member status.
const isActiveBatch = (cohort: VtBatch | undefined | null): boolean =>
  cohort?.type === 'BATCH' && cohort?.cohortStatus === 'active';

const findActiveBatch = (response: any): VtBatch | null => {
  if (!Array.isArray(response?.result)) return null;
  // Several active batches → first match, same as mobile's `cohort.find(...)`.
  return (response.result as VtBatch[]).find(isActiveBatch) ?? null;
};

let cachedLookup: { key: string; promise: Promise<VtBatch | null> } | null = null;

// Last resolved batch. Reloads still re-fetch (see getActiveVtBatch), so a batch
// assigned mid-session shows up on a refresh of any page. ProgramSwitchModal
// clears it, so re-entering VT re-checks.
export const VT_BATCH_STORAGE_KEY = 'vtActiveBatch';

const readStoredBatch = (key: string): { batch: VtBatch | null } | null => {
  try {
    const raw = localStorage.getItem(VT_BATCH_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return stored?.key === key ? { batch: stored.batch ?? null } : null;
  } catch {
    return null;
  }
};

/**
 * Resolve the learner's active VT batch, or null.
 *
 * Not `checkUserHasActiveBatch` from cohortAssignmentHelper: that one returns a
 * bare boolean, and the batch itself is needed here for its custom fields. It
 * backs the SCP Assessment Attempts card, unchanged.
 */
export const getActiveVtBatch = (
  userId: string,
  {
    programKey = '',
    forceRefresh = false,
  }: { programKey?: string; forceRefresh?: boolean } = {}
): Promise<VtBatch | null> => {
  const key = `${userId}:${programKey}`;
  if (!forceRefresh && cachedLookup?.key === key) {
    return cachedLookup.promise;
  }

  // No lookup yet in memory means this is the first one since a page load
  // (refresh or login), so fetch fresh on whatever page the learner is on.
  // In-app navigation after that reuses the in-memory result.
  const stored = forceRefresh || !cachedLookup ? null : readStoredBatch(key);
  if (stored) {
    const promise = Promise.resolve(stored.batch);
    cachedLookup = { key, promise };
    return promise;
  }

  const promise = fetchActiveVtBatch(userId).then((batch) => {
    try {
      localStorage.setItem(VT_BATCH_STORAGE_KEY, JSON.stringify({ key, batch }));
    } catch {
      // Storage unavailable (private mode / quota) — fall back to memory only.
    }
    return batch;
  });
  cachedLookup = { key, promise };
  return promise;
};

// Records that the L2 Courses tab has already been enabled for this batch,
// whether the learner was redirected to it or it just appeared during in-app
// navigation. A refresh redirects only when the tab was not enabled before.
// Not kept by preserveLocalStorage(), so it resets on logout and the next
// login redirects.
const L2_TAB_SHOWN_STORAGE_KEY = 'vtL2TabShown';

const getL2TabShownKey = (userId: string, batch: VtBatch) =>
  `${userId}:${batch.cohortId ?? ''}`;

/** True once the L2 Courses tab has been enabled for this learner's batch. */
export const hasL2TabBeenShown = (userId: string, batch: VtBatch): boolean => {
  try {
    return localStorage.getItem(L2_TAB_SHOWN_STORAGE_KEY) === getL2TabShownKey(userId, batch);
  } catch {
    return false;
  }
};

export const markL2TabShown = (userId: string, batch: VtBatch) => {
  try {
    localStorage.setItem(L2_TAB_SHOWN_STORAGE_KEY, getL2TabShownKey(userId, batch));
  } catch {
    // Storage unavailable — the redirect may repeat, which is harmless.
  }
};

// Only the batch check that resolves first after a page load (refresh, or the
// first VT page after login) may auto-redirect; a check that resolves later,
// during in-app navigation, just enables the tab. Module scope, so a reload
// re-arms it.
let firstBatchCheckPending = true;

/** True for the first resolved batch check of this page load only. */
export const consumeFirstBatchCheck = (): boolean => {
  const pending = firstBatchCheckPending;
  firstBatchCheckPending = false;
  return pending;
};

/**
 * Re-arm on logout, so logging back in without a reload counts as a fresh load:
 * the batch is fetched again and the first check may redirect.
 */
export const resetFirstBatchCheck = () => {
  firstBatchCheckPending = true;
  cachedLookup = null;
};

/**
 * Stop Layout from redirecting on its next check. ProgramSwitchModal sets the
 * new program before it finishes, so Layout would check the batch on the old
 * page and race the modal's own navigation; the modal decides instead.
 */
export const skipFirstBatchCheck = () => {
  firstBatchCheckPending = false;
};

/**
 * Where a learner entering a program should go: L2 Courses for a VT learner
 * with a batch, otherwise the program's landing page. Resolved before
 * navigating, so the learner never sees the landing page first. The redirect
 * is recorded, so Layout doesn't repeat it on the next refresh.
 */
export const resolveProgramEntryRoute = async (
  userId: string | null | undefined,
  program: string | null | undefined,
  landingPage: string
): Promise<string> => {
  if (!userId || program !== TenantName.YOUTHNET) return landingPage;
  const batch = await getActiveVtBatch(userId, { programKey: program });
  if (!batch) return landingPage;
  markL2TabShown(userId, batch);
  return '/l2-courses';
};

/** Drop the batch so the next VT visit re-checks. */
export const clearActiveVtBatchCache = () => {
  cachedLookup = null;
  try {
    localStorage.removeItem(VT_BATCH_STORAGE_KEY);
  } catch {
    // Ignore: nothing to clear if storage is unavailable.
  }
};

const fetchActiveVtBatch = async (userId: string): Promise<VtBatch | null> => {
  if (!userId || typeof window === 'undefined') return null;

  const currentAcademicYearId = localStorage.getItem('academicYearId');

  try {
    if (currentAcademicYearId) {
      const batch = findActiveBatch(await getCohortList(userId, true, true));
      if (batch) return batch;
    }

    const academicYearList = await getAcademicYear();
    const otherYearIds = (Array.isArray(academicYearList) ? academicYearList : [])
      .map((year: { id?: string }) => year?.id)
      .filter((id): id is string => Boolean(id) && id !== currentAcademicYearId);

    for (const yearId of otherYearIds) {
      localStorage.setItem('academicYearId', yearId);
      const batch = findActiveBatch(await getCohortList(userId, true, true));
      if (batch) return batch;
    }

    return null;
  } catch (error) {
    console.error('getActiveVtBatch: failed to resolve active batch', error);
    return null;
  } finally {
    if (currentAcademicYearId) {
      localStorage.setItem('academicYearId', currentAcademicYearId);
    } else {
      localStorage.removeItem('academicYearId');
    }
  }
};

/**
 * Read one custom field off the batch as a list of plain strings.
 * `selectedValues` entries are either bare strings or `{ id, label }` objects,
 * and which one arrives varies by field, so both are handled.
 */
const extractCustomFieldValues = (
  batch: VtBatch | null | undefined,
  label: string,
  prefer: 'label' | 'id' = 'label'
): string[] => {
  const field = batch?.customField?.find((item) => item?.label === label);
  const values = Array.isArray(field?.selectedValues) ? field?.selectedValues : [];
  return (values ?? [])
    .map((value) => {
      if (typeof value === 'string') return value;
      return prefer === 'id' ? value?.id ?? value?.label : value?.label ?? value?.id;
    })
    .filter((value): value is string => Boolean(value));
};

/**
 * The batch's SKILLS custom field (e.g. ["Sewing Machine Operator (SMO)"]).
 *
 * `skills` is the deepest level of the pos-framework taxonomy
 * (domain > subDomain > subject > skills) and courses expose it as `se_skills`,
 * so these values filter the L2 course catalogue directly.
 */
export const extractBatchSkills = (batch: VtBatch | null | undefined): string[] =>
  extractCustomFieldValues(batch, 'SKILLS');

/**
 * Question-set ids attached to the batch via its ASSESSMENTS custom field.
 * These are the only assessments a VT learner may see.
 */
export const extractAssessmentIds = (batch: VtBatch | null | undefined): string[] =>
  extractCustomFieldValues(batch, 'ASSESSMENTS', 'id');

/**
 * The batch's END_DATE custom field as `YYYY-MM-DD`, or null when unset.
 * Same label the admin Batch list reads (BatchFlow.tsx) and the same
 * `YYYY-MM-DD` string youthNet's batch form writes.
 */
export const extractBatchEndDate = (
  batch: VtBatch | null | undefined
): string | null => {
  const [value] = extractCustomFieldValues(batch, 'END_DATE');
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : null;
};

const getTodayKey = (): string => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * True once the batch's end date has passed. The end date itself still counts
 * as in-batch, and a batch with no end date never ends. String comparison on
 * the date key, like CreateBatchModal's own past-date check — no timezone shift.
 */
export const isBatchEnded = (batch: VtBatch | null | undefined): boolean => {
  const endDate = extractBatchEndDate(batch);
  return Boolean(endDate && endDate < getTodayKey());
};
