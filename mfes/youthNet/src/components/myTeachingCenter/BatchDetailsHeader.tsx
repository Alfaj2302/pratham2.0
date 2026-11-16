import React, { useState } from 'react';
import { Box, IconButton, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { useTranslation } from 'next-i18next';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';

interface BatchDetailsHeaderProps {
  batch: MyTeachingCenterBatch;
  // When given, shows the 3-dot menu next to the batch name with an Edit
  // Batch option (same pattern as scp-teacher-repo's centers/[cohortId]).
  onEditBatch?: () => void;
}

// Batch dates come back as "YYYY-MM-DD" strings; show them as DD-MM-YYYY.
// Reordered as text (not via Date) so the day can't shift with timezone.
const formatBatchDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

// Summary card at the top of the Batch Details page — batch name, center ·
// domain · course, date range, and learner count, with a helper line above
// the Learner List below it.
const BatchDetailsHeader: React.FC<BatchDetailsHeaderProps> = ({ batch, onEditBatch }) => {
  const { t } = useTranslation();
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const dateRange =
    batch.startDate && batch.endDate ? `${formatBatchDate(batch.startDate)} → ${formatBatchDate(batch.endDate)}` : null;

  return (
    <Box
      sx={{
        background: '#fff',
        border: '1px solid #EBE1D4',
        borderRadius: '16px',
        p: 3,
        mb: 3,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="h5" fontWeight={700} textTransform="capitalize">
          {batch.name}
        </Typography>
        {onEditBatch && (
          <>
            <IconButton
              aria-label="more"
              aria-controls="batch-details-menu"
              aria-haspopup="true"
              onClick={(event) => setMenuAnchorEl(event.currentTarget)}
            >
              <MoreVertIcon sx={{ cursor: 'pointer' }} />
            </IconButton>
            <Menu
              id="batch-details-menu"
              anchorEl={menuAnchorEl}
              keepMounted
              open={Boolean(menuAnchorEl)}
              onClose={() => setMenuAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchorEl(null);
                  onEditBatch();
                }}
              >
                <ListItemIcon>
                  <ModeEditOutlineOutlinedIcon fontSize="small" />
                </ListItemIcon>
                {t('MY_TEACHING_CENTER.EDIT_BATCH')}
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} textTransform="capitalize">
        {[batch.centerName, batch.domain, batch.skill].filter(Boolean).join(' · ')}
      </Typography>

      <Box display="flex" flexWrap="wrap" alignItems="center" gap={3} sx={{ mt: 1.5 }}>
        {dateRange && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <CalendarTodayOutlinedIcon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ mb: 0 }}>{dateRange}</Typography>
          </Box>
        )}
        <Box display="flex" alignItems="center" gap={0.5}>
          <GroupsOutlinedIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ mb: 0 }}>
            {t('MY_TEACHING_CENTER.LEARNER_COUNT', { count: batch.learnerCount || 0 })}
          </Typography>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        {t('MY_TEACHING_CENTER.LEARNER_LIST_HELPER')}
      </Typography>
    </Box>
  );
};

export default BatchDetailsHeader;
