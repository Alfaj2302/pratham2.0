import React, { useEffect, useRef, useState } from 'react';
import { Box, Autocomplete, TextField } from '@mui/material';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { getCentersForDomains, PlacementCenter, SdbvFilters } from '../../services/placements/PlacementCenterService';
import { getBatchesForCenter, PlacementBatch } from '../../services/placements/PlacementBatchService';

interface CenterBatchSelectorProps {
  domains: string[];
  sdbv: SdbvFilters;
  // Restored from sessionStorage (see placementsFilterStorage) so a page
  // refresh doesn't lose the Coordinator's Center/Batch selection.
  initialCenter?: PlacementCenter | null;
  initialBatch?: PlacementBatch | null;
  onCenterSelected: (center: PlacementCenter | null) => void;
  onBatchSelected: (batch: PlacementBatch | null) => void;
}

// Center + Batch cascading Autocomplete pair, modeled on
// AllocateToBatchModal.tsx's own Center/Batch pair — except Centers here are
// scoped by the Coordinator's assigned Domain(s) + the SDBV filters above,
// not "my cohorts" for a single trainer.
const CenterBatchSelector: React.FC<CenterBatchSelectorProps> = ({
  domains,
  sdbv,
  initialCenter = null,
  initialBatch = null,
  onCenterSelected,
  onBatchSelected,
}) => {
  const [centerOptions, setCenterOptions] = useState<PlacementCenter[] | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<PlacementCenter | null>(initialCenter);

  const [batchOptions, setBatchOptions] = useState<PlacementBatch[] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(initialBatch);

  // Only the very first loadCenters() run (right after `domains` first
  // resolves) should restore initialCenter/initialBatch instead of
  // resetting the selection — every later run (an actual SDBV filter
  // change) must still clear the selection as before.
  const hasRestoredRef = useRef(false);

  const loadCenters = async () => {
    const isInitialRestore = !hasRestoredRef.current && !!(initialCenter || initialBatch);

    setCenterOptions(null);
    if (!isInitialRestore) {
      setSelectedCenter(null);
      setBatchOptions(null);
      setSelectedBatch(null);
      onCenterSelected(null);
      onBatchSelected(null);
    }
    if (domains.length === 0) {
      // `domains` hasn't resolved yet (still its initial []) — nothing to
      // search with yet, so don't consume the restore flag here. The real
      // run, once `domains` actually has values, still needs
      // isInitialRestore to be true.
      setCenterOptions([]);
      return;
    }
    // Only mark the restore as "done" once we've actually reached a call
    // that can use it — otherwise this flag gets burned by the call above
    // (domains still []), and the next call (domains finally loaded, ~1s
    // later) would wrongly treat itself as a real filter change and wipe
    // out the restored selection instead of applying it.
    hasRestoredRef.current = true;
    try {
      const centers = await getCentersForDomains(domains, sdbv);
      setCenterOptions(centers);
      if (isInitialRestore && initialCenter) {
        setSelectedCenter(initialCenter);
        onCenterSelected(initialCenter);
        loadBatches(initialCenter.cohortId, initialBatch);
      }
    } catch (error) {
      console.error('Error loading centers:', error);
      showToastMessage('Something went wrong while fetching centers', 'error');
      setCenterOptions([]);
    }
  };

  useEffect(() => {
    loadCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains.join(','), sdbv.state, sdbv.district, sdbv.block]);

  const loadBatches = async (centerId: string, preselectBatch: PlacementBatch | null = null) => {
    setBatchOptions(null);
    if (!preselectBatch) {
      setSelectedBatch(null);
      onBatchSelected(null);
    }
    try {
      const batches = await getBatchesForCenter(centerId);
      setBatchOptions(batches);
      if (preselectBatch) {
        setSelectedBatch(preselectBatch);
        onBatchSelected(preselectBatch);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      showToastMessage('Something went wrong while fetching batches', 'error');
      setBatchOptions([]);
    }
  };

  const handleCenterChange = (option: PlacementCenter | null) => {
    setSelectedCenter(option);
    onCenterSelected(option);
    if (option) {
      loadBatches(option.cohortId);
    } else {
      setBatchOptions(null);
      setSelectedBatch(null);
      onBatchSelected(null);
    }
  };

  const handleBatchChange = (option: PlacementBatch | null) => {
    setSelectedBatch(option);
    onBatchSelected(option);
  };

  return (
    <Box display="flex" flexWrap="wrap" gap={2} width="100%">
      <Autocomplete
        sx={{ flex: { xs: '1 1 100%', sm: '1 1 0' }, minWidth: { sm: 240 } }}
        options={centerOptions || []}
        loading={centerOptions == null}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(o, v) => o.cohortId === v.cohortId}
        value={selectedCenter}
        onChange={(_, option) => handleCenterChange(option)}
        renderInput={(params) => <TextField {...params} label="Center" />}
      />

      <Autocomplete
        sx={{ flex: { xs: '1 1 100%', sm: '1 1 0' }, minWidth: { sm: 240 } }}
        options={batchOptions || []}
        loading={!!selectedCenter && batchOptions == null}
        disabled={!selectedCenter}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(o, v) => o.cohortId === v.cohortId}
        value={selectedBatch}
        onChange={(_, option) => handleBatchChange(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Batch"
            placeholder={!selectedCenter ? 'Choose a center first' : undefined}
          />
        )}
      />
    </Box>
  );
};

export default CenterBatchSelector;
