import React, { useEffect, useState } from 'react';
import { Box, Autocomplete, TextField } from '@mui/material';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { getCentersForDomains, PlacementCenter, SdbvFilters } from '../../services/placements/PlacementCenterService';
import { getBatchesForCenter, PlacementBatch } from '../../services/placements/PlacementBatchService';

interface CenterBatchSelectorProps {
  domains: string[];
  sdbv: SdbvFilters;
  onBatchSelected: (batch: PlacementBatch | null) => void;
}

// Center + Batch cascading Autocomplete pair, modeled on
// AllocateToBatchModal.tsx's own Center/Batch pair — except Centers here are
// scoped by the Coordinator's assigned Domain(s) + the SDBV filters above,
// not "my cohorts" for a single trainer.
const CenterBatchSelector: React.FC<CenterBatchSelectorProps> = ({ domains, sdbv, onBatchSelected }) => {
  const [centerOptions, setCenterOptions] = useState<PlacementCenter[] | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<PlacementCenter | null>(null);

  const [batchOptions, setBatchOptions] = useState<PlacementBatch[] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(null);

  const loadCenters = async () => {
    setCenterOptions(null);
    setSelectedCenter(null);
    setBatchOptions(null);
    setSelectedBatch(null);
    onBatchSelected(null);
    if (domains.length === 0) {
      setCenterOptions([]);
      return;
    }
    try {
      const centers = await getCentersForDomains(domains, sdbv);
      setCenterOptions(centers);
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

  const loadBatches = async (centerId: string) => {
    setBatchOptions(null);
    setSelectedBatch(null);
    onBatchSelected(null);
    try {
      const batches = await getBatchesForCenter(centerId);
      setBatchOptions(batches);
    } catch (error) {
      console.error('Error loading batches:', error);
      showToastMessage('Something went wrong while fetching batches', 'error');
      setBatchOptions([]);
    }
  };

  const handleCenterChange = (option: PlacementCenter | null) => {
    setSelectedCenter(option);
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
