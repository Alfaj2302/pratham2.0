import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Modal, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import {
  buildRetentionSubmission,
  extractRetentionFormData,
  getInitialRetentionFormData,
  getReadOnlyUiSchema,
  RetentionFormBundle,
} from '../../services/retention/RetentionFormService';
import {
  updateCohortMemberStatus,
  isMutationSuccess,
} from '../../services/myTeachingCenter/LearnerListService';
import { RetentionMilestoneKey } from '../../services/retention/retention.config';

interface RetentionModalProps {
  open: boolean;
  onClose: () => void;
  membershipId: string | number | null;
  learnerName?: string;
  learnerRow: any;
  milestoneKey: RetentionMilestoneKey | null;
  milestoneLabel?: string;
  // A Completed Follow-Up opens the exact same form/modal, prefilled with
  // its previously submitted answers, every field disabled — no separate
  // view-only form, per spec.
  isCompleted: boolean;
  form: RetentionFormBundle | null;
  onSaved: () => void;
}

// Retention Follow-Up form modal — same Modal shell + "DynamicForm keeps
// local formData via SubmitaFunction, a separate footer button does the
// real save" pattern as PlacementModal.tsx. Differs from PlacementModal in
// two ways: (1) it's scoped to a single milestone, not the whole learner
// record — see RetentionFormService's per-milestone JSON-blob storage —
// and (2) a Completed Follow-Up renders every field ui:disabled and hides
// the Save button instead of reusing the same editable form Placements
// does for its own "Update Placement".
const RetentionModal: React.FC<RetentionModalProps> = ({
  open,
  onClose,
  membershipId,
  learnerName,
  learnerRow,
  milestoneKey,
  milestoneLabel,
  isCompleted,
  form,
  onSaved,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // DynamicForm only reads prefilledFormData on first mount — bump this key
  // on every open so it always re-reads the current learner/milestone's
  // data instead of whichever one it first mounted with (same fix
  // PlacementModal.tsx already uses).
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open || !milestoneKey || !form?.schema) return;
    setFormData(
      isCompleted
        ? extractRetentionFormData(form.schema, learnerRow, milestoneKey)
        : { ...getInitialRetentionFormData(form.schema), currentlyEmployed: [""] }
    );
    setFormKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!membershipId || !form?.schema || !milestoneKey || saving) return;
    setSaving(true);
    try {
      const { customFields, allMilestonesCompleted } = buildRetentionSubmission(
        form.schema,
        learnerRow,
        milestoneKey,
        formData
      );
      const result = await updateCohortMemberStatus({
        membershipId,
        dynamicBody: { customFields },
      });
      if (!isMutationSuccess(result)) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }

      if (allMilestonesCompleted && learnerRow?.status !== 'retention_complete') {
        const statusResult = await updateCohortMemberStatus({
          membershipId,
          memberStatus: 'retention_complete',
        });
        if (!isMutationSuccess(statusResult)) {
          showToastMessage(t('RETENTION.STATUS_UPDATE_FAILED'), 'error');
        }
      }

      showToastMessage(t('RETENTION.FOLLOW_UP_SAVED_SUCCESS'), 'success');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const uiSchema = form?.uiSchema
    ? isCompleted
      ? getReadOnlyUiSchema(form.schema, form.uiSchema)
      : form.uiSchema
    : null;

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="retention-modal-title">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '92%', sm: 560 },
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
          borderRadius: '12px',
          outline: 'none',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ p: 2, borderRadius: '12px 12px 0 0', backgroundColor: theme.palette.warning?.A400 }}
        >
          <Box>
            <Typography id="retention-modal-title" variant="h6">
              {isCompleted
                ? t('RETENTION.VIEW_FOLLOW_UP', { milestone: milestoneLabel })
                : t('RETENTION.COMPLETE_FOLLOW_UP', { milestone: milestoneLabel })}
            </Typography>
            {learnerName && (
              <Typography variant="body2" color="text.secondary">
                {learnerName}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseSharpIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 2, overflowY: 'auto' }}>
          {form?.schema && uiSchema ? (
            // Same forced-100%-width override PlacementModal.tsx already
            // carries for isCallSubmitInHandle's hardcoded xs={12} md={4}
            // lg={3} grid item.
            <Box
              sx={{
                '& .MuiGrid-item': {
                  flexBasis: '100% !important',
                  maxWidth: '100% !important',
                },
              }}
            >
              <DynamicForm
                key={formKey}
                schema={form.schema}
                uiSchema={uiSchema}
                SubmitaFunction={(data: any) => setFormData(data)}
                isCallSubmitInHandle={true}
                isReassign={isCompleted}
                prefilledFormData={formData}
                type="retention"
              />
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            {isCompleted ? t('COMMON.CLOSE') : t('COMMON.CANCEL')}
          </Button>
          {!isCompleted && (
            <Button variant="contained" disabled={!form?.schema || saving} onClick={handleSave}>
              {saving ? <CircularProgress size={20} /> : t('COMMON.SAVE')}
            </Button>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default RetentionModal;
