import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';
import SimpleModal from '@shared-lib-v2/lib/SimpleModal/SimpleModal';
import DynamicFormV2 from '@shared-lib-v2/DynamicForm/components/DynamicFormV2';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import {
  getReadOnlyUiSchema,
  RetentionFormBundle,
  withCallIntervalLocked,
  withCallingDateMinimum,
} from '../../services/retention/RetentionFormService';
import { RETENTION_MILESTONES, RetentionMilestoneKey } from '../../services/retention/retention.config';
import { savePlacementRetentionData } from '../../services/placementRetention/PlacementRetentionRepository';
import {
  getActivePlacement,
  getCurrentActor,
  isPlacementRetentionComplete,
  upsertRetentionMilestone,
} from '../../services/placementRetention/PlacementRetentionDataService';

interface RetentionModalProps {
  onClose: () => void;
  batchCohortId: string;
  learnerName?: string;
  learnerRow: any;
  // The placement this follow-up belongs to, and a short label for it
  // (company · date) so the Coordinator can see which one they're filling.
  placementId: string;
  placementLabel?: string;
  placementSchema: any;
  milestoneKey: RetentionMilestoneKey;
  milestoneLabel?: string;
  isCompleted: boolean;
  // 'YYYY-MM-DD' this Follow-Up became Due — earliest selectable Calling Date.
  callingDateMin?: string;
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
// getFreshRetentionFormData / withKnownApiOptionValues) — this
// component just renders whatever it's given, exactly like PlacementModal.
const RetentionModal: React.FC<RetentionModalProps> = ({
  onClose,
  batchCohortId,
  learnerName,
  learnerRow,
  placementId,
  placementLabel,
  placementSchema,
  milestoneKey,
  milestoneLabel,
  isCompleted,
  callingDateMin,
  initialFormData,
  form,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Called by DynamicForm only after RJSF validation passes (required fields
  // filled, patterns valid) — the Save button submits the form via `form=`.
  const handleSave = async (formData: Record<string, any>) => {
    if (saving) return;
    setSaving(true);
    try {
      const month = RETENTION_MILESTONES.find((m) => m.key === milestoneKey)?.months;
      if (!month) return;
      // Writes just this one milestone into this one placement (adding it,
      // or updating it if this month already exists) — everything else in
      // the learner's Placement + Retention JSON is carried over as-is.
      const { ok } = await savePlacementRetentionData({
        batchCohortId,
        learnerRow,
        placementSchema,
        mutate: (current) => ({
          data: upsertRetentionMilestone(current, placementId, month, formData, getCurrentActor()),
        }),
        // The learner's status tracks their *current* placement only.
        memberStatus: (next) => {
          const active = getActivePlacement(next);
          return active?.placementId === placementId && isPlacementRetentionComplete(active)
            ? 'retention_complete'
            : undefined;
        },
      });
      if (!ok) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }

      showToastMessage(t('RETENTION.FOLLOW_UP_SAVED_SUCCESS'), 'success');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // skipAndHide / skipAndShow visibility (e.g. currentlyEmployed →
  // monthlySalary / reasonForLeavingJob, reasonForLeavingJob "other" →
  // reasonForLeavingJobOther) is derived by DynamicFormV2 from the current
  // formData, for both the editable and the read-only view.
  const uiSchema = isCompleted
    ? getReadOnlyUiSchema(form.schema, form.uiSchema)
    : withCallingDateMinimum(withCallIntervalLocked(form.uiSchema), callingDateMin);

  return (
    <SimpleModal
      open
      onClose={onClose}
      showFooter={true}
      modalTitle={
        isCompleted
          ? t('RETENTION.VIEW_FOLLOW_UP', { milestone: milestoneLabel })
          : t('RETENTION.COMPLETE_FOLLOW_UP', { milestone: milestoneLabel })
      }
      secondaryText={isCompleted ? t('COMMON.CLOSE') : t('COMMON.CANCEL')}
      secondaryActionHandler={onClose}
      // A Completed Follow-Up is read-only — no Save button.
      primaryText={isCompleted ? undefined : t('COMMON.SAVE')}
      primaryDisabled={saving}
      // SimpleModal's primary button is type="submit" form={id} — same
      // wiring as PlacementModal.tsx.
      id="dynamic-form-id"
    >
      {learnerName && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: placementLabel ? 0.5 : 2 }}>
          {learnerName}
        </Typography>
      )}
      {placementLabel && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
          {t('RETENTION.FOR_PLACEMENT', { placement: placementLabel })}
        </Typography>
      )}
      {/* Stack the Retention Form one field per row. */}
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
          uiSchema={uiSchema}
          // Full-form mode (not isCallSubmitInHandle) so the schema's
          // `required` array is honoured — see PlacementModal.tsx.
          hideSubmit={true}
          FormSubmitFunction={(cleanedData: any) => handleSave(cleanedData)}
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
    </SimpleModal>
  );
};

export default RetentionModal;
