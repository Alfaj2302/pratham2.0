// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  YouthSearchSchema,
  YouthSearchUISchema,
} from '../constant/Forms/YouthSearch';
import { Role, RoleId, Status } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { updateCohortMemberStatus } from '@/services/CohortService/cohortService';
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
import ConfirmationPopup from '@/components/ConfirmationPopup';
import DeleteDetails from '@/components/DeleteDetails';
import { editEditUser } from '@/services/UserService';
import {
  archiveUserRoleAndTenant,
  getTenantRoleSummary,
  reactivateUserRoleAndTenant,
} from '@shared-lib-v2/MapUser/UserRoleArchival';

// Youth listed on this page are 'Learner' role users
const YOUTH_ROLE_ID = RoleId.STUDENT;
import { transformLabel, formatDateToDDMMYYYY } from '@/utils/helper';
import { getCohortList } from '@/services/GetCohortList';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import MarkAsVolunteer from '@/components/MarkAsVolunteer';
import UnmarkAsVolunteer from '@/components/UnmarkAsVolunteer';
import { showToastMessage } from '@/components/Toastify';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import restoreIcon from '../../public/images/restore_user.svg';

//import { DynamicForm } from '@shared-lib';

const Youth = () => {
  const theme = useTheme<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(YouthSearchSchema);
  const [uiSchema, setUiSchema] = useState(YouthSearchUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [prefilledAddFormData, setPrefilledAddFormData] = useState({});
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editableUserId, setEditableUserId] = useState('');
  const [roleId, setRoleID] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [userID, setUserId] = useState('');
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    village: '',
  });
  const [reason, setReason] = useState('');
  const [memberShipID, setMemberShipID] = useState('');
  const [openMarkVolunteerModal, setOpenMarkVolunteerModal] = useState(false);
  const [openUnmarkVolunteerModal, setOpenUnmarkVolunteerModal] = useState(false);
  const [isVolunteerFieldId, setIsVolunteerFieldId] = useState('');
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);

  const { t, i18n } = useTranslation();
     const formRef = useRef(null);

  const initialFormData = localStorage.getItem('stateId')
    ? { state: [localStorage.getItem('stateId')] }
    : {};

  const searchStoreKey = 'youth';
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
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.youth.context}&contextType=${FormContext.youth.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.youth.context}&contextType=${FormContext.youth.contextType}`,
          header: {
            tenantid: localStorage.getItem('tenantId'),
          },
        },
      ]);
      setAddSchema(responseForm?.schema);
      setAddUiSchema(responseForm?.uiSchema);
    };

    setPrefilledAddFormData(initialFormData);
    setPrefilledFormData(initialFormDataSearch);
    setRoleID(RoleId.TEACHER);
    setTenantId(localStorage.getItem('tenantId'));
    fetchData();
  }, []);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true, // Hide submit button if isHide is true
    },
  };

  const SubmitaFunction = async (formData: any) => {
    setPrefilledFormData(formData);
    //set prefilled search data on refresh
    localStorage.setItem(searchStoreKey, JSON.stringify(formData));
    await searchData(formData, 0);
  };

  const searchData = async (formData: any, newPage: any) => {
    const staticFilter = {
      role: 'Learner',
      // status: 'active',
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
      userList,
      staticSort
    );
  };

  // Define table columns
  const columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: 'Youth Name',
      render: (row: any) =>
        `${transformLabel(row.firstName) || ''} ${
          transformLabel(row.middleName) || ''
        } ${transformLabel(row.lastName) || ''}`.trim(),
    },
    {
      keys: ['enrollmentId'],
      label: 'Enrollment ID',
      render: (row) => row.enrollmentId || '-',
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
      keys: ['gender'],
      label: 'Gender',
      render: (row) => transformLabel(row.gender) || '',
    },
    {
      keys: ['tenantJoinedAt'],
      label: 'DOJ',
      render: (row) =>
        row.tenantJoinedAt ? formatDateToDDMMYYYY(row.tenantJoinedAt) : '-',
    },
    // {
    //   keys: ['mobile'],
    //   label: 'Mobile',
    //   render: (row) => transformLabel(row.mobile) || '',
    // },
    // {
    //   key: 'STATE',
    //   label: 'State',
    //   render: (row) => {
    //     const state =
    //       row.customFields.find((field) => field.label === 'STATE')
    //         ?.selectedValues[0]?.value || '-';
    //     return `${state}`;
    //   },
    // },
    {
      keys: ['STATE', 'DISTRICT', 'BLOCK', 'VILLAGE'],
      label: 'Location (State / District / Block/ Village)',
      render: (row: any) => {
        const state =
          transformLabel(
            row.customFields.find(
              (field: { label: string }) => field.label === 'STATE'
            )?.selectedValues?.[0]?.value
          ) || '';
        const district =
          transformLabel(
            row.customFields.find(
              (field: { label: string }) => field.label === 'DISTRICT'
            )?.selectedValues?.[0]?.value
          ) || '';
        const block =
          transformLabel(
            row.customFields.find(
              (field: { label: string }) => field.label === 'BLOCK'
            )?.selectedValues?.[0]?.value
          ) || '';
        const village =
          transformLabel(
            row.customFields.find(
              (field: { label: string }) => field.label === 'VILLAGE'
            )?.selectedValues?.[0]?.value
          ) || '';
        return `${state == '' ? '' : `${state}`}${
          district == '' ? '' : `, ${district}`
        }${block == '' ? '' : `, ${block}`}${
          village == '' ? '' : `, ${village}`
        }`;
      },
    },
   
  ];

  const userDelete = async () => {
    try {
      // Latest user details (User Read API) -> current-tenant role summary
      const roleSummary = await getTenantRoleSummary(userID, tenantId);
      let membershipId = null;

      // Attempt to get the cohort list
      try {
        const userCohortResp = await getCohortList(userID);
        if (userCohortResp?.result?.cohortData?.length) {
          membershipId = userCohortResp.result.cohortData[0].cohortMembershipId;
        } else {
          console.warn('No cohort data found for the user.');
        }
      } catch (error) {
        console.error('Failed to fetch cohort list:', error);
      }

      // Attempt to update cohort member status only if we got a valid membershipId
      if (membershipId) {
        try {
          const updateResponse = await updateCohortMemberStatus({
            memberStatus: 'archived',
            statusReason: reason,
            membershipId: membershipId,
          });

          if (updateResponse?.responseCode !== 200) {
            console.error(
              'Failed to archive user from center:',
              updateResponse
            );
            showToastMessage(
              updateResponse?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'),
              'error'
            );
            return;
          } else {
            console.log('User successfully archived from center.');
          }
        } catch (error) {
          console.error('Error archiving user from center:', error);
          showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
          return;
        }
      }

      // User Role Archival API, then Tenant Status Update API only when
      // this was the last active role in the current tenant
      const resp = await archiveUserRoleAndTenant({
        userId: userID,
        roleId: YOUTH_ROLE_ID,
        tenantId,
        reason,
        summary: roleSummary,
      });

      if (resp?.responseCode === 200) {
        setResponse((prev) => ({
          ...prev,
          result: {
            ...prev?.result,
            getUserDetails: prev?.result?.getUserDetails?.filter(
              (item) => item?.userId !== userID
            ),
          },
        }));
        searchData(prefilledFormData, currentPage);
        console.log('Team leader successfully archived.');
      } else {
        console.error('Failed to archive team leader:', resp);
        showToastMessage(resp?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }

      return resp;
    } catch (error) {
      console.error('Error updating team leader:', error);
    }
  };

  const handlemarkAsVolunteer = async () => {
    console.log('selected!!!', editableUserId);
    try {
      const userId = editableUserId;
      const userDetails = {
        userData: {},
        customFields: [
          {
            fieldId:
              isVolunteerFieldId || '59716ca7-37af-4527-a1ad-ce0f1dabeb00',
            value: 'yes',
          },
        ],
      };
      const response = await editEditUser(userId, userDetails);
      showToastMessage(t('YOUTH.MARK_AS_VOLUNTEER_SUCCESSFULLY'), 'success');
      searchData({}, 0);
    } catch (e) {
      showToastMessage(t('YOUTH.MARK_AS_VOLUNTEER_FAILED'), 'error');
      console.log(e);
    }
  };

  const handleUnmarkAsVolunteer = async () => {
    console.log('unmarking volunteer!!!', editableUserId);
    try {
      const userId = editableUserId;
      const userDetails = {
        userData: {},
        customFields: [
          {
            fieldId:
              isVolunteerFieldId || '59716ca7-37af-4527-a1ad-ce0f1dabeb00',
            value: 'no',
          },
        ],
      };
      const response = await editEditUser(userId, userDetails);
      showToastMessage(t('YOUTH.UNMARK_AS_VOLUNTEER_SUCCESSFULLY'), 'success');
      searchData({}, 0);
    } catch (e) {
      showToastMessage(t('YOUTH.UNMARK_AS_VOLUNTEER_FAILED'), 'error');
      console.log(e);
    }
  };
 const archiveToactive = async () => {
    try {
      let membershipIds = null;

      // Attempt to get the cohort list
      try {
        const userCohortResp = await getCohortList(userID);
        if (userCohortResp?.result?.length) {
          membershipIds = userCohortResp?.result?.map(
            (item) => item.cohortMembershipId
          );
        } else {
          console.warn('No cohort data found for the user.');
        }
      } catch (error) {
        console.error('Failed to fetch cohort list:', error);
      }

      // Attempt to update cohort member status only if we got a valid membershipId
      if (membershipIds && Array.isArray(membershipIds)) {
        for (const membershipId of membershipIds) {
          try {
            const updateResponse = await updateCohortMemberStatus({
              memberStatus: 'active',
           //   statusReason: reason,
              membershipId,
            });

            if (updateResponse?.responseCode !== 200) {
              console.error(
                `Failed to activate user with membershipId ${membershipId}:`,
                updateResponse
              );
              showToastMessage(
                updateResponse?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'),
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
            showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
            return;
          }
        }
      }

      // User Role Archival API (status active), then Tenant Status Update API
      // when the tenant membership is not active
      const resp = await reactivateUserRoleAndTenant({
        userId: userID,
        roleId: YOUTH_ROLE_ID,
        tenantId,
      });

      if (resp?.responseCode === 200) {
        // setResponse((prev) => ({
        //   ...prev,
        //   result: {
        //     ...prev?.result,
        //     getUserDetails: prev?.result?.getUserDetails?.filter(
        //       (item) => item?.userId !== userID
        //     ),
        //   },
        // }));
        searchData(prefilledFormData, currentPage);
        
        showToastMessage(t("LEARNERS.ACTIVATE_USER_SUCCESS"), "success");
        console.log('learner successfully aactive.');
      } else {
        console.error('Failed to activate youth:', resp);
        showToastMessage(resp?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }

      return resp;
    } catch (error) {
      console.error('Error updating team leader:', error);
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
            backgroundColor: 'rgb(227, 234, 240)',
            padding: '10px',
          }}
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        console.log('row:', row);
        console.log('AddSchema', addSchema);
        console.log('AddUISchema', addUiSchema);

        let tempFormData = extractMatchingKeys(row, addSchema);
        // console.log('tempFormData', tempFormData);
        setPrefilledAddFormData(tempFormData);
        setIsEdit(true);
        setEditableUserId(row?.userId);
        handleOpenModal();
      },
      show: (row) => row.tenantStatus !== 'archived'
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgb(227, 234, 240)',
            padding: '10px',
          }}
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row) => {
        const findVillage = row?.customFields.find((item) => {
          if (item.label === 'VILLAGE') {
            return item;
          }
        });

        // console.log('row:', row?.customFields[2].selectedValues[0].value);
        // setEditableUserId(row?.userId);
        // const memberStatus = Status.ARCHIVED;
        // const statusReason = '';
        // const membershipId = row?.userId;

        // const response = await updateCohortMemberStatus({
        //   memberStatus,
        //   statusReason,
        //   membershipId,
        // });
        // setPrefilledFormData({});
        // searchData(prefilledFormData, currentPage);
        setOpen(true);
        setUserId(row?.userId);

        setUserData({
          firstName: row?.firstName || '',
          lastName: row?.lastName || '',
          village: findVillage?.selectedValues?.[0]?.value || '',
        });
      },
         show: (row) => row.tenantStatus !== 'archived'
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgb(227, 234, 240)',
            height: '34px',
            width: '34px',
          }}
        >
          <SwapHorizIcon />
        </Box>
      ),
      callback: (row: any) => {
        console.log('row:', row);
        setEditableUserId(row?.userId);
        setOpenMarkVolunteerModal(true);
        const volunteerField = row.customFields.find(
          (field) => field.label === 'IS_VOLUNTEER'
        );
        setIsVolunteerFieldId(volunteerField?.fieldId);
      },
      show: (row: any) => {
        const isVolunteerField = row.customFields.find(
          (field) => field.label === 'IS_VOLUNTEER'
        );

        const isVolunteer = isVolunteerField?.selectedValues?.[0] === 'yes';

        return !isVolunteer;
      },
      show: (row) => row.tenantStatus !== 'archived'
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgb(255, 182, 193)',
            height: '34px',
            width: '34px',
          }}
        >
          <SwapHorizIcon />
        </Box>
      ),
      callback: (row: any) => {
        console.log('unmark volunteer row:', row);
        setEditableUserId(row?.userId);
        setOpenUnmarkVolunteerModal(true);
        const volunteerField = row.customFields.find(
          (field) => field.label === 'IS_VOLUNTEER'
        );
        setIsVolunteerFieldId(volunteerField?.fieldId);
      },
      show: (row: any) => {
        const isVolunteerField = row.customFields.find(
          (field) => field.label === 'IS_VOLUNTEER'
        );

        const isVolunteer = isVolunteerField?.selectedValues?.[0] === 'yes';

        return isVolunteer;
      },
    },
     {
          icon: (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: 'rgb(227, 234, 240)',
                padding: '10px',
              }}
            >
              {' '}
              <Image src={restoreIcon} alt="" />{' '}
            </Box>
          ),
          callback: async (row) => {
            const findVillage = row?.customFields.find((item) => {
              if (item.label === 'VILLAGE') {
                return item;
              }
            });
    
            // console.log('row:', row?.customFields[2].selectedValues[0].value);
            setEditableUserId(row?.userId);
    
            setArchiveToActiveOpen(true);
    
            setUserId(row?.userId);
    
            setUserData({
              firstName: row?.firstName || '',
              lastName: row?.lastName || '',
              village: findVillage?.selectedValues?.[0]?.value || '',
            });
            // setReason('');
            // setChecked(false);
          },
          show: (row) => row.tenantStatus !== 'active',
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

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    tenantCohortRoleMapping: [
      {
        tenantId: tenantId,
        roleId: roleId,
      },
    ],
    username: 'youthnetyouth',
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage = 'YOUTH.YOUTH_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'youthnet-youth-updated-successfully';
  const failureUpdateMessage = 'YOUTH.NOT_ABLE_UPDATE_YOUTH';
  const successCreateMessage = 'YOUTH.YOUTH_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'youthnet-youth-created-successfully';
  const failureCreateMessage = 'YOUTH.NOT_ABLE_CREATE_YOUTH';
  // const notificationKey = 'onMentorCreate';
  // const notificationMessage = 'YOUTH.USER_CREDENTIALS_WILL_BE_SEND_SOON';
  // const notificationContext = 'USER';

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
      
        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          modalTitle={isEdit ? t('YOUTH.UPDATE_YOUTH') : t('YOUTH.NEW_YOUTH')}
          id="dynamic-form-id"
          primaryText={isEdit ? t('Update') : t('Create')}
        >
          <AddEditUser
            SuccessCallback={() => {
              setPrefilledFormData({});
              searchData({}, 0);
              setOpenModal(false);
            }}
            schema={addSchema}
            uiSchema={addUiSchema}
            editPrefilledFormData={prefilledAddFormData}
            isEdit={isEdit}
            editableUserId={editableUserId}
            UpdateSuccessCallback={() => {
              setPrefilledFormData({});
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
            // notificationKey={notificationKey}
            // notificationMessage={notificationMessage}
            // notificationContext={notificationContext}
            type="youth"
            hideSubmit={true}
          />
        </SimpleModal>
          <Box
                  sx={{ display: 'flex', justifyContent: 'flex-end' }}
                  gap={2}
                  mt={4}
                >
                   <ResetFiltersButton
          searchStoreKey="youth"
          formRef={formRef}
          SubmitaFunction={SubmitaFunction}
          setPrefilledFormData={setPrefilledFormData}
        />
                </Box>
 
        {response && response?.result?.getUserDetails ? (
          <Box sx={{ mt: 5 }}>
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
              {t('COMMON.NO_YOUTH_FOUND')}
            </Typography>
          </Box>
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
        onClickPrimary={userDelete}
      >
        <DeleteDetails
          firstName={userData.firstName}
          lastName={userData.lastName}
          village={userData.village}
          checked={checked}
          setChecked={setChecked}
          reason={reason}
          setReason={setReason}
        />
      </ConfirmationPopup>
      <ConfirmationPopup
        checked={true}
        open={archiveToActiveOpen}
        onClose={() => setArchiveToActiveOpen(false)}
        title={t('COMMON.ACTIVATE_USER')}
        primary={t('COMMON.ACTIVATE')}
        secondary={t('COMMON.CANCEL')}
        reason={"yes"}
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
                  { userData.firstName } { userData.lastName } {t("FORM.WAS_BELONG_TO")}
                </Typography>
                <TextField fullWidth value={userData.village} disabled sx={{ mt: 1 }} />
              </Box>
         <Typography fontWeight="bold">
                   {t("FORM.CONFIRM_TO_ACTIVATE")}  

                </Typography>

 </ConfirmationPopup>
      <ConfirmationPopup
        checked={checked}
        open={openMarkVolunteerModal}
        onClose={() => {
          setOpenMarkVolunteerModal(false);
          setChecked(false);
        }}
        title={t('YOUTH.MARK_AS_VOLUNTEER')}
        primary={t('YOUTH.MARK_AS_VOLUNTEER')}
        secondary={t('COMMON.CANCEL')}
        onClickPrimary={handlemarkAsVolunteer}
        isFromMarkAsVoluteer={true}
      >
        <MarkAsVolunteer checked={checked} setChecked={setChecked} />
      </ConfirmationPopup>
      <ConfirmationPopup
        checked={checked}
        open={openUnmarkVolunteerModal}
        onClose={() => {
          setOpenUnmarkVolunteerModal(false);
          setChecked(false);
        }}
        title={t('YOUTH.UNMARK_AS_VOLUNTEER')}
        primary={t('YOUTH.UNMARK_AS_VOLUNTEER')}
        secondary={t('COMMON.CANCEL')}
        onClickPrimary={handleUnmarkAsVolunteer}
        isFromMarkAsVoluteer={true}
      >
        <UnmarkAsVolunteer checked={checked} setChecked={setChecked} />
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

export default Youth;
