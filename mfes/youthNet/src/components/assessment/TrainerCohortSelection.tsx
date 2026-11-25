import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { searchBatchesForCenter } from '../../services/myTeachingCenter/BatchListService';
import { getTrainerCenters, TrainerCenter } from '../../services/myTeachingCenter/TrainerCentersService';
import { getTrainerTaxonomy } from '../../services/myTeachingCenter/TrainerTaxonomyService';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';
import { showToastMessage } from '../Toastify';

// Center -> Batch selector for the Trainer assessment flows.
//
// Deliberately NOT a port of scp-teacher-repo's CohortSelectionSection, which is built on that repo's
// cohort hierarchy, custom fields and block-level manipulation. This mirrors the cascade YouthNet
// already uses in AllocateToBatchModal.tsx (L2 Interested Queue): centers come from the Trainer's own
// cohort tree, and batches are resolved per-center using the Trainer's assigned Domain/Skills taxonomy.
//
// `onBatchChange` hands the caller the whole batch record, not just its id, because a batch carries
// `assessmentIds` (its ASSESSMENTS customField) — that is how a Trainer's assessments are scoped.

const CENTER_STORAGE_KEY = 'assessmentCenterId';
const BATCH_STORAGE_KEY = 'classId';

interface TrainerCohortSelectionProps {
  classId: string;
  setClassId: React.Dispatch<React.SetStateAction<string>>;
  // Fires whenever the resolved batch changes, including to null when the selection is cleared.
  onBatchChange?: (batch: MyTeachingCenterBatch | null) => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showFloatingLabel?: boolean;
}

const TrainerCohortSelection: React.FC<TrainerCohortSelectionProps> = ({
  classId,
  setClassId,
  onBatchChange,
  loading,
  setLoading,
  showFloatingLabel = true,
}) => {
  const { t } = useTranslation();

  // null = still loading; [] = loaded and genuinely empty. Keeping them distinct lets the empty
  // states below say "no centers assigned" without flashing it during the first fetch.
  const [centers, setCenters] = useState<TrainerCenter[] | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [batches, setBatches] = useState<MyTeachingCenterBatch[] | null>(null);

  const readUserId = () =>
    typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const emitBatch = (batchList: MyTeachingCenterBatch[], cohortId: string) => {
    onBatchChange?.(batchList.find((batch) => batch.cohortId === cohortId) ?? null);
  };

  useEffect(() => {
    const loadCenters = async () => {
      const userId = readUserId();
      if (!userId) {
        setCenters([]);
        return;
      }

      setLoading(true);
      try {
        const list = await getTrainerCenters(userId);
        setCenters(list);

        // Restore the Trainer's last center if it is still assigned to them; otherwise fall back to
        // the first one so the page has data to show without an extra click.
        const saved =
          typeof window !== 'undefined' ? localStorage.getItem(CENTER_STORAGE_KEY) : null;
        const restored = list.find((center) => center.id === saved) ?? list[0];
        if (restored) {
          setSelectedCenterId(restored.id);
        }
      } catch (error) {
        console.error('Error fetching trainer centers', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        setCenters([]);
      } finally {
        setLoading(false);
      }
    };

    loadCenters();
  }, []);

  useEffect(() => {
    if (!selectedCenterId) {
      setBatches(null);
      return;
    }

    const loadBatches = async () => {
      const userId = readUserId();
      if (!userId) {
        setBatches([]);
        return;
      }

      setLoading(true);
      setBatches(null);
      try {
        // Batches are resolved by the Trainer's own Domain/Skills taxonomy, scoped to this center —
        // the same two-step AllocateToBatchModal uses.
        const taxonomy = await getTrainerTaxonomy(userId);
        const list = await searchBatchesForCenter(
          selectedCenterId,
          taxonomy.domains,
          taxonomy.skills
        );
        setBatches(list);

        const saved =
          typeof window !== 'undefined' ? localStorage.getItem(BATCH_STORAGE_KEY) : null;
        const restored = list.find((batch) => batch.cohortId === saved) ?? list[0];
        if (restored) {
          setClassId(restored.cohortId);
          localStorage.setItem(BATCH_STORAGE_KEY, restored.cohortId);
          emitBatch(list, restored.cohortId);
        } else {
          setClassId('');
          emitBatch(list, '');
        }
      } catch (error) {
        console.error('Error fetching batches for center', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, [selectedCenterId]);

  const handleCenterChange = (event: SelectChangeEvent) => {
    const centerId = event.target.value;
    setSelectedCenterId(centerId);
    localStorage.setItem(CENTER_STORAGE_KEY, centerId);
    // Clear the batch immediately; the effect above repopulates it for the new center.
    setClassId('');
    localStorage.removeItem(BATCH_STORAGE_KEY);
    onBatchChange?.(null);
  };

  const handleBatchChange = (event: SelectChangeEvent) => {
    const cohortId = event.target.value;
    setClassId(cohortId);
    localStorage.setItem(BATCH_STORAGE_KEY, cohortId);
    emitBatch(batches ?? [], cohortId);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: '16px',
        width: '100%',
      }}
    >
      <FormControl sx={{ flex: 1, minWidth: 0 }} disabled={loading || centers === null}>
        {showFloatingLabel && <InputLabel id="assessment-center-label">{t('ASSESSMENTS.CENTER')}</InputLabel>}
        <Select
          labelId="assessment-center-label"
          label={showFloatingLabel ? t('ASSESSMENTS.CENTER') : undefined}
          value={centers?.some((center) => center.id === selectedCenterId) ? selectedCenterId : ''}
          onChange={handleCenterChange}
        >
          {(centers ?? []).map((center) => (
            <MenuItem key={center.id} value={center.id}>
              {center.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl
        sx={{ flex: 1, minWidth: 0 }}
        disabled={loading || !selectedCenterId || batches === null}
      >
        {showFloatingLabel && <InputLabel id="assessment-batch-label">{t('ASSESSMENTS.BATCH')}</InputLabel>}
        <Select
          labelId="assessment-batch-label"
          label={showFloatingLabel ? t('ASSESSMENTS.BATCH') : undefined}
          value={batches?.some((batch) => batch.cohortId === classId) ? classId : ''}
          onChange={handleBatchChange}
        >
          {(batches ?? []).map((batch) => (
            <MenuItem key={batch.cohortId} value={batch.cohortId}>
              {batch.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TrainerCohortSelection;
