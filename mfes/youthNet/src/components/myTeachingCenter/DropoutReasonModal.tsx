import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { dropoutReasons } from '../../utils/app.config';
import { modalStyles } from '../../styles/modalStyles';
import {
  updateCohortMemberStatus,
  isMutationSuccess,
} from '../../services/myTeachingCenter/LearnerListService';

interface DropoutReasonModalProps {
  open: boolean;
  onClose: () => void;
  cohortMembershipId: string | number | null;
  onMarked: () => void;
}

// Same Modal UI + dropoutReasons values as
// mfes/scp-teacher-repo/src/components/DropOutModal.tsx (identical
// dropoutReasons array already exists in youthNet's own app.config.ts —
// see l2InterestedQueue/DropOutModal precedent). Ported rather than
// imported: no path alias exists for cross-app imports between two
// standalone Next apps (same reason L2BatchCreate.ts was ported earlier).
// Deliberately drops the attendance-marked-today guard scp-teacher-repo's
// version has — there's no attendance feature in this Trainer flow, so
// that check doesn't apply here.
const DropoutReasonModal: React.FC<DropoutReasonModalProps> = ({
  open,
  onClose,
  cohortMembershipId,
  onMarked,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [selectedReason, setSelectedReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setSelectedReason('');
    onClose();
  };

  const handleSelection = (event: SelectChangeEvent) => {
    setSelectedReason(event.target.value);
  };

  const handleMarkDropout = async () => {
    if (!selectedReason || !cohortMembershipId || saving) return;
    setSaving(true);
    try {
      const result = await updateCohortMemberStatus({
        membershipId: cohortMembershipId,
        memberStatus: 'dropout',
        statusReason: selectedReason,
      });
      if (!isMutationSuccess(result)) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }
      showToastMessage(t('COMMON.LEARNER_MARKED_DROPOUT'), 'success');
      setSelectedReason('');
      onMarked();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} aria-labelledby="dropout-reason-modal-title">
      <Box sx={modalStyles}>
        <Box display="flex" justifyContent="space-between" sx={{ padding: '18px 16px' }}>
          <Typography
            variant="h2"
            sx={{ color: theme.palette.warning['A200'], fontSize: '14px' }}
            component="h2"
          >
            {t('COMMON.DROP_OUT')}
          </Typography>
          <CloseIcon
            sx={{ cursor: 'pointer', color: theme.palette.warning['A200'] }}
            onClick={handleClose}
          />
        </Box>
        <Divider />

        <Box sx={{ padding: '10px 18px' }}>
          <FormControl sx={{ mt: 1, width: '100%' }}>
            <InputLabel sx={{ fontSize: '16px', color: theme.palette.warning['300'] }} id="dropout-reason-label">
              {t('COMMON.REASON_FOR_DROPOUT')}
            </InputLabel>
            <Select
              labelId="dropout-reason-label"
              value={selectedReason}
              input={<OutlinedInput label={t('COMMON.REASON_FOR_DROPOUT')} />}
              onChange={handleSelection}
            >
              {dropoutReasons?.map((reason) => (
                <MenuItem
                  key={reason.value}
                  value={reason.value}
                  sx={{ fontSize: '16px', color: theme.palette.warning['300'] }}
                >
                  {reason.label
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box mt={1.5}>
          <Divider />
        </Box>
        <Box p="18px">
          <Button
            className="w-100"
            sx={{ boxShadow: 'none' }}
            variant="contained"
            onClick={handleMarkDropout}
            disabled={!selectedReason || saving}
          >
            {t('COMMON.MARK_DROP_OUT')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DropoutReasonModal;
