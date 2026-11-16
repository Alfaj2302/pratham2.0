'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, Button, Divider, Skeleton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import { getAssessmentsByIds } from '@learner/utils/API/AssesmentService';
import {
  stripHtml,
  VtQuestionSet,
} from '@learner/utils/helpers/vtAssessmentHelpers';
import { VtAssessmentShell } from '@learner/components/VtAssessment';

const INSTRUCTION_KEYS = [
  'LEARNER_APP.VT_ASSESSMENT.INSTRUCTION_1',
  'LEARNER_APP.VT_ASSESSMENT.INSTRUCTION_2',
  'LEARNER_APP.VT_ASSESSMENT.INSTRUCTION_3',
  'LEARNER_APP.VT_ASSESSMENT.INSTRUCTION_4',
  'LEARNER_APP.VT_ASSESSMENT.INSTRUCTION_5',
];

const TestDetailPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <VtAssessmentShell title={t('LEARNER_APP.VT_ASSESSMENT.TITLE')}>
      {({ batchEnded }) => (
        <Suspense fallback={<Skeleton variant="rounded" height={240} />}>
          <TestDetailBody batchEnded={batchEnded} />
        </Suspense>
      )}
    </VtAssessmentShell>
  );
};

const TestDetailBody: React.FC<{ batchEnded: boolean }> = ({ batchEnded }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const rawIdentifier = params?.identifier;
  const identifier = Array.isArray(rawIdentifier)
    ? rawIdentifier[0] ?? ''
    : rawIdentifier ?? '';
  const type = searchParams.get('type') ?? '';
  const testListUrl = `/l2-courses/${encodeURIComponent(type)}`;

  const [questionSet, setQuestionSet] = useState<VtQuestionSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    // Batch over → the test can't be started, so don't fetch it either.
    if (batchEnded) {
      setIsLoading(false);
      return;
    }
    if (!identifier) {
      setIsLoading(false);
      return;
    }
    try {
      const results = (await getAssessmentsByIds([identifier])) as VtQuestionSet[];
      setQuestionSet(results?.[0] ?? null);
    } catch (error) {
      console.error('TestDetail: failed to load question set', error);
    } finally {
      setIsLoading(false);
    }
  }, [identifier, batchEnded]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = () => {
    // No courseId/unitId: PlayerService.createAssessmentTracking then posts
    // courseId = unitId = contentId = the question-set id, which is exactly what
    // /tracking/assessment/search/status is queried with.
    const exitLink = `${testListUrl}?completed=${identifier}`;
    router.push(
      `/player/${identifier}?previousPage=${encodeURIComponent(testListUrl)}` +
        `&exitLink=${encodeURIComponent(exitLink)}`
    );
  };

  // Deep link into a test after the batch ended — no instructions, no Start.
  if (batchEnded) {
    return (
      <Typography sx={{ color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.BATCH_COMPLETED_NO_ASSESSMENTS')}
      </Typography>
    );
  }

  if (isLoading) return <Skeleton variant="rounded" height={240} />;

  if (!questionSet) {
    return (
      <Typography sx={{ color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.NO_DATA_FOUND')}
      </Typography>
    );
  }

  const medium = Array.isArray(questionSet.medium)
    ? questionSet.medium[0]
    : questionSet.medium;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(testListUrl)}
        sx={{ textTransform: 'none', color: '#1E1B16', mb: 1, ml: -1 }}
      >
        {t('LEARNER_APP.VT_ASSESSMENT.BACK')}
      </Button>
      <Box
        sx={{
          border: '1px solid #D0C5B4',
          borderRadius: '8px',
          bgcolor: '#FFFFFF',
          p: { xs: 2, md: 3 },
        }}
      >
        <Typography
          sx={{ fontSize: '18px', fontWeight: 600, color: '#1E1B16', mb: 1 }}
        >
          {questionSet.name}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {questionSet.description && (
          <Typography sx={{ fontSize: '14px', color: '#4D4639', mb: 2 }}>
            {stripHtml(questionSet.description)}
          </Typography>
        )}
        {medium && (
          <Box>
            <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
              {t('LEARNER_APP.VT_ASSESSMENT.TEST_MEDIUM')}
            </Typography>
            <Typography sx={{ fontSize: '16px', color: '#1E1B16' }}>
              {medium}
            </Typography>
          </Box>
        )}
      </Box>

      <Typography
        sx={{ fontSize: '16px', fontWeight: 700, color: '#1E1B16', mt: 3, mb: 1 }}
      >
        {t('LEARNER_APP.VT_ASSESSMENT.GENERAL_INSTRUCTIONS')}
      </Typography>
      <Box component="ul" sx={{ pl: 3, m: 0 }}>
        {INSTRUCTION_KEYS.map((key) => (
          <Typography
            component="li"
            key={key}
            sx={{ fontSize: '14px', color: '#4D4639', mb: 1 }}
          >
            {t(key)}
          </Typography>
        ))}
      </Box>

      <Button
        variant="contained"
        onClick={handleStart}
        fullWidth
        sx={{
          mt: 3,
          height: 48,
          bgcolor: '#FDBE16',
          color: '#4D4639',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          maxWidth: { sm: 320 },
          '&:hover': { bgcolor: '#E6A800' },
        }}
      >
        {t('LEARNER_APP.VT_ASSESSMENT.START_TEST')}
      </Button>
    </Box>
  );
};

export default TestDetailPage;
