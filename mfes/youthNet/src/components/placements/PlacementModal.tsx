import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Modal, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import {
  buildPlacementCustomFields,
  PlacementFormBundle,
} from '../../services/placements/PlacementFormService';
import {
  updateCohortMemberStatus,
  isMutationSuccess,
} from '../../services/myTeachingCenter/LearnerListService';

interface PlacementModalProps {
  open: boolean;
  onClose: () => void;
  membershipId: string | number | null;
  learnerName?: string;
  isUpdate: boolean;
  initialFormData: Record<string, any>;
  form: PlacementFormBundle | null;
  onSaved: () => void;
}

// Placement Form is fetched from the backend (form/read?context=PLACEMENT&
// contextType=PLACEMENT — see PlacementFormService) and rendered with
// DynamicForm, same Modal shell as AllocateToBatchModal.tsx. Same
// "DynamicForm keeps local formData via SubmitaFunction, a separate footer
// button does the real save" pattern already used for L2QueueAssignSchema in
// l2-interested-queue.tsx's side panel.
const PlacementModal: React.FC<PlacementModalProps> = ({
  open,
  onClose,
  membershipId,
  learnerName,
  isUpdate,
  initialFormData,
  form,
  onSaved,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [formData, setFormData] = useState<Record<string, any>>(initialFormData || {});
  const [saving, setSaving] = useState(false);

  // DynamicForm only reads its `prefilledFormData` prop into internal state
  // on first mount (see l2-interested-queue.tsx's own comment on this same
  // quirk) — this Modal's <DynamicForm> stays mounted across every open, so
  // without a remount it would keep showing whichever learner's data it
  // first mounted with. Bumping this key on every open forces a fresh
  // mount, so it always re-reads the current initialFormData.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFormData(initialFormData || {});
    setFormKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!membershipId || !form?.schema || saving) return;
    setSaving(true);
    try {
      const customFields = buildPlacementCustomFields(form.schema, formData);
      const result = await updateCohortMemberStatus({
        membershipId,
        memberStatus: 'placed',
        dynamicBody: { customFields },
      });
      if (!isMutationSuccess(result)) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }
      showToastMessage(
        isUpdate
          ? t('PLACEMENTS.PLACEMENT_UPDATED_SUCCESS')
          : t('PLACEMENTS.PLACEMENT_SAVED_SUCCESS'),
        'success'
      );
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="placement-modal-title">
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
            <Typography id="placement-modal-title" variant="h6">
              {isUpdate ? t('PLACEMENTS.UPDATE_PLACEMENT') : t('PLACEMENTS.PLACE_STUDENT')}
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
          {form?.schema && form?.uiSchema ? (
            // DynamicForm hardcodes a Grid item xs={12} md={4} lg={3} per
            // field whenever isCallSubmitInHandle is true, ignoring any
            // uiSchema grid option — same quirk l2-interested-queue.tsx's
            // side panel already works around this exact way. Forcing every
            // field to 100% width here stacks the Placement Form one field
            // below another instead of several per row.
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
                uiSchema={form.uiSchema}
                SubmitaFunction={(data: any) => setFormData(data)}
                isCallSubmitInHandle={true}
                // The Placement Form has dependent-API fields (district
                // depends on state) — DynamicForm's own dependent-key
                // handling only partially reassembles prefilledFormData
                // during that async dance. isReassign makes it do one more,
                // explicit full re-apply of prefilledFormData once
                // rendering is complete (same fix already used for the SDBV
                // filter bar's own State→District cascade).
                isReassign={isUpdate}
                prefilledFormData={formData}
                type="placement"
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
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="contained" disabled={!form?.schema || saving} onClick={handleSave}>
            {saving ? <CircularProgress size={20} /> : t('COMMON.SAVE')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default PlacementModal;
