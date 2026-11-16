'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CommonTabs, useTranslation } from '@shared-lib';
import {
  getAssessmentsByIds,
  getAssessmentStatusSummary,
  getOfflineAssessmentStatus,
  IAssessmentStatusSummary,
} from '@learner/utils/API/AssesmentService';
import {
  getQuestionSetId,
  isOfflineAssessment,
  mergeLatestAttempts,
  VtQuestionSet,
} from '@learner/utils/helpers/vtAssessmentHelpers';
import {
  AssessmentStatusLine,
  getAssessmentTypeLabelKey,
  OfflineTestCard,
  OnlineTestCard,
  TestCompletedModal,
  VtAssessmentShell,
} from '@learner/components/VtAssessment';

interface CategoryData {
  online: VtQuestionSet[];
  offline: VtQuestionSet[];
  summary?: IAssessmentStatusSummary;
  total: number;
}

const TestListPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const rawType = params?.type;
  const type = decodeURIComponent(
    Array.isArray(rawType) ? rawType[0] ?? '' : rawType ?? ''
  );

  return (
    <VtAssessmentShell
      title={t(getAssessmentTypeLabelKey(type), { defaultValue: type })}
      onBack={() => router.push('/l2-courses?tab=assessment')}
    >
      {({ assessmentIds, batchEnded }) => (
        <Suspense fallback={<TestListSkeleton />}>
          <TestListBody
            type={type}
            assessmentIds={assessmentIds}
            batchEnded={batchEnded}
          />
        </Suspense>
      )}
    </VtAssessmentShell>
  );
};

const TestListSkeleton: React.FC = () => (
  <Box>
    {[0, 1, 2].map((index) => (
      <Skeleton
        key={index}
        variant="rounded"
        height={76}
        sx={{ mb: 1.5, borderRadius: '8px' }}
      />
    ))}
  </Box>
);

const TestListBody: React.FC<{
  type: string;
  assessmentIds: string[];
  batchEnded: boolean;
}> = ({ type, assessmentIds, batchEnded }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const completedId = searchParams.get('completed');

  const [data, setData] = useState<CategoryData | null>(null);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [offlineStatuses, setOfflineStatuses] = useState<
    Record<string, string | null>
  >({});
  const [isOfflineStatusLoading, setIsOfflineStatusLoading] = useState(false);
  const [completedQuestionSet, setCompletedQuestionSet] =
    useState<VtQuestionSet | null>(null);

  const returnUrl = `/l2-courses/${encodeURIComponent(type)}`;

  // See the category list: key on the joined ids so the 3-second eligibility
  // poll does not re-trigger this fetch.
  const assessmentIdsKey = assessmentIds.join(',');

  const load = useCallback(async () => {
    const userId =
      typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const ids = assessmentIdsKey ? assessmentIdsKey.split(',') : [];

    // Batch over → the list is withheld, so skip the search entirely.
    if (batchEnded) {
      setData({ online: [], offline: [], total: 0 });
      return;
    }

    if (!ids.length || !userId) {
      setData({ online: [], offline: [], total: 0 });
      return;
    }

    setHasError(false);
    try {
      const allQuestionSets = (await getAssessmentsByIds(
        ids
      )) as VtQuestionSet[];
      const categoryQuestionSets = allQuestionSets.filter(
        (questionSet) => (questionSet?.assessmentType ?? 'Other') === type
      );
      const categoryIds = categoryQuestionSets.map(getQuestionSetId).filter(Boolean);

      const summaryList = await getAssessmentStatusSummary({
        userId: [userId],
        courseId: categoryIds,
        unitId: categoryIds,
        contentId: categoryIds,
      });
      const summary = summaryList?.[0];
      const merged = mergeLatestAttempts(categoryQuestionSets, summary);

      // AI assessments are out of scope, so `ai-assessment/search` is never
      // called: offline is exactly `evaluationType === 'offline'`.
      const offline = merged.filter(isOfflineAssessment);
      const online = merged.filter(
        (questionSet) => !isOfflineAssessment(questionSet)
      );

      setData({ online, offline, summary, total: merged.length });

      if (completedId) {
        setCompletedQuestionSet(
          merged.find((questionSet) => getQuestionSetId(questionSet) === completedId) ??
            null
        );
      }

      if (offline.length > 0) {
        setIsOfflineStatusLoading(true);
        const entries = await Promise.all(
          offline.map(async (questionSet) => {
            const id = getQuestionSetId(questionSet);
            try {
              const response = await getOfflineAssessmentStatus({
                userIds: [userId],
                questionSetId: id,
                // A VT question set has no parent course; mobile keys tracking off
                // the question-set id for course, unit and content alike.
                parentId: id,
              });
              const record = response?.result?.find(
                (item: { userId?: string }) => item?.userId === userId
              );
              return [id, record?.status ?? null] as const;
            } catch (error) {
              console.error('TestList: offline status failed for', id, error);
              return [id, null] as const;
            }
          })
        );
        setOfflineStatuses(Object.fromEntries(entries));
        setIsOfflineStatusLoading(false);
      }
    } catch (error) {
      console.error('TestList: failed to load assessments', error);
      setHasError(true);
      setData({ online: [], offline: [], total: 0 });
    }
  }, [assessmentIdsKey, type, completedId, batchEnded]);

  useEffect(() => {
    load();
  }, [load]);

  // Reached by deep link once the batch has ended — same message as the tab.
  if (batchEnded) {
    return (
      <Typography sx={{ color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.BATCH_COMPLETED_NO_ASSESSMENTS')}
      </Typography>
    );
  }

  if (data === null) return <TestListSkeleton />;

  if (hasError) {
    return (
      <Typography sx={{ color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.LOAD_ERROR')}
      </Typography>
    );
  }

  if (data.total === 0) {
    return (
      <Typography sx={{ color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.NO_DATA_FOUND')}
      </Typography>
    );
  }

  const completedCount = Array.isArray(data.summary?.assessments)
    ? (data.summary?.assessments as unknown[]).length
    : 0;

  const onlineContent = (
    <Box>
      {data.online.map((questionSet) => {
        const id = getQuestionSetId(questionSet);
        return (
          <OnlineTestCard
            key={id}
            questionSet={questionSet}
            onStart={() =>
              router.push(
                `/l2-courses/detail/${id}?type=${encodeURIComponent(type)}`
              )
            }
            onOpenAnswerSheet={() =>
              router.push(
                `/l2-courses/answersheet/${id}?type=${encodeURIComponent(type)}`
              )
            }
          />
        );
      })}
    </Box>
  );

  const offlineContent = (
    <Box>
      {data.offline.map((questionSet) => {
        const id = getQuestionSetId(questionSet);
        const userId =
          typeof window !== 'undefined' ? localStorage.getItem('userId') : '';
        return (
          <OfflineTestCard
            key={id}
            questionSet={questionSet}
            offlineStatus={offlineStatuses[id]}
            isStatusLoading={isOfflineStatusLoading}
            onClick={() =>
              router.push(
                `/manual-assessment?assessmentId=${id}&parentId=${id}&userId=${userId}` +
                  `&returnUrl=${encodeURIComponent(returnUrl)}&flow=vt`
              )
            }
          />
        );
      })}
    </Box>
  );

  // An empty tab is hidden rather than shown with an empty state.
  const tabs = [
    ...(data.online.length > 0
      ? [
          {
            label: `${t('LEARNER_APP.VT_ASSESSMENT.ONLINE')} (${data.online.length})`,
            content: onlineContent,
          },
        ]
      : []),
    ...(data.offline.length > 0
      ? [
          {
            label: `${t('LEARNER_APP.VT_ASSESSMENT.OFFLINE')} (${data.offline.length})`,
            content: offlineContent,
          },
        ]
      : []),
  ];

  const handleCloseCompletedModal = () => {
    setCompletedQuestionSet(null);
    router.replace(returnUrl);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <AssessmentStatusLine
          status={data.summary?.status}
          percentage={data.summary?.percentage}
          completedCount={completedCount}
          totalCount={data.total}
        />
      </Box>

      {tabs.length > 0 && (
        <CommonTabs
          tabs={tabs}
          value={Math.min(activeTab, tabs.length - 1)}
          onChange={(_event, newValue) => setActiveTab(newValue)}
          ariaLabel="assessment online offline tabs"
        />
      )}

      <TestCompletedModal
        open={Boolean(completedId && completedQuestionSet)}
        score={completedQuestionSet?.totalScore}
        maxScore={completedQuestionSet?.totalMaxScore}
        isResultMissing={
          Boolean(completedQuestionSet) && !completedQuestionSet?.lastAttemptedOn
        }
        onClose={handleCloseCompletedModal}
      />
    </Box>
  );
};

export default TestListPage;
