'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from '@shared-lib';
import { PASS_PERCENTAGE_THRESHOLD } from '@learner/utils/helpers/vtAssessmentHelpers';

export const VtStatusIcon: React.FC<{ status?: string }> = ({ status }) => {
  if (status === 'Completed') {
    return <CheckCircleIcon sx={{ fontSize: 24, color: '#1A8825' }} />;
  }
  if (status === 'In_Progress') {
    return <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: '#4D4639' }} />;
  }
  return <RemoveIcon sx={{ fontSize: 24, color: '#4D4639' }} />;
};

interface AssessmentStatusLineProps {
  status?: string;
  percentage?: number | string;
  /** When given, an In_Progress status reads "In Progress (X out of Y completed)". */
  completedCount?: number;
  totalCount?: number;
}

/**
 * Status + score line shared by the category card and the test-list header.
 * Mobile colours the percentage green above 35 and red otherwise.
 */
const AssessmentStatusLine: React.FC<AssessmentStatusLineProps> = ({
  status,
  percentage,
  completedCount,
  totalCount,
}) => {
  const { t } = useTranslation();

  if (status === 'Completed') {
    const numericPercentage = Number(percentage) || 0;
    return (
      <Typography sx={{ fontSize: '14px', color: '#4D4639' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.OVERALL_SCORE')}{' '}
        <Box
          component="span"
          sx={{
            fontWeight: 700,
            color:
              numericPercentage > PASS_PERCENTAGE_THRESHOLD ? '#1A8825' : '#BA1A1A',
          }}
        >
          {numericPercentage}%
        </Box>
      </Typography>
    );
  }

  if (status === 'In_Progress') {
    return (
      <Typography sx={{ fontSize: '14px', color: '#4D4639' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.IN_PROGRESS')}
        {typeof completedCount === 'number' && typeof totalCount === 'number' && (
          <>
            {' ('}
            {completedCount} {t('LEARNER_APP.VT_ASSESSMENT.OUT_OF')} {totalCount}{' '}
            {t('LEARNER_APP.VT_ASSESSMENT.COMPLETED_LOWERCASE')}
            {')'}
          </>
        )}
      </Typography>
    );
  }

  return (
    <Typography sx={{ fontSize: '14px', color: '#4D4639' }}>
      {t('LEARNER_APP.VT_ASSESSMENT.NOT_STARTED')}
    </Typography>
  );
};

export default AssessmentStatusLine;
