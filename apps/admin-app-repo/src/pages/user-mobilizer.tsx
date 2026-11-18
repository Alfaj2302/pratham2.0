// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  MobilizerSearchSchema,
  MobilizerUISchema,
} from '../constant/Forms/MobilizerSearch';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apartment from '../../public/images/apartment.svg';

import { Role, ROLE_LOGIN_URL_MAP, RoleId, RoleName, Status, TenantName } from '@/utils/app.constant';
import { HierarchicalSearchUserList, userList } from '@/services/UserList';
import {
  Box,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Autocomplete,
  Chip,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@shared-lib-v2/MapUser/DeleteUser';
import { reactivateUserRoleAndTenant } from '@shared-lib-v2/MapUser/UserRoleArchival';
import DeleteDetails from '@/components/DeleteDetails';
import editIcon from '../../public/images/editIcon.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import AddEditUser from '@/components/EntityForms/AddEditUser/AddEditUser';
import TenantService from '@/services/TenantService';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import { extractWorkingLocationVillages, transformLabel } from '@/utils/helper';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import restoreIcon from '../../public/images/restore_user.svg';
import { showToastMessage } from '@/components/Toastify';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import CenterListWidget from '@shared-lib-v2/MapUser/CenterListWidget';
import WorkingVillageAssignmentWidget from '@shared-lib-v2/MapUser/WorkingVillageAssignmentWidget';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';
import {
  enhanceUiSchemaWithGrid,
  splitUserData,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { buildProgramMappingEmailRequest } from '@shared-lib-v2/DynamicForm/utils/notifications/programMapping';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import axios from 'axios';
import {
  bulkCreateCohortMembers,
  updateCohortMemberStatus,
} from '@/services/CohortService/cohortService';
import { getCohortList } from '@/services/GetCohortList';
import { updateUser } from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import { sendCredentialService } from '@/services/NotificationService';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import useStore from '@/store/store';
import {
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

const Mobilizer = () => {
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);

  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(MobilizerSearchSchema);
  const [uiSchema, setUiSchema] = useState(MobilizerUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [prefilledState, setPrefilledState] = useState({});
  const [prefilledAddFormData, setPrefilledAddFormData] = useState({});
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editableUserId, setEditableUserId] = useState('');
  const [state, setState] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { t, i18n } = useTranslation();
  const formRef = useRef(null);

  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [userID, setUserId] = useState('');
  const [village, setVillage] = useState('');
  const [reason, setReason] = useState('');
  const [selectedCenters, setSelectedCenters] = useState<any[]>([]);
  const [availableCenters, setAvailableCenters] = useState<any[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [workingVillageId, setWorkingVillageId] = useState('');
  const [workingLocationId, setWorkingLocationId] = useState('');
  // Restore/reactivate (single center + villages)
  const [restoreCentersForWidget, setRestoreCentersForWidget] = useState<
    Array<{ id: string; name: string; cohortMembershipId?: string }>
  >([]);
  const [restoreCenterIdToMembershipId, setRestoreCenterIdToMembershipId] =
    useState<Record<string, string>>({});
  const [restoreSelectedCenterId, setRestoreSelectedCenterId] =
    useState<string>('');
  const [restoreSelectedVillagesSet, setRestoreSelectedVillagesSet] = useState<
    Set<string>
  >(new Set());
  const [restoreVillagesByBlockData, setRestoreVillagesByBlockData] = useState<
    Record<string, any[]>
  >({});
  const [isRestoreInProgress, setIsRestoreInProgress] = useState(false);
  // const [workingVillageValues, setWorkingVillageValues] = useState([]);

  const searchStoreKey = 'mobilizer';
  const initialFormDataSearch =
    localStorage.getItem(searchStoreKey) &&
    localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};

  const storedUserData = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  console.log(
    '########### type mobilizer process.env.NEXT_PUBLIC_TEACHER_SBPLAYER',
    process.env.NEXT_PUBLIC_TEACHER_SBPLAYER
  );
  console.log(
    '########### type mobilizer process.env.NEXT_PUBLIC_ADMIN_SBPLAYER',
    process.env.NEXT_PUBLIC_ADMIN_SBPLAYER
  );
  let cleanedUrl = process.env.NEXT_PUBLIC_ADMIN_SBPLAYER?.replace(
    /\/sbplayer$/,
    ''
  );

  const [roleId, setRoleID] = useState('');
  console.log('########### type cleanedUrl', cleanedUrl);

  useEffect(() => {
    if (response?.result?.totalCount !== 0) {
      searchData(prefilledFormData, 0);
    }
  }, [pageLimit]);
  useEffect(() => {
    // Fetch form schema from API and set it in state.
    const fetchData = async () => {
      const responseForm = await fetchForm([
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.mobilizer.context}&contextType=${FormContext.mobilizer.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.mobilizer.context}&contextType=${FormContext.mobilizer.contextType}`,
          header: {
            tenantid: TenantService.getTenantId(),
          },
        },
      ]);
      // console.log('responseForm', responseForm);
      let alterSchema = responseForm?.schema;
      let alterUISchema = responseForm?.uiSchema;
      console.log('alterSchema@@@', alterSchema);
      if (alterSchema) {
        setWorkingVillageId(alterSchema?.properties?.working_village?.fieldId);
        // Store working_location fieldId before removing it
        setWorkingLocationId(
          alterSchema?.properties?.working_location?.fieldId
        );
      }
      // Remove working_village and working_location from schema and uiSchema
      // working_location will come from WorkingVillageAssignmentWidget (step 1)
      const keysToRemove = ['working_village', 'working_location'];
      keysToRemove.forEach((key) => delete alterSchema.properties[key]);
      keysToRemove.forEach((key) => delete alterUISchema[key]);
      //also remove from required if present
      alterSchema.required =
        alterSchema.required?.filter((key) => !keysToRemove.includes(key)) ||
        [];
      if (alterUISchema?.firstName) {
        alterUISchema.firstName['ui:disabled'] = true;
      }
      if (alterUISchema?.lastName) {
        alterUISchema.lastName['ui:disabled'] = true;
      }
      if (alterUISchema?.dob) {
        alterUISchema.dob['ui:disabled'] = true;
      }
      if (alterUISchema?.email) {
        alterUISchema.email['ui:disabled'] = true;
      }
      if (alterUISchema?.mobile) {
        //if mobile is not required, then disable it
        // alterUISchema.mobile['ui:disabled'] = true;
      }

      //bug fix for bakcend multiple times same fields in both form
      let requiredArray = alterSchema?.required;
      if (Array.isArray(requiredArray)) {
        // Remove duplicates from requiredArray
        requiredArray = Array.from(new Set(requiredArray));
      }
      alterSchema.required = requiredArray;

      //set 2 grid layout
      alterUISchema = enhanceUiSchemaWithGrid(alterUISchema);

      console.log('############# debugschema alterUISchema', alterUISchema);
      console.log('############# debugschema alterSchema', alterSchema);

      setAddSchema(alterSchema);
      setAddUiSchema(alterUISchema);
      setTenantId(localStorage.getItem('tenantId'));
    };

    setPrefilledAddFormData(initialFormDataSearch);
    fetchData();

    setRoleID(RoleId.MOBILIZER);
    setTenantId(localStorage.getItem('tenantId'));
  }, []);

  const extractVillageIdsFromWorkingLocation = (
    workingLocation: any
  ): string[] | null => {
    if (!workingLocation || !Array.isArray(workingLocation)) {
      return null;
    }

    const villageIds: string[] = [];

    // Iterate through all states -> districts -> blocks -> villages
    for (const state of workingLocation) {
      if (state.districts && Array.isArray(state.districts)) {
        for (const district of state.districts) {
          if (district.blocks && Array.isArray(district.blocks)) {
            for (const block of district.blocks) {
              if (block.villages && Array.isArray(block.villages)) {
                for (const village of block.villages) {
                  if (village.id) {
                    villageIds.push(String(village.id));
                  }
                }
              }
            }
          }
        }
      }
    }

    // Return null if no villages found, otherwise return array of IDs
    return villageIds.length > 0 ? villageIds : null;
  };

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true, // Hide submit button if isHide is true
    },
  };

  const SubmitaFunction = async (formData: any) => {
    if (Object.keys(formData).length > 0) {
      setPrefilledFormData(formData);
      //set prefilled search data on refresh
      localStorage.setItem(searchStoreKey, JSON.stringify(formData));
      await searchData(formData, 0);
    }
  };
  const HierarchicalSearchUserListCustom = async (data) => {
    const { role, tenantId, ...filteredFilters } = data.filters;
    const newData = {
      ...data,
      filters: filteredFilters,
    };
    return await HierarchicalSearchUserList({
      ...newData,
      role: [RoleName.MOBILIZER],
      customfields: ['state', 'district', 'block', 'village', 'working_location', 'working_village'],
    });
  };

  //new variables
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<
    string | string[] | null
  >(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMappingInProgress, setIsMappingInProgress] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [cohortResponse, setCohortResponse] = useState<any>(null); // Store full cohort/search API response
  const [catchmentAreaData, setCatchmentAreaData] = useState<any>(null); // Store extracted CATCHMENT_AREA data
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null); // Track selected state
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  ); // Track selected district
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null); // Track selected block
  const [workingVillageAssignmentCenterId, setWorkingVillageAssignmentCenterId] = useState<string | null>(null);
  const [workingVillageAssignmentLocation, setWorkingVillageAssignmentLocation] = useState<any>(null);
  const [selectedVillagesSet, setSelectedVillagesSet] = useState<Set<string>>(new Set());
  const [villagesByBlockData, setVillagesByBlockData] = useState<Record<string, Array<{ id: string; name: string; blockId: string; unavailable: boolean; assigned: boolean }>>>({});
  const [centerOptionsData, setCenterOptionsData] = useState<any[]>([]);

  // Edit modal variables
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserIdEdit, setSelectedUserIdEdit] = useState<string | null>(null);
  const [selectedUserRow, setSelectedUserRow] = useState<any>(null);
  const [isEditInProgress, setIsEditInProgress] = useState(false);

  // Reassign modal variables
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<string | null>(null);
  const [reassignRow, setReassignRow] = useState<any>(null);
  const [reassignCenterId, setReassignCenterId] = useState<string | null>(null);
  const [reassignWorkingVillageIds, setReassignWorkingVillageIds] = useState<string>('');
  const [reassignSelectedVillages, setReassignSelectedVillages] = useState<Set<string>>(new Set());
  const [reassignVillagesByBlock, setReassignVillagesByBlock] = useState<Record<string, Array<{ id: string; name: string; blockId: string; unavailable: boolean; assigned: boolean }>>>({});
  const [reassignCenterOptions, setReassignCenterOptions] = useState<any[]>([]);
  const [isReassignInProgress, setIsReassignInProgress] = useState(false);

  // Function to check if villages are selected in working_location
  // Returns { isValid: boolean, missingBlocks: Array<{state, district, block}>, isWorkingLocationMissing?: boolean }
  const validateVillagesSelected = (
    userDetails: any
  ): {
    isValid: boolean;
    missingBlocks: Array<{
      stateName: string;
      districtName: string;
      blockName: string;
    }>;
    isWorkingLocationMissing?: boolean;
  } => {
    const missingBlocks: Array<{
      stateName: string;
      districtName: string;
      blockName: string;
    }> = [];

    // Extract working_location from userDetails
    // It can be at top level or inside customFields array
    let workingLocation = userDetails?.working_location;

    // If not at top level, try to find it in customFields
    // working_location has a specific structure: array of objects with stateId, stateName, districts
    if (
      !workingLocation &&
      userDetails?.customFields &&
      Array.isArray(userDetails.customFields)
    ) {
      const workingLocationField = userDetails.customFields.find(
        (field: any) => {
          // Check if the value matches working_location structure
          if (
            field.value &&
            Array.isArray(field.value) &&
            field.value.length > 0
          ) {
            const firstItem = field.value[0];
            // working_location structure: { stateId, stateName, districts: [...] }
            return (
              firstItem &&
              typeof firstItem === 'object' &&
              'stateId' in firstItem &&
              'stateName' in firstItem &&
              'districts' in firstItem
            );
          }
          return false;
        }
      );
      if (workingLocationField?.value) {
        workingLocation = workingLocationField.value;
      }
    }

    if (!workingLocation) {
      console.log(
        'validateVillagesSelected: No working_location found in userDetails or customFields',
        userDetails
      );
      // Return with a flag to indicate working_location is missing entirely
      return {
        isValid: false,
        missingBlocks: [],
        isWorkingLocationMissing: true,
      };
    }
    if (!Array.isArray(workingLocation) || workingLocation.length === 0) {
      console.log(
        'validateVillagesSelected: working_location is not a valid array'
      );
      return {
        isValid: false,
        missingBlocks: [],
        isWorkingLocationMissing: true,
      };
    }

    console.log(
      'validateVillagesSelected: workingLocation',
      JSON.stringify(workingLocation, null, 2)
    );

    let totalBlocks = 0;
    let blocksWithVillages = 0;

    // Check EVERY block - each block must have at least one village selected
    for (const state of workingLocation) {
      if (state.districts && Array.isArray(state.districts)) {
        for (const district of state.districts) {
          if (district.blocks && Array.isArray(district.blocks)) {
            for (const block of district.blocks) {
              totalBlocks++;

              // Check if this block has villages selected
              // Villages can be an array of objects with {id, name} or just empty array
              const hasVillages =
                block.villages &&
                Array.isArray(block.villages) &&
                block.villages.length > 0;

              console.log(
                `Block ${
                  block.name || block.id
                }: hasVillages=${hasVillages}, villages count=${
                  block.villages?.length || 0
                }, villages=`,
                block.villages
              );

              if (hasVillages) {
                blocksWithVillages++;
              } else {
                // This block is missing villages
                missingBlocks.push({
                  stateName: state.stateName || t('MOBILIZER.UNKNOWN_STATE'),
                  districtName:
                    district.districtName || t('MOBILIZER.UNKNOWN_DISTRICT'),
                  blockName: block.name || t('MOBILIZER.UNKNOWN_BLOCK'),
                });
              }
            }
          }
        }
      }
    }

    console.log(
      `validateVillagesSelected: totalBlocks=${totalBlocks}, blocksWithVillages=${blocksWithVillages}, missingBlocks=${missingBlocks.length}`
    );

    console.log('validateVillagesSelected: missingBlocks', missingBlocks);

    return {
      isValid: missingBlocks.length === 0,
      missingBlocks,
    };
  };

  const searchData = async (formData: any, newPage: any) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      const staticFilter = {
        role: RoleName.MOBILIZER,
        // tenantId: storedUserData.tenantData[0].tenantId,
      };
      const { sortBy } = formData;
      const staticSort = ['firstName', sortBy || 'asc'];
      await searchListData(
        formData,
        newPage,
        staticFilter,
        pageLimit,
        setPageOffset,
        setCurrentPage,
        setResponse,
        HierarchicalSearchUserListCustom,
        staticSort
      );
    }
  };

  // Define table columns
  let columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: t('MOBILIZER.MOBILIZER_NAME'),
      render: (row: any) =>
        `${transformLabel(row.firstName) || ''} ${
          transformLabel(row.middleName) || ''
        } ${transformLabel(row.lastName) || ''}`.trim(),
    },
    {
      keys: ['gender'],
      label: t('TABLE_TITLE.GENDER') || 'Gender',
      render: (row) => transformLabel(row.gender) || '',
    },
    {
      keys: ['mobile'],
      label: t('TABLE_TITLE.MOBILE') || 'Mobile',
      render: (row) => transformLabel(row.mobile) || '',
    },
    {
      keys: ['STATE', 'DISTRICT', 'BLOCK', 'VILLAGE'],
      label: t('TABLE_TITLE.LOCATION'),
      render: (row: any) => {
        const state = transformLabel(row?.customfield?.state) || '';
        const district = transformLabel(row?.customfield?.district) || '';
        const block = transformLabel(row?.customfield?.block) || '';
        const village = transformLabel(row?.customfield?.village) || '';
        return `${state == '' ? '' : `${state}`}${
          district == '' ? '' : `, ${district}`
        }${block == '' ? '' : `, ${block}`}${
          village == '' ? '' : `, ${village}`
        }`;
      },
    },
    {
      keys: ['working_village'],
      label: t('TABLE_TITLE.WORKING_VILLAGE') || 'Working Village',
      render: (row) => extractWorkingLocationVillages(row) || '',
    },
    {
      key: 'status',
      label: t('TABLE_TITLE.STATUS'),
      render: (row: any) => transformLabel(row.status),
      getStyle: (row: any) => ({
        color: row.status === 'active' ? 'green' : 'red',
      }),
    },
  ];

  const archiveToactive = async () => {
    try {
      // Strict sequence restore flow:
      // 1) user-tenant/status active
      // 2) cohortmember/update/:membershipId active
      // 3) user/update (working_location + working_village)

      if (!userID) {
        showToastMessage('User not selected', 'error');
        return;
      }
      if (!restoreSelectedCenterId) {
        showToastMessage('Please select a center', 'error');
        return;
      }
      if (restoreSelectedVillagesSet.size === 0) {
        showToastMessage('Please select at least one village', 'error');
        return;
      }

      const membershipId = restoreCenterIdToMembershipId[restoreSelectedCenterId];
      if (!membershipId) {
        showToastMessage('Center membership not found for selected center', 'error');
        return;
      }

      if (!workingLocationId || !workingVillageId) {
        showToastMessage(
          'Field IDs not loaded. Please refresh the page and try again.',
          'error'
        );
        return;
      }

      setIsRestoreInProgress(true);
      try {
        // Step 1: Update cohort membership status
        const cohortMemberResp = await updateCohortMemberStatus({
          memberStatus: 'active',
          membershipId,
        });
        if (cohortMemberResp?.responseCode !== 200) {
          console.error('Failed to activate cohort membership:', cohortMemberResp);
          showToastMessage(
            cohortMemberResp?.params?.errmsg || 'Failed to activate center membership',
            'error'
          );
          return;
        }

        // Step 2: User Role Archival API (status active), then Tenant Status
        // Update API when the tenant membership is not active
        const tenantStatusResp = await reactivateUserRoleAndTenant({
          userId: userID,
          roleId: RoleId.MOBILIZER,
          tenantId,
        });
        if (tenantStatusResp?.responseCode !== 200) {
          console.error('Failed to activate mobilizer (role/tenant status):', tenantStatusResp);
          showToastMessage(
            tenantStatusResp?.params?.errmsg || 'Failed to activate user',
            'error'
          );
          return;
        }

        // Step 3: Update user working_location + working_village
        const tenantIdLS = localStorage.getItem('tenantId') || '';
        const token = localStorage.getItem('token') || '';
        const academicYearId = localStorage.getItem('academicYearId') || '';

        const headers = {
          'Content-Type': 'application/json',
          tenantId: tenantIdLS,
          Authorization: `Bearer ${token}`,
          academicyearid: academicYearId,
        };

        // Fetch selected center to get CATCHMENT_AREA
        const cohortSearchResp = await axios.post(
          `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/cohort/search`,
          {
            limit: 200,
            offset: 0,
            filters: {
              type: 'COHORT',
              status: ['active'],
              cohortId: [restoreSelectedCenterId],
            },
          },
          { headers }
        );

        const cohortDetails =
          cohortSearchResp?.data?.result?.results?.cohortDetails || [];
        const selectedCenter = cohortDetails.find(
          (c: any) => String(c.cohortId) === String(restoreSelectedCenterId)
        );
        const catchmentAreaField = selectedCenter?.customFields?.find(
          (field: any) => field.label === 'CATCHMENT_AREA'
        );
        if (!catchmentAreaField?.selectedValues) {
          showToastMessage(
            'CATCHMENT_AREA not found for selected center',
            'error'
          );
          return;
        }

        // Create a map of selected villages by block ID
        const selectedVillagesByBlock: Record<
          string,
          Array<{ id: number; name: string }>
        > = {};
        Object.entries(restoreVillagesByBlockData).forEach(
          ([blockId, villages]: any) => {
            const selectedInBlock = (villages || []).filter((v: any) =>
              restoreSelectedVillagesSet.has(v.id)
            );
            if (selectedInBlock.length > 0) {
              selectedVillagesByBlock[blockId] = selectedInBlock.map((v: any) => ({
                id: Number(v.id),
                name: v.name,
              }));
            }
          }
        );

        // Build working location structure from CATCHMENT_AREA
        const workingLocationStructure: any[] = [];
        catchmentAreaField.selectedValues.forEach((stateData: any) => {
          const stateId = Number(stateData.stateId);
          const stateName = stateData.stateName || '';

          const districts: any[] = [];
          if (stateData.districts && Array.isArray(stateData.districts)) {
            stateData.districts.forEach((district: any) => {
              const districtId = Number(district.districtId);
              const districtName = district.districtName || '';

              const blocks: any[] = [];
              if (district.blocks && Array.isArray(district.blocks)) {
                district.blocks.forEach((block: any) => {
                  const blockIdStr = String(block.id);
                  if (
                    selectedVillagesByBlock[blockIdStr] &&
                    selectedVillagesByBlock[blockIdStr].length > 0
                  ) {
                    blocks.push({
                      id: Number(block.id),
                      name: block.name || '',
                      villages: selectedVillagesByBlock[blockIdStr],
                    });
                  }
                });
              }

              if (blocks.length > 0) {
                districts.push({
                  districtId,
                  districtName,
                  blocks,
                });
              }
            });
          }

          if (districts.length > 0) {
            workingLocationStructure.push({
              stateId,
              stateName,
              districts,
            });
          }
        });

        if (workingLocationStructure.length === 0) {
          showToastMessage('Working location could not be built', 'error');
          return;
        }

        const villageIds = Array.from(restoreSelectedVillagesSet).map((id) =>
          String(id)
        );

        // Fetch current user data to preserve other customFields
        let existingCustomFields: any[] = [];
        try {
          const userResp = await axios.get(
            `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/user/read/${userID}`,
            { headers }
          );
          const userDetailsResp = userResp?.data?.result;
          if (userDetailsResp?.customFields) {
            existingCustomFields = userDetailsResp.customFields;
          }
        } catch (fetchError) {
          console.error('Error fetching user details:', fetchError);
        }

        const filteredCustomFields = (existingCustomFields || []).filter(
          (field: any) =>
            field.fieldId !== workingLocationId && field.fieldId !== workingVillageId
        );
        filteredCustomFields.push({
          fieldId: workingLocationId,
          value: workingLocationStructure,
        });
        filteredCustomFields.push({
          fieldId: workingVillageId,
          value: villageIds,
        });

        const updateUserResp = await updateUser(userID, {
          userData: {},
          customFields: filteredCustomFields,
        });
        if (updateUserResp?.status !== 200) {
          console.error('Failed to update user working villages:', updateUserResp);
          showToastMessage('Failed to update user villages', 'error');
          return;
        }

        showToastMessage(t('MOBILIZER.ACTIVATE_USER_SUCCESS'), 'success');
        setArchiveToActiveOpen(false);
        setRestoreCentersForWidget([]);
        setRestoreCenterIdToMembershipId({});
        setRestoreSelectedCenterId('');
        setRestoreSelectedVillagesSet(new Set());
        setRestoreVillagesByBlockData({});
        searchData(prefilledFormData, currentPage);
        console.log('Mobilizer successfully reactivated with villages.');
        return updateUserResp;
      } finally {
        setIsRestoreInProgress(false);
      }
    } catch (error) {
      console.error('Error activating mobilizer:', error);
      showToastMessage('Error activating mobilizer', 'error');
    } finally {
      setIsRestoreInProgress(false);
    }
  };
  // Define actions
  const actions = [
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            // backgroundColor: 'rgb(227, 234, 240)',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Edit Mobilizer"
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        // console.log('row>>>>', row);
        setIsEditInProgress(true);
        setEditModalOpen(true);
        setSelectedUserIdEdit(row?.userId);
        setSelectedUserRow(row);
        setIsEditInProgress(false);
      },
      show: (row) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            // backgroundColor: 'rgb(227, 234, 240)',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Delete State Lead"
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        console.log('row>>>>>', row);
        // Extract centerName from cohortData where cohortMember.status === 'active'
        const centerNames = row?.cohortData
          ?.filter((item: any) => item?.cohortMember?.status === 'active')
          ?.map((item: any) => item?.centerName)
          ?.filter(Boolean) || [];
        const centerNamesString = centerNames.length > 0 ? centerNames.join(', ') : '';
        setAvailableCenters(centerNamesString);
        setVillage(centerNamesString || row?.customfield?.block || row?.customfield?.village || '');
        setUserId(row?.userId);
        setOpen(true);
        setFirstName(row?.firstName);
        setLastName(row?.lastName);
        setReason('');
        setChecked(false);
      },
      show: (row) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            // backgroundColor: 'rgb(227, 234, 240)',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Reassign Villages"
        >
          <Image src={apartment} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        // Extract reassign data from row
        const { centerId, workingVillageIds } = extractReassignData(row);
        
        // Set state for reassign modal
        setReassignUserId(row?.userId);
        setReassignRow(row);
        setReassignCenterId(centerId);
        setReassignWorkingVillageIds(workingVillageIds);
        setReassignSelectedVillages(new Set());
        setReassignVillagesByBlock({});
        setReassignCenterOptions([]);
        setReassignModalOpen(true);
      },
      show: (row) => row.status === 'active' && row?.cohortData?.some((item: any) => item?.cohortMember?.status === 'active'),
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            // backgroundColor: 'rgb(227, 234, 240)',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Reactivate Mobilizer"
        >
          {' '}
          <Image src={restoreIcon} alt="" />{' '}
        </Box>
      ),
      callback: async (row: any) => {
        const selectedUserId = row?.userId;
        setEditableUserId(row?.userId);
        setUserId(row?.userId);
        setFirstName(row?.firstName);
        setLastName(row?.lastName);
        setSelectedCenters([]);
        setAvailableCenters([]);
        setLoadingCenters(true);
        setArchiveToActiveOpen(true);
        setRestoreCentersForWidget([]);
        setRestoreCenterIdToMembershipId({});
        setRestoreSelectedCenterId('');
        setRestoreSelectedVillagesSet(new Set());
        setRestoreVillagesByBlockData({});
        
        try {
          // Fetch cohort list for the user
          const cohortResponse = await getCohortList(selectedUserId);
          const cohortList = cohortResponse?.result || [];
          
          // Filter centers where cohortMemberStatus = "archived", cohortStatus = "active", and type = "CENTER" or "COHORT"
          const filteredCenters = cohortList.filter((cohort: any) => 
            cohort.cohortMemberStatus === 'archived' &&
            cohort.cohortStatus === 'active' &&
            (cohort.type === 'CENTER' || cohort.type === 'COHORT')
          );
          
          const centersForWidget = filteredCenters.map((c: any) => ({
            id: String(c.cohortId),
            name: c.cohortName || String(c.cohortId),
            cohortMembershipId: c.cohortMembershipId,
          }));
          const membershipMap: Record<string, string> = {};
          centersForWidget.forEach((c: any) => {
            if (c?.id && c?.cohortMembershipId) {
              membershipMap[String(c.id)] = String(c.cohortMembershipId);
            }
          });
          setRestoreCentersForWidget(centersForWidget);
          setRestoreCenterIdToMembershipId(membershipMap);
        } catch (error) {
          console.error('Error fetching cohort list:', error);
          showToastMessage('Failed to load centers', 'error');
        } finally {
          setLoadingCenters(false);
        }
      },
      show: (row) => row.status !== 'active',
    }
  ];

  // Pagination handlers
  const handlePageChange = (newPage: any) => {
    console.log('Page changed to:', newPage);
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: any) => {
    console.log('Rows per page changed to:', newRowsPerPage);
    setPageLimit(newRowsPerPage);
  };

  const handleOpenModal = () => setOpenModal(true);

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const [formStep, setFormStep] = useState(0);

  // Function to fetch cohort list when block is selected
  const fetchCohortListByBlock = async (blockId: string) => {
    if (!blockId) {
      setCohortResponse(null);
      setCatchmentAreaData(null);
      return;
    }

    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      const token = localStorage.getItem('token') || '';
      const academicYearId = localStorage.getItem('academicYearId') || '';

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/cohort/search`,
        {
          limit: 200,
          offset: 0,
          filters: {
            type: 'COHORT',
            block: [blockId],
            status: ['active'],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
            academicyearid: academicYearId,
          },
        }
      );

      // Store the full response
      setCohortResponse(response?.data);
      console.log('############# cohortResponse stored', response?.data);
    } catch (error) {
      console.error('Error fetching cohort list:', error);
      setCohortResponse(null);
      setCatchmentAreaData(null);
    }
  };

  // Helper function to extract reassign data from row
  const extractReassignData = (row: any) => {
    // Extract centerId from active cohort
    const activeCenter = row?.cohortData?.find(
      (item: any) => item?.cohortMember?.status === 'active'
    );
    const centerId = activeCenter?.centerId || null;
    
    // Extract working_village IDs
    const workingVillageIds = row?.customfield?.working_village || '';
    
    return {
      centerId,
      workingVillageIds,
    };
  };

  // Function to extract CATCHMENT_AREA from selected center
  const extractCatchmentAreaFromCenter = (centerId: string) => {
    if (!cohortResponse || !centerId) {
      setCatchmentAreaData(null);
      return;
    }

    try {
      const cohortDetails =
        cohortResponse?.result?.results?.cohortDetails || [];
      const selectedCenter = cohortDetails.find(
        (cohort: any) => cohort.cohortId === centerId
      );

      if (selectedCenter) {
        const customFields = selectedCenter.customFields || [];
        const catchmentAreaField = customFields.find(
          (field: any) => field.label === 'CATCHMENT_AREA'
        );

        if (
          catchmentAreaField?.selectedValues &&
          Array.isArray(catchmentAreaField.selectedValues) &&
          catchmentAreaField.selectedValues.length > 0
        ) {
          const extractedCatchmentArea = catchmentAreaField.selectedValues;
          setCatchmentAreaData(extractedCatchmentArea);
          console.log(
            '############# extractedCatchmentArea',
            extractedCatchmentArea
          );
        } else {
          setCatchmentAreaData(null);
          console.log('No CATCHMENT_AREA found in selected center');
        }
      } else {
        setCatchmentAreaData(null);
        console.log('Selected center not found in cohort response');
      }
    } catch (error) {
      console.error('Error extracting catchment area:', error);
      setCatchmentAreaData(null);
    }
  };

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    tenantCohortRoleMapping: [
      {
        tenantId: TenantService.getTenantId(),
        roleId: RoleId.MOBILIZER,
      },
    ],
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage = 'MOBILIZER.MOBILIZER_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'mobilizer-updated-successfully';
  const failureUpdateMessage = 'MOBILIZER.NOT_ABLE_UPDATE_MOBILIZER';
  const successCreateMessage = 'MOBILIZER.MOBILIZER_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'mobilizer-created-successfully';
  const failureCreateMessage = 'MOBILIZER.NOT_ABLE_CREATE_MOBILIZER';
  const notificationKey = 'onMobilizerCreate';
  const notificationMessage = 'MOBILIZER.USER_CREDENTIALS_WILL_BE_SEND_SOON';
  const notificationContext = 'USER';
  useEffect(() => {
    setPrefilledFormData(initialFormDataSearch);
  }, []);
  return (
    <>
      <Box display={'flex'} flexDirection={'column'} gap={2}>
        {isLoading ? (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        ) : (
          schema &&
          uiSchema && (
            <DynamicForm
              ref={formRef}
              schema={schema}
              uiSchema={updatedUiSchema}
              SubmitaFunction={SubmitaFunction}
              isCallSubmitInHandle={true}
              prefilledFormData={prefilledFormData || {}}
            />
          )
        )}
        <Box mt={4} sx={pageActionBarSx}>
          <ResetFiltersButton
            searchStoreKey="mobilizer"
            formRef={formRef}
            SubmitaFunction={SubmitaFunction}
            setPrefilledFormData={setPrefilledFormData}
          />
          {isActiveYear && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              color="primary"
              sx={{
                textTransform: 'none',
                fontSize: '14px',
                color: theme.palette.primary['100'],
                width: '200px',
              }}
              onClick={() => {
                setPrefilledState({});
                setFormStep(0);
                setSelectedUserId(null);
                setUserDetails(null);
                setSelectedCenterId(null);
                setCohortResponse(null);
                setCatchmentAreaData(null);
                setSelectedStateId(null);
                setSelectedDistrictId(null);
                setSelectedBlockId(null);
                setWorkingVillageAssignmentCenterId(null);
                setWorkingVillageAssignmentLocation(null);
                setMapModalOpen(true);
              }}
            >
              {t('COMMON.MAP_NEW')}
            </Button>
          )}
        </Box>

        {/* <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          primaryText={isEdit ? t('Update') : t('Create')}
          id="dynamic-form-id"
          modalTitle={
            isEdit
              ? t('STATE_LEADS.UPDATE_STATE_LEAD')
              : t('STATE_LEADS.NEW_STATE_LEAD')
          }
        >
          <AddEditUser
            SuccessCallback={() => {
              setPrefilledFormData(initialFormDataSearch);
              searchData(initialFormDataSearch, 0);
              setOpenModal(false);
            }}
            schema={addSchema}
            uiSchema={addUiSchema}
            editPrefilledFormData={prefilledAddFormData}
            isEdit={isEdit}
            editableUserId={editableUserId}
            UpdateSuccessCallback={() => {
              setPrefilledFormData(prefilledFormData);
              searchData(prefilledFormData, currentPage);
              setOpenModal(false);
            }}
            extraFields={extraFields}
            extraFieldsUpdate={extraFieldsUpdate}
            successUpdateMessage={successUpdateMessage}
            telemetryUpdateKey={telemetryUpdateKey}
            failureUpdateMessage={failureUpdateMessage}
            successCreateMessage={successCreateMessage}
            telemetryCreateKey={telemetryCreateKey}
            failureCreateMessage={failureCreateMessage}
            notificationKey={notificationKey}
            notificationMessage={notificationMessage}
            notificationContext={notificationContext}
            hideSubmit={true}
            type={'state-lead'}
          />
        </SimpleModal> */}

        {response != null ? (
          <>
            {response && response?.result?.getUserDetails ? (
              <Box sx={pageTableSectionSx}>
                <PaginatedTable
                  count={response?.result?.totalCount}
                  data={response?.result?.getUserDetails}
                  columns={columns}
                  actions={actions}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  defaultPage={currentPage}
                  defaultRowsPerPage={pageLimit}
                />
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="20vh"
              >
                <Typography marginTop="10px" textAlign={'center'}>
                  {t('COMMON.NO_MOBILIZER_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}

        <ConfirmationPopup
          checked={checked}
          open={open}
          onClose={() => setOpen(false)}
          title={t('COMMON.DELETE_USER')}
          primary={t('COMMON.DELETE_USER_WITH_REASON')}
          secondary={t('COMMON.CANCEL')}
          reason={reason}
          onClickPrimary={async () => {
            try {
              const resp = await deleteUser({
                userId: userID,
                roleId: roleId,
                tenantId: tenantId,
                reason: reason,
              });

              if (resp?.responseCode === 200) {
                searchData(prefilledFormData, currentPage);
                console.log('Mobilizer successfully archived.');
                setOpen(false);
              } else {
                console.error('Failed to archive mobilizer:', resp);
              }
            } catch (error) {
              console.error('Error deleting mobilizer:', error);
            }
          }}
        >
          <DeleteDetails
            firstName={firstName}
            lastName={lastName}
            village={village}
            checked={checked}
            setChecked={setChecked}
            reason={reason}
            setReason={setReason}
            center={availableCenters}
          />
        </ConfirmationPopup>
      </Box>

      {/* Restore/Reactivate Modal Dialog (same dimensions as reassign modal) */}
      <Dialog
        open={archiveToActiveOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            setArchiveToActiveOpen(false);
            setSelectedCenters([]);
            setAvailableCenters([]);
            setRestoreCentersForWidget([]);
            setRestoreCenterIdToMembershipId({});
            setRestoreSelectedCenterId('');
            setRestoreSelectedVillagesSet(new Set());
            setRestoreVillagesByBlockData({});
          }
        }}
        maxWidth={false}
        fullWidth={true}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            p: 2,
          }}
        >
          <Typography variant="h1" component="div">
            Reactivate Mobilizer
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setArchiveToActiveOpen(false);
              setSelectedCenters([]);
              setAvailableCenters([]);
              setRestoreCentersForWidget([]);
              setRestoreCenterIdToMembershipId({});
              setRestoreSelectedCenterId('');
              setRestoreSelectedVillagesSet(new Set());
              setRestoreVillagesByBlockData({});
            }}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          <Box sx={{ mb: 2 }}>
            <Typography>
              {firstName} {lastName} {t('FORM.WAS_BELONG_TO')}
            </Typography>
          </Box>

          {loadingCenters ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : restoreCentersForWidget.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No archived centers found for this user
            </Typography>
          ) : (
            <WorkingVillageAssignmentWidget
              userId={userID}
              isForRestore={true}
              isForLmp={true}
              hideConfirmButton={true}
              centerOptionsOverride={restoreCentersForWidget}
              onCenterChange={(centerId) => {
                setRestoreSelectedCenterId(centerId);
                setRestoreSelectedVillagesSet(new Set());
                setRestoreVillagesByBlockData({});
              }}
              onSelectionChange={(centerId, selectedVillages, villagesByBlock) => {
                setRestoreSelectedCenterId(centerId);
                setRestoreSelectedVillagesSet(selectedVillages);
                setRestoreVillagesByBlockData(villagesByBlock);
              }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            fullWidth
            disabled={
              loadingCenters ||
              isRestoreInProgress ||
              !restoreSelectedCenterId ||
              restoreSelectedVillagesSet.size === 0
            }
            onClick={archiveToactive}
            sx={{
              backgroundColor: '#FFC107',
              color: '#000',
              fontFamily: 'Poppins',
              fontWeight: 500,
              fontSize: '14px',
              height: '40px',
              lineHeight: '20px',
              letterSpacing: '0.1px',
              textAlign: 'center',
              verticalAlign: 'middle',
              '&:hover': {
                backgroundColor: '#ffb300',
              },
              width: '100%',
            }}
          >
            {isRestoreInProgress ? 'Activating...' : t('COMMON.ACTIVATE')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map Modal Dialog */}
      <Dialog
        open={mapModalOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click
          if (reason !== 'backdropClick') {
            setMapModalOpen(false);
            setSelectedCenterId(null); // Reset center selection when dialog closes
            setSelectedUserId(null); // Reset user selection when dialog closes
            setUserDetails(null);
            setCohortResponse(null);
            setCatchmentAreaData(null);
            setSelectedStateId(null);
            setSelectedDistrictId(null);
            setSelectedBlockId(null);
            setFormStep(0);
          }
        }}
        maxWidth={false}
        fullWidth={true}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            p: 2,
          }}
        >
          {formStep === 1 ? (
            <Button
              sx={{
                backgroundColor: '#FFC107',
                color: '#000',
                fontFamily: 'Poppins',
                fontWeight: 500,
                fontSize: '14px',
                height: '40px',
                lineHeight: '20px',
                letterSpacing: '0.1px',
                textAlign: 'center',
                verticalAlign: 'middle',
                '&:hover': {
                  backgroundColor: '#ffb300',
                },
                p: 2,
              }}
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setFormStep(0);
                // Keep user selection when going back
              }}
            >
              {t('COMMON.BACK')}
            </Button>
          ) : (
            <Typography variant="h1" component="div"></Typography>
          )}
          <Typography variant="h1" component="div">
            {t('MOBILIZER.MAP_USER_AS_MOBILIZER')}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setMapModalOpen(false);
              setFormStep(0);
              setSelectedCenterId(null);
              setSelectedUserId(null);
              setUserDetails(null);
              setCohortResponse(null);
              setCatchmentAreaData(null);
              setSelectedStateId(null);
              setSelectedDistrictId(null);
              setSelectedBlockId(null);
              setWorkingVillageAssignmentCenterId(null);
              setWorkingVillageAssignmentLocation(null);
            }}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {formStep === 0 && (
            <Box sx={{ mb: 3 }}>
              <EmailSearchUser
                onUserSelected={(userId) => {
                  setSelectedUserId(userId || null);
                  // console.log('Selected User ID:', userId);
                }}
                onUserDetails={async (userDetails) => {
                  // console.log('############# userDetails', userDetails);
                  setUserDetails(userDetails);
                  // Store user details but don't trigger mapping yet
                  // Mapping will be triggered after WorkingVillageAssignmentWidget completes
                  // Auto-advance to next step after form submission (similar to user-leader.tsx)
                  if (selectedUserId && userDetails) {
                    setFormStep(1);
                  }
                }}
                schema={addSchema}
                uiSchema={addUiSchema}
                prefilledState={prefilledState}
                onPrefilledStateChange={(prefilledState) => {
                  setPrefilledState(prefilledState || {});
                }}
                roleId={roleId}
                tenantId={tenantId}
                type="leader"
              />
            </Box>
          )}
          {formStep === 1 && (
            <Box sx={{ mb: 3 }}>
              <WorkingVillageAssignmentWidget
                userId={selectedUserId}
                hideConfirmButton={true}
                onCenterChange={(centerId) => {
                  setWorkingVillageAssignmentCenterId(centerId);
                  localStorage.setItem('workingLocationCenterId', centerId);
                  // Reset villages when center changes
                  setSelectedVillagesSet(new Set());
                  setVillagesByBlockData({});
                }}
                onSelectionChange={(centerId, selectedVillages, villagesByBlock) => {
                  setWorkingVillageAssignmentCenterId(centerId);
                  setSelectedVillagesSet(selectedVillages);
                  setVillagesByBlockData(villagesByBlock);
                  localStorage.setItem('workingLocationCenterId', centerId);
                }}
                onCenterOptionsChange={(centerOptions) => {
                  setCenterOptionsData(centerOptions);
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          {formStep === 0 && !(!selectedUserId || isMappingInProgress) && (
            <Button
              sx={{
                backgroundColor: '#FFC107',
                color: '#000',
                fontFamily: 'Poppins',
                fontWeight: 500,
                fontSize: '14px',
                height: '40px',
                lineHeight: '20px',
                letterSpacing: '0.1px',
                textAlign: 'center',
                verticalAlign: 'middle',
                '&:hover': {
                  backgroundColor: '#ffb300',
                },
                width: '100%',
              }}
              disabled={!selectedUserId || isMappingInProgress}
              form="dynamic-form-id"
              type="submit"
            >
              {t('COMMON.NEXT')}
            </Button>
          )}
          {formStep === 1 && !(!selectedUserId || !userDetails || !workingVillageAssignmentCenterId || selectedVillagesSet.size === 0 || isMappingInProgress) && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!selectedUserId || !userDetails || !workingVillageAssignmentCenterId || selectedVillagesSet.size === 0 || isMappingInProgress}
              onClick={async () => {
                if (!selectedUserId || !userDetails) {
                  showToastMessage(
                    t('MOBILIZER.PLEASE_SEARCH_AND_SELECT_USER'),
                    'error'
                  );
                  return;
                }

                // Get center ID from state or localStorage (set by WorkingVillageAssignmentWidget)
                const centerIdToUse = workingVillageAssignmentCenterId || localStorage.getItem('workingLocationCenterId');
                if (!centerIdToUse) {
                  showToastMessage('Please select a center and assign villages', 'error');
                  return;
                }

                if (selectedVillagesSet.size === 0) {
                  showToastMessage('Please select at least one village', 'error');
                  return;
                }

                // Get center details to extract CATCHMENT_AREA structure
                const center = centerOptionsData.find((c: any) => c.id === centerIdToUse);
                if (!center || !center.customFields) {
                  showToastMessage('Center details not found. Please select a center again.', 'error');
                  return;
                }

                // Find CATCHMENT_AREA field in customFields
                const catchmentAreaField = center.customFields.find(
                  (field: any) => field.label === 'CATCHMENT_AREA'
                );

                if (!catchmentAreaField || !catchmentAreaField.selectedValues) {
                  showToastMessage('CATCHMENT_AREA not found for selected center', 'error');
                  return;
                }

                // Create a map of selected villages by block ID
                const selectedVillagesByBlock: Record<string, Array<{ id: number; name: string }>> = {};
                
                // Iterate through all villages and group selected ones by block
                Object.entries(villagesByBlockData).forEach(([blockId, villages]) => {
                  const selectedInBlock = villages.filter((village) => selectedVillagesSet.has(village.id));
                  if (selectedInBlock.length > 0) {
                    selectedVillagesByBlock[blockId] = selectedInBlock.map((v) => ({
                      id: Number(v.id),
                      name: v.name,
                    }));
                  }
                });

                // Build working location structure from CATCHMENT_AREA (similar to handleConfirmAssignment)
                const workingLocationStructure: Array<{
                  stateId: number;
                  stateName: string;
                  districts: Array<{
                    districtId: number;
                    districtName: string;
                    blocks: Array<{
                      id: number;
                      name: string;
                      villages: Array<{ id: number; name: string }>;
                    }>;
                  }>;
                }> = [];

                // Iterate through catchment area structure
                catchmentAreaField.selectedValues.forEach((stateData: any) => {
                  const stateId = Number(stateData.stateId);
                  const stateName = stateData.stateName || '';

                  const districts: Array<{
                    districtId: number;
                    districtName: string;
                    blocks: Array<{
                      id: number;
                      name: string;
                      villages: Array<{ id: number; name: string }>;
                    }>;
                  }> = [];

                  if (stateData.districts && Array.isArray(stateData.districts)) {
                    stateData.districts.forEach((district: any) => {
                      const districtId = Number(district.districtId);
                      const districtName = district.districtName || '';

                      const blocks: Array<{
                        id: number;
                        name: string;
                        villages: Array<{ id: number; name: string }>;
                      }> = [];

                      if (district.blocks && Array.isArray(district.blocks)) {
                        district.blocks.forEach((block: any) => {
                          const blockId = String(block.id);
                          
                          // Only include blocks that have selected villages
                          if (selectedVillagesByBlock[blockId] && selectedVillagesByBlock[blockId].length > 0) {
                            blocks.push({
                              id: Number(block.id),
                              name: block.name || '',
                              villages: selectedVillagesByBlock[blockId],
                            });
                          }
                        });
                      }

                      // Only include districts that have blocks with selected villages
                      if (blocks.length > 0) {
                        districts.push({
                          districtId,
                          districtName,
                          blocks,
                        });
                      }
                    });
                  }

                  // Only include states that have districts with selected villages
                  if (districts.length > 0) {
                    workingLocationStructure.push({
                      stateId,
                      stateName,
                      districts,
                    });
                  }
                });

                // Extract village IDs from working location structure
                const villageIds: string[] = [];
                workingLocationStructure.forEach((state) => {
                  state.districts.forEach((district) => {
                    district.blocks.forEach((block) => {
                      block.villages.forEach((village) => {
                        villageIds.push(String(village.id));
                      });
                    });
                  });
                });

                if (villageIds.length === 0) {
                  showToastMessage('Please select at least one village', 'error');
                  return;
                }

                setIsMappingInProgress(true);
                try {
                  const { userData, customFields } =
                    splitUserData(userDetails);

                  const mappedUserEmail = userData?.email || userDetails?.email;
                  const mappedUserFirstName =
                    userData?.firstName || userDetails?.firstName || '';

                  delete userData.email;

                  // Modify customFields to add/update working_location and workingVillageId
                  // Remove existing working_location and working_village fields if present
                  const filteredCustomFields = customFields.filter(
                    (field: any) => field.fieldId !== workingLocationId && field.fieldId !== workingVillageId
                  );
                  
                  // Add working_location field with value from built structure
                  // The value should be an array containing the working location structure (as per API requirement)
                  filteredCustomFields.push({
                    fieldId: workingLocationId,
                    value: workingLocationStructure // This is already an array
                  });
                  
                  // Add working_village field with village IDs array
                  filteredCustomFields.push({
                    fieldId: workingVillageId,
                    value: villageIds // Array of village ID strings
                  });
                  
                  const updatedCustomFields = filteredCustomFields;

                  // Build payload for user-tenant API
                  const userTenantPayload = {
                    userId: selectedUserId,
                    tenantId: tenantId,
                    roleId: roleId,
                    customField: updatedCustomFields,
                    userData: userData,
                  };

                  console.log('######### userTenantPayload', JSON.stringify(userTenantPayload, null, 2));

                  // Call user-tenant API first
                  const updateUserResponse = await enrollUserTenant({
                    userId: selectedUserId,
                    tenantId: tenantId,
                    roleId: roleId,
                    customField: updatedCustomFields,
                    userData: userData,
                  });
                  
                  console.log(
                    '######### updatedResponse',
                    updateUserResponse
                  );

                  if (
                    updateUserResponse &&
                    updateUserResponse?.params?.err === null
                  ) {
                    // Ensure centerId is a string (handle array case)
                    const cohortId = Array.isArray(centerIdToUse)
                      ? centerIdToUse[0]
                      : centerIdToUse;

                    // Call bulkCreateCohortMembers to map user to center
                    if (cohortId && selectedUserId) {
                      try {
                        const cohortMemberResponse =
                          await bulkCreateCohortMembers({
                            userId: [selectedUserId],
                            cohortId: [cohortId],
                          });

                        if (
                          cohortMemberResponse?.responseCode === 201 ||
                          cohortMemberResponse?.params?.err === null ||
                          cohortMemberResponse?.status === 201
                        ) {
                          console.log(
                            'Successfully mapped user to center:',
                            cohortMemberResponse
                          );
                          showToastMessage(t(successCreateMessage), 'success');

                          try {
                            const program =
                              localStorage.getItem('tenantName') ||
                              localStorage.getItem('program') ||
                              '';
                            // TODO: confirm which env var should provide login link
                            const loginLink = ROLE_LOGIN_URL_MAP[Role.MOBILIZER];

                            if (mappedUserEmail) {
                              await sendCredentialService(
                                buildProgramMappingEmailRequest({
                                  email: mappedUserEmail,
                                  firstName: mappedUserFirstName,
                                  role: 'Mentor',
                                  program,
                                  platform: 'Pratham learning Platform (PLP)',
                                  loginLink,
                                })
                              );
                            }
                          } catch (notificationError) {
                            console.error(
                              'Error sending program mapping notification:',
                              notificationError
                            );
                          }
                        } else {
                          console.error(
                            'Error mapping user to center:',
                            cohortMemberResponse
                          );
                          showToastMessage(
                            cohortMemberResponse?.data?.params?.errmsg ||
                              t(failureCreateMessage),
                            'error'
                          );
                        }
                      } catch (cohortError) {
                        console.error(
                          'Error in bulkCreateCohortMembers:',
                          cohortError
                        );
                        showToastMessage(
                          cohortError?.response?.data?.params?.errmsg ||
                            t(failureCreateMessage),
                          'error'
                        );
                      }
                    }

                    // Close dialog
                    setMapModalOpen(false);
                    setSelectedCenterId(null);
                    setSelectedUserId(null);
                    setCohortResponse(null);
                    setCatchmentAreaData(null);
                    setSelectedStateId(null);
                    setSelectedDistrictId(null);
                    setSelectedBlockId(null);
                    setFormStep(0);
                    setUserDetails(null);
                    setWorkingVillageAssignmentCenterId(null);
                    setWorkingVillageAssignmentLocation(null);
                    setSelectedVillagesSet(new Set());
                    setVillagesByBlockData({});
                    setCenterOptionsData([]);
                    // Refresh the data
                    searchData(prefilledFormData, 0);
                  } else {
                    showToastMessage(t(failureUpdateMessage), 'error');
                  }
                } catch (error) {
                  console.error('Error creating cohort member:', error);
                  showToastMessage(
                    error?.response?.data?.params?.errmsg ||
                      t(failureCreateMessage),
                    'error'
                  );
                } finally {
                  setIsMappingInProgress(false);
                }
              }}
            >
              {t('COMMON.MAP')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Modal Dialog */}
      <Dialog
        open={editModalOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click
          if (reason !== 'backdropClick') {
            setSelectedUserIdEdit(null); // Reset user selection when dialog closes
            setSelectedUserRow(null); // Reset user row selection when dialog closes
            setIsEditInProgress(true);
          }
        }}
        maxWidth={false}
        fullWidth={true}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            p: 2,
          }}
        >
          <Typography variant="h1" component="div">
            {t('MOBILIZER.EDIT_MOBILIZER')}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setEditModalOpen(false)}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isEditInProgress ? (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
                <CircularProgress />
                <Typography variant="h1" component="div" sx={{ mt: 2 }}>
                  {t('COMMON.SAVING')}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <EditSearchUser
                onUserDetails={async (userDetails) => {
                  console.log('############# userDetails', userDetails);
                  if (selectedUserIdEdit) {
                    setIsEditInProgress(true);
                    try {
                      const { userData, customFields } =
                        splitUserData(userDetails);
  
                      delete userData.email;
  
                      const object = {
                        userData: userData,
                        customFields: customFields,
                      };
  
                      //update user details
                      const updateUserResponse = await updateUser(selectedUserIdEdit, object);
                      console.log(
                        '######### updatedResponse',
                        updateUserResponse
                      );
  
                      if (
                        updateUserResponse &&
                        updateUserResponse?.status == 200
                      ) {
                        showToastMessage(t(successUpdateMessage), 'success');
                        // Refresh the data
                        searchData(prefilledFormData, currentPage);
                      } else {
                        showToastMessage(t(failureUpdateMessage), 'error');
                      }
                    } catch (error) {
                      console.error('Error updating user:', error);
                      showToastMessage(
                        error?.response?.data?.params?.errmsg ||
                          t(failureUpdateMessage),
                        'error'
                      );
                    } finally {
                      setIsEditInProgress(false);
                      setEditModalOpen(false);
                    }
                  } else if (!selectedUserIdEdit) {
                    showToastMessage('Please search and select a user', 'error');
                  }
                }}
                selectedUserRow={selectedUserRow}
                schema={addSchema}
                uiSchema={addUiSchema}
                userId={selectedUserIdEdit}
                roleId={roleId}
                tenantId={tenantId}
                type="leader"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
            <Button
              sx={{
                backgroundColor: '#FFC107',
                color: '#000',
                fontFamily: 'Poppins',
                fontWeight: 500,
                fontSize: '14px',
                height: '40px',
                lineHeight: '20px',
                letterSpacing: '0.1px',
                textAlign: 'center',
                verticalAlign: 'middle',
                '&:hover': {
                  backgroundColor: '#ffb300',
                },
                width: '100%',
              }}
              disabled={!selectedUserIdEdit || isEditInProgress}
              form="dynamic-form-id"
              type="submit"
            >
              {t('COMMON.SAVE')}
            </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Modal Dialog */}
      <Dialog
        open={reassignModalOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click
          if (reason !== 'backdropClick') {
            setReassignModalOpen(false);
            setReassignUserId(null);
            setReassignRow(null);
            setReassignCenterId(null);
            setReassignWorkingVillageIds('');
            setReassignSelectedVillages(new Set());
            setReassignVillagesByBlock({});
            setReassignCenterOptions([]);
          }
        }}
        maxWidth={false}
        fullWidth={true}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            p: 2,
          }}
        >
          <Typography variant="h1" component="div">
            Reassign Working Villages
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setReassignModalOpen(false);
              setReassignUserId(null);
              setReassignRow(null);
              setReassignCenterId(null);
              setReassignWorkingVillageIds('');
              setReassignSelectedVillages(new Set());
              setReassignVillagesByBlock({});
              setReassignCenterOptions([]);
            }}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <WorkingVillageAssignmentWidget
              userId={reassignUserId || undefined}
              centerId={reassignCenterId || undefined}
              existingWorkingVillageIds={reassignWorkingVillageIds || undefined}
              isForReassign={true}
              hideConfirmButton={true}
              onCenterChange={(centerId) => {
                setReassignCenterId(centerId);
              }}
              onSelectionChange={(centerId, selectedVillages, villagesByBlock) => {
                setReassignCenterId(centerId);
                setReassignSelectedVillages(selectedVillages);
                setReassignVillagesByBlock(villagesByBlock);
              }}
              onCenterOptionsChange={(centerOptions) => {
                setReassignCenterOptions(centerOptions);
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            fullWidth
            disabled={
              !reassignUserId ||
              !reassignCenterId ||
              reassignSelectedVillages.size === 0 ||
              isReassignInProgress
            }
            onClick={async () => {
              if (!reassignUserId) {
                showToastMessage('Please select a user', 'error');
                return;
              }

              // Get center ID from state
              const centerIdToUse = reassignCenterId;
              if (!centerIdToUse) {
                showToastMessage('Please select a center and assign villages', 'error');
                return;
              }

              if (reassignSelectedVillages.size === 0) {
                showToastMessage('Please select at least one village', 'error');
                return;
              }

              // Get center details to extract CATCHMENT_AREA structure
              const center = reassignCenterOptions.find((c: any) => c.id === centerIdToUse);
              if (!center || !center.customFields) {
                showToastMessage('Center details not found. Please select a center again.', 'error');
                return;
              }

              // Find CATCHMENT_AREA field in customFields
              const catchmentAreaField = center.customFields.find(
                (field: any) => field.label === 'CATCHMENT_AREA'
              );

              if (!catchmentAreaField || !catchmentAreaField.selectedValues) {
                showToastMessage('Catchment Area not found for selected center', 'error');
                return;
              }

              // Create a map of selected villages by block ID
              const selectedVillagesByBlock: Record<string, Array<{ id: number; name: string }>> = {};
              
              // Iterate through all villages and group selected ones by block
              Object.entries(reassignVillagesByBlock).forEach(([blockId, villages]) => {
                const selectedInBlock = villages.filter((village) => reassignSelectedVillages.has(village.id));
                if (selectedInBlock.length > 0) {
                  selectedVillagesByBlock[blockId] = selectedInBlock.map((v) => ({
                    id: Number(v.id),
                    name: v.name,
                  }));
                }
              });

              // Build working location structure from CATCHMENT_AREA
              const workingLocationStructure: Array<{
                stateId: number;
                stateName: string;
                districts: Array<{
                  districtId: number;
                  districtName: string;
                  blocks: Array<{
                    id: number;
                    name: string;
                    villages: Array<{ id: number; name: string }>;
                  }>;
                }>;
              }> = [];

              // Iterate through catchment area structure
              catchmentAreaField.selectedValues.forEach((stateData: any) => {
                const stateId = Number(stateData.stateId);
                const stateName = stateData.stateName || '';

                const districts: Array<{
                  districtId: number;
                  districtName: string;
                  blocks: Array<{
                    id: number;
                    name: string;
                    villages: Array<{ id: number; name: string }>;
                  }>;
                }> = [];

                if (stateData.districts && Array.isArray(stateData.districts)) {
                  stateData.districts.forEach((district: any) => {
                    const districtId = Number(district.districtId);
                    const districtName = district.districtName || '';

                    const blocks: Array<{
                      id: number;
                      name: string;
                      villages: Array<{ id: number; name: string }>;
                    }> = [];

                    if (district.blocks && Array.isArray(district.blocks)) {
                      district.blocks.forEach((block: any) => {
                        const blockId = String(block.id);
                        
                        // Only include blocks that have selected villages
                        if (selectedVillagesByBlock[blockId] && selectedVillagesByBlock[blockId].length > 0) {
                          blocks.push({
                            id: Number(block.id),
                            name: block.name || '',
                            villages: selectedVillagesByBlock[blockId],
                          });
                        }
                      });
                    }

                    // Only include districts that have blocks with selected villages
                    if (blocks.length > 0) {
                      districts.push({
                        districtId,
                        districtName,
                        blocks,
                      });
                    }
                  });
                }

                // Only include states that have districts with selected villages
                if (districts.length > 0) {
                  workingLocationStructure.push({
                    stateId,
                    stateName,
                    districts,
                  });
                }
              });

              // Validate required field IDs
              if (!workingLocationId || !workingVillageId) {
                showToastMessage('Field IDs not loaded. Please refresh the page and try again.', 'error');
                return;
              }

              // Extract village IDs from selected villages
              const villageIds = Array.from(reassignSelectedVillages).map((id) => String(id));

              setIsReassignInProgress(true);
              try {
                // Get original centerId from reassignRow
                const originalCenterData = extractReassignData(reassignRow);
                const originalCenterId = originalCenterData?.centerId;

                // API Call 1: Update cohort membership if center changed
                if (originalCenterId && centerIdToUse && originalCenterId !== centerIdToUse) {
                  try {
                    const cohortMemberResponse = await bulkCreateCohortMembers({
                      userId: [reassignUserId],
                      cohortId: [centerIdToUse],
                      removeCohortId: [originalCenterId],
                    });

                    if (
                      cohortMemberResponse?.responseCode !== 201 &&
                      cohortMemberResponse?.params?.err !== null &&
                      cohortMemberResponse?.status !== 201
                    ) {
                      console.error('Error updating cohort membership:', cohortMemberResponse);
                      showToastMessage(
                        cohortMemberResponse?.data?.params?.errmsg ||
                          'Failed to update center assignment',
                        'error'
                      );
                      return;
                    }
                    console.log('Successfully updated cohort membership:', cohortMemberResponse);
                  } catch (cohortError) {
                    console.error('Error in bulkCreateCohortMembers:', cohortError);
                    showToastMessage(
                      cohortError?.response?.data?.params?.errmsg ||
                        'Failed to update center assignment',
                      'error'
                    );
                    return;
                  }
                }

                // API Call 2: Update user with working_location and working_village
                // Get user details first to extract existing customFields
                const tenantId = localStorage.getItem('tenantId') || '';
                const token = localStorage.getItem('token') || '';
                
                // Fetch current user data to get existing customFields
                let existingCustomFields: any[] = [];
                try {
                  const userResponse = await axios.get(
                    `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/user/read/${reassignUserId}`,
                    {
                      headers: {
                        'Content-Type': 'application/json',
                        tenantId: tenantId,
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );
                  
                  const userDetails = userResponse?.data?.result;
                  if (userDetails?.customFields) {
                    existingCustomFields = userDetails.customFields;
                  }
                } catch (fetchError) {
                  console.error('Error fetching user details:', fetchError);
                  // Continue with empty customFields if fetch fails
                }

                // Filter out existing working_location and working_village fields
                const filteredCustomFields = existingCustomFields.filter(
                  (field: any) => field.fieldId !== workingLocationId && field.fieldId !== workingVillageId
                );

                // Add working_location field
                filteredCustomFields.push({
                  fieldId: workingLocationId,
                  value: workingLocationStructure, // Array containing the working location structure
                });

                // Add working_village field
                filteredCustomFields.push({
                  fieldId: workingVillageId,
                  value: villageIds, // Array of village ID strings
                });

                // Call updateUser API
                const updateUserResponse = await updateUser(reassignUserId, {
                  userData: {}, // Empty userData as we're only updating customFields
                  customFields: filteredCustomFields,
                });

                if (updateUserResponse && updateUserResponse?.status === 200) {
                  showToastMessage('Villages reassigned successfully', 'success');
                  searchData(prefilledFormData, currentPage);
                  setReassignModalOpen(false);
                  
                  // Reset all reassign state
                  setReassignUserId(null);
                  setReassignRow(null);
                  setReassignCenterId(null);
                  setReassignWorkingVillageIds('');
                  setReassignSelectedVillages(new Set());
                  setReassignVillagesByBlock({});
                  setReassignCenterOptions([]);
                } else {
                  showToastMessage(
                    updateUserResponse?.response?.data?.params?.errmsg ||
                      'Failed to update user villages',
                    'error'
                  );
                }
              } catch (error) {
                console.error('Error reassigning villages:', error);
                showToastMessage(
                  error?.response?.data?.params?.errmsg || 'Failed to reassign villages',
                  'error'
                );
              } finally {
                setIsReassignInProgress(false);
              }
            }}
            sx={{
              backgroundColor: '#FFC107',
              color: '#000',
              fontFamily: 'Poppins',
              fontWeight: 500,
              fontSize: '14px',
              height: '40px',
              lineHeight: '20px',
              letterSpacing: '0.1px',
              textAlign: 'center',
              verticalAlign: 'middle',
              '&:hover': {
                backgroundColor: '#ffb300',
              },
              width: '100%',
            }}
          >
            {isReassignInProgress ? 'Reassigning...' : 'Reassign Villages'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Mobilizer;
