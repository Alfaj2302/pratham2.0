
import React, { useState, useEffect, useRef } from 'react';
import { Box, Select, MenuItem, InputLabel, Checkbox, ListItemText, Grid, FormControl, Button } from '@mui/material';
import { getFieldOptions, getDistrictUserCount } from '../../services/MasterDataService';
import { Role } from '../../utils/app.constant';

const LOCATION_FILTERS_KEY = 'userRegistrationLocationFilters';

interface LocationOption {
  value: number | string;
  label: string;
  userCount?: number;
  [key: string]: any;
}

const normalizeName = (name: unknown) => String(name ?? '').trim().toLowerCase();

// Merge the district-user-count result (names + counts) with the
// field options (ids needed by the Block API and the user list filter).
const buildDistrictOptions = (counts: any[], fieldOptions: LocationOption[]): LocationOption[] => {
  const byId = new Map(fieldOptions.map((o) => [String(o.value), o]));
  const byName = new Map(fieldOptions.map((o) => [normalizeName(o.label), o]));
  const seen = new Set<string>();
  const options: LocationOption[] = [];
  counts.forEach((item) => {
    const rawId = item.id ?? item.district_id ?? item.value;
    const match = (rawId != null && byId.get(String(rawId))) || byName.get(normalizeName(item.name));
    if (!match || seen.has(String(match.value))) return;
    seen.add(String(match.value));
    options.push({ ...match, label: item.name || match.label, userCount: Number(item.user_count) || 0 });
  });
  // Highest user count first; ties fall back to alphabetical order
  return options.sort(
    (a, b) => (b.userCount ?? 0) - (a.userCount ?? 0) || a.label.localeCompare(b.label)
  );
};

interface LocationDropdownsProps {
  onLocationChange?: (location: {
    states?: number[];
    districts?: number[];
    blocks?: number[];
  }) => void;
}

const LocationDropdowns: React.FC<LocationDropdownsProps> = ({ onLocationChange }) => {
  const [states, setStates] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [blocks, setBlocks] = useState<LocationOption[]>([]);

  const [selectedState, setSelectedState] = useState<number | string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<(number | string)[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<(number | string)[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // Holds stored values to apply once each dropdown's options load
  const pendingRestoreRef = useRef<{
    state?: number | string;
    district?: number | string;
    districts?: (number | string)[];
    blocks?: (number | string)[];
  } | null>(null);
  // Tracks whether each level has already been restored (prevents re-applying on subsequent loads)
  const restoredRef = useRef({ state: false, district: false, blocks: false });
  // Prevents the very first render (all selections empty) from wiping stored location
  const isSaveInitialized = useRef(false);

  // Read stored location from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCATION_FILTERS_KEY);
      if (raw) pendingRestoreRef.current = JSON.parse(raw);
    } catch {}
  }, []);

  // Fetch states on mount
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await getFieldOptions({
          fieldName: 'state',
          sort: ['state_name', 'asc'],
        });
        if (response?.result?.values) {
          const stateOptions = response.result.values.map((item: any) => ({
            value: item.value != null ? item.value : item.state_id,
            label: item.label || item.state_name,
          }));
          setStates(stateOptions);
        }
      } catch (error) {
        console.error('Error fetching states:', error);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // Fetch districts when state is selected
  useEffect(() => {
    if (selectedState !== '') {
      const fetchDistricts = async () => {
        setLoadingDistricts(true);
        setDistricts([]);
        setBlocks([]);
        setSelectedDistricts([]);
        setSelectedBlocks([]);
        const tenantId = localStorage.getItem('tenantId');
        const [fieldResult, countResult] = await Promise.allSettled([
          getFieldOptions({
            fieldName: 'district',
            controllingfieldfk: [selectedState],
            sort: ['district_name', 'asc'],
          }),
          tenantId
            ? getDistrictUserCount({ role: Role.STUDENT, tenantId, stateId: [selectedState] })
            : Promise.reject(new Error('TenantId not found in localStorage')),
        ]);
        if (cancelled) return;

        const fieldOptions: LocationOption[] =
          fieldResult.status === 'fulfilled' && fieldResult.value?.result?.values
            ? fieldResult.value.result.values.map((item: any) => ({
                value: item.value != null ? item.value : item.district_id,
                label: item.label || item.district_name,
              }))
            : [];
        if (fieldResult.status === 'rejected') {
          console.error('Error fetching districts:', fieldResult.reason);
        }

        if (countResult.status === 'fulfilled') {
          setDistricts(buildDistrictOptions(countResult.value, fieldOptions));
        } else {
          // Counts unavailable — fall back to the plain district list
          console.error('Error fetching district user counts:', countResult.reason);
          setDistricts(fieldOptions);
        }
        setLoadingDistricts(false);
      };

      let cancelled = false;
      fetchDistricts();
      return () => {
        cancelled = true;
      };
    } else {
      setDistricts([]);
      setBlocks([]);
      setSelectedDistricts([]);
      setSelectedBlocks([]);
    }
  }, [selectedState]);

  // Stable key so the block fetch only reruns when the actual selection changes
  const selectedDistrictsKey = selectedDistricts.map(String).sort().join(',');

  // Fetch blocks for all selected districts
  useEffect(() => {
    if (selectedDistricts.length > 0) {
      let cancelled = false;
      const fetchBlocks = async () => {
        setLoadingBlocks(true);
        try {
          const response = await getFieldOptions({
            fieldName: 'block',
            controllingfieldfk: selectedDistricts,
            sort: ['block_name', 'asc'],
          });
          if (cancelled) return;
          const blockOptions: LocationOption[] = response?.result?.values
            ? response.result.values.map((item: any) => ({
                value: item.value != null ? item.value : item.block_id,
                label: item.label || item.block_name,
              }))
            : [];
          setBlocks(blockOptions);
          // Keep only the selected blocks that still belong to a selected district
          const available = new Set(blockOptions.map((b) => String(b.value)));
          setSelectedBlocks((prev) => {
            const next = prev.filter((b) => available.has(String(b)));
            return next.length === prev.length ? prev : next;
          });
        } catch (error) {
          if (cancelled) return;
          console.error('Error fetching blocks:', error);
          setBlocks([]);
          setSelectedBlocks([]);
        } finally {
          if (!cancelled) setLoadingBlocks(false);
        }
      };

      fetchBlocks();
      return () => {
        cancelled = true;
      };
    } else {
      setBlocks([]);
      setSelectedBlocks([]);
      setLoadingBlocks(false);
    }
  }, [selectedDistrictsKey]);

  // Notify parent component when location changes
  useEffect(() => {
    if (onLocationChange) {
      onLocationChange({
        states: selectedState !== '' ? [selectedState as number] : undefined,
        districts: selectedDistricts.length > 0 ? (selectedDistricts as number[]) : undefined,
        blocks: selectedBlocks.length > 0 ? (selectedBlocks as number[]) : undefined,
      });
    }
  }, [selectedState, selectedDistricts, selectedBlocks, onLocationChange]);

  // Restore state selection once states are loaded
  useEffect(() => {
    if (states.length > 0 && !restoredRef.current.state && pendingRestoreRef.current?.state != null) {
      const match = states.find((s) => s.value === pendingRestoreRef.current!.state);
      if (match) setSelectedState(match.value);
      restoredRef.current.state = true;
    }
  }, [states]);

  // Restore district selections once districts are loaded
  // (supports the legacy single `district` key as well as the `districts` array)
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    const storedDistricts = pending?.districts?.length
      ? pending.districts
      : pending?.district != null
        ? [pending.district]
        : [];
    if (districts.length > 0 && !restoredRef.current.district && storedDistricts.length > 0) {
      const matches = districts
        .filter((d) => storedDistricts.includes(d.value))
        .map((d) => d.value);
      if (matches.length > 0) setSelectedDistricts(matches);
      restoredRef.current.district = true;
    }
  }, [districts]);

  // Restore block selections once blocks are loaded
  useEffect(() => {
    if (blocks.length > 0 && !restoredRef.current.blocks && pendingRestoreRef.current?.blocks?.length) {
      const matches = blocks
        .filter((b) => pendingRestoreRef.current!.blocks!.includes(b.value))
        .map((b) => b.value);
      if (matches.length > 0) setSelectedBlocks(matches);
      restoredRef.current.blocks = true;
    }
  }, [blocks]);

  // Persist location selections to localStorage — skip the initial empty render so it
  // doesn't wipe the previously stored values before restoration has a chance to run.
  useEffect(() => {
    if (!isSaveInitialized.current) {
      isSaveInitialized.current = true;
      return;
    }
    try {
      localStorage.setItem(LOCATION_FILTERS_KEY, JSON.stringify({
        state: selectedState !== '' ? selectedState : undefined,
        districts: selectedDistricts.length > 0 ? selectedDistricts : undefined,
        blocks: selectedBlocks.length > 0 ? selectedBlocks : undefined,
      }));
    } catch {}
  }, [selectedState, selectedDistricts, selectedBlocks]);

  const handleClear = () => {
    pendingRestoreRef.current = null;
    restoredRef.current = { state: false, district: false, blocks: false };
    try { localStorage.removeItem(LOCATION_FILTERS_KEY); } catch {}
    setSelectedState('');
    // district/block state clears automatically via their useEffects
  };

  const hasAnySelection = selectedState !== '' || selectedDistricts.length > 0 || selectedBlocks.length > 0;

  const renderMultiValue = (options: LocationOption[]) => (selected: (number | string)[]) => {
    if (selected.length === 0) return 'Select';
    if (selected.length === 1) {
      const option = options.find((opt) => opt.value === selected[0]);
      return option?.label || '';
    }
    return `${selected.length} selected`;
  };
  const renderBlockValue = renderMultiValue(blocks);
  const renderDistrictValue = renderMultiValue(districts);

  return (
    <Box>
      <Grid container spacing={2}>
        {/* State Dropdown — single select */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel
              id="state-select-label"
              sx={{ fontSize: '12px', color: '#7C766F' }}
            >
              State
            </InputLabel>
            <Select
              labelId="state-select-label"
              label="State"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as number | string)}
              disabled={loadingStates}
              sx={{
                borderRadius: '8px',
                '& .MuiSelect-select': { py: 1.5 },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: '300px',
                    '& .MuiMenuItem-root': { py: 0.5 },
                  },
                },
              }}
            >
              {loadingStates ? (
                <MenuItem value="" disabled>Loading states...</MenuItem>
              ) : states.length === 0 ? (
                <MenuItem value="" disabled>No states available</MenuItem>
              ) : (
                states.map((state) => (
                  <MenuItem key={state.value} value={state.value}>
                    {state.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* District Dropdown — multiple select with user counts */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel
              id="district-select-label"
              sx={{ fontSize: '12px', color: '#7C766F' }}
            >
              District
            </InputLabel>
            <Select
              labelId="district-select-label"
              label="District"
              multiple
              value={selectedDistricts}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDistricts(typeof value === 'string' ? [] : value as (number | string)[]);
              }}
              disabled={selectedState === '' || loadingDistricts}
              renderValue={(selected) => renderDistrictValue(selected as (number | string)[])}
              sx={{
                borderRadius: '8px',
                '& .MuiSelect-select': { py: 1.5 },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: '300px',
                    '& .MuiMenuItem-root': { py: 0.5 },
                  },
                },
              }}
            >
              {loadingDistricts ? (
                <MenuItem value="" disabled>Loading districts...</MenuItem>
              ) : selectedState === '' ? (
                <MenuItem value="" disabled>Select State first</MenuItem>
              ) : districts.length === 0 ? (
                <MenuItem value="" disabled>No districts available</MenuItem>
              ) : (
                districts.map((district) => (
                  <MenuItem key={district.value} value={district.value}>
                    <Checkbox checked={selectedDistricts.indexOf(district.value) > -1} />
                    <ListItemText
                      primary={
                        district.userCount != null
                          ? `${district.label} (${district.userCount})`
                          : district.label
                      }
                    />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Block Dropdown — multiple select */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel
              id="block-select-label"
              sx={{ fontSize: '12px', color: '#7C766F' }}
            >
              Block
            </InputLabel>
            <Select
              labelId="block-select-label"
              label="Block"
              multiple
              value={selectedBlocks}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedBlocks(typeof value === 'string' ? [] : value as (number | string)[]);
              }}
              disabled={selectedDistricts.length === 0 || loadingBlocks}
              renderValue={(selected) => renderBlockValue(selected as (number | string)[])}
              sx={{
                borderRadius: '8px',
                '& .MuiSelect-select': { py: 1.5 },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: '300px',
                    '& .MuiMenuItem-root': { py: 0.5 },
                  },
                },
              }}
            >
              {loadingBlocks ? (
                <MenuItem value="" disabled>Loading blocks...</MenuItem>
              ) : selectedDistricts.length === 0 ? (
                <MenuItem value="" disabled>Select District first</MenuItem>
              ) : blocks.length === 0 ? (
                <MenuItem value="" disabled>No blocks available</MenuItem>
              ) : (
                blocks.map((block) => (
                  <MenuItem key={block.value} value={block.value}>
                    <Checkbox checked={selectedBlocks.indexOf(block.value) > -1} />
                    <ListItemText primary={block.label} />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Clear Button */}
        {hasAnySelection && (
          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleClear}
              sx={{
                borderRadius: '8px',
                borderColor: '#7C766F',
                color: '#7C766F',
                textTransform: 'none',
                fontWeight: 500,
                height: '48px',
                px: 3,
                '&:hover': {
                  borderColor: '#1E1B16',
                  color: '#1E1B16',
                  bgcolor: 'transparent',
                },
              }}
            >
              Clear
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default LocationDropdowns;
