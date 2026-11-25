import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import { splitUserData } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { updateUser } from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import { RoleId } from '@shared-lib-v2/utils/app.constant';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import Header from '../components/Header';
import BackHeader from '../components/youthNet/BackHeader';
import withRole from '../components/withRole';
import { TENANT_DATA } from '../utils/app.config';
import { getLoggedInUserRole } from '../utils/helper';
import { YOUTHNET_USER_ROLE } from '../components/youthNet/tempConfigs';
import { bulkCreateCohortMembers } from '../services/CohortService';
import TrainerCenterSelector from '../components/trainerMapping/TrainerCenterSelector';
import PaginatedTable, {
  PaginatedTableAction,
  PaginatedTableColumn,
} from '@shared-lib-v2/lib/PaginatedTable/PaginatedTable';
import {
  disableDomainSkillFields,
  extractDomainSkillValues,
  getCenterHeadCenters,
  getCenterTrainers,
  getTrainerCentersInScope,
  getTrainerDomainSkills,
  getTrainerGender,
  getTrainerLocation,
  getTrainerName,
  getTrainerMappingForm,
  TrainerCenter,
  TrainerMappingFormBundle,
} from '../services/trainerMapping/TrainerMappingService';

const isBulkSuccess = (response: any) =>
  response?.responseCode === 201 ||
  response?.data?.responseCode === 201 ||
  response?.status === 201;

// Center Head (Lead) Trainer Mapping. Same flow as admin-app-repo's
// /user-trainer (Central Lead): Map New (search user -> Domain/Skill form ->
// Centers), Edit (profile only, Domain/Skill locked) and Reassign Center —
// with Centers restricted to the Center Head's own assigned Centers that
// match the Trainer's Domain/Skill. Removing a Trainer from a Center is done
// through Reassign; there is no tenant-wide Delete here, since that would
// also drop the Trainer from Centers this Center Head doesn't manage.
const TrainerMappingPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.LEAD) {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tenantId, setTenantId] = useState('');
  const roleId = RoleId.TEACHER;

  const [myCenters, setMyCenters] = useState<{ id: string; name: string }[]>([]);
  // Every Center step on this page is scoped to the Center Head's own Centers.
  const myCenterIds = useMemo(() => myCenters.map((center) => center.id), [myCenters]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [trainerForm, setTrainerForm] = useState<TrainerMappingFormBundle | null>(null);

  useEffect(() => {
    setTenantId(localStorage.getItem('tenantId') || '');
    const init = async () => {
      const [centers, form] = await Promise.all([
        getCenterHeadCenters(),
        getTrainerMappingForm(),
      ]);
      setMyCenters(centers);
      setSelectedCenterId(centers[0]?.id || '');
      setTrainerForm(form);
      setIsPageLoading(false);
    };
    init();
  }, []);

  // Client-side paging over the selected Center's Trainers (cohortmember/list
  // already returns them all in one call).
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadTrainers = async (centerId: string) => {
    setIsListLoading(true);
    try {
      setTrainers(await getCenterTrainers(centerId));
    } catch (error) {
      console.error('Error loading Trainers:', error);
      setTrainers([]);
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    if (selectedCenterId) loadTrainers(selectedCenterId);
  }, [selectedCenterId]);

  // Step back a page if a reload (e.g. a Reassign that removed a Trainer)
  // leaves the current page empty.
  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(trainers.length / rowsPerPage) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [trainers.length, rowsPerPage, page]);

  // ---- Map New wizard (Domain/Skill -> Center) ----
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
      showToastMessage(t('TRAINER_MAPPING.SELECT_DOMAIN_SKILL'), 'error');
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
        showToastMessage(
          enrollResponse?.params?.errmsg || t('TRAINER_MAPPING.MAP_FAILED'),
          'error'
        );
        return;
      }

      const bulkResponse = await bulkCreateCohortMembers({
        userId: [selectedUserId],
        cohortId: selectedCenters.map((center) => center.cohortId),
      });
      if (!isBulkSuccess(bulkResponse)) {
        showToastMessage(
          bulkResponse?.params?.errmsg || t('TRAINER_MAPPING.MAP_CENTERS_FAILED'),
          'error'
        );
        return;
      }

      showToastMessage(t('TRAINER_MAPPING.MAPPED_SUCCESSFULLY'), 'success');
      handleCloseMapModal();
      loadTrainers(selectedCenterId);
    } catch (error) {
      console.error('Error mapping Trainer:', error);
      showToastMessage(t('TRAINER_MAPPING.MAP_FAILED'), 'error');
    } finally {
      setIsMapping(false);
    }
  };

  // ---- Edit (profile only, Domain/Skill locked) ----
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const editUiSchema = useMemo(
    () =>
      trainerForm
        ? disableDomainSkillFields(trainerForm.schema, trainerForm.uiSchema)
        : null,
    [trainerForm]
  );

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditRow(null);
  };

  const handleEditSubmit = async (userDetails: any) => {
    if (!editRow?.userId) return;
    setIsEditSaving(true);
    try {
      const { userData, customFields } = splitUserData(userDetails);
      delete userData.email;
      const response: any = await updateUser(editRow.userId, { userData, customFields });
      if (response && response?.status == 200) {
        showToastMessage(t('TRAINER_MAPPING.UPDATED_SUCCESSFULLY'), 'success');
        loadTrainers(selectedCenterId);
      } else {
        showToastMessage(t('TRAINER_MAPPING.UPDATE_FAILED'), 'error');
      }
    } catch (error: any) {
      console.error('Error updating Trainer:', error);
      showToastMessage(
        error?.response?.data?.params?.errmsg || t('TRAINER_MAPPING.UPDATE_FAILED'),
        'error'
      );
    } finally {
      setIsEditSaving(false);
      closeEditModal();
    }
  };

  // ---- Reassign Center ----
  // Only the Center Head's own Domain/Skill-matching Centers are editable;
  // the Trainer's other Centers are carried through untouched on save.
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignRow, setReassignRow] = useState<any>(null);
  const [reassignDomain, setReassignDomain] = useState<string | undefined>(undefined);
  const [reassignSkills, setReassignSkills] = useState<string[]>([]);
  const [reassignCenters, setReassignCenters] = useState<TrainerCenter[]>([]);
  const [originalReassignIds, setOriginalReassignIds] = useState<string[]>([]);
  const [outOfScopeCenterIds, setOutOfScopeCenterIds] = useState<string[]>([]);
  const [isReassignLoading, setIsReassignLoading] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const closeReassignModal = () => {
    setReassignModalOpen(false);
    setReassignRow(null);
    setReassignCenters([]);
    setOriginalReassignIds([]);
    setOutOfScopeCenterIds([]);
  };

  const openReassignModal = async (row: any) => {
    const { domain: rowDomain, skills: rowSkills } = getTrainerDomainSkills(row);
    setReassignRow(row);
    setReassignDomain(rowDomain);
    setReassignSkills(rowSkills);
    setReassignCenters([]);
    setOriginalReassignIds([]);
    setOutOfScopeCenterIds([]);
    setReassignModalOpen(true);
    setIsReassignLoading(true);
    try {
      const current = await getTrainerCentersInScope(
        row.userId,
        rowDomain,
        rowSkills,
        myCenterIds
      );
      setReassignCenters(current.inScope);
      setOriginalReassignIds(current.inScope.map((center) => center.cohortId));
      setOutOfScopeCenterIds(current.outOfScopeIds);
    } catch (error) {
      console.error('Error loading Trainer Centers:', error);
      showToastMessage(t('TRAINER_MAPPING.CENTERS_LOAD_FAILED'), 'error');
    } finally {
      setIsReassignLoading(false);
    }
  };

  const handleReassignConfirm = async () => {
    if (!reassignRow?.userId || isReassigning) return;
    const selectedIds = reassignCenters.map((center) => center.cohortId);
    const removedIds = originalReassignIds.filter((id) => !selectedIds.includes(id));
    const finalIds = [...selectedIds, ...outOfScopeCenterIds];
    if (selectedIds.length === 0) {
      showToastMessage(t('TRAINER_MAPPING.SELECT_AT_LEAST_ONE_CENTER'), 'error');
      return;
    }
    setIsReassigning(true);
    try {
      const response = await bulkCreateCohortMembers({
        userId: [reassignRow.userId],
        cohortId: finalIds,
        ...(removedIds.length > 0 ? { removeCohortId: removedIds } : {}),
      });
      if (!isBulkSuccess(response)) {
        showToastMessage(
          response?.params?.errmsg || t('TRAINER_MAPPING.REASSIGN_FAILED'),
          'error'
        );
        return;
      }
      showToastMessage(t('TRAINER_MAPPING.REASSIGNED_SUCCESSFULLY'), 'success');
      closeReassignModal();
      loadTrainers(selectedCenterId);
    } catch (error) {
      console.error('Error reassigning Trainer Centers:', error);
      showToastMessage(t('TRAINER_MAPPING.REASSIGN_FAILED'), 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  const columns: PaginatedTableColumn[] = [
    { key: 'name', label: t('TRAINER_MAPPING.TRAINER_NAME'), minWidth: 200, render: getTrainerName },
    { key: 'gender', label: t('TRAINER_MAPPING.GENDER'), render: getTrainerGender },
    {
      key: 'mobile',
      label: t('TRAINER_MAPPING.MOBILE'),
      minWidth: 140,
      render: (row: any) => row.mobile || '-',
    },
    { key: 'location', label: t('TRAINER_MAPPING.LOCATION'), minWidth: 320, render: getTrainerLocation },
    {
      key: 'domain',
      label: t('TRAINER_MAPPING.DOMAIN'),
      minWidth: 200,
      render: (row: any) => getTrainerDomainSkills(row).domain || '-',
    },
    {
      key: 'skills',
      label: t('TRAINER_MAPPING.SKILL'),
      minWidth: 240,
      render: (row: any) => getTrainerDomainSkills(row).skills.join(', ') || '-',
    },
  ];

  const actions: PaginatedTableAction[] = [
    {
      icon: <EditIcon />,
      title: t('TRAINER_MAPPING.EDIT_TRAINER'),
      disabled: !trainerForm,
      callback: (row: any) => {
        setEditRow(row);
        setEditModalOpen(true);
      },
    },
    {
      icon: <ApartmentIcon />,
      title: t('TRAINER_MAPPING.REASSIGN_CENTER'),
      callback: openReassignModal,
    },
  ];

  const dialogPaperProps = {
    sx: { width: '100%', maxWidth: '100%', maxHeight: '100vh' },
  };
  const dialogTitleSx = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    p: 2,
  };

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader headingOne={t('TRAINER_MAPPING.PAGE_TITLE')} />
      </Box>

      {isPageLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2} sx={{ px: 2, mb: 4 }}>
          {!trainerForm && (
            <Typography color="error">{t('TRAINER_MAPPING.FORM_LOAD_FAILED')}</Typography>
          )}

          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>{t('TRAINER_MAPPING.CENTER')}</InputLabel>
              <Select
                label={t('TRAINER_MAPPING.CENTER')}
                value={selectedCenterId}
                onChange={(event) => setSelectedCenterId(String(event.target.value))}
              >
                {myCenters.map((center) => (
                  <MenuItem key={center.id} value={center.id}>
                    {center.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={!trainerForm || myCenters.length === 0}
              sx={{ textTransform: 'none' }}
              onClick={() => {
                resetWizard();
                setMapModalOpen(true);
              }}
            >
              {t('TRAINER_MAPPING.MAP_NEW')}
            </Button>
          </Box>

          {myCenters.length === 0 ? (
            <Typography textAlign="center" py={4}>
              {t('TRAINER_MAPPING.NO_CENTERS_ASSIGNED')}
            </Typography>
          ) : isListLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : trainers.length === 0 ? (
            <Typography textAlign="center" py={4}>
              {t('TRAINER_MAPPING.NO_TRAINERS')}
            </Typography>
          ) : (
            <PaginatedTable
              count={trainers.length}
              data={trainers.slice(page * rowsPerPage, (page + 1) * rowsPerPage)}
              columns={columns}
              actions={actions}
              actionsLabel={t('TRAINER_MAPPING.ACTIONS')}
              defaultPage={page}
              defaultRowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5, 10, 15]}
              onPageChange={(newPage) => setPage(newPage)}
              onRowsPerPageChange={(newRowsPerPage) => {
                setRowsPerPage(newRowsPerPage);
                setPage(0);
              }}
              getRowKey={(row: any) => row.userId}
            />
          )}
        </Box>
      )}

      {/* Map New: Select User + Domain/Skill -> Center */}
      <Dialog
        open={mapModalOpen}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') handleCloseMapModal();
        }}
        maxWidth={false}
        fullWidth
        PaperProps={dialogPaperProps}
      >
        <DialogTitle sx={dialogTitleSx}>
          {formStep === 1 ? (
            <Button startIcon={<ArrowBackIcon />} onClick={() => setFormStep(0)}>
              {t('COMMON.BACK')}
            </Button>
          ) : (
            <Box />
          )}
          <Typography variant="h1" component="div">
            {t('TRAINER_MAPPING.MAP_USER_AS_TRAINER')}
          </Typography>
          <IconButton aria-label="close" onClick={handleCloseMapModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {formStep === 0 && trainerForm && (
            <Box sx={{ mb: 3 }}>
              <EmailSearchUser
                onUserSelected={setSelectedUserId}
                onUserDetails={handleUserDetails}
                schema={trainerForm.schema}
                uiSchema={trainerForm.uiSchema}
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
                {t('TRAINER_MAPPING.MATCHING_CENTERS', {
                  domain,
                  skills: skills.join(', '),
                })}
              </Typography>
              <TrainerCenterSelector
                domain={domain}
                skills={skills}
                value={selectedCenters}
                onChange={setSelectedCenters}
                allowedCenterIds={myCenterIds}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          {formStep === 0 && !!selectedUserId && (
            <Button variant="contained" fullWidth form="dynamic-form-id" type="submit">
              {t('COMMON.NEXT')}
            </Button>
          )}
          {formStep === 1 && (
            <Button
              variant="contained"
              fullWidth
              disabled={selectedCenters.length === 0 || isMapping}
              onClick={handleConfirmMapping}
            >
              {isMapping ? <CircularProgress size={20} /> : t('TRAINER_MAPPING.MAP_AS_TRAINER')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit: profile fields only */}
      <Dialog
        open={editModalOpen}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') closeEditModal();
        }}
        maxWidth={false}
        fullWidth
        PaperProps={dialogPaperProps}
      >
        <DialogTitle sx={dialogTitleSx}>
          <Typography variant="h1" component="div">
            {t('TRAINER_MAPPING.EDIT_TRAINER_DETAILS')}
          </Typography>
          <IconButton aria-label="close" onClick={closeEditModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isEditSaving || !trainerForm || !editRow ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <EditSearchUser
                onUserDetails={handleEditSubmit}
                selectedUserRow={editRow}
                schema={trainerForm.schema}
                uiSchema={editUiSchema}
                userId={editRow.userId}
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
            fullWidth
            disabled={!editRow || isEditSaving}
            form="dynamic-form-id"
            type="submit"
          >
            {t('COMMON.SAVE')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Center: add/remove within the Center Head's own Centers */}
      <Dialog
        open={reassignModalOpen}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') closeReassignModal();
        }}
        maxWidth={false}
        fullWidth
        PaperProps={dialogPaperProps}
      >
        <DialogTitle sx={dialogTitleSx}>
          <Typography variant="h1" component="div">
            {t('TRAINER_MAPPING.REASSIGN_TITLE', {
              name: reassignRow ? getTrainerName(reassignRow) : '',
            })}
          </Typography>
          <IconButton aria-label="close" onClick={closeReassignModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isReassignLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="body1">
                {t('TRAINER_MAPPING.REASSIGN_MATCHING_CENTERS', {
                  domain: reassignDomain || '-',
                  skills: reassignSkills.join(', ') || '-',
                })}
              </Typography>
              <TrainerCenterSelector
                key={reassignRow?.userId}
                domain={reassignDomain}
                skills={reassignSkills}
                value={reassignCenters}
                onChange={setReassignCenters}
                allowedCenterIds={myCenterIds}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            fullWidth
            disabled={isReassignLoading || isReassigning || reassignCenters.length === 0}
            onClick={handleReassignConfirm}
          >
            {isReassigning ? <CircularProgress size={20} /> : t('TRAINER_MAPPING.SAVE_CENTERS')}
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

export default withRole(TENANT_DATA.YOUTHNET)(TrainerMappingPage);
