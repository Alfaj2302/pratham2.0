import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Modal, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import {
  applySkipAndHide,
  buildRetentionSubmission,
  getReadOnlyUiSchema,
  RetentionFormBundle,
  withCallIntervalLocked,
} from '../../services/retention/RetentionFormService';
import {
  updateCohortMemberStatus,
  isMutationSuccess,
} from '../../services/myTeachingCenter/LearnerListService';
import { RetentionMilestoneKey } from '../../services/retention/retention.config';

interface RetentionModalProps {
  onClose: () => void;
  membershipId: string | number;
  learnerName?: string;
  learnerRow: any;
  milestoneKey: RetentionMilestoneKey;
  milestoneLabel?: string;
  isCompleted: boolean;
  initialFormData: Record<string, any>;
  form: RetentionFormBundle;
  onSaved: () => void;
}

// Same "mounted only while a Follow-Up is actually selected — no `open`
// prop" pattern as PlacementModal.tsx (see its own comment for the full
// reasoning): DynamicForm has no unmount cleanup for its own async prefill
// chain (fetching domain's option list, etc.), so a persistently-mounted
// modal toggling `open` + remounting the inner DynamicForm via a changing
// `key` let a superseded instance's delayed async resolution call back into
// this (still-mounted) component's setState and clobber the correct
// prefilled data — a race that depended on network timing. The caller
// (RetentionLearnerTable) only renders this component at all while a
// Follow-Up box is selected, and computes initialFormData itself (see
// RetentionFormService's extractRetentionFormData /
// getFreshRetentionFormData / buildRetentionSchemaWithKnownValues) — this
// component just renders whatever it's given, exactly like PlacementModal.
const RetentionModal: React.FC<RetentionModalProps> = ({
  onClose,
  membershipId,
  learnerName,
  learnerRow,
  milestoneKey,
  milestoneLabel,
  isCompleted,
  initialFormData,
  form,
  onSaved,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { customFields, allMilestonesCompleted } = buildRetentionSubmission(
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

  const baseUiSchema = isCompleted
    ? getReadOnlyUiSchema(form.schema, form.uiSchema)
    : withCallIntervalLocked(form.uiSchema);
  // Precomputed once, from the same initialFormData formData itself starts
  // as — see applySkipAndHide's own comment for why this can't just rely
  // on DynamicForm's own internal skip/hide effect for this form's shape.
  const uiSchema = applySkipAndHide(form.schema, baseUiSchema, initialFormData);

  return (
    <Modal open onClose={onClose} aria-labelledby="retention-modal-title">
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
          {/* Same forced-100%-width override PlacementModal.tsx already
              carries for isCallSubmitInHandle's hardcoded xs={12} md={4}
              lg={3} grid item. */}
          <Box
            sx={{
              '& .MuiGrid-item': {
                flexBasis: '100% !important',
                maxWidth: '100% !important',
              },
            }}
          >
            <DynamicForm
              schema={form.schema}
              uiSchema={uiSchema}
              SubmitaFunction={(data: any) => setFormData(data)}
              isCallSubmitInHandle={true}
              // The Retention Form has an API-driven field (domain) —
              // isReassign makes DynamicForm do an explicit full re-apply
              // of prefilledFormData once rendering is complete (same fix
              // already used for Placement's own Update flow and the SDBV
              // filter bar's State→District cascade).
              isReassign={isCompleted}
              prefilledFormData={initialFormData}
              type="retention"
            />
          </Box>
        </Box>

        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            {isCompleted ? t('COMMON.CLOSE') : t('COMMON.CANCEL')}
          </Button>
          {!isCompleted && (
            <Button variant="contained" disabled={saving} onClick={handleSave}>
              {saving ? <CircularProgress size={20} /> : t('COMMON.SAVE')}
            </Button>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default RetentionModal;
