'use client';

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from '@shared-lib';

interface TestCompletedModalProps {
  open: boolean;
  score?: number;
  maxScore?: number;
  /**
   * The learner finished the test but no attempt came back from tracking, i.e.
   * the player's POST /tracking/assessment/create did not land. Say so instead
   * of showing a success message with no marks — the result must not be lost
   * silently.
   */
  isResultMissing?: boolean;
  onClose: () => void;
}

/**
 * Shown when the learner returns from the player with `?completed={id}`.
 * Marks are hidden when the question set carries no max score.
 */
const TestCompletedModal: React.FC<TestCompletedModalProps> = ({
  open,
  score,
  maxScore,
  isResultMissing = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const showMarks = Boolean(maxScore);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
        {isResultMissing ? (
          <>
            <ErrorOutlineIcon sx={{ fontSize: 48, color: '#BA1A1A', mb: 1 }} />
            <Typography
              sx={{ fontSize: '16px', color: '#4D4639' }}
            >
              {t('LEARNER_APP.VT_ASSESSMENT.RESULT_NOT_SAVED')}
            </Typography>
          </>
        ) : (
          <>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#1A8825', mb: 1 }} />
            <Typography
              sx={{ fontSize: '20px', fontWeight: 600, color: '#1E1B16' }}
            >
              {t('LEARNER_APP.VT_ASSESSMENT.TEST_COMPLETED')}
            </Typography>
            {showMarks && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: '16px', color: '#4D4639' }}>
                  {t('LEARNER_APP.VT_ASSESSMENT.YOUR_MARKS')} {score ?? 0}/
                  {maxScore}
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: '#FDBE16',
            color: '#4D4639',
            textTransform: 'none',
            px: 4,
            borderRadius: '8px',
            '&:hover': { bgcolor: '#E6A800' },
          }}
        >
          {t('LEARNER_APP.VT_ASSESSMENT.OK')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestCompletedModal;
