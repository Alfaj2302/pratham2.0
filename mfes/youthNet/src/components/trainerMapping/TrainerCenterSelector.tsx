import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Card,
  CardContent,
  Checkbox,
  IconButton,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import { getStateBlockDistrictList } from '../../services/youthNet/Dashboard/VillageServices';
import {
  getCentersForDomainSkills,
  TrainerCenter,
} from '../../services/trainerMapping/TrainerMappingService';

interface Option {
  value: string;
  label: string;
}

interface TrainerCenterSelectorProps {
  domain?: string;
  skills: string[];
  // A Trainer can be assigned to multiple Centers — used both by Map New
  // (fresh selection) and Reassign Center (pre-populated with the Trainer's
  // current Centers, so they can add/remove from that set — the "earlier
  // assigned" Centers show up already checked and in the Selected Centers
  // summary below).
  value: TrainerCenter[];
  onChange: (centers: TrainerCenter[]) => void;
  // State Lead scope: when set, only these States are offered in the State
  // filter and every Center search is pinned to them (an empty array means
  // no States are assigned, so nothing is browsable). Left undefined for
  // Central Lead, who sees Centers across every State.
  allowedStateIds?: string[];
  // Center Head scope: when set, only these Centers (the Center Head's own
  // assigned Centers) are ever listed — the Domain/Skill + geography search
  // results are narrowed to them. An empty array means nothing is listed.
  allowedCenterIds?: string[];
}

// Ported from admin-app-repo's components/trainer/TrainerCenterSelector.tsx
// (Central Lead / State Lead Trainer Mapping) so the Center Head sees the
// exact same Center step; only the imports and the allowedCenterIds scope
// differ. Keep the two in sync.
//
// Same three-section layout as MultipleCenterListWidgetNew.tsx (the widget
// behind /user-leader's own Center picker: Geography Filters -> card-grid
// Centers with checkboxes/Select All -> Selected Centers grouped by state)
// — ported here rather than reused directly because that widget has no
// Domain/Skill awareness at all (geography-only /cohort/search), while
// Trainer Centers must also match the Trainer's own Domain/Skill
// (customFieldsName, via TrainerCenterService). Deliberately Center-only:
// no Batch section, no Batch fetch, per the ticket's "No Batch Selection"
// section.
const TrainerCenterSelector: React.FC<TrainerCenterSelectorProps> = ({
  domain,
  skills,
  value,
  onChange,
  allowedStateIds,
  allowedCenterIds,
}) => {
  // Theme color
  const themeColor = '#FDBE16';
  const themeColorLight = 'rgba(253, 190, 22, 0.1)'; // 10% opacity

  const [stateOptions, setStateOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [blockOptions, setBlockOptions] = useState<Option[]>([]);
  const [villageOptions, setVillageOptions] = useState<Option[]>([]);

  // A State Lead with a single assigned State gets it preselected, so the
  // District filter is usable straight away.
  // ...and, like /user-leader's Center picker (MultipleCenterListWidgetNew),
  // that State is locked so the State Lead can't switch away from it.
  const isStateLocked = allowedStateIds?.length === 1;
  const defaultSelectedState = isStateLocked ? allowedStateIds : [];
  const [selectedState, setSelectedState] =
    useState<string[]>(defaultSelectedState);
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
        const states: Option[] =
          resp?.result?.values?.map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })) || [];
        const scopedStates = allowedStateIds
          ? states.filter((state) => allowedStateIds.includes(state.value))
          : states;
        if (isCurrent) setStateOptions(scopedStates);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedStateIds?.join(',')]);

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

  // Reset the selection only when Domain/Skill actually change to a
  // different value — not on mount, so a pre-populated `value` (Reassign
  // Center opens with the Trainer's existing Centers already selected)
  // survives the initial render, and not on geography-filter/search
  // changes, which only narrow what's browsable below and must never
  // silently drop what's already chosen.
  //
  // Compares against the *previous value* via a ref rather than a simple
  // "has an effect run before" boolean — confirmed via console logging that
  // the boolean version breaks under React 18 Strict Mode's dev-only
  // double-invocation of effects on mount (mount -> simulated unmount ->
  // mount again): the boolean ref survives that fake unmount, so the
  // second simulated mount sees "already ran once" and wrongly fires
  // onChange([]) despite domain/skills never having actually changed,
  // wiping out Reassign's freshly-loaded selection the instant it appeared.
  // Storing the actual previous key sidesteps this: the second Strict Mode
  // invocation recomputes the same key, sees no difference, and no-ops.
  const prevDepsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const depsKey = `${domain ?? ''}|${skills.join(',')}`;
    if (prevDepsKeyRef.current !== null && prevDepsKeyRef.current !== depsKey) {
      onChange([]);
    }
    prevDepsKeyRef.current = depsKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, skills.join(',')]);

  // Search Centers whenever Domain/Skill (from the previous step) or any of
  // the geography filters / name search change. Debounced so typing in the
  // name search doesn't fire one request per keystroke.
  useEffect(() => {
    let isCurrent = true;
    const timeoutId = setTimeout(
      async () => {
        setCenterOptions(null);
        if (
          !domain ||
          skills.length === 0 ||
          (allowedStateIds && allowedStateIds.length === 0) ||
          (allowedCenterIds && allowedCenterIds.length === 0)
        ) {
          if (isCurrent) setCenterOptions([]);
          return;
        }
        setLoading((prev) => ({ ...prev, centers: true }));
        try {
          // With no State picked, a scoped (State Lead) search still stays
          // inside the assigned States instead of falling back to all.
          const stateFilter =
            selectedState.length > 0 ? selectedState : allowedStateIds;
          const centers = await getCentersForDomainSkills(domain, skills, {
            state: stateFilter,
            district: selectedDistrict,
            block: selectedBlock,
            village: selectedVillage,
            name: searchKeyword || undefined,
          });
          const scopedCenters = allowedCenterIds
            ? centers.filter((center) => allowedCenterIds.includes(center.cohortId))
            : centers;
          if (isCurrent) setCenterOptions(scopedCenters);
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
    allowedStateIds?.join(','),
    allowedCenterIds?.join(','),
  ]);

  // A locked State isn't a user-applied filter, so it doesn't count toward
  // the "N filters active" badge or bring up Clear on its own.
  const activeFiltersCount =
    (selectedState.length > 0 && !isStateLocked ? 1 : 0) +
    (selectedDistrict.length > 0 ? 1 : 0) +
    (selectedBlock.length > 0 ? 1 : 0) +
    (selectedVillage.length > 0 ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const clearFilters = () => {
    setSelectedState(defaultSelectedState);
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

  // ---- Center selection (card grid + Select All) ----
  const selectedCenterIds = useMemo(() => value.map((c) => c.cohortId), [value]);

  const handleCenterToggle = (center: TrainerCenter) => {
    const isSelected = selectedCenterIds.includes(center.cohortId);
    if (isSelected) {
      onChange(value.filter((c) => c.cohortId !== center.cohortId));
    } else {
      onChange([...value, center]);
    }
  };

  const visibleCenters = centerOptions || [];
  const isAllSelected =
    visibleCenters.length > 0 &&
    visibleCenters.every((center) => selectedCenterIds.includes(center.cohortId));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const idsToRemove = visibleCenters.map((c) => c.cohortId);
      onChange(value.filter((c) => !idsToRemove.includes(c.cohortId)));
    } else {
      const existingIds = value.map((c) => c.cohortId);
      const toAdd = visibleCenters.filter((c) => !existingIds.includes(c.cohortId));
      onChange([...value, ...toAdd]);
    }
  };

  // ---- Selected Centers summary, grouped by state ----
  const selectedCentersByState = useMemo(() => {
    const grouped: Record<string, TrainerCenter[]> = {};
    value.forEach((center) => {
      const state = center.state || 'Unknown';
      if (!grouped[state]) grouped[state] = [];
      grouped[state].push(center);
    });
    return grouped;
  }, [value]);
  const selectedStatesCount = Object.keys(selectedCentersByState).length;

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
            isStateLocked
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

      {/* Centers — card grid with checkboxes + Select All */}
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
          {visibleCenters.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={isAllSelected}
                onChange={handleSelectAll}
                icon={<CheckBoxOutlineBlankIcon />}
                checkedIcon={<CheckBoxIcon />}
                sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }}
              />
              <Typography variant="body2" color="text.secondary">
                Select All
              </Typography>
            </Box>
          )}
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Search centers..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 2 }}
        />

        {loading.centers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: themeColor }} />
          </Box>
        ) : visibleCenters.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No centers found. Please adjust your filters.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden', pr: 1 }}>
            <Grid container spacing={2}>
              {visibleCenters.map((center) => {
                const isSelected = selectedCenterIds.includes(center.cohortId);
                const locationParts = [center.village, center.block, center.district, center.state].filter(
                  Boolean
                );
                return (
                  <Grid item xs={12} sm={6} md={3} key={center.cohortId} sx={{ display: 'flex' }}>
                    <Card
                      sx={{
                        border: isSelected ? `2px solid ${themeColor}` : '1px solid',
                        borderColor: isSelected ? themeColor : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': { boxShadow: 2, borderColor: themeColor },
                      }}
                      onClick={() => handleCenterToggle(center)}
                    >
                      <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleCenterToggle(center)}
                            onClick={(e) => e.stopPropagation()}
                            icon={<CheckBoxOutlineBlankIcon />}
                            checkedIcon={<CheckBoxIcon />}
                            sx={{
                              color: themeColor,
                              '&.Mui-checked': { color: themeColor },
                              p: 0,
                              mt: 0.5,
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight={600}
                              sx={{
                                mb: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                minHeight: '2.5em',
                              }}
                            >
                              {center.name}
                            </Typography>
                            {locationParts.length > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                                >
                                  {locationParts.map((part, index) => (
                                    <React.Fragment key={index}>
                                      {index > 0 && (
                                        <Box component="span" sx={{ mx: 0.5, color: 'text.secondary' }}>
                                          •
                                        </Box>
                                      )}
                                      <Box
                                        component="span"
                                        sx={{
                                          color: index === locationParts.length - 1 ? themeColor : 'text.secondary',
                                          fontWeight: index === locationParts.length - 1 ? 500 : 400,
                                        }}
                                      >
                                        {part}
                                      </Box>
                                    </React.Fragment>
                                  ))}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Selected Centers — includes earlier-assigned Centers (Reassign
          opens with `value` already populated), grouped by state, each
          removable individually. */}
      {value.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
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
                <CheckCircleIcon sx={{ fontSize: 16, color: themeColor }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Selected Centers
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {value.length} center{value.length !== 1 ? 's' : ''} across {selectedStatesCount} state
                  {selectedStatesCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="text"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => onChange([])}
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {Object.entries(selectedCentersByState).map(([state, centers]) => (
              <Grid item xs={12} sm={6} key={state}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ color: themeColor, mb: 1.5, textTransform: 'uppercase' }}
                  >
                    {state} ({centers.length})
                  </Typography>
                  <Stack spacing={1.5}>
                    {centers.map((center) => {
                      const locationParts = [center.village, center.block, center.district].filter(Boolean);
                      return (
                        <Card
                          key={center.cohortId}
                          sx={{
                            bgcolor: themeColorLight,
                            border: '1px solid',
                            borderColor: 'rgba(253, 190, 22, 0.3)',
                            borderRadius: 1.5,
                            p: 1.5,
                            position: 'relative',
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleCenterToggle(center)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              p: 0.5,
                              color: 'text.secondary',
                              '&:hover': { color: 'error.main', bgcolor: 'rgba(0, 0, 0, 0.04)' },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, pr: 3 }}>
                            {center.name}
                          </Typography>
                          {locationParts.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOnIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                              >
                                {locationParts.map((part, index) => (
                                  <React.Fragment key={index}>
                                    {index > 0 && (
                                      <Box component="span" sx={{ mx: 0.5, color: 'text.secondary' }}>
                                        •
                                      </Box>
                                    )}
                                    <Box component="span">{part}</Box>
                                  </React.Fragment>
                                ))}
                              </Typography>
                            </Box>
                          )}
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default TrainerCenterSelector;
