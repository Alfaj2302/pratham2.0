// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { TrainerSearchSchema, TrainerSearchUISchema } from '../constant/Forms/TrainerSearch';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Role, RoleId } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
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
} from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@shared-lib-v2/MapUser/DeleteUser';
import editIcon from '../../public/images/editIcon.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
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
import { bulkCreateCohortMembers } from '@/services/CohortService/cohortService';
import {
  extractDomainSkillValues,
  getTrainerMappingForm,
} from '@/services/trainer/TrainerFormService';
import TrainerCenterSelector from '@/components/trainer/TrainerCenterSelector';

// Trainer listing + filters, matching user-placement-retention-coordinator.tsx's
// own page shape exactly (search bar + Reset/Map New action row + Paginated
// list + Edit/Delete/Reactivate), sitting next to it under Manage Users.
// Trainer itself reuses the Instructor role (RoleId.TEACHER, same as
// user-instructor.tsx) — there is no separate backend role for it — and the
// list is filtered/searched the same way that page's own Instructor search
// already works (`userList` with role:'Instructor').
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
  const [pageOffset, setPageOffset] = useState<number>(0);
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

  const searchStoreKey = 'trainer';
  const initialFormDataSearch =
    localStorage.getItem(searchStoreKey) &&
    localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};

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

  const searchData = async (formData: any, newPage: any) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      delete formData.status;
      if (formData.tenantStatus === 'all') {
        delete formData.tenantStatus;
      }
      const staticFilter = {
        role: Role.TEACHER,
        tenantId: TenantService.getTenantId(),
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
        userList,
        staticSort
      );
    }
  };

  // Domain/Skill/State/District/Block/Village are all read out of each
  // row's own customFields by label — same convention
  // PlacementRetentionCoordinator's own Domain column and
  // TrainerTaxonomyService (mfes/youthNet) already use. A customField's own
  // selectedValues come back in two different shapes from /user/list —
  // DOMAIN/SKILLS as plain strings (["Apparel"]), but
  // STATE/DISTRICT/BLOCK/VILLAGE as objects ([{id, value}]) — rendering the
  // object form directly is what produced "[object Object]" in the table.
  // Read whichever shape is present.
  const getSelectedValueLabel = (selectedValue: any): string | null => {
    if (selectedValue == null) return null;
    if (typeof selectedValue === 'object') {
      return selectedValue.label || selectedValue.value || null;
    }
    return String(selectedValue);
  };

  const findCustomFieldValues = (row: any, label: string): string => {
    const field = row?.customFields?.find((f: any) => f.label === label);
    const values = (field?.selectedValues || [])
      .map(getSelectedValueLabel)
      .filter(Boolean);
    return values.length ? values.join(', ') : '-';
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
      render: (row: any) => transformLabel(row.tenantStatus),
      getStyle: (row: any) => ({
        color: row.tenantStatus === 'active' ? 'green' : 'red',
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
        const parts = ['STATE', 'DISTRICT', 'BLOCK', 'VILLAGE']
          .map((label) => findCustomFieldValues(row, label))
          .filter((part) => part && part !== '-');
        return parts.length ? parts.join(' / ') : '-';
      },
    },
    {
      key: 'DOMAIN',
      label: 'Domain',
      render: (row: any) => findCustomFieldValues(row, 'DOMAIN'),
    },
    {
      key: 'SKILLS',
      label: 'Skill',
      render: (row: any) => findCustomFieldValues(row, 'SKILLS'),
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
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [isMapping, setIsMapping] = useState(false);

  const resetWizard = () => {
    setFormStep(0);
    setPrefilledState({});
    setSelectedUserId(null);
    setUserPayload(null);
    setDomain(undefined);
    setSkills([]);
    setSelectedCenter(null);
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
    if (!selectedUserId || !selectedCenter || !userPayload || isMapping) return;
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
        cohortId: [selectedCenter.cohortId],
      });

      const isBulkSuccess =
        bulkResponse?.responseCode === 201 ||
        bulkResponse?.data?.responseCode === 201 ||
        bulkResponse?.status === 201;

      if (!isBulkSuccess) {
        showToastMessage(
          bulkResponse?.params?.errmsg || 'Could not map Trainer to this Center',
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

  // ---- Delete / Reactivate confirmation state ----
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionUserName, setActionUserName] = useState('');
  const [reason, setReason] = useState('');

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
      show: (row: any) => row.tenantStatus !== 'archived',
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
      show: (row: any) => row.tenantStatus !== 'archived',
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
      callback: (row: any) => {
        setActionUserId(row?.userId);
        setActionUserName(`${row.firstName || ''} ${row.lastName || ''}`.trim());
        setReactivateConfirmOpen(true);
      },
      show: (row: any) => row.tenantStatus !== 'active',
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

  const handleReactivateConfirm = async () => {
    if (!actionUserId) return;
    try {
      const resp = await deleteUser({ userId: actionUserId, roleId, tenantId, status: 'active' });
      if (resp?.responseCode === 200) {
        showToastMessage('Trainer activated successfully', 'success');
        searchData(prefilledFormData, currentPage);
      } else {
        showToastMessage('Failed to activate Trainer', 'error');
      }
    } catch (error) {
      console.error('Error activating Trainer:', error);
      showToastMessage('Failed to activate Trainer', 'error');
    } finally {
      setReactivateConfirmOpen(false);
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
                Centers matching {domain} / {skills.join(', ')}
              </Typography>
              <TrainerCenterSelector
                domain={domain}
                skills={skills}
                value={selectedCenter}
                onChange={setSelectedCenter}
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
              disabled={!selectedCenter || isMapping}
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
            Edit Trainer's Domain/Skill
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
                uiSchema={trainerMappingForm.uiSchema}
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

      {/* Reactivate confirmation */}
      <ConfirmationPopup
        checked={true}
        open={reactivateConfirmOpen}
        onClose={() => setReactivateConfirmOpen(false)}
        title={t('COMMON.ACTIVATE_USER')}
        primary={t('COMMON.ACTIVATE')}
        secondary={t('COMMON.CANCEL')}
        reason="yes"
        onClickPrimary={handleReactivateConfirm}
      >
        <Typography fontWeight="bold">
          {actionUserName} — {t('FORM.CONFIRM_TO_ACTIVATE')}
        </Typography>
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
