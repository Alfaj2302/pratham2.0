'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useTranslation } from '@shared-lib';
import {
  formatSubmittedDate,
  VtQuestionSet,
} from '@learner/utils/helpers/vtAssessmentHelpers';

interface OnlineTestCardProps {
  questionSet: VtQuestionSet;
  onStart: () => void;
  onOpenAnswerSheet: () => void;
}

/**
 * One online test. Never attempted → "Take the test"; attempted → score, submitted
 * date and a chevron that opens the read-only answer sheet (mobile `SubjectBox`
 * with `isAiAssessment === false`).
 */
const OnlineTestCard: React.FC<OnlineTestCardProps> = ({
  questionSet,
  onStart,
  onOpenAnswerSheet,
}) => {
  const { t } = useTranslation();
  const isAttempted = Boolean(questionSet?.lastAttemptedOn);

  return (
    <Box
      onClick={isAttempted ? onOpenAnswerSheet : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        border: '1px solid #D0C5B4',
        borderRadius: '8px',
        bgcolor: '#FFFFFF',
        p: 2,
        mb: 1.5,
        cursor: isAttempted ? 'pointer' : 'default',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '16px', fontWeight: 500, color: '#1E1B16' }}
        >
          {questionSet?.name}
        </Typography>
        {isAttempted && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mt: 0.5,
            }}
          >
            <Typography sx={{ fontSize: '14px', color: '#1E1B16' }}>
              {questionSet?.totalScore ?? 0}/{questionSet?.totalMaxScore ?? 0}
            </Typography>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: '#7C766F' }} />
            <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
              {formatSubmittedDate(
                questionSet?.createdOn ?? questionSet?.lastAttemptedOn
              )}
            </Typography>
          </Box>
        )}
      </Box>

      {isAttempted ? (
        <NavigateNextIcon sx={{ fontSize: 32, color: '#1E1B16' }} />
      ) : (
        <Button
          variant="outlined"
          onClick={(event) => {
            event.stopPropagation();
            onStart();
          }}
          sx={{
            borderColor: '#D0C5B4',
            color: '#1E1B16',
            textTransform: 'none',
            whiteSpace: 'nowrap',
            borderRadius: '8px',
          }}
        >
          {t('LEARNER_APP.VT_ASSESSMENT.TAKE_THE_TEST')}
        </Button>
      )}
    </Box>
  );
};

export default OnlineTestCard;
