// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import axios from 'axios';
import axiosInstance from '@/services/Interceptor';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import { enhanceUiSchemaWithGrid } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  TeamLeaderSearchSchema,
  TeamLeaderSearchUISchema,
} from '../constant/Forms/TeamLeaderSearch';
import { Role, ROLE_LOGIN_URL_MAP, RoleId, Status, TenantName } from '@/utils/app.constant';
import { HierarchicalSearchUserList, userList } from '@/services/UserList';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  CircularProgress,
  Autocomplete,
  Chip,
} from '@mui/material';
import { debounce, set } from 'lodash';
import { Numbers } from '@mui/icons-material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AddEditUser from '@/components/EntityForms/AddEditUser/AddEditUser';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  bulkCreateCohortMembers,
  updateCohortMemberStatus,
} from '@/services/CohortService/cohortService';
import editIcon from '../../public/images/editIcon.svg';
import apartment from '../../public/images/apartment.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import DeleteDetails from '@/components/DeleteDetails';
import { deleteUser } from '@shared-lib-v2/MapUser/DeleteUser';
import { reactivateUserRoleAndTenant } from '@shared-lib-v2/MapUser/UserRoleArchival';
import {
  calculateAge,
  calculateAgeFromDate,
  transformLabel,
} from '@/utils/helper';
import { getCohortList } from '@/services/GetCohortList';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import restoreIcon from '../../public/images/restore_user.svg';
import { showToastMessage } from '@/components/Toastify';
import MultipleCenterListWidgetNew from '@shared-lib-v2/MapUser/MultipleCenterListWidgetNew';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { updateUser } from '@/services/CreateUserService';
import { splitUserData } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import { sendCredentialService } from '@/services/NotificationService';
import { buildProgramMappingEmailRequest } from '@shared-lib-v2/DynamicForm/utils/notifications/programMapping';
import useStore from '@/store/store';
import {
  getVisibleTableActions,
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

const UserLeader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(TeamLeaderSearchSchema);
  const [uiSchema, setUiSchema] = useState(TeamLeaderSearchUISchema);
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
  const [isReassign, setIsReassign] = useState(false);
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);
  const [selectedCenters, setSelectedCenters] = useState<any[]>([]);
  const [availableCenters, setAvailableCenters] = useState<any[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);

  const [editableUserId, setEditableUserId] = useState('');
  const [roleId, setRoleID] = useState('');
  const [blockFieldId, setBlockFieldId] = useState('');
  const [districtFieldId, setDistrictFieldId] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [village, setVillage] = useState('');
  const [reason, setReason] = useState('');
  const [userID, setUserId] = useState('');

  const { t, i18n } = useTranslation();
  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const formRef = useRef(null);

  const [formStep, setFormStep] = useState(0);

  const initialFormData = localStorage.getItem('stateId')
    ? { state: [localStorage.getItem('stateId')] }
    : {};

  const searchStoreKey = 'teamLeader';
  const initialFormDataSearch =
    localStorage.getItem(searchStoreKey) &&
      localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : localStorage.getItem('stateId')
        ? { state: [localStorage.getItem('stateId')] }
        : {};

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
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.teamLead.context}&contextType=${FormContext.teamLead.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.teamLead.context}&contextType=${FormContext.teamLead.contextType}`,
          header: {
            tenantid: localStorage.getItem('tenantId'),
          },
        },
      ]);
      // console.log('responseForm', responseForm);
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

      console.log('############# debugschema alterUISchema', alterUISchema);
      console.log('############# debugschema alterSchema', alterSchema);

      setAddSchema(alterSchema);
      setAddUiSchema(alterUISchema);
    };
    fetchData();
    setRoleID(RoleId.TEAM_LEADER);
    setTenantId(localStorage.getItem('tenantId'));
  }, []);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true, // Hide submit button if isHide is true
    },
  };
  const SubmitaFunction = async (formData: any) => {
    console.log('###### debug issue formData', formData);
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
      role: [Role.TEAM_LEADER],
      customfields: ['state', 'district', 'block', 'village'],
    });
  };

  const archiveToactive = async () => {
    try {
      // Validate that at least one center is selected
      if (!selectedCenters || selectedCenters.length === 0) {
        showToastMessage('Please select at least one center', 'error');
        return;
      }

      // Update cohort member status for each selected center
      const membershipIds = selectedCenters.map((center) => center.cohortMembershipId);

      for (const membershipId of membershipIds) {
        try {
          const updateResponse = await updateCohortMemberStatus({
            memberStatus: 'active',
            membershipId,
          });

          if (updateResponse?.responseCode !== 200) {
            console.error(
              `Failed to activate user with membershipId ${membershipId}:`,
              updateResponse
            );
            showToastMessage(
              `Failed to activate center membership ${membershipId}`,
              'error'
            );
            return;
          } else {
            console.log(
              `User with membershipId ${membershipId} successfully activated.`
            );
          }
        } catch (error) {
          console.error(
            `Error activating user with membershipId ${membershipId}:`,
            error
          );
          showToastMessage(
            `Error activating center membership ${membershipId}`,
            'error'
          );
          return;
        }
      }

      // After successful center activation: User Role Archival API (status
      // active), then Tenant Status Update API when tenant is not active
      const resp = await reactivateUserRoleAndTenant({
        userId: userID,
        roleId: RoleId.TEAM_LEADER,
        tenantId,
      });

      if (resp?.responseCode === 200) {
        showToastMessage(t('LEARNERS.ACTIVATE_USER_SUCCESS'), 'success');
        // Reset state
        setSelectedCenters([]);
        setAvailableCenters([]);
        setArchiveToActiveOpen(false);
        // Refresh the list
        searchData(prefilledFormData, currentPage);
        console.log('User successfully activated.');
      } else {
        console.error('Failed to activate user:', resp);
        showToastMessage('Failed to activate user', 'error');
      }

      return resp;
    } catch (error) {
      console.error('Error activating user:', error);
      showToastMessage('Error activating user', 'error');
    }
  };
  const searchData = async (formData, newPage) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      const staticFilter = {
        role: 'Lead',
        tenantId: localStorage.getItem('tenantId'),
      };
      if (localStorage.getItem('roleName') === Role.ADMIN) {
        staticFilter.state = [localStorage.getItem('stateId')];
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

  // Define table columns
  const columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: 'Team Lead Name',
      render: (row) =>
        `${transformLabel(row.firstName) || ''} ${
          transformLabel(row.middleName) || ''
          } ${transformLabel(row.lastName) || ''}`.trim(),
    },
    // {
    //   keys: ['age'],
    //   label: 'Age',
    //   render: (row) => calculateAgeFromDate(row.dob) || '',
    // },
    {
      keys: ['gender'],
      label: 'Gender',
      render: (row) => transformLabel(row.gender) || '',
    },
    {
      keys: ['STATE', 'DISTRICT', 'BLOCK'],
      label: 'State, District, Block',
      render: (row: any) => {
        const state = transformLabel(row?.customfield?.state) || '';
        const district = transformLabel(row?.customfield?.district) || '';
        const block = transformLabel(row?.customfield?.block) || '';
        return `${state == '' ? '' : `${state}`}${
          district == '' ? '' : `, ${district}`
          }${block == '' ? '' : `, ${block}`}`;
      },
    },
    {
      keys: ['CENTER'],
      label: 'Center',
      render: (row: any) => {
        const centerList =
          row?.cohortData
            ?.filter((item: any) => item?.cohortMember?.status === 'active' && item?.centerStatus === 'active')
            ?.map((item: any) => item?.centerName) || [];
        return centerList.join(', ');
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(row.status),
      getStyle: (row) => ({ color: row.status === 'active' ? 'green' : 'red' }),
    },
  ];

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
          title="Edit Team Leader"
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row) => {
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
          title="Delete Team Leader"
        >
          {' '}
          <Image src={deleteIcon} alt="" />{' '}
        </Box>
      ),
      callback: async (row) => {
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
          title="Reassign Team Leader"
        >
          <Image src={apartment} alt="" />
        </Box>
      ),
      callback: async (row) => {
        setReassignModalOpen(true);
        setSelectedCenterIdReassign(null); // Reset center selection when dialog closes
        setOriginalCenterIdReassign(null); // Reset original center selection when dialog closes
        setSelectedCenterListReassign([]); // Reset center list when dialog closes
        setSelectedUserIdReassign(null); // Reset user selection when dialog closes
        setIsReassignModelProgress(true);

        //load prefilled value
        //call geographical data api
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          tenantId: localStorage.getItem('tenantId') || '',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          academicyearid: localStorage.getItem('academicYearId') || '',
        };
        const userId = row?.userId;
        const cohortData = row?.cohortData;
        setSelectedUserIdReassign(userId);
        const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/cohort/geographical-hierarchy`;
        let response = null;
        try {
          response = await axios.post(apiUrl, { userId: userId }, { headers });
        }
        catch (e) { }
        const geographicalData = response?.data?.result?.data || [];

        // Transform geographicalData into centerList
        const centerList = [];
        const centerIdArray = [];

        geographicalData.forEach((state) => {
          state.districts?.forEach((district) => {
            district.blocks?.forEach((block) => {
              block.centers?.forEach((center) => {
                // Check if centerId exists in cohortData with active status
                // Filter all entries for the same centerId and check if any has both statuses active
                const cohortCenters = cohortData?.filter(
                  (item: any) => item?.centerId === center.centerId
                );
                const isActiveCenter = cohortCenters?.some(
                  (cohortCenter: any) =>
                    cohortCenter?.cohortMember?.status === 'active' && cohortCenter?.centerStatus === 'active'
                );

                // Only push if center has active cohortMember status
                if (isActiveCenter) {
                  const centerObject = {
                    value: center.centerId,
                    label: center.centerName,
                    state: state.stateName,
                    district: district.districtName,
                    block: block.blockName,
                    village: null, // villageName might not exist in the structure
                    stateId: state.stateId,
                    districtId: district.districtId,
                    blockId: block.blockId,
                    villageId: null, // villageId might not exist in the structure
                  };
                  centerList.push(centerObject);
                  centerIdArray.push(center.centerId);
                }
              });
            });
          });
        });
        setSelectedCenterIdReassign(
          centerIdArray.length > 0 ? centerIdArray : null
        );
        setOriginalCenterIdReassign(
          centerIdArray.length > 0 ? centerIdArray : null
        );
        setSelectedCenterListReassign(centerList);
        setIsReassignModelProgress(false);
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
          title="Reactivate Team Leader"
        >
          {' '}
          <Image src={restoreIcon} alt="" />{' '}
        </Box>
      ),
      callback: async (row) => {
        const selectedUserId = row?.userId;
        setEditableUserId(row?.userId);
        setUserId(row?.userId);
        setFirstName(row?.firstName);
        setLastName(row?.lastName);
        setSelectedCenters([]);
        setAvailableCenters([]);
        setLoadingCenters(true);
        setArchiveToActiveOpen(true);

        try {
          // Fetch cohort list for the user
          const cohortResponse = await getCohortList(selectedUserId);
          const cohortList = cohortResponse?.result || [];

          // Filter centers where cohortMemberStatus = "archived", cohortStatus = "active", and type = "CENTER" or "COHORT"
          // Filter and remove duplicates based on cohortId
          const filteredCenters = [];
          const seenCohortIds = new Set();
          for (const cohort of cohortList) {
            if (
              cohort.cohortMemberStatus === 'archived' &&
              cohort.cohortStatus === 'active' &&
              (cohort.type === 'CENTER' || cohort.type === 'COHORT')
            ) {
              if (!seenCohortIds.has(cohort.cohortId)) {
                filteredCenters.push(cohort);
                seenCohortIds.add(cohort.cohortId);
              }
            }
          }

          setAvailableCenters(filteredCenters);
        } catch (error) {
          console.error('Error fetching cohort list:', error);
          showToastMessage('Failed to load centers', 'error');
        } finally {
          setLoadingCenters(false);
        }
      },
      show: (row) => row.status !== 'active',
    },
  ];

  const visibleActions = getVisibleTableActions(actions, isActiveYear);

  // Pagination handlers
  const handlePageChange = (newPage) => {
    // console.log('Page changed to:', newPage);
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    // console.log('Rows per page changed to:', newRowsPerPage);
    setPageLimit(newRowsPerPage);
  };

  const handleOpenModal = () => setOpenModal(true);

  const handleCloseModal = () => {
    setOpenModal(false);
    setIsReassign(false);
    setIsEdit(false);
  };

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    tenantCohortRoleMapping: [
      {
        tenantId: tenantId,
        roleId: roleId,
      },
    ],
    username: 'scpTeamLead',
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage = 'TEAM_LEADERS.TEAM_LEADER_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'scp-team-lead-updated-successfully';
  const failureUpdateMessage = 'TEAM_LEADERS.NOT_ABLE_UPDATE_TEAM_LEADER';
  const successCreateMessage = 'TEAM_LEADERS.TEAM_LEADER_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'scp-team-lead-created-successfully';
  const failureCreateMessage = 'TEAM_LEADERS.NOT_ABLE_CREATE_TEAM_LEADER';
  const notificationKey = 'onTeamLeaderCreated';
  const notificationMessage = 'TEAM_LEADERS.USER_CREDENTIALS_WILL_BE_SEND_SOON';
  const notificationContext = 'USER';
  const blockReassignmentNotificationKey = 'TL_BLOCK_REASSIGNMENT';
  const profileUpdateNotificationKey = 'TL_PROFILE_UPDATE';
  const districtUpdateNotificationKey = 'TL_DISTRICT_UPDATE';

  useEffect(() => {
    setPrefilledFormData(initialFormDataSearch);
  }, []);

  //new variables
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<
    string | string[] | null
  >(null);
  const [selectedCenterList, setSelectedCenterList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMappingInProgress, setIsMappingInProgress] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  //reassign modal variables
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedCenterIdReassign, setSelectedCenterIdReassign] = useState<
    string | string[] | null
  >(null);
  const [originalCenterIdReassign, setOriginalCenterIdReassign] = useState<
    string | string[] | null
  >(null);
  const [selectedCenterListReassign, setSelectedCenterListReassign] = useState<
    any[]
  >([]);
  const [selectedUserIdReassign, setSelectedUserIdReassign] = useState<
    string | null
  >(null);
  const [isReassignInProgress, setReassignInProgress] = useState(false);
  const [isReassignModelProgress, setIsReassignModelProgress] = useState(false);

  //edit modal variables
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserIdEdit, setSelectedUserIdEdit] = useState<
    string | null
  >(null);
  const [selectedUserRow, setSelectedUserRow] = useState<any>(null);
  const [isEditInProgress, setIsEditInProgress] = useState(false);

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
              prefilledFormData={prefilledFormData}
            />
          )
        )}
        <Box mt={4} sx={pageActionBarSx}>
          <ResetFiltersButton
            searchStoreKey="teamLeader"
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
                  {t('TEAM_LEADERS.NO_TEAM_LEADER_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}
      </Box>

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
              console.log('Team leader successfully archived.');
            } else {
              console.error('Failed to archive team leader:', resp);
            }
          } catch (error) {
            console.error('Error deleting team leader:', error);
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
          isForTeamLead={true}
        />
      </ConfirmationPopup>
      <ConfirmationPopup
        checked={true}
        open={archiveToActiveOpen}
        onClose={() => {
          setArchiveToActiveOpen(false);
          setSelectedCenters([]);
          setAvailableCenters([]);
        }}
        title={t('COMMON.ACTIVATE_USER')}
        primary={t('COMMON.ACTIVATE')}
        secondary={t('COMMON.CANCEL')}
        reason={selectedCenters.length > 0 ? 'yes' : ''}
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
          {loadingCenters ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Autocomplete
              multiple
              options={availableCenters}
              value={selectedCenters}
              onChange={(event, newValue) => {
                setSelectedCenters(newValue);
              }}
              getOptionLabel={(option) => option.cohortName || ''}
              isOptionEqualToValue={(option, value) =>
                option.cohortMembershipId === value.cohortMembershipId
              }
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
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
              renderOption={(props, option, { selected }) => (
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
              disabled={loadingCenters || availableCenters.length === 0}
            />
          )}
          {!loadingCenters && availableCenters.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No archived centers found for this user
            </Typography>
          )}
        </Box>
        <Typography fontWeight="bold">
          {t('FORM.CONFIRM_TO_ACTIVATE')}
        </Typography>
      </ConfirmationPopup>

      {/* Map Modal Dialog */}
      <Dialog
        open={mapModalOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click
          if (reason !== 'backdropClick') {
            setMapModalOpen(false);
            setSelectedCenterId(null); // Reset center selection when dialog closes
            setSelectedCenterList([]); // Reset center list when dialog closes
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
              onClick={() => setFormStep(0)}
            >
              {t('COMMON.BACK')}
            </Button>
          ) : (
            <Typography variant="h1" component="div"></Typography>
          )}
          <Typography variant="h1" component="div">
            {t('Map User as Lead')}
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
                  console.log('Selected User ID:', userId);
                }}
                onUserDetails={(userDetails) => {
                  console.log('############# userDetails', userDetails);
                  setUserDetails(userDetails);
                  setFormStep(1);
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
              <MultipleCenterListWidgetNew
                value={selectedCenterId}
                onChange={(centerId) => {
                  setSelectedCenterId(centerId);
                  console.log('Selected Center ID:', centerId);
                }}
                onCenterList={(centerList) => {
                  setSelectedCenterList(centerList || []);
                  console.log('############# centerList', centerList);
                }}
                selectedCenterList={selectedCenterList}
                label="Select Center"
                required={true}
                multiple={false}
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
          {formStep === 1 && !(!selectedUserId || !selectedCenterId || isMappingInProgress) && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={async () => {
                if (selectedUserId && selectedCenterId) {
                  setIsMappingInProgress(true);
                  try {
                    const { userData, customFields } =
                      splitUserData(userDetails);

                    const mappedUserEmail = userData?.email || userDetails?.email;
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
                    console.log(
                      '######### updatedResponse',
                      updateUserResponse
                    );

                    if (
                      updateUserResponse &&
                      updateUserResponse?.params?.err === null
                    ) {
                      // getNotification(editableUserId, profileUpdateNotificationKey);
                      showToastMessage(t(successUpdateMessage), 'success');
                      // telemetryCallbacks(telemetryUpdateKey);

                      //map user to tenant
                      // Ensure selectedCenterId is a string (handle array case)
                      const cohortId = Array.isArray(selectedCenterId)
                        ? selectedCenterId
                        : [selectedCenterId];

                      console.log('Creating with User ID:', selectedUserId);
                      console.log(
                        'Creating with Center ID (cohortId):',
                        cohortId
                      );

                      // Call the cohortmember/create API
                      const response = await bulkCreateCohortMembers({
                        userId: [selectedUserId],
                        cohortId: cohortId,
                        // removeCohortId: [],
                      });

                      if (
                        response?.responseCode === 201 ||
                        response?.data?.responseCode === 201 ||
                        response?.status === 201
                      ) {
                        showToastMessage(t(successCreateMessage), 'success');

                        try {
                          const program =
                            localStorage.getItem('tenantName') ||
                            localStorage.getItem('program') ||
                            '';
                          // TODO: confirm which env var should provide login link
                          const loginLink = ROLE_LOGIN_URL_MAP[Role.TEAM_LEADER];
                          const roleForNotification =
                            program === TenantName.YOUTHNET
                              ? 'Center Head'
                              : 'Team Leader';

                          if (mappedUserEmail) {
                            await sendCredentialService(
                              buildProgramMappingEmailRequest({
                                email: mappedUserEmail,
                                firstName: mappedUserFirstName,
                                role: roleForNotification,
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
                        setSelectedCenterList([]);
                        setSelectedUserId(null);
                        // Refresh the data
                        searchData(prefilledFormData, 0);
                      } else {
                        showToastMessage(
                          response?.data?.params?.errmsg ||
                          t(failureCreateMessage),
                          'error'
                        );
                      }
                    } else {
                      // console.error('Error update user:', error);
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
                  showToastMessage('Please search and select a user', 'error');
                } else {
                  showToastMessage('Please select a center', 'error');
                }
              }}
              disabled={
                !selectedUserId || !selectedCenterId || isMappingInProgress
              }
            >
              {t('COMMON.MAP')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Reassign Modal Dialog */}
      <Dialog
        open={reassignModalOpen}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click
          if (reason !== 'backdropClick') {
            setReassignModalOpen(false);
            setSelectedCenterIdReassign(null); // Reset center selection when dialog closes
            setOriginalCenterIdReassign(null); // Reset original center selection when dialog closes
            setSelectedCenterListReassign([]); // Reset center list when dialog closes
            setSelectedUserIdReassign(null); // Reset user selection when dialog closes
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
            {t('Reassign Lead to Center')}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setReassignModalOpen(false)}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {isReassignModelProgress ? (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '150px',
                }}
              >
                <CircularProgress />
                <Typography variant="h1" component="div" sx={{ mt: 2 }}>
                  {t('Loading...')}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <MultipleCenterListWidgetNew
                value={selectedCenterIdReassign}
                onChange={(centerId) => {
                  setSelectedCenterIdReassign(centerId);
                  console.log('Selected Center ID:', centerId);
                }}
                onCenterList={(centerList) => {
                  setSelectedCenterListReassign(centerList || []);
                  console.log('############# centerList', centerList);
                }}
                selectedCenterList={selectedCenterListReassign}
                label="Select Center"
                required={true}
                multiple={false}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={async () => {
              if (selectedUserIdReassign && selectedCenterIdReassign) {
                setReassignInProgress(true);
                try {
                  //map user to tenant
                  // Ensure selectedCenterId is a string (handle array case)
                  const cohortId = Array.isArray(selectedCenterIdReassign)
                    ? selectedCenterIdReassign
                    : [selectedCenterIdReassign];

                  console.log('Creating with User ID:', selectedUserId);
                  console.log('Creating with Center ID (cohortId):', cohortId);

                  const removedIds = originalCenterIdReassign?.filter(
                    (item: any) => !cohortId.includes(item)
                  );

                  // Call the cohortmember/create API
                  const response = await bulkCreateCohortMembers({
                    userId: [selectedUserIdReassign],
                    cohortId: cohortId,
                    //add remove cohort id check
                    ...(removedIds?.length > 0
                      ? { removeCohortId: removedIds }
                      : {}),
                  });

                  if (
                    response?.responseCode === 201 ||
                    response?.data?.responseCode === 201 ||
                    response?.status === 201
                  ) {
                    showToastMessage(t(successCreateMessage), 'success');
                    // Close dialog
                    setReassignModalOpen(false);
                    setSelectedCenterIdReassign(null);
                    setOriginalCenterIdReassign(null); // Reset original center selection when dialog closes
                    setSelectedCenterListReassign([]);
                    setSelectedUserIdReassign(null);
                    // Refresh the data
                    searchData(prefilledFormData, 0);
                  } else {
                    showToastMessage(
                      response?.data?.params?.errmsg || t(failureCreateMessage),
                      'error'
                    );
                  }
                } catch (error) {
                  console.error('Error creating cohort member:', error);
                  showToastMessage(
                    error?.response?.data?.params?.errmsg ||
                    t(failureCreateMessage),
                    'error'
                  );
                } finally {
                  setReassignInProgress(false);
                }
              } else if (!selectedUserIdReassign) {
                showToastMessage('Please search and select a user', 'error');
              } else {
                showToastMessage('Please select a center', 'error');
              }
            }}
            disabled={
              !selectedUserIdReassign ||
              !selectedCenterIdReassign ||
              isReassignInProgress
            }
          >
            {t('COMMON.REASSIGN')}
          </Button>
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
            {t('Edit User as Leader')}
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
                        // getNotification(editableUserId, profileUpdateNotificationKey);
                        showToastMessage(t(successUpdateMessage), 'success');
                        // telemetryCallbacks(telemetryUpdateKey);
                        // Refresh the data
                        searchData(prefilledFormData, 0);
                      } else {
                        // console.error('Error update user:', error);
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

export default UserLeader;
