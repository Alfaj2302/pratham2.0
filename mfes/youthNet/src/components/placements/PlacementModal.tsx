import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';
import SimpleModal from '@shared-lib-v2/lib/SimpleModal/SimpleModal';
import DynamicFormV2 from '@shared-lib-v2/DynamicForm/components/DynamicFormV2';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { PlacementFormBundle } from '../../services/placements/PlacementFormService';
import { savePlacementRetentionData } from '../../services/placementRetention/PlacementRetentionRepository';
import {
  createPlacement,
  getCurrentActor,
  updatePlacement,
} from '../../services/placementRetention/PlacementRetentionDataService';

// 'create' = Place Student, 'placeAgain' = a new placement for a learner who
// already has one (the current one is resigned), 'update' = edit one
// existing placement, identified by placementId.
export type PlacementModalMode = 'create' | 'placeAgain' | 'update';

interface PlacementModalProps {
  onClose: () => void;
  batchCohortId: string;
  learnerRow: any;
  learnerName?: string;
  mode: PlacementModalMode;
  placementId?: string;
  initialFormData: Record<string, any>;
  form: PlacementFormBundle;
  // Unmodified Placement Form schema — used to migrate a learner still on
  // the old per-field storage before applying this save.
  placementSchema: any;
  onSaved: () => void;
}

const MODE_TITLE_KEYS: Record<PlacementModalMode, string> = {
  create: 'PLACEMENTS.PLACE_STUDENT',
  placeAgain: 'PLACEMENTS.PLACE_AGAIN',
  update: 'PLACEMENTS.UPDATE_PLACEMENT',
};

// Placement Form is fetched from the backend (form/read?context=PLACEMENT&
// contextType=PLACEMENT — see PlacementFormService) and rendered with
// DynamicForm inside SimpleModal (same pattern as admin-app AddEditPlacementPropertyModal).
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
//
// The same Placement Form serves all three modes; every save goes through
// savePlacementRetentionData, which re-reads the learner's latest
// Placement + Retention JSON, applies just this change, and writes the
// complete JSON back.
const PlacementModal: React.FC<PlacementModalProps> = ({
  onClose,
  batchCohortId,
  learnerRow,
  learnerName,
  mode,
  placementId,
  initialFormData,
  form,
  placementSchema,
  onSaved,
}) => {
  const isUpdate = mode === 'update';
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Called by DynamicForm only after RJSF validation passes (required fields
  // filled, patterns valid) — the Save button submits the form via `form=`.
  const handleSave = async (formData: Record<string, any>) => {
    if (saving) return;
    setSaving(true);
    try {
      const actor = getCurrentActor();
      const { ok } = await savePlacementRetentionData({
        batchCohortId,
        learnerRow,
        placementSchema,
        mutate: (current) => {
          if (!isUpdate) return createPlacement(current, formData, actor);
          if (!placementId) throw new Error('Update Placement without a placementId');
          return { data: updatePlacement(current, placementId, formData, actor) };
        },
        // A new placement (re)starts the learner's Retention cycle; updating
        // an existing one leaves their status alone.
        memberStatus: isUpdate ? undefined : () => 'placed',
      });
      if (!ok) {
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
    <SimpleModal
      open
      onClose={onClose}
      showFooter={true}
      modalTitle={t(MODE_TITLE_KEYS[mode])}
      secondaryText={t('COMMON.CANCEL')}
      secondaryActionHandler={onClose}
      primaryText={t('COMMON.SAVE')}
      primaryDisabled={saving}
      // SimpleModal's primary button is type="submit" form={id}, so Save
      // submits DynamicForm (default id "dynamic-form-id") and RJSF
      // validation runs before FormSubmitFunction is called.
      id="dynamic-form-id"
    >
      {learnerName && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {learnerName}
        </Typography>
      )}
      {/* Stack the Placement Form one field per row. */}
      <Box
        sx={{
          '& .MuiGrid-item': {
            flexBasis: '100% !important',
            maxWidth: '100% !important',
          },
        }}
      >
        <DynamicFormV2
          schema={form.schema}
          uiSchema={form.uiSchema}
          // Full-form mode (not isCallSubmitInHandle): the per-field
          // mode renders each field as its own <Form> without the
          // schema's `required` array, so required fields got no
          // asterisk and no validation.
          hideSubmit={true}
          FormSubmitFunction={(cleanedData: any) => handleSave(cleanedData)}
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
    </SimpleModal>
  );
};

export default PlacementModal;
