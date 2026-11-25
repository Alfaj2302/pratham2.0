// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { TrainerSearchSchema, TrainerSearchUISchema } from '../constant/Forms/TrainerSearch';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Role, RoleId } from '@/utils/app.constant';
import { HierarchicalSearchUserList } from '@/services/UserList';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  TextField,
  Autocomplete,
  Checkbox,
  Chip,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@shared-lib-v2/MapUser/DeleteUser';
import editIcon from '../../public/images/editIcon.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
import apartment from '../../public/images/apartment.svg';
import restoreIcon from '../../public/images/restore_user.svg';
import Image from 'next/image';
import { searchListData } from '@/components/DynamicForm/DynamicFormCallback';
import TenantService from '@/services/TenantService';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import { transformLabel } from '@/utils/helper';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import { showToastMessage } from '@/components/Toastify';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';
import { splitUserData } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import { updateUser } from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import useStore from '@/store/store';
import {
  getVisibleTableActions,
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';
import {
  bulkCreateCohortMembers,
  updateCohortMemberStatus,
} from '@/services/CohortService/cohortService';
import { getCohortList } from '@/services/GetCohortList';
import { updateUserTenantStatus } from '@/services/UserService';
import {
  disableDomainSkillFields,
  extractDomainSkillValues,
  getTrainerMappingForm,
} from '@/services/trainer/TrainerFormService';
import {
  getAssignedStateIds,
  getCentersForDomainSkills,
  getUserAssignedCenters,
  TrainerCenter,
} from '@/services/trainer/TrainerCenterService';
import TrainerCenterSelector from '@/components/trainer/TrainerCenterSelector';

// Trainer listing + filters, matching user-placement-retention-coordinator.tsx's
// own page shape exactly (search bar + Reset/Map New action row + Paginated
// list + Edit/Delete/Reactivate), sitting next to it under Manage Users.
// Trainer itself reuses the Instructor role (RoleId.TEACHER, same as
// user-instructor.tsx) — there is no separate backend role for it — and the
// list is fetched via /user/hierarchical-search, same as user-instructor.tsx
// and user-leader.tsx's own listings, rather than plain /user/list — that's
// what embeds each row's own `cohortData` (needed by Reassign Center to know
// a Trainer's currently active Centers) and flat `customfield` object
// (needed by the Domain/Skill/Location columns below).
//
// The one structural difference from PRC's single-step "Map New" (which just
// enrolls the user into the role) is the Map New wizard here still has two
// steps — Domain/Skill, then Center — because Trainer mapping additionally
// creates a Center-level cohort membership; per the original ticket, this
// stops at Center with no Batch step at all.
const TrainerMapping = () => {
  const theme = useTheme<any>();
  const isActiveYear = useStore((state: any) => state.isActiveYearSelected);
  const { t } = useTranslation();

  const [schema] = useState(TrainerSearchSchema);
  const [uiSchema] = useState(TrainerSearchUISchema);
  const [pageLimit, setPageLimit] = useState<number>(10);
  // Only the setter is needed — searchListData requires it to track
  // pagination offset internally, but this page never reads the value back.
  const [, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [response, setResponse] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const formRef = useRef(null);

  const [tenantId, setTenantId] = useState('');
  const [roleId, setRoleId] = useState('');

  const [trainerMappingForm, setTrainerMappingForm] = useState(null);
  const [formLoadError, setFormLoadError] = useState(false);
  // Gates the whole page's first paint — the filter bar, action row and
  // table all appear together once everything the page needs (the Domain/
  // Skill form used by Map New/Edit, and the first page of results) is
  // ready, instead of the filter bar flashing its own separate loader while
  // that form fetch is still in flight.
  const [isPageLoading, setIsPageLoading] = useState(true);

  // State Lead reuses this same page, scoped to the States assigned to them:
  // the Trainer list, the Map New Center step and Reassign Center all stay
  // inside those States. Central Lead (undefined scope) sees every State.
  const isStateLead = localStorage.getItem('roleName') === Role.ADMIN;
  const [allowedStateIds] = useState<string[] | undefined>(() =>
    isStateLead ? getAssignedStateIds() : undefined
  );

  const searchStoreKey = 'trainer';
  const storedFormDataSearch =
    localStorage.getItem(searchStoreKey) &&
    localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};
  // The State filter is locked for a State Lead (see TrainerSearch.js), so
  // never restore a saved search pointing at a different State — its
  // District/Block/Village wouldn't belong to the assigned State either.
  const lockedStateId = isStateLead ? localStorage.getItem('stateId') : null;
  const initialFormDataSearch =
    lockedStateId && storedFormDataSearch?.state?.[0] !== lockedStateId
      ? { state: [lockedStateId] }
      : storedFormDataSearch;

  useEffect(() => {
    if (isPageLoading) return;
    if (response?.result?.totalCount !== 0) {
      searchData(prefilledFormData, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLimit]);

  useEffect(() => {
    setTenantId(localStorage.getItem('tenantId') || '');
    setRoleId(RoleId.TEACHER);
    setPrefilledFormData(initialFormDataSearch);

    const init = async () => {
      const [form] = await Promise.all([
        getTrainerMappingForm(),
        searchData(initialFormDataSearch, 0),
      ]);
      if (!form) {
        setFormLoadError(true);
      } else {
        setTrainerMappingForm(form);
      }
      setIsPageLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': { norender: true },
  };

  const SubmitaFunction = async (formData: any) => {
    if (Object.keys(formData).length > 0) {
      setPrefilledFormData(formData);
      localStorage.setItem(searchStoreKey, JSON.stringify(formData));
      await searchData(formData, 0);
    }
  };

  // /user/hierarchical-search (same endpoint + convention as
  // user-instructor.tsx's own HierarchicalSearchUserListCustom) instead of
  // plain /user/list — this is what actually returns `cohortData` embedded
  // per row, which Reassign Center needs to know a Trainer's currently
  // active Centers, and it's the same source Domain/Skill/State/District/
  // Block/Village come back from as a flat `customfield` object (see the
  // table columns below) rather than the customFields array /user/list uses.
  const HierarchicalSearchUserListCustom = async (data: any) => {
    const { role, tenantId, ...filteredFilters } = data.filters || {};
    const newData = { ...data, filters: filteredFilters };
    return await HierarchicalSearchUserList({
      ...newData,
      role: [Role.TEACHER],
      customfields: ['state', 'district', 'block', 'village', 'domain', 'skills'],
    });
  };

  const searchData = async (formData: any, newPage: any) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      // Filters saved before Status switched from `tenantStatus` to `status`.
      delete formData.tenantStatus;
      const staticFilter: any = {
        role: Role.TEACHER,
        tenantId: TenantService.getTenantId(),
      };
      if (allowedStateIds) {
        staticFilter.state = allowedStateIds;
      }
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

  // Domain/Skill/State/District/Block/Village all come back on
  // /user/hierarchical-search's own flat `row.customfield.<code>` object
  // (lowercase field codes, plain display strings) — same shape
  // user-instructor.tsx's own State/District/Block/Village/Main Subjects/
  // Subjects Teach columns already read (`row?.customfield?.state`,
  // `.district`, `.main_subject`, ...). This is a different, flatter shape
  // than plain /user/list's `customFields` array of
  // {fieldId, label, selectedValues}.
  const getCustomFieldValue = (row: any, code: string): string => {
    const raw = row?.customfield?.[code];
    if (raw === undefined || raw === null || raw === '') return '-';
    return String(raw);
  };

  const columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: 'Trainer Name',
      render: (row: any) =>
        `${row.firstName || ''} ${row.middleName || ''} ${row.lastName || ''}`.trim(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(row.status),
      getStyle: (row: any) => ({
        color: row.status === 'active' ? 'green' : 'red',
      }),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (row: any) => transformLabel(row.gender) || '-',
    },
    {
      key: 'mobile',
      label: 'Mobile',
      render: (row: any) => row.mobile || '-',
    },
    {
      key: 'LOCATION',
      label: 'Location (State / District / Block / Village)',
      render: (row: any) => {
        const parts = ['state', 'district', 'block', 'village']
          .map((code) => transformLabel(getCustomFieldValue(row, code)))
          .filter((part) => part && part !== '-');
        return parts.length ? parts.join(' / ') : '-';
      },
    },
    {
      key: 'DOMAIN',
      label: 'Domain',
      render: (row: any) => transformLabel(getCustomFieldValue(row, 'domain')),
    },
    {
      key: 'SKILLS',
      label: 'Skill',
      render: (row: any) => transformLabel(getCustomFieldValue(row, 'skills')),
    },
  ];

  // ---- Map New wizard state (Domain/Skill -> Center, no Batch) ----
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [prefilledState, setPrefilledState] = useState({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPayload, setUserPayload] = useState<any>(null);
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedCenters, setSelectedCenters] = useState<TrainerCenter[]>([]);
  const [isMapping, setIsMapping] = useState(false);

  const resetWizard = () => {
    setFormStep(0);
    setPrefilledState({});
    setSelectedUserId(null);
    setUserPayload(null);
    setDomain(undefined);
    setSkills([]);
    setSelectedCenters([]);
  };

  const handleCloseMapModal = () => {
    setMapModalOpen(false);
    resetWizard();
  };

  const handleUserDetails = (payload: any) => {
    const { domain: selectedDomain, skills: selectedSkills } =
      extractDomainSkillValues(payload?.customFields);
    if (!selectedDomain || selectedSkills.length === 0) {
      showToastMessage('Please select a Domain and at least one Skill', 'error');
      return;
    }
    setUserPayload(payload);
    setDomain(selectedDomain);
    setSkills(selectedSkills);
    setFormStep(1);
  };

  const handleConfirmMapping = async () => {
    if (!selectedUserId || selectedCenters.length === 0 || !userPayload || isMapping) return;
    setIsMapping(true);
    try {
      const { userData, customFields } = splitUserData(userPayload);
      delete userData.email;

      const enrollResponse = await enrollUserTenant({
        userId: selectedUserId,
        tenantId,
        roleId,
        customField: customFields,
        userData,
      });

      if (enrollResponse && enrollResponse?.params?.err) {
        showToastMessage(enrollResponse?.params?.errmsg || 'Could not map Trainer', 'error');
        return;
      }

      const bulkResponse = await bulkCreateCohortMembers({
        userId: [selectedUserId],
        cohortId: selectedCenters.map((center) => center.cohortId),
      });

      const isBulkSuccess =
        bulkResponse?.responseCode === 201 ||
        bulkResponse?.data?.responseCode === 201 ||
        bulkResponse?.status === 201;

      if (!isBulkSuccess) {
        showToastMessage(
          bulkResponse?.params?.errmsg || 'Could not map Trainer to the selected Centers',
          'error'
        );
        return;
      }

      showToastMessage('Trainer mapped successfully', 'success');
      handleCloseMapModal();
      searchData(prefilledFormData, 0);
    } catch (error) {
      console.error('Error mapping Trainer:', error);
      showToastMessage('Could not map Trainer', 'error');
    } finally {
      setIsMapping(false);
    }
  };

  // ---- Edit modal (Domain/Skill only) ----
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserIdEdit, setSelectedUserIdEdit] = useState<string | null>(null);
  const [selectedUserRow, setSelectedUserRow] = useState<any>(null);
  const [isEditInProgress, setIsEditInProgress] = useState(false);

  // ---- Reassign Center state ----
  // Trainer can add additional Centers and remove previously assigned ones.
  // Opens pre-populated with the Trainer's own Domain/Skill (read off the
  // row) and their current Centers — the latter is the intersection of
  // /cohort/geographical-hierarchy (every Center this user is assigned to,
  // across every role they hold) and /cohort/search filtered by this
  // Trainer's Domain/Skill (see getUserAssignedCenters in
  // TrainerCenterService for why neither API alone is enough for a
  // multi-role user).
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<string | null>(null);
  const [reassignUserName, setReassignUserName] = useState('');
  const [reassignDomain, setReassignDomain] = useState<string | undefined>(undefined);
  const [reassignSkills, setReassignSkills] = useState<string[]>([]);
  const [reassignCenters, setReassignCenters] = useState<TrainerCenter[]>([]);
  const [originalReassignCenterIds, setOriginalReassignCenterIds] = useState<string[]>([]);
  // State Lead only: the Trainer's Centers outside the assigned States.
  // They aren't shown or editable here, but are kept in the save payload so
  // a State Lead can never drop a Trainer from another State's Center.
  const [outOfScopeCenterIds, setOutOfScopeCenterIds] = useState<string[]>([]);
  const [isReassignLoading, setIsReassignLoading] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const handleCloseReassignModal = () => {
    setReassignModalOpen(false);
    setReassignUserId(null);
    setReassignDomain(undefined);
    setReassignSkills([]);
    setReassignCenters([]);
    setOriginalReassignCenterIds([]);
    setOutOfScopeCenterIds([]);
  };

  const openReassignModal = async (row: any) => {
    setReassignModalOpen(true);
    setReassignUserId(row?.userId);
    setReassignUserName(`${row.firstName || ''} ${row.lastName || ''}`.trim());
    setReassignCenters([]);
    setOriginalReassignCenterIds([]);
    setOutOfScopeCenterIds([]);
    setIsReassignLoading(true);

    const rowDomain = row?.customfield?.domain;
    const rowSkillsRaw = row?.customfield?.skills;
    const rowSkills = rowSkillsRaw
      ? String(rowSkillsRaw)
          .split(',')
          .map((skill: string) => skill.trim())
          .filter(Boolean)
      : [];
    setReassignDomain(rowDomain || undefined);
    setReassignSkills(rowSkills);

    try {
      // Intersects /cohort/geographical-hierarchy (every Center this user
      // is assigned to, across every role they hold) with /cohort/search
      // filtered by this Trainer's own Domain/Skill — see
      // TrainerCenterService.getUserAssignedCenters for why neither API
      // alone is enough to isolate a multi-role user's Trainer-specific
      // Centers.
      const assignedCenters = await getUserAssignedCenters(row?.userId, rowDomain, rowSkills);
      let currentCenters = assignedCenters;
      if (allowedStateIds) {
        const inScopeIds = new Set(
          allowedStateIds.length > 0
            ? (
                await getCentersForDomainSkills(rowDomain, rowSkills, {
                  state: allowedStateIds,
                })
              ).map((center) => center.cohortId)
            : []
        );
        currentCenters = assignedCenters.filter((center) => inScopeIds.has(center.cohortId));
        setOutOfScopeCenterIds(
          assignedCenters
            .filter((center) => !inScopeIds.has(center.cohortId))
            .map((center) => center.cohortId)
        );
      }
      setReassignCenters(currentCenters);
      setOriginalReassignCenterIds(currentCenters.map((center) => center.cohortId));
    } catch (error) {
      console.error('Error loading Trainer Centers:', error);
      showToastMessage('Could not load this Trainer\'s current Centers', 'error');
    } finally {
      setIsReassignLoading(false);
    }
  };

  const handleReassignConfirm = async () => {
    if (!reassignUserId || isReassigning) return;
    if (reassignCenters.length === 0) {
      showToastMessage('Please select at least one Center', 'error');
      return;
    }
    setIsReassigning(true);
    try {
      const finalCenterIds = reassignCenters.map((center) => center.cohortId);
      const removedCenterIds = originalReassignCenterIds.filter(
        (id) => !finalCenterIds.includes(id)
      );

      const response = await bulkCreateCohortMembers({
        userId: [reassignUserId],
        cohortId: [...finalCenterIds, ...outOfScopeCenterIds],
        ...(removedCenterIds.length > 0 ? { removeCohortId: removedCenterIds } : {}),
      });

      const isSuccess =
        response?.responseCode === 201 ||
        response?.data?.responseCode === 201 ||
        response?.status === 201;

      if (!isSuccess) {
        showToastMessage(
          response?.params?.errmsg || 'Could not update this Trainer\'s Centers',
          'error'
        );
        return;
      }

      showToastMessage('Trainer\'s Centers updated successfully', 'success');
      handleCloseReassignModal();
      searchData(prefilledFormData, currentPage);
    } catch (error) {
      console.error('Error reassigning Trainer Centers:', error);
      showToastMessage('Could not update this Trainer\'s Centers', 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  // ---- Delete confirmation state ----
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionUserName, setActionUserName] = useState('');
  const [reason, setReason] = useState('');

  // ---- Reactivate (archived -> active) state ----
  // Same flow as user-leader.tsx's Reactivate: pick which of the user's
  // archived Center memberships to restore, activate each membership, then
  // set the user's tenant status back to active.
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);
  const [archivedCenters, setArchivedCenters] = useState<any[]>([]);
  const [centersToActivate, setCentersToActivate] = useState<any[]>([]);
  const [loadingArchivedCenters, setLoadingArchivedCenters] = useState(false);

  const closeArchiveToActive = () => {
    setArchiveToActiveOpen(false);
    setArchivedCenters([]);
    setCentersToActivate([]);
  };

  const openArchiveToActive = async (row: any) => {
    setActionUserId(row?.userId);
    setActionUserName(`${row.firstName || ''} ${row.lastName || ''}`.trim());
    setArchivedCenters([]);
    setCentersToActivate([]);
    setLoadingArchivedCenters(true);
    setArchiveToActiveOpen(true);

    try {
      const cohortResponse = await getCohortList(row?.userId);
      const cohortList = cohortResponse?.result || [];

      // Archived memberships of still-active Centers, deduped by cohortId.
      const seenCohortIds = new Set();
      const filteredCenters = cohortList.filter((cohort: any) => {
        if (
          cohort.cohortMemberStatus !== 'archived' ||
          cohort.cohortStatus !== 'active' ||
          (cohort.type !== 'CENTER' && cohort.type !== 'COHORT') ||
          seenCohortIds.has(cohort.cohortId)
        ) {
          return false;
        }
        seenCohortIds.add(cohort.cohortId);
        return true;
      });
      setArchivedCenters(filteredCenters);
    } catch (error) {
      console.error('Error fetching cohort list:', error);
      showToastMessage('Failed to load centers', 'error');
    } finally {
      setLoadingArchivedCenters(false);
    }
  };

  const handleArchiveToActive = async () => {
    if (!actionUserId) return;
    if (centersToActivate.length === 0) {
      showToastMessage('Please select at least one center', 'error');
      return;
    }
    try {
      for (const center of centersToActivate) {
        const updateResponse = await updateCohortMemberStatus({
          memberStatus: 'active',
          membershipId: center.cohortMembershipId,
        });
        if (updateResponse?.responseCode !== 200) {
          console.error('Failed to activate center membership:', updateResponse);
          showToastMessage(
            `Failed to activate center membership ${center.cohortMembershipId}`,
            'error'
          );
          return;
        }
      }

      const resp = await updateUserTenantStatus(actionUserId, tenantId, {
        status: 'active',
      });
      if (resp?.responseCode === 200) {
        showToastMessage(t('LEARNERS.ACTIVATE_USER_SUCCESS'), 'success');
        closeArchiveToActive();
        searchData(prefilledFormData, currentPage);
      } else {
        console.error('Failed to activate Trainer:', resp);
        showToastMessage('Failed to activate user', 'error');
      }
    } catch (error) {
      console.error('Error activating Trainer:', error);
      showToastMessage('Error activating user', 'error');
    }
  };

  const actions = [
    {
      icon: (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', justifyContent: 'center', padding: '10px' }}
          title="Edit Trainer"
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        setIsEditInProgress(true);
        setEditModalOpen(true);
        setSelectedUserIdEdit(row?.userId);
        setSelectedUserRow(row);
        setIsEditInProgress(false);
      },
      show: (row: any) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', justifyContent: 'center', padding: '10px' }}
          title="Delete Trainer"
        >
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        setActionUserId(row?.userId);
        setActionUserName(`${row.firstName || ''} ${row.lastName || ''}`.trim());
        setReason('');
        setDeleteConfirmOpen(true);
      },
      show: (row: any) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', justifyContent: 'center', padding: '10px' }}
          title="Reassign Center"
        >
          <Image src={apartment} alt="" />
        </Box>
      ),
      callback: openReassignModal,
      show: (row: any) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', justifyContent: 'center', padding: '10px' }}
          title="Reactivate Trainer"
        >
          <Image src={restoreIcon} alt="" />
        </Box>
      ),
      callback: openArchiveToActive,
      show: (row: any) => row.status !== 'active',
    },
  ];

  const visibleActions = getVisibleTableActions(actions, isActiveYear);

  const handleDeleteConfirm = async () => {
    if (!actionUserId) return;
    try {
      const resp = await deleteUser({ userId: actionUserId, roleId, tenantId, reason });
      if (resp?.responseCode === 200) {
        showToastMessage('Trainer removed successfully', 'success');
        searchData(prefilledFormData, currentPage);
      } else {
        showToastMessage('Failed to remove Trainer', 'error');
      }
    } catch (error) {
      console.error('Error removing Trainer:', error);
      showToastMessage('Failed to remove Trainer', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setActionUserId(null);
    }
  };

  const handlePageChange = (newPage: any) => searchData(prefilledFormData, newPage);
  const handleRowsPerPageChange = (newRowsPerPage: any) => setPageLimit(newRowsPerPage);

  return (
    <>
      {isPageLoading ? (
        <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {schema && uiSchema && (
            <DynamicForm
              ref={formRef}
              schema={schema}
              uiSchema={updatedUiSchema}
              SubmitaFunction={SubmitaFunction}
              isCallSubmitInHandle={true}
              prefilledFormData={prefilledFormData || {}}
            />
          )}

          {formLoadError && (
            <Typography color="error">
              Could not load the Trainer Mapping form. Please try again later.
            </Typography>
          )}

          <Box mt={4} sx={pageActionBarSx}>
            <ResetFiltersButton
              searchStoreKey={searchStoreKey}
              formRef={formRef}
              SubmitaFunction={SubmitaFunction}
              setPrefilledFormData={setPrefilledFormData}
            />
            {isActiveYear && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                color="primary"
                disabled={formLoadError}
                sx={{
                  textTransform: 'none',
                  fontSize: '14px',
                  color: theme.palette.primary['100'],
                  width: '200px',
                }}
                onClick={() => {
                  resetWizard();
                  setMapModalOpen(true);
                }}
              >
                {t('COMMON.MAP_NEW')}
              </Button>
            )}
          </Box>

          {response != null ? (
            response?.result?.getUserDetails ? (
              <Box sx={pageTableSectionSx}>
                <PaginatedTable
                  count={response?.result?.totalCount}
                  data={response?.result?.getUserDetails}
                  columns={columns}
                  actions={visibleActions}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  defaultPage={currentPage}
                  defaultRowsPerPage={pageLimit}
                />
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="20vh">
                <Typography marginTop="10px" textAlign="center">
                  No Trainers found
                </Typography>
              </Box>
            )
          ) : (
            <CenteredLoader />
          )}
        </Box>
      )}

      {/* Map New Dialog: Select User + Domain/Skill -> Center (no Batch) */}
      <Dialog
        open={mapModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') handleCloseMapModal();
        }}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '100%', maxWidth: '100%', maxHeight: '100vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', p: 2 }}>
          {formStep === 1 ? (
            <Button startIcon={<ArrowBackIcon />} onClick={() => setFormStep(0)}>
              Back
            </Button>
          ) : (
            <Typography variant="h1" component="div" />
          )}
          <Typography variant="h1" component="div">
            Map User as Trainer
          </Typography>
          <IconButton aria-label="close" onClick={handleCloseMapModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {formStep === 0 && trainerMappingForm && (
            <Box sx={{ mb: 3 }}>
              <EmailSearchUser
                onUserSelected={setSelectedUserId}
                onUserDetails={handleUserDetails}
                schema={trainerMappingForm.schema}
                uiSchema={trainerMappingForm.uiSchema}
                prefilledState={prefilledState}
                onPrefilledStateChange={setPrefilledState}
                roleId={roleId}
                tenantId={tenantId}
                type="trainer"
              />
            </Box>
          )}
          {formStep === 1 && (
            <Box sx={{ mb: 3 }} display="flex" flexDirection="column" gap={2}>
              <Typography variant="body1">
                Centers matching {domain} / {skills.join(', ')} — a Trainer can be assigned to
                multiple Centers.
              </Typography>
              <TrainerCenterSelector
                domain={domain}
                skills={skills}
                value={selectedCenters}
                onChange={setSelectedCenters}
                allowedStateIds={allowedStateIds}
                requireState
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          {formStep === 0 && !!selectedUserId && (
            <Button variant="contained" color="primary" fullWidth form="dynamic-form-id" type="submit">
              {t('COMMON.NEXT')}
            </Button>
          )}
          {formStep === 1 && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={selectedCenters.length === 0 || isMapping}
              onClick={handleConfirmMapping}
            >
              {isMapping ? <CircularProgress size={20} /> : 'Map as Trainer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Dialog: Domain/Skill only */}
      <Dialog
        open={editModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            setEditModalOpen(false);
            setSelectedUserIdEdit(null);
            setSelectedUserRow(null);
          }
        }}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '100%', maxWidth: '100%', maxHeight: '100vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', p: 2 }}>
          <Typography variant="h1" component="div">
            Edit Trainer Details
          </Typography>
          <IconButton aria-label="close" onClick={() => setEditModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isEditInProgress || !trainerMappingForm ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
              <CircularProgress />
              <Typography variant="h1" component="div" sx={{ mt: 2 }}>
                Saving...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <EditSearchUser
                onUserDetails={async (userDetails: any) => {
                  if (!selectedUserIdEdit) {
                    showToastMessage('Please search and select a user', 'error');
                    return;
                  }
                  setIsEditInProgress(true);
                  try {
                    const { userData, customFields } = splitUserData(userDetails);
                    delete userData.email;

                    const updateUserResponse = await updateUser(selectedUserIdEdit, {
                      userData,
                      customFields,
                    });

                    if (updateUserResponse && updateUserResponse?.status == 200) {
                      showToastMessage('Trainer updated successfully', 'success');
                      searchData(prefilledFormData, currentPage);
                    } else {
                      showToastMessage('Could not update Trainer', 'error');
                    }
                  } catch (error) {
                    console.error('Error updating Trainer:', error);
                    showToastMessage(
                      error?.response?.data?.params?.errmsg || 'Could not update Trainer',
                      'error'
                    );
                  } finally {
                    setIsEditInProgress(false);
                    setEditModalOpen(false);
                  }
                }}
                selectedUserRow={selectedUserRow}
                schema={trainerMappingForm.schema}
                uiSchema={disableDomainSkillFields(
                  trainerMappingForm.schema,
                  trainerMappingForm.uiSchema
                )}
                userId={selectedUserIdEdit}
                roleId={roleId}
                tenantId={tenantId}
                type="trainer"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={!selectedUserIdEdit || isEditInProgress}
            form="dynamic-form-id"
            type="submit"
          >
            {t('COMMON.SAVE')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Center: add additional Centers / remove previously
          assigned ones. Domain/Skill are fixed (read from the Trainer's own
          profile), only the Center selection is editable here. */}
      <Dialog
        open={reassignModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') handleCloseReassignModal();
        }}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '100%', maxWidth: '100%', maxHeight: '100vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', p: 2 }}>
          <Typography variant="h1" component="div">
            Reassign {reassignUserName ? `${reassignUserName}'s` : "Trainer's"} Centers
          </Typography>
          <IconButton aria-label="close" onClick={handleCloseReassignModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isReassignLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
              <CircularProgress />
              <Typography variant="h1" component="div" sx={{ mt: 2 }}>
                Loading...
              </Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="body1">
                Centers matching {reassignDomain} / {reassignSkills.join(', ')} — add additional
                Centers or remove previously assigned ones.
              </Typography>
              <TrainerCenterSelector
                key={reassignUserId}
                domain={reassignDomain}
                skills={reassignSkills}
                value={reassignCenters}
                onChange={setReassignCenters}
                allowedStateIds={allowedStateIds}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={isReassignLoading || isReassigning || reassignCenters.length === 0}
            onClick={handleReassignConfirm}
          >
            {isReassigning ? <CircularProgress size={20} /> : 'Save Centers'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation — the primary button only renders/enables once
          `checked` is true and `reason` is non-empty (ConfirmationPopup's own
          contract), so this is always-checked with a required reason field
          instead of Instructor Mapping's fuller DeleteDetails checkbox. */}
      <ConfirmationPopup
        checked={true}
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t('COMMON.DELETE_USER')}
        primary={t('COMMON.DELETE_USER_WITH_REASON')}
        secondary={t('COMMON.CANCEL')}
        reason={reason}
        onClickPrimary={handleDeleteConfirm}
      >
        <Typography sx={{ mb: 2 }}>
          {actionUserName} will be removed as Trainer, including their Center mapping.
        </Typography>
        <TextField
          fullWidth
          label="Reason"
          placeholder="Reason for removing this Trainer"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmationPopup>

      <ConfirmationPopup
        checked={true}
        open={archiveToActiveOpen}
        onClose={closeArchiveToActive}
        title={t('COMMON.ACTIVATE_USER')}
        primary={t('COMMON.ACTIVATE')}
        secondary={t('COMMON.CANCEL')}
        reason={centersToActivate.length > 0 ? 'yes' : ''}
        onClickPrimary={handleArchiveToActive}
      >
        <Box sx={{ border: '1px solid #ddd', borderRadius: 2, mb: 2, p: 1 }}>
          <Typography>
            {actionUserName} {t('FORM.WAS_BELONG_TO')}
          </Typography>
          {loadingArchivedCenters ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Autocomplete
              multiple
              options={archivedCenters}
              value={centersToActivate}
              onChange={(event, newValue) => setCentersToActivate(newValue)}
              getOptionLabel={(option: any) => option.cohortName || ''}
              isOptionEqualToValue={(option: any, value: any) =>
                option.cohortMembershipId === value.cohortMembershipId
              }
              renderTags={(value, getTagProps) =>
                value.map((option: any, index) => (
                  <Chip
                    label={option.cohortName}
                    {...getTagProps({ index })}
                    key={option.cohortMembershipId}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Centers"
                  placeholder="Select centers to activate"
                  sx={{ mt: 1 }}
                />
              )}
              renderOption={(props, option: any, { selected }) => (
                <li {...props} key={option.cohortMembershipId}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {option.cohortName}
                </li>
              )}
              disableCloseOnSelect
              disabled={archivedCenters.length === 0}
            />
          )}
          {!loadingArchivedCenters && archivedCenters.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No archived centers found for this user
            </Typography>
          )}
        </Box>
        <Typography fontWeight="bold">{t('FORM.CONFIRM_TO_ACTIVATE')}</Typography>
      </ConfirmationPopup>
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

export default TrainerMapping;
