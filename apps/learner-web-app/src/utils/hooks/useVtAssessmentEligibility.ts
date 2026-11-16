'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TenantName } from '@learner/utils/app.constant';
import { useUserProgram } from '@learner/utils/hooks/useUserProgram';
import {
  extractAssessmentIds,
  getActiveVtBatch,
  isBatchEnded,
  VtBatch,
} from '@learner/utils/helpers/vtBatchHelper';

// The program's landing page, where the batch is re-checked on every visit.
const getLandingPage = () =>
  (typeof window !== 'undefined' && localStorage.getItem('landingPage')) || '/home';

// Same batch? Compared so an identical re-fetch doesn't churn object identity.
const isSameBatch = (a: VtBatch | null, b: VtBatch | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.cohortId === b.cohortId &&
    a.cohortStatus === b.cohortStatus &&
    a.cohortMemberStatus === b.cohortMemberStatus &&
    JSON.stringify(a.customField ?? []) === JSON.stringify(b.customField ?? [])
  );
};

export interface VtAssessmentEligibility {
  loading: boolean;
  eligible: boolean;
  batch: VtBatch | null;
  batchEnded: boolean;
  assessmentIds: string[];
  refresh: () => void;
}

/**
 * Active-batch eligibility for the Vocational Training Assessment feature.
 * Resolved once per page load; inert (no API call) for every other program.
 */
export const useVtAssessmentEligibility = (
  enabled = true
): VtAssessmentEligibility => {
  const userProgram = useUserProgram();
  const pathname = usePathname();
  const isVt = enabled && userProgram === TenantName.YOUTHNET;
  // Landing the learner on the VT home page is the one moment worth re-checking;
  // every other page reuses what that visit stored.
  const isLandingPage = pathname === getLandingPage();

  const [batch, setBatch] = useState<VtBatch | null>(null);
  // Which program the current `batch` was resolved for. `loading` is derived from
  // it rather than being its own state flag: useUserProgram's server snapshot is
  // null, so on the hydration render `isVt` flips from false to true, and a
  // stored flag would still read "not loading" for that one render — long enough
  // for the page shell to bounce an eligible learner to the landing page.
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const loading = isVt && resolvedFor !== userProgram;

  // Drops a second call that lands while the first is still open.
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isVt) {
      setBatch(null);
      return;
    }
    if (inFlightRef.current) return;

    const userId =
      typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      setBatch(null);
      setResolvedFor(userProgram);
      return;
    }

    inFlightRef.current = true;
    try {
      const activeBatch = await getActiveVtBatch(userId, {
        programKey: userProgram ?? '',
        forceRefresh: isLandingPage,
      });
      // Keep the previous object when nothing material changed, so a re-fetch
      // can't defeat the memo() on LearnerCourse and re-run its content search.
      if (mountedRef.current) {
        setBatch((previous) =>
          isSameBatch(previous, activeBatch) ? previous : activeBatch
        );
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setResolvedFor(userProgram);
    }
  }, [isVt, userProgram, isLandingPage]);

  useEffect(() => {
    if (!isVt) {
      setBatch(null);
      return;
    }

    refresh();
  }, [isVt, refresh]);

  return {
    loading,
    // Never report a stale batch from a program the learner just switched away
    // from: while `loading` is true the batch belongs to a different program.
    eligible: isVt && !loading && Boolean(batch),
    batch,
    // Courses stay open after the batch ends; only assessments are withheld,
    // so this is reported separately instead of failing `eligible`.
    batchEnded: isBatchEnded(batch),
    assessmentIds: extractAssessmentIds(batch),
    refresh,
  };
};

export default useVtAssessmentEligibility;
