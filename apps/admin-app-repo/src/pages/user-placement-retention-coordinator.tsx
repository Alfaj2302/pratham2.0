// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  PlacementRetentionCoordinatorSearchSchema,
  PlacementRetentionCoordinatorUISchema,
} from '../constant/Forms/PlacementRetentionCoordinatorSearch';
import CloseIcon from '@mui/icons-material/Close';

import { Role, ROLE_LOGIN_URL_MAP, RoleId, RoleName, Status, TenantName } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
import {
  Box,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress
} from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@shared-lib-v2/MapUser/DeleteUser';
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
import { transformLabel } from '@/utils/helper';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import restoreIcon from '../../public/images/restore_user.svg';
import { showToastMessage } from '@/components/Toastify';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';
import {
  enhanceUiSchemaWithGrid,
  splitUserData,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import { updateUser } from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import { sendCredentialService } from '@/services/NotificationService';
import { buildProgramMappingEmailRequest } from '@shared-lib-v2/DynamicForm/utils/notifications/programMapping';
import useStore from '@/store/store';
import {
  getVisibleTableActions,
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

const PlacementRetentionCoordinator = () => {
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);

  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(PlacementRetentionCoordinatorSearchSchema);
  const [uiSchema, setUiSchema] = useState(PlacementRetentionCoordinatorUISchema);
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

  const searchStoreKey = 'placementRetentionCoordinator';
  const initialFormDataSearch =
    localStorage.getItem(searchStoreKey) &&
    localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};

  const storedUserData = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  const [roleId, setRoleID] = useState('');

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
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.placementRetentionCoordinator.context}&contextType=${FormContext.placementRetentionCoordinator.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.placementRetentionCoordinator.context}&contextType=${FormContext.placementRetentionCoordinator.contextType}`,
          header: {
            tenantid: TenantService.getTenantId(),
          },
        },
      ]);
      let alterSchema = responseForm?.schema;
      let alterUISchema = responseForm?.uiSchema;
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

      setAddSchema(alterSchema);
      setAddUiSchema(alterUISchema);
      setTenantId(localStorage.getItem('tenantId'));
    };

    setPrefilledAddFormData(initialFormDataSearch);
    fetchData();

    setRoleID(RoleId.PLACEMENT_RETENTION_COORDINATOR);
    setTenantId(localStorage.getItem('tenantId'));
  }, []);

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

  //new variables
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<
    string | string[] | null
  >(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMappingInProgress, setIsMappingInProgress] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  //edit modal variables
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserIdEdit, setSelectedUserIdEdit] = useState<
    string | null
  >(null);
  const [selectedUserRow, setSelectedUserRow] = useState<any>(null);
  const [isEditInProgress, setIsEditInProgress] = useState(false);

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
        role: RoleName.PLACEMENT_RETENTION_COORDINATOR,
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
        userList,
        staticSort
      );
    }
  };

  // Extract a display label from a customFields selectedValues entry, which
  // the API returns either as a plain string or as an { id, value } object.
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

  // Define table columns
  let columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: 'Placement Retention Coordinator Name',
      render: (row: any) =>
        `${row.firstName || ''} ${row.middleName || ''} ${
          row.lastName || ''
        }`.trim(),
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
      render: (row) => {
        const domain =
          row.customFields
            .find((field) => field.label === 'DOMAIN')
            ?.selectedValues.join(', ') || '-';
        return `${domain}`;
      },
    },
  ];

  const archiveToactive = async () => {
    try {
      const resp = await deleteUser({
        userId: editableUserId,
        roleId: roleId,
        tenantId: tenantId,
        status: 'active',
      });
      setArchiveToActiveOpen(false);
      searchData(prefilledFormData, currentPage);

      showToastMessage(t('LEARNERS.ACTIVATE_USER_SUCCESS'), 'success');
    } catch (error) {
      console.error('Error updating placement retention coordinator:', error);
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
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Edit Placement Retention Coordinator"
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
      show: (row) => row.tenantStatus !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Delete Placement Retention Coordinator"
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        setEditableUserId(row?.userId);
        const userId = row?.userId;
        try {
          const response = await deleteUser({
            userId,
            roleId,
            tenantId,
          });
          if (response?.responseCode === 200) {
            showToastMessage(t('COMMON.USER_DELETE_SUCCSSFULLY'), 'success');
            setPrefilledFormData({});
            searchData(prefilledFormData, currentPage);
          } else {
            showToastMessage(t('COMMON.FAILED_TO_DELETE_USER'), 'error');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          showToastMessage(t('COMMON.FAILED_TO_DELETE_USER'), 'error');
        }
        setOpenModal(false);
      },
      show: (row) => row.tenantStatus !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            justifyContent: 'center',
            padding: '10px',
          }}
          title="Reactivate Placement Retention Coordinator"
        >
          {' '}
          <Image src={restoreIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        const findState = row?.customFields.find((item) => {
          if (item.label === 'STATE') {
            return item;
          }
        });
        const stateValues = findState?.selectedValues
          ?.map((item: any) => {
            return typeof item === 'object' ? item?.value : item;
          })
          ?.filter(Boolean) || [];
        const stateString = stateValues.length > 0 ? stateValues.join(', ') : '';
        setState(stateString);
        setFirstName(row?.firstName);
        setLastName(row?.lastName);
        setEditableUserId(row?.userId);
        setArchiveToActiveOpen(true);
        setPrefilledFormData({});
      },
      show: (row) => row.tenantStatus !== 'active',
    }
  ];

  const visibleActions = getVisibleTableActions(actions, isActiveYear);

  // Pagination handlers
  const handlePageChange = (newPage: any) => {
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: any) => {
    setPageLimit(newRowsPerPage);
  };

  const handleOpenModal = () => setOpenModal(true);

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const [formStep, setFormStep] = useState(0);

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    tenantCohortRoleMapping: [
      {
        tenantId: TenantService.getTenantId(),
        roleId: RoleId.PLACEMENT_RETENTION_COORDINATOR,
      },
    ],
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage = 'PLACEMENT_RETENTION_COORDINATORS.PLACEMENT_RETENTION_COORDINATOR_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'placement-retention-coordinator-updated-successfully';
  const failureUpdateMessage = 'PLACEMENT_RETENTION_COORDINATORS.NOT_ABLE_UPDATE_PLACEMENT_RETENTION_COORDINATOR';
  const successCreateMessage = 'PLACEMENT_RETENTION_COORDINATORS.PLACEMENT_RETENTION_COORDINATOR_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'placement-retention-coordinator-created-successfully';
  const failureCreateMessage = 'PLACEMENT_RETENTION_COORDINATORS.NOT_ABLE_CREATE_PLACEMENT_RETENTION_COORDINATOR';
  const notificationKey = 'onYouthnetPlacementRetentionCoordinatorCreate';
  const notificationMessage = 'PLACEMENT_RETENTION_COORDINATORS.USER_CREDENTIALS_WILL_BE_SEND_SOON';
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
            searchStoreKey="placementRetentionCoordinator"
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
                setMapModalOpen(true);
              }}
            >
              {t('COMMON.MAP_NEW')}
            </Button>
          )}
        </Box>

        {response != null ? (
          <>
            {response && response?.result?.getUserDetails ? (
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
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="20vh"
              >
                <Typography marginTop="10px" textAlign={'center'}>
                  {t('COMMON.NO_PLACEMENT_RETENTION_COORDINATOR_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}

        <ConfirmationPopup
          checked={true}
          open={archiveToActiveOpen}
          onClose={() => setArchiveToActiveOpen(false)}
          title={t('COMMON.ACTIVATE_USER')}
          primary={t('COMMON.ACTIVATE')}
          secondary={t('COMMON.CANCEL')}
          reason={'yes'}
          onClickPrimary={archiveToactive}
        >
          <Box
            sx={{
              border: '1px solid #ddd',
              borderRadius: 2,
              mb: 2,
              p: 1,
            }}
          >
            <Typography>
              {firstName} {lastName} {t('FORM.WAS_BELONG_TO')}
            </Typography>
            <TextField fullWidth value={state} disabled sx={{ mt: 1 }} />
          </Box>
          <Typography fontWeight="bold">
            {t('FORM.CONFIRM_TO_ACTIVATE')}
          </Typography>
        </ConfirmationPopup>
      </Box>

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
            {t('Map User as Placement Retention Coordinator')}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setMapModalOpen(false)}
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
                }}
                onUserDetails={async (userDetails) => {
                  setUserDetails(userDetails);

                  //update user details tenant map
                  if (selectedUserId) {
                    setIsMappingInProgress(true);
                    try {
                      const { userData, customFields } =
                        splitUserData(userDetails);

                      const mappedUserEmail =
                        userData?.email || userDetails?.email;
                      const mappedUserFirstName =
                        userData?.firstName || userDetails?.firstName || '';

                      delete userData.email;

                      const object = {
                        userData: userData,
                        customFields: customFields,
                      };

                      //update user details
                      const updateUserResponse = await enrollUserTenant({
                        userId: selectedUserId,
                        tenantId: tenantId,
                        roleId: roleId,
                        customField: customFields,
                        userData: userData,
                      });

                      if (
                        updateUserResponse &&
                        updateUserResponse?.params?.err === null
                      ) {
                        showToastMessage(t(successUpdateMessage), 'success');

                        try {
                          const program =
                            localStorage.getItem('tenantName') ||
                            localStorage.getItem('program') ||
                            '';
                          const loginLink = ROLE_LOGIN_URL_MAP[Role.PLACEMENT_RETENTION_COORDINATOR];

                          if (mappedUserEmail) {
                            await sendCredentialService(
                              buildProgramMappingEmailRequest({
                                email: mappedUserEmail,
                                firstName: mappedUserFirstName,
                                role: RoleName.PLACEMENT_RETENTION_COORDINATOR,
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

                        // Close dialog
                        setMapModalOpen(false);
                        setSelectedCenterId(null);
                        setSelectedUserId(null);
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
                  } else if (!selectedUserId) {
                    showToastMessage(
                      'Please search and select a user',
                      'error'
                    );
                  }
                }}
                schema={addSchema}
                uiSchema={addUiSchema}
                prefilledState={{}}
                onPrefilledStateChange={(prefilledState) => {
                  setPrefilledState(prefilledState || {});
                }}
                roleId={roleId}
                tenantId={tenantId}
                type="placement-retention-coordinator"
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
            {t('Edit User as Placement Retention Coordinator')}
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
                  {t('Saving...')}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <EditSearchUser
                onUserDetails={async(userDetails) => {
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

                      if (
                        updateUserResponse &&
                        updateUserResponse?.status == 200
                      ) {
                        showToastMessage(t(successUpdateMessage), 'success');
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
                      setIsEditInProgress(false);
                      setEditModalOpen(false);
                    }
                  } else if (!selectedUserIdEdit) {
                    showToastMessage('Please search and select a user', 'error');
                  } else {
                    showToastMessage('Please select a center', 'error');
                  }
                }}
                selectedUserRow={selectedUserRow}
                schema={addSchema}
                uiSchema={addUiSchema}
                userId={selectedUserIdEdit}
                roleId={roleId}
                tenantId={tenantId}
                type="placement-retention-coordinator"
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

export default PlacementRetentionCoordinator;
