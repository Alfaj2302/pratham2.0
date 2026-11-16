import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Modal,
  Typography,
  Button,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import CloseIcon from '@mui/icons-material/Close';
import { modalStyles } from '../../styles/modalStyles';
import {
  getCohortList as getCohortListService,
  bulkCreateCohortMembers,
} from '../../services/CohortService/cohortService';
import {
  getCohortList as getCohortListWithChildren,
  getCohortData,
} from '../../services/CohortServices';

import { updateUserTenantStatus } from '../../services/ManageUser';
import { showToastMessage } from '../Toastify';
import { LocationFilters } from './types';
import { editEditUser } from '../../services/ProfileService';
import { Role } from '../../utils/app.constant';
import { getInterestedToJoinFieldId } from '../../utils/helper';

interface AssignBatchModalProps {
  open: boolean;
  onClose: () => void;
  selectedLearners: string[];
  onAssign: (data: {
    mode: string;
    center: string;
    batchId: string;
    batchName: string;
  }) => void;
  locationFilters: LocationFilters;
  selectedLearnerIds: string[];
}

const AssignBatchModal: React.FC<AssignBatchModalProps> = ({
  open,
  onClose,
  selectedLearners,
  onAssign,
  locationFilters,
  selectedLearnerIds,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const [mode, setMode] = useState('in-person');
  const [center, setCenter] = useState('');
  const [batch, setBatch] = useState('');
  const [centers, setCenters] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [batches, setBatches] = useState<
    Array<{ label: string; value: string; parentId?: string }>
  >([]);
  const [allBatches, setAllBatches] = useState<
    Array<{ label: string; value: string; parentId?: string }>
  >([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedBatchName, setSelectedBatchName] = useState('');

  // Check if user is a Teacher
  const isTeacher =
    typeof window !== 'undefined' &&
    localStorage.getItem('role') === Role.TEACHER;

  // Check if user is a Lead
  const isLead =
    typeof window !== 'undefined' &&
    localStorage.getItem('role') === Role.TEAM_LEADER;

  const handleAssign = async () => {
    if (!center || !batch || selectedLearnerIds.length === 0) {
      return;
    }

    const tenantId =
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (!tenantId) {
      console.error('tenantId not found in localStorage');
      return;
    }

    setIsAssigning(true);
    try {
      await Promise.all(
        selectedLearnerIds.map((userId) =>
          updateUserTenantStatus(userId, tenantId, 'active')
        )
      );
      const interestedToJoinFieldId = getInterestedToJoinFieldId();
      if (interestedToJoinFieldId) {
        const userDetails = {
          userData: {},
          customFields: [
            {
              fieldId: interestedToJoinFieldId,
              value: 'joined',
            },
          ],
        };
        await Promise.all(
          selectedLearnerIds.map((userId) => editEditUser(userId, userDetails))
        );
      }

      await bulkCreateCohortMembers({
        userId: selectedLearnerIds,
        cohortId: [batch],
      });

      onAssign({
        mode,
        center,
        batchId: batch,
        batchName: selectedBatchName || '',
      });
    } catch (error) {
      showToastMessage(
        t('USER_REGISTRATION.SOMETHING_WENT_WRONG_ASSIGNING_BATCH'),
        'error'
      );
      console.error('Error while assigning batch:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const locationKey = useMemo(
    () =>
      JSON.stringify([
        locationFilters.states,
        locationFilters.districts,
        locationFilters.blocks,
        locationFilters.villages,
      ]),
    [locationFilters]
  );

  const hasLocationSelection = true;
  //bug fix for location atatch to center dropdown
  // Boolean(locationFilters.states?.length) &&
  // Boolean(locationFilters.districts?.length) &&
  // Boolean(locationFilters.blocks?.length) &&
  // Boolean(locationFilters.villages?.length);

  // const buildCenterFilters = async() => {
  //   const filters: Record<string, string[] | string> = {
  //     type: 'COHORT',
  //     status: ['active'],
  //   };

  //   const addFilter = (key: string, values?: (string | number)[]) => {
  //     if (values && values.length > 0) {
  //       filters[key] = values.map((value) => String(value));
  //     }
  //   };
  //   let response: any;
  //   if (typeof window !== 'undefined' && window.localStorage) {
  //     const userId = localStorage.getItem('userId');
  //     if (userId) {
  //      response = await getCohortListWithChildren(userId, {
  //         customField: 'true',
  //       });
  //       console.log('response', response[0]?.customField);
  //       // setCenters(response.map((cohort: any) => ({
  //       //   label: `${capitalizeFirstChar(cohort.name)} (${capitalizeFirstChar(getField(cohort.customFields, "TYPE_OF_CENTER"))})`,
  //       //   value: cohort.cohortId,
  //       // })));
  //     }}
  //     const getSelectedId = (label: any, data: any) => {
  //       const field = data.find(item => item.label === label);
  //       const selected = field?.selectedValues?.[0];

  //       return typeof selected === "object" ? selected.id : null;
  //     };
  //     // console.log('getSelectedId', getSelectedId('STATE', response[0]?.customField));
  //     // console.log('getSelectedId', getSelectedId('DISTRICT', response[0]?.customField));
  //     // console.log('getSelectedId', getSelectedId('BLOCK', response[0]?.customField));
  //     // console.log('getSelectedId', getSelectedId('VILLAGE', response[0]?.customField));
  //     // console.log('locationFilters.states', locationFilters.states);
  //     // console.log('locationFilters.districts', locationFilters.districts);
  //     // console.log('locationFilters.blocks', locationFilters.blocks);
  //     // console.log('locationFilters.villages', locationFilters.villages);
  //   addFilter('state', [getSelectedId('STATE', response[0]?.customField)]);
  //   addFilter('district',[getSelectedId('DISTRICT', response[0]?.customField)]);
  //   addFilter('block',[getSelectedId('BLOCK', response[0]?.customField)]);
  //   addFilter('village',[getSelectedId('VILLAGE', response[0]?.customField)]);
  //   console.log('filters=====>', filters);

  //   return filters;
  // };
  function getField(customFields: any, label: any) {
    const field = customFields.find((f: any) => f.label === label);
    if (!field) return null;

    // If selectedValues is an array of objects → return object.value
    // If selectedValues is array of strings → return string
    const val = field.selectedValues?.[0];
    return typeof val === 'object' ? val.value : val;
  }

  const capitalizeFirstChar = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!hasLocationSelection) {
      setCenters([]);
      setCenter('');
      setBatches([]);
      setAllBatches([]);
      setBatch('');
      return;
    }

    const fetchCenters = async () => {
      setLoadingCenters(true);
      try {
        if (isLead) {
          // For Lead role: Use getCohortData with children=true and customField=true
          const cohortResponseData = await getCohortData(
            localStorage.getItem('userId') || '',
            { customField: true, children: true }
          );
          const cohortData = cohortResponseData?.result ?? [];

          // Extract centers (cohorts with type COHORT or no parentId)
          // Only centers where the logged-in user's membership is still active
          const centerDetails = cohortData.filter(
            (cohort: any) =>
              cohort?.type === 'COHORT' &&
              (cohort?.cohortStatus === 'active' ||
                cohort?.status === 'active') &&
              cohort?.cohortMemberStatus === 'active' &&
              !cohort?.parentId
          );

          // Map centers
          const centerOptions = centerDetails.map((cohort: any) => {
            const cf = cohort.customField || cohort.customFields;
            return {
              label: `${capitalizeFirstChar(
                cohort.cohortName || cohort.name
              )} (${capitalizeFirstChar(getField(cf, 'TYPE_OF_CENTER'))})`,
              value: cohort.cohortId,
            };
          });

          setCenters(centerOptions);

          // Extract all batches from childData of all centers
          const allBatchDetails: any[] = [];
          centerDetails.forEach((center: any) => {
            if (center?.childData && Array.isArray(center.childData)) {
              center.childData.forEach((batch: any) => {
                // Only include active batches
                if (
                  batch?.type === 'BATCH' &&
                  (batch?.status === 'active' ||
                    batch?.cohortStatus === 'active')
                ) {
                  allBatchDetails.push({
                    ...batch,
                    parentId: center.cohortId,
                  });
                }
              });
            }
          });
           console.log('allBatchDetails', allBatchDetails);
          // Store all batches for later filtering by center
          const allBatchOptions = allBatchDetails?.map((batch: any) => ({
            label:
              capitalizeFirstChar(batch.name || batch.cohortName) ||
              t('USER_REGISTRATION.UNNAMED_BATCH'),
            value: batch.cohortId,
            parentId: batch.parentId,
          }));

          setAllBatches(allBatchOptions);

          // Set the first center as selected if available
          const centerStillValid = centerOptions.some(
            (option: any) => option.value === center
          );
          if (!centerStillValid) {
            const nextCenter = centerOptions[0]?.value ?? '';
            setCenter(nextCenter);
            setBatch('');
            setBatches([]);
          }
        } else {
          // For Instructor role: Keep existing logic
          // First, fetch all batches to get parentIds using getCohortData
          const batchResponseData = await getCohortData(
            localStorage.getItem('userId') || ''
          );
          const cohortData = batchResponseData?.result ?? [];

          // Helper function to recursively extract all batches
          const extractBatches = (cohorts: any[]): any[] => {
            let batches: any[] = [];
            cohorts.forEach((cohort: any) => {
              // Batches are items in childData that have a parentId, or items with type BATCH
              if (
                cohort?.parentId ||
                cohort?.type === 'BATCH' ||
                cohort?.cohortType === 'BATCH'
              ) {
                // Only include active batches
                if (
                  cohort?.status === 'active' ||
                  cohort?.cohortStatus === 'active'
                ) {
                  batches.push(cohort);
                }
              }
              // Recursively search in childData
              if (cohort?.childData && Array.isArray(cohort.childData)) {
                batches = batches.concat(extractBatches(cohort.childData));
              }
            });
            return batches;
          };

          const batchDetails = extractBatches(cohortData);

          // Only batches where the logged-in user's membership is still active
          const activeMemberBatches = batchDetails?.filter(
            (batch: any) => batch?.cohortMemberStatus === 'active'
          );

          // Store all batches for later filtering by center
          const allBatchOptions = activeMemberBatches?.map((batch: any) => ({
            label:
              capitalizeFirstChar(batch.name || batch.cohortName) ||
              t('USER_REGISTRATION.UNNAMED_BATCH'),
            value: batch.cohortId,
            parentId: batch.parentId,
            cohortMemberStatus: batch.cohortMemberStatus,
          }));
          setAllBatches(allBatchOptions);

          // Extract all unique parentIds from batches
          const parentIds = Array.from(
            new Set(
              activeMemberBatches
                .map((batch: any) => batch.parentId)
                .filter(
                  (id: any) =>
                    id &&
                    id !== 'Select' &&
                    typeof id === 'string' &&
                    id.trim() !== ''
                )
            )
          );

          if (parentIds.length === 0) {
            setCenters([]);
            setCenter('');
            setBatches([]);
            setAllBatches([]);
            setBatch('');
            return;
          }

          // Fetch centers using parentIds as cohortId filter
          const centerResponse = await getCohortListService({
            limit: 200,
            offset: 0,
            sort: ['name', 'asc'],
            filters: {
              cohortId: parentIds,
              type: 'COHORT',
              status: ['active'],
            },
          });

          const centerDetails = centerResponse?.results?.cohortDetails ?? [];
          const centerOptions = centerDetails.map((cohort: any) => {
            const cf = cohort.customField;

            return {
              label: isTeacher
                ? `${capitalizeFirstChar(cohort.name)}`
                : `${capitalizeFirstChar(cohort.name)} (${capitalizeFirstChar(
                    getField(cf, 'TYPE_OF_CENTER')
                  )})`,
              value: cohort.cohortId,
            };
          });

          setCenters(centerOptions);

          // Set the first center as selected if available
          const centerStillValid = centerOptions.some(
            (option: any) => option.value === center
          );
          if (!centerStillValid) {
            const nextCenter = centerOptions[0]?.value ?? '';
            setCenter(nextCenter);
            setBatch('');
            setBatches([]);
          }
        }
      } catch (error) {
        console.error('Error fetching centers:', error);
        setCenters([]);
        setCenter('');
        setBatch('');
        setBatches([]);
        setAllBatches([]);
      } finally {
        setLoadingCenters(false);
      }
    };

    fetchCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locationKey, isTeacher, isLead]);

  useEffect(() => {
    if (!center) {
      setBatches([]);
      setBatch('');
      return;
    }

    // Filter batches from allBatches by selected center
    const filteredBatches = allBatches.filter(
      (batch) => batch.parentId === center
    );
console.log('filteredBatches', filteredBatches);
    setBatches(filteredBatches);
    if (filteredBatches.length > 0) {
      const nextBatch = filteredBatches.some(
        (option: any) => option.value === batch
      )
        ? batch
        : filteredBatches[0]?.value || '';
      setBatch(nextBatch);
      const batchLabel =
        filteredBatches.find((option: any) => option.value === nextBatch)
          ?.label || '';
      setSelectedBatchName(batchLabel);
    } else {
      setBatch('');
      setSelectedBatchName('');
    }
  }, [center, allBatches, batch]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="assign-batch-modal-title"
      aria-describedby="assign-batch-modal-description"
    >
      <Box
        sx={{
          ...modalStyles(theme, '500px'),
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            p: 2,
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '20px',
                color: '#1E1B16',
                mb: 0.5,
              }}
            >
              {t('USER_REGISTRATION.LEARNERS_SELECTED', {
                count: selectedLearners.length,
              })}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '14px', color: '#7C766F' }}
            >
              {t('USER_REGISTRATION.ASSIGN_BATCH')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 24, color: '#4A4640' }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {/* Learners Section */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '12px',
                color: '#7C766F',
                display: 'block',
                mb: 1,
              }}
            >
              {t('USER_REGISTRATION.LEARNERS_LABEL')}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: '16px', fontWeight: 600, color: '#1E1B16' }}
            >
              {selectedLearners.join(', ')}
            </Typography>
          </Box>

          {/* Mode of Learning */}
          {/* <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: '12px', color: '#7C766F', display: 'block', mb: 1.5 }}
            >
              Mode of Learning
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                sx={{ gap: 3 }}
              >
                <FormControlLabel
                  value="in-person"
                  control={<Radio sx={{ color: '#1E1B16', '&.Mui-checked': { color: '#1E1B16' } }} />}
                  label="In person"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px', color: '#1E1B16' } }}
                />
                <FormControlLabel
                  value="remote"
                  control={<Radio sx={{ color: '#1E1B16', '&.Mui-checked': { color: '#1E1B16' } }} />}
                  label="Remote"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px', color: '#1E1B16' } }}
                />
              </RadioGroup>
            </FormControl>
          </Box> */}

          {/* Center Dropdown */}
          <Box sx={{ mb: 3 }}>
            <InputLabel
              sx={{
                fontSize: '12px',
                color: '#7C766F',
                mb: 1,
                transform: 'none',
                position: 'static',
              }}
            >
              {t('USER_REGISTRATION.CENTER')}
            </InputLabel>
            <Select
              fullWidth
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: '8px',
                '& .MuiSelect-select': {
                  py: 1.5,
                },
              }}
              disabled={!hasLocationSelection || loadingCenters}
              MenuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                PaperProps: {
                  sx: {
                    maxHeight: '220px',
                  },
                },
              }}
            >
              {loadingCenters ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.LOADING_CENTERS')}
                </MenuItem>
              ) : !hasLocationSelection ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.SET_LOCATION_FILTERS_FIRST')}
                </MenuItem>
              ) : centers.length === 0 ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.NO_CENTERS_AVAILABLE')}
                </MenuItem>
              ) : (
                centers.map((centerOption) => (
                  <MenuItem key={centerOption.value} value={centerOption.value}>
                    {centerOption.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </Box>

          {/* Batch Dropdown */}
          <Box sx={{ mb: 2 }}>
            <InputLabel
              sx={{
                fontSize: '12px',
                color: '#7C766F',
                mb: 1,
                transform: 'none',
                position: 'static',
              }}
            >
              {t('USER_REGISTRATION.BATCH')}
            </InputLabel>
            <Select
              fullWidth
              value={batch}
              onChange={(e) => {
                const selectedValue = e.target.value;
                setBatch(selectedValue);
                const selectedBatch = batches.find(
                  (option) => option.value === selectedValue
                );
                setSelectedBatchName(selectedBatch?.label || '');
              }}
              displayEmpty
              sx={{
                borderRadius: '8px',
                '& .MuiSelect-select': {
                  py: 1.5,
                },
              }}
              disabled={!center || loadingBatches}
              MenuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                PaperProps: {
                  sx: {
                    maxHeight: '220px',
                  },
                },
              }}
            >
              {loadingBatches ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.LOADING_BATCHES')}
                </MenuItem>
              ) : !center ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.SELECT_CENTER_FIRST')}
                </MenuItem>
              ) : batches.length === 0 ? (
                <MenuItem value="" disabled>
                  {t('USER_REGISTRATION.NO_BATCHES_AVAILABLE')}
                </MenuItem>
              ) : (
                batches.map((batchOption) => (
                  <MenuItem key={batchOption.value} value={batchOption.value}>
                    {batchOption.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleAssign}
            disabled={
              !center ||
              !batch ||
              loadingCenters ||
              loadingBatches ||
              isAssigning
            }
            sx={{
              bgcolor: '#FDBE16',
              color: '#1E1B16',
              fontWeight: 600,
              fontSize: '16px',
              borderRadius: '100px',
              py: 1.5,
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#F5B800',
              },
              '&:disabled': {
                bgcolor: '#e0e0e0',
                color: '#9e9e9e',
              },
            }}
          >
            {t('USER_REGISTRATION.ASSIGN_BATCH_LEARNERS', {
              count: selectedLearners.length,
            })}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AssignBatchModal;