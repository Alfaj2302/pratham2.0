import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Grid,
  Autocomplete,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { showToastMessage } from '@/components/Toastify';
import { getStateBlockDistrictList } from '@/services/MasterDataService';
import {
  getCentersForDomainSkills,
  TrainerCenter,
} from '@/services/trainer/TrainerCenterService';

interface Option {
  value: string;
  label: string;
}

interface TrainerCenterSelectorProps {
  domain?: string;
  skills: string[];
  value: TrainerCenter | null;
  onChange: (center: TrainerCenter | null) => void;
}

// Same "Geography Filters" + "Centers" sectioned layout as
// MultipleBatchListWidget.tsx (the widget behind Instructor Mapping's own
// Center/Batch step) — State/District/Block/Village cascading multi-select
// filters narrow the Center search, same as that widget. Deliberately
// Center-only: no Batch section, no Batch fetch, per the ticket's "No Batch
// Selection" section.
const TrainerCenterSelector: React.FC<TrainerCenterSelectorProps> = ({
  domain,
  skills,
  value,
  onChange,
}) => {
  // Theme color
  const themeColor = '#FDBE16';
  const themeColorLight = 'rgba(253, 190, 22, 0.1)'; // 10% opacity
  const themeColorLighter = 'rgba(253, 190, 22, 0.05)'; // 5% opacity
  const themeColorDark = '#E5A814'; // Slightly darker for hover states

  const [stateOptions, setStateOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [blockOptions, setBlockOptions] = useState<Option[]>([]);
  const [villageOptions, setVillageOptions] = useState<Option[]>([]);

  const [selectedState, setSelectedState] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string[]>([]);
  const [selectedVillage, setSelectedVillage] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  const [loading, setLoading] = useState({
    state: false,
    district: false,
    block: false,
    village: false,
    centers: false,
  });

  const [centerOptions, setCenterOptions] = useState<TrainerCenter[] | null>(
    null
  );

  // Load State options once on mount.
  useEffect(() => {
    let isCurrent = true;
    const loadStates = async () => {
      setLoading((prev) => ({ ...prev, state: true }));
      try {
        const resp = await getStateBlockDistrictList({
          fieldName: 'state',
          sort: ['state_name', 'asc'],
        });
        const states =
          resp?.result?.values?.map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })) || [];
        if (isCurrent) setStateOptions(states);
      } catch (error) {
        console.error('Error loading states:', error);
        if (isCurrent) setStateOptions([]);
      } finally {
        if (isCurrent) setLoading((prev) => ({ ...prev, state: false }));
      }
    };
    loadStates();
    return () => {
      isCurrent = false;
    };
  }, []);

  // District depends on State.
  useEffect(() => {
    let isCurrent = true;
    const loadDistricts = async () => {
      if (selectedState.length === 0) {
        setDistrictOptions([]);
        setSelectedDistrict([]);
        return;
      }
      setLoading((prev) => ({ ...prev, district: true }));
      try {
        const resp = await getStateBlockDistrictList({
          fieldName: 'district',
          controllingfieldfk: selectedState,
          sort: ['district_name', 'asc'],
        });
        const districts =
          resp?.result?.values?.map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })) || [];
        if (isCurrent) setDistrictOptions(districts);
      } catch (error) {
        console.error('Error loading districts:', error);
        if (isCurrent) setDistrictOptions([]);
      } finally {
        if (isCurrent) setLoading((prev) => ({ ...prev, district: false }));
      }
    };
    loadDistricts();
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState.join(',')]);

  // Block depends on District.
  useEffect(() => {
    let isCurrent = true;
    const loadBlocks = async () => {
      if (selectedDistrict.length === 0) {
        setBlockOptions([]);
        setSelectedBlock([]);
        return;
      }
      setLoading((prev) => ({ ...prev, block: true }));
      try {
        const resp = await getStateBlockDistrictList({
          fieldName: 'block',
          controllingfieldfk: selectedDistrict,
          sort: ['block_name', 'asc'],
        });
        const blocks =
          resp?.result?.values?.map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })) || [];
        if (isCurrent) setBlockOptions(blocks);
      } catch (error) {
        console.error('Error loading blocks:', error);
        if (isCurrent) setBlockOptions([]);
      } finally {
        if (isCurrent) setLoading((prev) => ({ ...prev, block: false }));
      }
    };
    loadBlocks();
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict.join(',')]);

  // Village depends on Block.
  useEffect(() => {
    let isCurrent = true;
    const loadVillages = async () => {
      if (selectedBlock.length === 0) {
        setVillageOptions([]);
        setSelectedVillage([]);
        return;
      }
      setLoading((prev) => ({ ...prev, village: true }));
      try {
        const resp = await getStateBlockDistrictList({
          fieldName: 'village',
          controllingfieldfk: selectedBlock,
          sort: ['village_name', 'asc'],
        });
        const villages =
          resp?.result?.values?.map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })) || [];
        if (isCurrent) setVillageOptions(villages);
      } catch (error) {
        console.error('Error loading villages:', error);
        if (isCurrent) setVillageOptions([]);
      } finally {
        if (isCurrent) setLoading((prev) => ({ ...prev, village: false }));
      }
    };
    loadVillages();
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock.join(',')]);

  // Search Centers whenever Domain/Skill (from the previous step) or any of
  // the geography filters / name search change. Debounced so typing in the
  // name search doesn't fire one request per keystroke.
  useEffect(() => {
    let isCurrent = true;
    const timeoutId = setTimeout(
      async () => {
        setCenterOptions(null);
        onChange(null);
        if (!domain || skills.length === 0) {
          if (isCurrent) setCenterOptions([]);
          return;
        }
        setLoading((prev) => ({ ...prev, centers: true }));
        try {
          const centers = await getCentersForDomainSkills(domain, skills, {
            state: selectedState,
            district: selectedDistrict,
            block: selectedBlock,
            village: selectedVillage,
            name: searchKeyword || undefined,
          });
          if (isCurrent) setCenterOptions(centers);
        } catch (error) {
          console.error('Error loading centers for Trainer mapping:', error);
          showToastMessage(
            'Something went wrong while fetching centers',
            'error'
          );
          if (isCurrent) setCenterOptions([]);
        } finally {
          if (isCurrent) setLoading((prev) => ({ ...prev, centers: false }));
        }
      },
      searchKeyword ? 400 : 0
    );

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    domain,
    skills.join(','),
    selectedState.join(','),
    selectedDistrict.join(','),
    selectedBlock.join(','),
    selectedVillage.join(','),
    searchKeyword,
  ]);

  const activeFiltersCount =
    (selectedState.length > 0 ? 1 : 0) +
    (selectedDistrict.length > 0 ? 1 : 0) +
    (selectedBlock.length > 0 ? 1 : 0) +
    (selectedVillage.length > 0 ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const clearFilters = () => {
    setSelectedState([]);
    setSelectedDistrict([]);
    setSelectedBlock([]);
    setSelectedVillage([]);
  };

  const geoField = (
    label: string,
    options: Option[],
    selected: string[],
    onSelect: (values: string[]) => void,
    placeholder: string,
    isLoading: boolean,
    disabled: boolean
  ) => (
    <Grid item xs={12} sm={6} md={3}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: 'text.secondary', mb: 1 }}
      >
        {label}
      </Typography>
      <Autocomplete
        multiple
        options={options}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        value={options.filter((o) => selected.includes(o.value))}
        onChange={(_, newValue) => onSelect(newValue.map((o) => o.value))}
        loading={isLoading}
        disabled={disabled || isLoading}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.value}
              label={option.label}
              size="small"
              deleteIcon={<CloseIcon />}
            />
          ))
        }
      />
    </Grid>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Geography Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: themeColorLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FilterListIcon sx={{ fontSize: 16, color: themeColor }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Geography Filters
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hasActiveFilters
                  ? `${activeFiltersCount} filter${
                      activeFiltersCount > 1 ? 's' : ''
                    } active`
                  : 'No filters applied'}
              </Typography>
            </Box>
          </Stack>
          {hasActiveFilters && (
            <Button
              variant="text"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={clearFilters}
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
        </Stack>

        <Grid container spacing={2}>
          {geoField(
            'State',
            stateOptions,
            selectedState,
            setSelectedState,
            'Select states...',
            loading.state,
            false
          )}
          {geoField(
            'District',
            districtOptions,
            selectedDistrict,
            setSelectedDistrict,
            'Select districts...',
            loading.district,
            selectedState.length === 0
          )}
          {geoField(
            'Block',
            blockOptions,
            selectedBlock,
            setSelectedBlock,
            'Select blocks...',
            loading.block,
            selectedDistrict.length === 0
          )}
          {geoField(
            'Village',
            villageOptions,
            selectedVillage,
            setSelectedVillage,
            'Select villages...',
            loading.village,
            selectedBlock.length === 0
          )}
        </Grid>
      </Paper>

      {/* Centers */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: themeColorLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BusinessIcon sx={{ fontSize: 16, color: themeColor }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Centers
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {centerOptions == null
                ? 'Loading…'
                : `${centerOptions.length} center${
                    centerOptions.length === 1 ? '' : 's'
                  } found`}
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Search centers..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Autocomplete
          options={centerOptions || []}
          loading={loading.centers}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.cohortId === v.cohortId}
          value={value}
          onChange={(_, option) => onChange(option)}
          renderInput={(params) => <TextField {...params} label="Center" />}
        />
        {centerOptions != null && centerOptions.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 2 }}
          >
            No centers found. Please adjust your filters.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default TrainerCenterSelector;
