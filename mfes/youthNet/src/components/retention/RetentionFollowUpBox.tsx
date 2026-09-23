import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';
import { RetentionFollowUpState } from '../../services/retention/retention.config';

interface RetentionFollowUpBoxProps {
  targetDate: Date | null;
  state: RetentionFollowUpState;
  // The date this follow-up was actually submitted — only meaningful (and
  // only passed in) once state === 'completed'. Shown instead of the target
  // date so a Completed box still surfaces real completion information, per
  // spec section 9, rather than just the "Completed" label on its own.
  completedDate?: Date | null;
  onClick?: () => void;
}

const STATE_COLORS: Record<RetentionFollowUpState, { border: string; bg: string; text: string }> = {
  upcoming: { border: '#e0e0e0', bg: '#fafafa', text: 'text.secondary' },
  due: { border: '#ed6c02', bg: '#fff4e5', text: 'warning.dark' },
  completed: { border: '#2e7d32', bg: '#edf7ed', text: 'success.dark' },
};

// One Retention Follow-Up cell: Upcoming (not actionable), Due (clickable —
// opens the Retention Form), or Completed (clickable — opens the same form
// read-only). Deliberately plain MUI, matching the rest of the Youthnet
// design system rather than the Retention reference screenshot's own
// styling (per spec: that screenshot is functional reference only).
const RetentionFollowUpBox: React.FC<RetentionFollowUpBoxProps> = ({
  targetDate,
  state,
  completedDate,
  onClick,
}) => {
  const { t } = useTranslation();
  const colors = STATE_COLORS[state];
  const clickable = state !== 'upcoming' && !!onClick;

  return (
    <Box
      onClick={clickable ? onClick : undefined}
      sx={{
        border: '1px solid',
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderRadius: 1.5,
        px: 1.5,
        py: 0.75,
        minWidth: 120,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <Typography variant="caption" fontWeight={600} color={colors.text}>
        {t(`RETENTION.STATE_${state.toUpperCase()}`)}
      </Typography>
      {state !== 'completed' && targetDate && (
        <Typography variant="caption" display="block" color="text.secondary">
          {t('RETENTION.TARGET_DATE', { date: format(targetDate, 'dd-MM-yyyy') })}
        </Typography>
      )}
      {state === 'completed' && completedDate && (
        <Typography variant="caption" display="block" color="text.secondary">
          {t('RETENTION.COMPLETED_DATE', { date: format(completedDate, 'dd-MM-yyyy') })}
        </Typography>
      )}
    </Box>
  );
};

export default RetentionFollowUpBox;
