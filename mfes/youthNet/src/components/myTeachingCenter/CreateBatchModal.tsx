import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { customizeValidator } from '@rjsf/validator-ajv8';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import SimpleModal from '../SimpleModal';
import { L2BatchCreate } from '../../constant/Forms/L2BatchCreate';
import {
  createBatch,
  isCreateBatchSuccess,
  updateBatch,
} from '../../services/myTeachingCenter/CreateBatchService';
import {
  getAssessmentsByIds,
  searchAssessmentsForSkill,
} from '../../services/myTeachingCenter/BatchAssessmentService';
import { MyTeachingCenterBatch, TrainerAssignedTaxonomy } from '../../utils/Interfaces';

// Cast to `any` deliberately: the RJSF schema/uiSchema objects get
// field-specific overrides spliced in below (enum/enumNames/ui:disabled/
// formatMinimum), which a strict literal type from L2BatchCreate would
// reject via excess-property checks — same loose typing this dynamic-form
// machinery uses everywhere else in the codebase (e.g. BatchFlow.tsx).
const cloneDeep = (obj: any): any => JSON.parse(JSON.stringify(obj));

interface CreateBatchModalProps {
  open: boolean;
  onClose: () => void;
  // Reused from an existing matching batch's own parentId (see
  // my-teaching-center/index.tsx) — there's no dedicated Center lookup any
  // more, so this is only available once at least one batch already
  // exists for the Trainer's Domain/Skills.
  centerId: string;
  // TYPE_OF_CENTER off the Center's own Cohort Details (cohort/search by
  // the Center's cohortId) — controls which Type of Batch options are
  // offered, mirroring apps/admin-app-repo/BatchFlow.tsx's own centerType
  // handling exactly: 'regular' -> only Regular (locked); 'remote' ->
  // Remote + Hybrid (not locked). Not hardcoded per Trainer/page.
  centerType: string | null;
  trainerTaxonomy: TrainerAssignedTaxonomy;
  // Called after a successful create, or a successful update in Edit mode.
  onCreated: () => void;
  // Edit mode: the batch being edited. Same form as Create, prefilled with
  // the batch's values, with Domain and Skills removed (not shown, not
  // sent - the batch keeps its existing Domain/Skills).
  editBatch?: MyTeachingCenterBatch | null;
}

const EDIT_HIDDEN_FIELDS = ['domain', 'skills'];

// Same validator setup DynamicForm uses ($data for enddate's reference to
// startdate), so the submit check matches the errors shown inline.
const batchFormValidator = customizeValidator({ ajvOptionsOverrides: { $data: true } });

// The batch's own current values, in the form's field keys.
const getEditPrefill = (batch: MyTeachingCenterBatch | null): Record<string, any> => {
  if (!batch) return {};
  const prefill: Record<string, any> = { name: batch.name };
  if (batch.batchType) prefill.batch_type = batch.batchType;
  if (batch.startDate) prefill.startdate = batch.startDate;
  if (batch.endDate) prefill.enddate = batch.endDate;
  if (batch.assessmentIds.length) prefill.assessments = batch.assessmentIds;
  return prefill;
};

// Local date (not UTC) so "today" matches the Trainer's own calendar day.
const getToday = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
};

const toDateKey = (value?: string) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;

// Same modal chrome as /scp-teacher-repo/centers?tab=1's "Add Batch" (the
// SimpleModal component — identical here, shared component shape) and the
// same Batch-create form (L2BatchCreate, ported into constant/Forms/) that
// apps/admin-app-repo's BatchFlow.tsx already uses for Vocational Training
// batches. Domain and Skills are both prepopulated straight from the
// Trainer's own profile (trainerTaxonomy — confirmed real DOMAIN/SKILLS
// customFields on GET /user/read?fieldvalue=true) and locked/disabled
// whenever there's exactly one value, mirroring BatchFlow.tsx's own
// buildSchemaAndUi() behavior for a single-option field.
const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  open,
  onClose,
  centerId,
  centerType,
  trainerTaxonomy,
  onCreated,
  editBatch = null,
}) => {
  const { t } = useTranslation();
  const isEdit = !!editBatch;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<any>(null);

  // Assessment options follow the batch's Domain + Skill: the selected
  // ones in Create, the batch's own (hidden, unchangeable) ones in Edit.
  const assessmentDomain = isEdit ? editBatch?.domain : formData?.domain?.[0];
  const assessmentSkill = isEdit ? editBatch?.skill : formData?.skills?.[0];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadAssessmentOptions = async () => {
      const options = await searchAssessmentsForSkill(
        assessmentDomain ?? '',
        assessmentSkill ?? ''
      );
      // Keep a batch's already-saved Assessments selectable (and shown as
      // selected) even if they no longer match the search.
      const savedIds = editBatch?.assessmentIds ?? [];
      const missingIds = savedIds.filter((id) => !options.some((o) => o.identifier === id));
      const saved = await getAssessmentsByIds(missingIds);
      if (cancelled) return;

      const allOptions = [...options, ...saved];
      formRef.current?.setFieldOptions?.(
        'assessments',
        allOptions.map((o) => ({ value: o.identifier, label: o.name }))
      );
      // Drop selections that don't belong to a newly selected Skill.
      const selected: string[] = formData?.assessments ?? [];
      const kept = selected.filter((id) => allOptions.some((o) => o.identifier === id));
      if (kept.length !== selected.length) {
        formRef.current?.resetForm?.({ ...formData, assessments: kept });
      }
    };
    loadAssessmentOptions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assessmentDomain, assessmentSkill]);

  // Seed formData with the batch's current values each time Edit opens, so
  // saving without touching any field still submits the existing values.
  useEffect(() => {
    if (open && editBatch) setFormData(getEditPrefill(editBatch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editBatch]);

  if (!open) return null;

  const schema = cloneDeep(L2BatchCreate.schema);
  const uiSchema = cloneDeep(L2BatchCreate.uiSchema);

  // overrideEnum, mirroring apps/admin-app-repo/BatchFlow.tsx's own helper:
  // drop the framework-taxonomy `api` fetch and restrict each field to the
  // Trainer's own assigned values (both already plain display strings, so
  // enum and enumNames are identical).
  if (isEdit) {
    EDIT_HIDDEN_FIELDS.forEach((key) => {
      delete (schema.properties as any)[key];
      delete uiSchema[key];
    });
    schema.required = schema.required.filter((key: string) => !EDIT_HIDDEN_FIELDS.includes(key));
    if (Array.isArray(uiSchema['ui:order'])) {
      uiSchema['ui:order'] = uiSchema['ui:order'].filter(
        (key: string) => !EDIT_HIDDEN_FIELDS.includes(key)
      );
    }
  }

  if (schema.properties.domain) {
    delete (schema.properties.domain as any).api;
    schema.properties.domain.items = {
      type: 'string',
      enum: trainerTaxonomy.domains,
      enumNames: trainerTaxonomy.domains,
    };
    if (trainerTaxonomy.domains.length === 1) {
      uiSchema.domain = { ...uiSchema.domain, 'ui:disabled': true };
    }
  }
  if (schema.properties.skills) {
    delete (schema.properties.skills as any).api;
    schema.properties.skills.items = {
      type: 'string',
      enum: trainerTaxonomy.skills,
      enumNames: trainerTaxonomy.skills,
    };
    if (trainerTaxonomy.skills.length === 1) {
      uiSchema.skills = { ...uiSchema.skills, 'ui:disabled': true };
    }
  }

  // Type of Batch options, mirroring apps/admin-app-repo/BatchFlow.tsx's
  // own centerType handling verbatim: 'regular' centers only ever offer
  // Regular (locked, since there's exactly one option); 'remote' centers
  // offer Remote + Hybrid (both selectable, not locked). Dynamically
  // sourced from the Center's own TYPE_OF_CENTER — nothing hardcoded per
  // Trainer/page. If centerType is unknown/unconfirmed, the form's
  // original Regular/Remote/Hybrid options are left untouched.
  if (schema.properties.batch_type) {
    if (centerType === 'remote') {
      schema.properties.batch_type.enum = ['remote', 'hybrid'];
      schema.properties.batch_type.enumNames = ['REMOTE', 'HYBRID'];
      schema.properties.batch_type.default = 'remote';
      if (uiSchema.batch_type?.['ui:disabled']) {
        uiSchema.batch_type = { ...uiSchema.batch_type };
        delete uiSchema.batch_type['ui:disabled'];
      }
    } else if (centerType === 'regular') {
      schema.properties.batch_type.enum = ['regular'];
      schema.properties.batch_type.enumNames = ['REGULAR'];
      schema.properties.batch_type.default = 'regular';
      uiSchema.batch_type = { ...uiSchema.batch_type, 'ui:disabled': true };
    }
  }

  // Neither date can be in the past — same formatMinimum/minValue injection
  // BatchFlow.tsx applies, since "today" can't be a static schema value.
  // In Edit mode, also same as BatchFlow.tsx: a saved date that has already
  // passed (< today) is locked (disabled, and the "no past dates" rule is
  // skipped for it); a date that is today or later stays editable.
  const today = getToday();
  (['startdate', 'enddate'] as const).forEach((key) => {
    const savedDate = isEdit
      ? toDateKey(key === 'startdate' ? editBatch?.startDate : editBatch?.endDate)
      : undefined;
    const isLocked = !!savedDate && savedDate < today;
    if (schema.properties[key] && !isLocked) (schema.properties[key] as any).formatMinimum = today;
    if (uiSchema[key]) {
      uiSchema[key] = {
        ...uiSchema[key],
        'ui:options': {
          ...uiSchema[key]['ui:options'],
          ...(isLocked ? {} : { minValue: today }),
        },
        ...(isLocked ? { 'ui:disabled': true } : {}),
      };
    }
  });

  const prefilledFormData: Record<string, any> = isEdit ? getEditPrefill(editBatch) : {};
  if (!isEdit) {
    if (trainerTaxonomy.domains.length === 1) prefilledFormData.domain = [trainerTaxonomy.domains[0]];
    if (trainerTaxonomy.skills.length === 1) prefilledFormData.skills = [trainerTaxonomy.skills[0]];
  }
  if (centerType === 'regular') prefilledFormData.batch_type = 'regular';

  // Field errors (date order, past dates, patterns, ...) only show inline —
  // the per-field form never blocks the modal's own Create/Update button, so
  // the whole form is re-validated here against the same schema before
  // submitting. `enum` errors are skipped: some options (e.g. assessments)
  // are pushed into the form at runtime and aren't in this schema copy.
  const hasFormErrors = () => {
    const { errors } = batchFormValidator.validateFormData(formData, schema as any);
    if (errors.every((error) => error.name === 'enum')) return false;
    showToastMessage(
      t('MY_TEACHING_CENTER.FIX_FORM_ERRORS', {
        defaultValue: 'Please fix the errors in the form before submitting.',
      }),
      'error'
    );
    return true;
  };

  const handleUpdate = async () => {
    if (!editBatch?.cohortId) {
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_UPDATE_FAILED'), 'error');
      return;
    }
    // A batch whose saved End Date has already passed is Completed and can
    // no longer be edited.
    const savedEndDate = toDateKey(editBatch.endDate);
    if (savedEndDate && savedEndDate < getToday()) {
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_COMPLETED_CANNOT_UPDATE'), 'error');
      return;
    }
    if (!formData?.name || !formData?.batch_type || !formData?.startdate || !formData?.enddate) {
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_UPDATE_FAILED'), 'error');
      return;
    }
    if (hasFormErrors()) return;
    // Never send Domain/Skills from the Edit form.
    const editFormData = { ...formData };
    EDIT_HIDDEN_FIELDS.forEach((key) => delete editFormData[key]);

    setSaving(true);
    try {
      const result = await updateBatch({ cohortId: editBatch.cohortId, formData: editFormData });
      if (!isCreateBatchSuccess(result)) {
        showToastMessage(t('MY_TEACHING_CENTER.BATCH_UPDATE_FAILED'), 'error');
        return;
      }
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_UPDATED_SUCCESS'), 'success');
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (isEdit) {
      await handleUpdate();
      return;
    }
    const domain = formData?.domain?.[0];
    const skill = formData?.skills?.[0];
    // Re-validate against the Trainer's actual taxonomy right before
    // submitting — the dropdowns only ever offer assigned values, but this
    // is the check that still holds even if that were bypassed client-side.
    if (!domain || !trainerTaxonomy.domains.includes(domain)) {
      showToastMessage(t('MY_TEACHING_CENTER.DOMAIN_COURSE_NOT_ASSIGNED'), 'error');
      return;
    }
    if (!skill || !trainerTaxonomy.skills.includes(skill)) {
      showToastMessage(t('MY_TEACHING_CENTER.DOMAIN_COURSE_NOT_ASSIGNED'), 'error');
      return;
    }
    if (!centerId) {
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_CREATE_FAILED'), 'error');
      return;
    }
    if (!formData?.name || !formData?.batch_type || !formData?.startdate || !formData?.enddate) {
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_CREATE_FAILED'), 'error');
      return;
    }
    if (hasFormErrors()) return;

    setSaving(true);
    try {
      const result = await createBatch({ centerId, formData });
      if (!isCreateBatchSuccess(result)) {
        showToastMessage(t('MY_TEACHING_CENTER.BATCH_CREATE_FAILED'), 'error');
        return;
      }
      showToastMessage(t('MY_TEACHING_CENTER.BATCH_CREATED_SUCCESS'), 'success');
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      showFooter
      primaryText={
        saving
          ? t('COMMON.LOADING')
          : isEdit
          ? t('MY_TEACHING_CENTER.UPDATE')
          : t('MY_TEACHING_CENTER.CREATE')
      }
      secondaryText={t('MY_TEACHING_CENTER.CANCEL')}
      primaryActionHandler={handleSubmit}
      secondaryActionHandler={onClose}
      modalTitle={
        isEdit ? t('MY_TEACHING_CENTER.EDIT_BATCH_TITLE') : t('MY_TEACHING_CENTER.CREATE_BATCH_TITLE')
      }
      id={isEdit ? 'my-teaching-center-batch-edit' : 'my-teaching-center-batch-create'}
    >
      {/* DynamicForm hardcodes a Grid item xs={12} md={4} lg={3} per field
          whenever isCallSubmitInHandle is true, ignoring any uiSchema grid
          option — forcing full width here at the call site instead of
          touching that shared, widely-used component (same fix already
          used by l2-interested-queue.tsx's CommonSidePanel form). */}
      <Box
        sx={{
          '& .MuiGrid-item': {
            flexBasis: '100% !important',
            maxWidth: '100% !important',
          },
        }}
      >
        <DynamicForm
          ref={formRef}
          schema={schema}
          uiSchema={{ ...uiSchema, 'ui:submitButtonOptions': { norender: true } }}
          SubmitaFunction={(fd: any) => setFormData(fd)}
          isCallSubmitInHandle={true}
          showRequiredIndicator
          prefilledFormData={prefilledFormData}
          type={isEdit ? 'my-teaching-center-batch-edit' : 'my-teaching-center-batch-create'}
        />
      </Box>
    </SimpleModal>
  );
};

export default CreateBatchModal;
