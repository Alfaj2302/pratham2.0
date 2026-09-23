import React, { useState } from 'react';
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
  onClose: () => void;
  membershipId: string | number;
  learnerName?: string;
  isUpdate: boolean;
  initialFormData: Record<string, any>;
  form: PlacementFormBundle;
  onSaved: () => void;
}

// Placement Form is fetched from the backend (form/read?context=PLACEMENT&
// contextType=PLACEMENT — see PlacementFormService) and rendered with
// DynamicForm, same Modal shell as AllocateToBatchModal.tsx.
//
// The caller (PlacementLearnerTable) only renders this component AT ALL
// while a row is selected for Place/Update — there is no `open` prop here,
// this component IS the open state. That matters: DynamicForm has no
// unmount cleanup for its own async prefill chain (fetching Domain/State/
// Placement Property options, resolving dependent District options, etc.),
// so an earlier attempt that kept one persistent <PlacementModal> mounted
// and only toggled an `open` prop + remounted the inner <DynamicForm> via a
// changing `key` still let a superseded DynamicForm instance's straggling
// async resolution call back into this (still-mounted) component's setState
// and clobber the correct data — a race whose outcome depended on network
// timing (reliably fine on a warm connection right after placing someone,
// unreliable after a full reload's cold connection). Fully unmounting this
// whole component between opens (see PlacementLearnerTable) means a stale
// instance's delayed callback lands on a component that's genuinely gone —
// React no-ops it — instead of a component that merely looks new via `key`.
const PlacementModal: React.FC<PlacementModalProps> = ({
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
  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
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
    <Modal open onClose={onClose} aria-labelledby="placement-modal-title">
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
          {/* DynamicForm hardcodes a Grid item xs={12} md={4} lg={3} per
              field whenever isCallSubmitInHandle is true, ignoring any
              uiSchema grid option — same quirk l2-interested-queue.tsx's
              side panel already works around this exact way. Forcing every
              field to 100% width here stacks the Placement Form one field
              below another instead of several per row. */}
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
              uiSchema={form.uiSchema}
              SubmitaFunction={(data: any) => setFormData(data)}
              isCallSubmitInHandle={true}
              // The Placement Form has dependent-API fields (district
              // depends on state) — isReassign makes DynamicForm do an
              // explicit full re-apply of prefilledFormData once rendering
              // is complete (same fix already used for the SDBV filter
              // bar's own State→District cascade).
              isReassign={isUpdate}
              prefilledFormData={initialFormData}
              type="placement"
            />
          </Box>
        </Box>

        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="contained" disabled={saving} onClick={handleSave}>
            {saving ? <CircularProgress size={20} /> : t('COMMON.SAVE')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default PlacementModal;
