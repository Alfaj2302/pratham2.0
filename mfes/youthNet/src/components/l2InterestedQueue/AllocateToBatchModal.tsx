import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Autocomplete,
  TextField,
  Modal,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { getCohortList as getMyCohorts } from '../../services/GetCohortList';
import { bulkCreateCohortMembers } from '../../services/CohortService';
import { updateUser } from '../../services/youthNet/Dashboard/UserServices';
import { getTrainerTaxonomy } from '../../services/myTeachingCenter/TrainerTaxonomyService';
import { searchBatchesForCenter } from '../../services/myTeachingCenter/BatchListService';
import { toPascalCase } from '../../utils/helper';
import {
  buildBatchEnrollCustomFields,
  isUpdateUserSuccess,
  getUpdateUserErrorMessage,
  isBulkCreateCohortMembersSuccess,
} from '../../services/l2InterestedQueue/l2QueueHelpers';

interface AllocateToBatchModalProps {
  open: boolean;
  onClose: () => void;
  learners: any[];
  domain: string;
  skill: string;
  onAllocated: () => void;
}

interface Option {
  label: string;
  value: string;
}

// Center and Batch are hand-fetched, not DynamicForm schema fields: mycohorts
// returns the trainer's whole cohort tree with no server-side filter of its
// own, and /cohort/search's response needs client-side unwrapping too,
// neither of which DynamicForm's schema-driven api/dependent mechanism
// (simple label/value mapping only, no filtering) can express. Batch is
// scoped to the selected Center + the *Trainer's own* assigned Domain/Skill
// (from their own profile, via getTrainerTaxonomy — not the learner's
// tagged domain/skill props, which are for header display only) — same
// searchBatchesForCenter (BatchListService.ts) my-teaching-center already
// uses, confirmed against the real customFieldsName filter contract.
const AllocateToBatchModal: React.FC<AllocateToBatchModalProps> = ({
  open,
  onClose,
  learners,
  domain,
  skill,
  onAllocated,
}) => {
  const [centerOptions, setCenterOptions] = useState<Option[] | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<Option | null>(null);

  const [batchOptions, setBatchOptions] = useState<Option[] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Option | null>(null);

  const [saving, setSaving] = useState(false);

  const loadCenters = async () => {
    setCenterOptions(null);
    setSelectedCenter(null);
    setBatchOptions(null);
    setSelectedBatch(null);
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      setCenterOptions([]);
      return;
    }
    const raw = await getMyCohorts(userId, true, true);
    if (!raw || raw?.isAxiosError || raw instanceof Error) {
      showToastMessage('Something went wrong while fetching centers', 'error');
      setCenterOptions([]);
      return;
    }
    const list = Array.isArray(raw?.result) ? raw.result : [];
    const centers = list.filter(
      (c: any) =>
        (c.type === 'COHORT' || c.type === 'CENTER') &&
        !c.parentId &&
        (c.cohortStatus ?? c.status)?.toLowerCase() === 'active'
    );
    setCenterOptions(centers.map((c: any) => ({ label: c.cohortName || c.name, value: c.cohortId })));
  };

  useEffect(() => {
    if (open) {
      loadCenters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadBatches = async (centerId: string) => {
    setBatchOptions(null);
    setSelectedBatch(null);
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      setBatchOptions([]);
      return;
    }
    const taxonomy = await getTrainerTaxonomy(userId);
    const list = await searchBatchesForCenter(centerId, taxonomy.domains, taxonomy.skills);
    // Hide batches whose end date has already passed (a batch ending today
    // is still allocatable). Batch dates are stored as YYYY-MM-DD.
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    setBatchOptions(
      list
        .filter((b) => !b.endDate || String(b.endDate).slice(0, 10) >= today)
        .map((b) => ({ label: b.name, value: b.cohortId }))
    );
  };

  const handleCenterChange = (option: Option | null) => {
    setSelectedCenter(option);
    if (option) {
      loadBatches(option.value);
    } else {
      setBatchOptions(null);
      setSelectedBatch(null);
    }
  };

  const handleConfirm = async () => {
    if (!selectedBatch || saving) return;
    setSaving(true);
    try {
      const userIds = learners.map((l) => l.userId);

      // Create the real cohort membership first — only flip each learner's
      // L2_INTERESTED flag to "enrolled" once that actually succeeds, so we
      // never mark someone enrolled without a real batch membership behind it.
      const bulkResult = await bulkCreateCohortMembers({
        userId: userIds,
        cohortId: [selectedBatch.value],
        status: 'in_training',
      });
      if (!isBulkCreateCohortMembersSuccess(bulkResult)) {
        showToastMessage('Could not create batch membership', 'error');
        return;
      }
      const enrollFields = buildBatchEnrollCustomFields();
      const userResults = await Promise.all(
        userIds.map((id) => updateUser(id, { userData: {}, customFields: enrollFields }))
      );
      const failed = userResults.find((r) => !isUpdateUserSuccess(r));
      if (failed) {
        showToastMessage(
          getUpdateUserErrorMessage(failed) || 'Something went wrong',
          'error'
        );
        return;
      }
      showToastMessage('Learner(s) allocated to batch', 'success');
      onAllocated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const theme = useTheme<any>();

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="allocate-batch-title">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '92%', sm: 520 },
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
            <Typography id="allocate-batch-title" variant="h6">
              Allocate to batch
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {learners.length} learner{learners.length > 1 ? 's' : ''} · {domain} › {skill}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseSharpIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 2, overflowY: 'auto' }}>
          <Autocomplete
            options={centerOptions || []}
            loading={centerOptions == null}
            getOptionLabel={(o) => toPascalCase(o.label)}
            value={selectedCenter}
            onChange={(_, option) => handleCenterChange(option)}
            renderInput={(params) => <TextField {...params} label="Center" />}
          />

          <Autocomplete
            sx={{ mt: 2 }}
            options={batchOptions || []}
            loading={!!selectedCenter && batchOptions == null}
            disabled={!selectedCenter}
            getOptionLabel={(o) => toPascalCase(o.label)}
            value={selectedBatch}
            onChange={(_, option) => setSelectedBatch(option)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Batch"
                placeholder={!selectedCenter ? 'Choose a center first' : undefined}
              />
            )}
          />
        </Box>

        <Divider />
        <Box display="flex" gap={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!selectedBatch || saving} onClick={handleConfirm}>
            {saving ? <CircularProgress size={20} /> : 'Confirm allocation'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AllocateToBatchModal;
