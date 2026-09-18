import React, { useState } from 'react';
import { Box, Button, Divider, Modal, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { modalStyles } from '../../styles/modalStyles';
import {
  updateCohortMemberStatus,
  isMutationSuccess,
} from '../../services/myTeachingCenter/LearnerListService';
import { UNPLACED_STATUS } from '../../services/placements/placements.config';

interface DeletePlacementModalProps {
  open: boolean;
  onClose: () => void;
  membershipId: string | number | null;
  learnerName?: string;
  onDeleted: () => void;
}

// Confirmation dialog, same Modal shell as DropoutReasonModal.tsx. "Delete"
// reverts the learner's cohort-membership status back to course_completed
// and clears their placement customFields — see the plan's "Persisting
// placement data" section for why this isn't a hard record delete.
const DeletePlacementModal: React.FC<DeletePlacementModalProps> = ({
  open,
  onClose,
  membershipId,
  learnerName,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!membershipId || saving) return;
    setSaving(true);
    try {
      const result = await updateCohortMemberStatus({
        membershipId,
        memberStatus: UNPLACED_STATUS,
      });
      if (!isMutationSuccess(result)) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }
      showToastMessage(t('PLACEMENTS.PLACEMENT_DELETED_SUCCESS'), 'success');
      onDeleted();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="delete-placement-modal-title">
      <Box sx={modalStyles}>
        <Box display="flex" justifyContent="space-between" sx={{ padding: '18px 16px' }}>
          <Typography
            variant="h2"
            sx={{ color: theme.palette.warning['A200'], fontSize: '14px' }}
            component="h2"
            id="delete-placement-modal-title"
          >
            {t('PLACEMENTS.DELETE_PLACEMENT')}
          </Typography>
          <CloseIcon sx={{ cursor: 'pointer', color: theme.palette.warning['A200'] }} onClick={onClose} />
        </Box>
        <Divider />

        <Box sx={{ padding: '18px' }}>
          <Typography variant="body2">
            {t('PLACEMENTS.DELETE_PLACEMENT_CONFIRM', { name: learnerName || '' })}
          </Typography>
        </Box>
        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: '18px' }}>
          <Button onClick={onClose} disabled={saving}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {t('PLACEMENTS.DELETE_PLACEMENT')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DeletePlacementModal;
