'use client';

import React from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useTranslation } from '@shared-lib';
import {
  formatSubmittedDate,
  toPercentage,
  VtQuestionSet,
} from '@learner/utils/helpers/vtAssessmentHelpers';

interface OfflineTestCardProps {
  questionSet: VtQuestionSet;
  /** Raw value from /tracking/assessment/offline-assessment-status, or undefined while loading. */
  offlineStatus?: string | null;
  isStatusLoading: boolean;
  onClick: () => void;
}

/**
 * One offline (written) test. Status labels come straight from the offline status
 * API, exactly as on mobile: nothing → Not submitted, `AI Pending`/`AI Processed`
 * → Submitted for evaluation, `Approved` → marks.
 */
const OfflineTestCard: React.FC<OfflineTestCardProps> = ({
  questionSet,
  offlineStatus,
  isStatusLoading,
  onClick,
}) => {
  const { t } = useTranslation();

  const renderStatus = () => {
    if (isStatusLoading) {
      return <Skeleton variant="text" width={180} height={20} />;
    }
    if (offlineStatus === 'AI Pending' || offlineStatus === 'AI Processed') {
      return (
        <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
          {t('LEARNER_APP.VT_ASSESSMENT.SUBMITTED_FOR_EVALUATION')}
        </Typography>
      );
    }
    if (offlineStatus === 'Approved') {
      const percentage = toPercentage(
        questionSet?.totalScore,
        questionSet?.totalMaxScore
      );
      return (
        <Typography sx={{ fontSize: '14px', color: '#1F1B13' }}>
          {t('LEARNER_APP.VT_ASSESSMENT.MARKS')} ({questionSet?.totalScore ?? 0}/
          {questionSet?.totalMaxScore ?? 0}){' '}
          <Box component="span" sx={{ color: '#1A881F', fontWeight: 600 }}>
            {percentage}%
          </Box>
        </Typography>
      );
    }
    return (
      <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.NOT_SUBMITTED')}
      </Typography>
    );
  };

  const publishedOn = formatSubmittedDate(questionSet?.lastPublishedOn);

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        border: '1px solid #D0C5B4',
        borderRadius: '8px',
        bgcolor: '#FFFFFF',
        p: 2,
        mb: 1.5,
        cursor: 'pointer',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '16px', fontWeight: 500, color: '#1E1B16' }}
        >
          {questionSet?.name}
        </Typography>
        {renderStatus()}
        {publishedOn && (
          <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
            {t('LEARNER_APP.VT_ASSESSMENT.PUBLISHED_ON')}: {publishedOn}
          </Typography>
        )}
      </Box>
      <NavigateNextIcon sx={{ fontSize: 32, color: '#1E1B16' }} />
    </Box>
  );
};

export default OfflineTestCard;
