'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Skeleton,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import {
  hierarchyContent,
  listQuestions,
  searchAssessment,
} from '@learner/utils/API/AssesmentService';
import {
  formatSubmittedDate,
  parseAnswerLabel,
  removeImagesFromHtml,
  stripHtml,
} from '@learner/utils/helpers/vtAssessmentHelpers';
import { VtAssessmentShell } from '@learner/components/VtAssessment';

const ITEMS_PER_PAGE = 10;
const QUESTION_CHUNK_SIZE = 10;

interface ScoreDetail {
  questionId: string;
  pass: string;
  resValue: string;
  score: number;
  maxScore: number;
  queTitle: string;
}

interface AnswerSheetData {
  lastAttemptedOn?: string;
  totalScore?: number;
  totalMaxScore?: number;
  scoreDetails: ScoreDetail[];
}

/**
 * `/tracking/assessment/search` returns `score_details` directly for some
 * payloads and only the raw `assessmentSummary` sections for others, so accept
 * both rather than assuming one shape.
 */
const toScoreDetails = (record: any): ScoreDetail[] => {
  if (Array.isArray(record?.score_details)) {
    return record.score_details.map((detail: any) => ({
      questionId: String(detail?.questionId ?? ''),
      pass: String(detail?.pass ?? ''),
      resValue: detail?.resValue ?? '',
      score: Number(detail?.score ?? 0),
      maxScore: Number(detail?.maxScore ?? 0),
      queTitle: detail?.queTitle ?? '',
    }));
  }

  if (!Array.isArray(record?.assessmentSummary)) return [];
  return record.assessmentSummary.flatMap((section: any) =>
    (section?.data ?? []).map((item: any) => ({
      questionId: String(item?.item?.id ?? ''),
      pass: String(item?.pass ?? ''),
      resValue: JSON.stringify(item?.resvalues ?? []),
      score: Number(item?.score ?? 0),
      maxScore: Number(item?.item?.maxscore ?? 0),
      queTitle: item?.item?.title ?? '',
    }))
  );
};

const AnswerSheetPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <VtAssessmentShell title={t('LEARNER_APP.VT_ASSESSMENT.TITLE')}>
      {() => (
        <Suspense fallback={<Skeleton variant="rounded" height={320} />}>
          <AnswerSheetBody />
        </Suspense>
      )}
    </VtAssessmentShell>
  );
};

const AnswerSheetBody: React.FC = () => {
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

  const [data, setData] = useState<AnswerSheetData | null>(null);
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadSolutions = useCallback(async () => {
    try {
      const hierarchy = await hierarchyContent(identifier);
      const questionSet =
        hierarchy?.result?.questionSet ?? hierarchy?.result?.questionset;
      const childNodes: string[] = questionSet?.childNodes ?? [];
      const sectionIds: string[] = (questionSet?.children ?? [])
        .map((child: { identifier?: string }) => child?.identifier)
        .filter(Boolean);
      const questionIds = childNodes.filter((id) => !sectionIds.includes(id));

      const collected: Record<string, string> = {};
      for (let i = 0; i < questionIds.length; i += QUESTION_CHUNK_SIZE) {
        const chunk = questionIds.slice(i, i + QUESTION_CHUNK_SIZE);
        const questions = await listQuestions(chunk);
        questions.forEach((question: any) => {
          const solution = question?.editorState?.solutions?.[0]?.value;
          if (question?.identifier && solution) {
            collected[question.identifier] = solution;
          }
        });
      }
      setSolutions(collected);
    } catch (error) {
      console.error('AnswerSheet: failed to load solutions', error);
    }
  }, [identifier]);

  const load = useCallback(async () => {
    const userId =
      typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!identifier || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      const records = await searchAssessment({
        userId,
        courseId: identifier,
        unitId: identifier,
        contentId: identifier,
      });
      const list = Array.isArray(records) ? records : [];
      const latest = list[list.length - 1];

      if (latest) {
        setData({
          lastAttemptedOn: latest?.lastAttemptedOn,
          totalScore: latest?.totalScore,
          totalMaxScore: latest?.totalMaxScore,
          scoreDetails: toScoreDetails(latest),
        });
        loadSolutions();
      }
    } catch (error) {
      console.error('AnswerSheet: failed to load attempt', error);
    } finally {
      setIsLoading(false);
    }
  }, [identifier, loadSolutions]);

  useEffect(() => {
    load();
  }, [load]);

  const scoreDetails = useMemo(() => data?.scoreDetails ?? [], [data]);
  const unansweredCount = useMemo(
    () =>
      scoreDetails.filter(
        (detail) => !detail.resValue || detail.resValue === '[]'
      ).length,
    [scoreDetails]
  );
  const correctCount = useMemo(
    () =>
      scoreDetails.filter((detail) => detail.pass?.toLowerCase() === 'yes')
        .length,
    [scoreDetails]
  );

  const totalPages = Math.max(1, Math.ceil(scoreDetails.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, scoreDetails.length);
  const currentQuestions = scoreDetails.slice(startIndex, endIndex);

  if (isLoading) return <Skeleton variant="rounded" height={320} />;

  if (!data) {
    return (
      <Box>
        <BackButton onClick={() => router.push(testListUrl)} />
        <Typography sx={{ color: '#7C766F' }}>
          {t('LEARNER_APP.VT_ASSESSMENT.NO_DATA_FOUND')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860 }}>
      <BackButton onClick={() => router.push(testListUrl)} />

      <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.SUBMITTED_ON')}{' '}
        {formatSubmittedDate(data.lastAttemptedOn)}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          my: 1.5,
          gap: 2,
        }}
      >
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1E1B16' }}>
          {unansweredCount} {t('LEARNER_APP.VT_ASSESSMENT.UNANSWERED')}
        </Typography>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1E1B16' }}>
          {data.totalScore ?? 0}/{data.totalMaxScore ?? 0}
        </Typography>
      </Box>
      <Divider />
      <Typography sx={{ fontSize: '14px', color: '#7C766F', my: 2 }}>
        {correctCount} {t('LEARNER_APP.VT_ASSESSMENT.OUT_OF')}{' '}
        {scoreDetails.length} {t('LEARNER_APP.VT_ASSESSMENT.CORRECT_ANSWERS')}
      </Typography>

      {currentQuestions.map((detail, index) => {
        const answer = parseAnswerLabel(detail.resValue);
        const solution = solutions[detail.questionId];
        return (
          <Box
            key={detail.questionId || `${startIndex + index}`}
            sx={{
              border: '1px solid #D0C5B4',
              borderRadius: '8px',
              p: 2,
              mb: 1.5,
              bgcolor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '15px', color: '#1E1B16', mb: 0.5 }}>
              Q{startIndex + index + 1}. {stripHtml(detail.queTitle)}
            </Typography>
            <Typography
              sx={{
                fontSize: '15px',
                fontWeight: 500,
                color: detail.pass?.toLowerCase() === 'yes' ? '#1A8825' : '#BA1A1A',
              }}
            >
              {t('LEARNER_APP.VT_ASSESSMENT.ANSWER_PREFIX')}{' '}
              {answer || t('LEARNER_APP.VT_ASSESSMENT.NA')}
            </Typography>
            {solution && (
              <Typography sx={{ fontSize: '14px', color: '#4D4639', mt: 1 }}>
                {t('LEARNER_APP.VT_ASSESSMENT.SOLUTION')}:{' '}
                {stripHtml(removeImagesFromHtml(solution))}
              </Typography>
            )}
          </Box>
        );
      })}

      {scoreDetails.length > ITEMS_PER_PAGE && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mt: 2,
          }}
        >
          <IconButton
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            aria-label="previous page"
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography sx={{ fontSize: '14px', color: '#4D4639' }}>
            {startIndex + 1}-{endIndex} / {scoreDetails.length}
          </Typography>
          <IconButton
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage === totalPages}
            aria-label="next page"
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={onClick}
      sx={{ textTransform: 'none', color: '#1E1B16', mb: 1, ml: -1 }}
    >
      {t('LEARNER_APP.VT_ASSESSMENT.BACK')}
    </Button>
  );
};

export default AnswerSheetPage;
