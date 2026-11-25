import React, { useState } from 'react';
import { Box, Button, Divider, Modal, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { modalStyles } from '../../styles/modalStyles';
import { UNPLACED_STATUS } from '../../services/placements/placements.config';
import { savePlacementRetentionData } from '../../services/placementRetention/PlacementRetentionRepository';
import {
  getCurrentActor,
  removePlacement,
} from '../../services/placementRetention/PlacementRetentionDataService';

interface DeletePlacementModalProps {
  onClose: () => void;
  batchCohortId: string;
  learnerRow: any;
  learnerName?: string;
  // The learner's current (active) placement — the only one this deletes.
  placementId: string;
  // Organization of the previous placement that becomes active again after
  // this delete, if the learner has one — shown in the confirmation text.
  restoredPlacementName?: string | null;
  placementSchema: any;
  onDeleted: () => void;
}

// Confirmation dialog, same Modal shell as DropoutReasonModal.tsx. "Delete"
// removes only the learner's current placement (and its own Retention
// milestones) from the Placement + Retention JSON — every earlier placement
// stays in the history, and the latest of them becomes active again (see
// removePlacement). The learner's cohort-membership status goes back to
// course_completed only when no placement is left; otherwise it stays
// placed. Both changes go in the same request.
//
// No `open` prop — the caller (PlacementLearnerTable) only renders this
// component at all while a row is selected for delete, same "mount on
// demand" pattern PlacementModal uses.
const DeletePlacementModal: React.FC<DeletePlacementModalProps> = ({
  onClose,
  batchCohortId,
  learnerRow,
  learnerName,
  placementId,
  restoredPlacementName,
  placementSchema,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { ok } = await savePlacementRetentionData({
        batchCohortId,
        learnerRow,
        placementSchema,
        mutate: (current) => ({ data: removePlacement(current, placementId, getCurrentActor()) }),
        // Decided from the freshly saved data, not the row's snapshot.
        memberStatus: (next) => (next.placements.length > 0 ? 'placed' : UNPLACED_STATUS),
      });
      if (!ok) {
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
    <Modal open onClose={onClose} aria-labelledby="delete-placement-modal-title">
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
            {restoredPlacementName !== undefined
              ? t('PLACEMENTS.DELETE_PLACEMENT_CONFIRM_RESTORE', {
                  name: learnerName || '',
                  organization: restoredPlacementName || '-',
                })
              : t('PLACEMENTS.DELETE_PLACEMENT_CONFIRM', { name: learnerName || '' })}
          </Typography>
        </Box>
        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: '18px' }}>
          <Button onClick={onClose} disabled={saving}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="contained" color="primary" onClick={handleDelete} disabled={saving}>
            {t('PLACEMENTS.DELETE_PLACEMENT')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DeletePlacementModal;
