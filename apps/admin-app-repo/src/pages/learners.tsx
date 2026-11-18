// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import axios from 'axios';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  learnerSearchSchema,
  learnerSearchUISchema,
} from '../constant/Forms/LearnerSearch';
import { Role, RoleId, Status } from '@/utils/app.constant';
// import { userList } from '@/services/UserList';
import {
  getUserDetailsInfo,
  HierarchicalSearchUserList,
} from '@/services/UserList';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { debounce } from 'lodash';
import { Numbers } from '@mui/icons-material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button } from '@mui/material';
import AddEditUser from '@/components/EntityForms/AddEditUser/AddEditUser';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { updateCohortMemberStatus } from '@/services/CohortService/cohortService';
import editIcon from '../../public/images/editIcon.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
import restoreIcon from '../../public/images/restore_user.svg';

import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import DeleteDetails from '@/components/DeleteDetails';
import {
  archiveUserRoleAndTenant,
  getTenantRoleSummary,
  reactivateUserRoleAndTenant,
} from '@shared-lib-v2/MapUser/UserRoleArchival';
import {
  calculateAgeFromDate,
  fetchUserData,
  formatDateToDDMMYYYY,
  transformLabel,
} from '@/utils/helper';
import { getCohortList } from '@/services/GetCohortList';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import apartment from '../../public/images/apartment.svg';
import { getCenterList } from '@/services/MasterDataService';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import CenterLabel from '@/components/Centerlabel';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import { showToastMessage } from '@/components/Toastify';
import { getOverallStatus } from '@shared-lib-v2/utils/helper';
import useStore from '@/store/store';
import {
  getVisibleTableActions,
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

const Learner = () => {
  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(learnerSearchSchema);
  const [uiSchema, setUiSchema] = useState(learnerSearchUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
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
  const [roleId, setRoleID] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [isReassign, setIsReassign] = useState(false);
  const [open, setOpen] = useState(false);
  const [archiveToActiveOpen, setArchiveToActiveOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [userID, setUserId] = useState('');
  const [centerSelectiveValue, setCenterSelectiveValue] = useState('');
  const [cohorts, setCohorts] = useState([]);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    village: '',
    center: '',
  });
  const [reason, setReason] = useState('');
  const [memberShipID, setMemberShipID] = useState('');
  const [blockFieldId, setBlockFieldId] = useState('');
  const [districtFieldId, setDistrictFieldId] = useState('');
  const [villageFieldId, setVillageFieldId] = useState('');
  const [parentId, setParentId] = useState('');
  const { t, i18n } = useTranslation();
  const initialFormData = localStorage.getItem('stateId')
    ? { state: [localStorage.getItem('stateId')] }
    : {};
  const formRef = useRef(null);

  const searchStoreKey = 'learner';
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
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
          header: {
            tenantid: localStorage.getItem('tenantId'),
          },
        },
      ]);
      console.log('responseForm', responseForm);

      //unit name is missing from required so handled from frotnend
      let alterSchema = responseForm?.schema;
      let requiredArray = alterSchema?.required;
      const mustRequired = [
        'firstName',
        'lastName',
        // 'email',
        'mobile',
        'dob',
        'gender',
        'state',
        'district',
        'block',
        'village',
        'center',
        'batch',
        'username',
      ];
      // Merge only missing items from required2 into required1
      mustRequired.forEach((item) => {
        if (!requiredArray.includes(item)) {
          requiredArray.push(item);
        }
      });
      //no required

      alterSchema.required = requiredArray;
      //add max selection custom
      if (alterSchema?.properties?.state) {
        alterSchema.properties.state.maxSelection = 1;
      }
      if (alterSchema?.properties?.district) {
        alterSchema.properties.district.maxSelection = 1;
      }
      if (alterSchema?.properties?.block) {
        alterSchema.properties.block.maxSelection = 1;
      }
      if (alterSchema?.properties?.village) {
        alterSchema.properties.village.maxSelection = 1;
      }
      if (alterSchema?.properties?.center) {
        alterSchema.properties.center.maxSelection = 1;
      }
      if (alterSchema?.properties?.batch) {
        alterSchema.properties.batch.maxSelection = 1;
      }

      const districtFieldId =
        responseForm?.schema?.properties?.district?.fieldId;
      const blockFieldId = responseForm?.schema?.properties?.block?.fieldId;
      const villageFieldId = responseForm?.schema?.properties?.village?.fieldId;

      // const centerFieldId = responseForm.schema.properties.center.fieldId;

      setBlockFieldId(blockFieldId);
      setDistrictFieldId(districtFieldId);
      setVillageFieldId(villageFieldId);
      setAddSchema(alterSchema);
      setAddUiSchema(responseForm?.uiSchema);
    };
    fetchData();
    setRoleID(RoleId.STUDENT);
    setTenantId(localStorage.getItem('tenantId'));
  }, []);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true, // Hide submit button if isHide is true
    },
  };

  const SubmitaFunction = async (formData: any) => {
    // console.log("###### debug issue formData", formData)
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
      role: [Role.LEARNERS],
      customfields: [
        'state',
        'district',
        'block',
        'village',
        'guardian_name',
        'guardian_relation',
        'parent_phone'
      ],
    });
  };

  const searchData = async (formData, newPage) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      const staticFilter = {
        role: 'Learner',
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
      label: 'Leaner Name',
      render: (row) =>
        `${transformLabel(row.firstName) || ''} ${transformLabel(row.middleName) || ''
          } ${transformLabel(row.lastName) || ''}`.trim(),
    },
    {
      keys: ['enrollmentId'],
      label: 'Enrollment ID',
      render: (row) => row.enrollmentId || '-',
    },
    {
      keys: ['tenantJoinedAt'],
      label: 'DOJ',
      render: (row) =>
        row.tenantJoinedAt ? formatDateToDDMMYYYY(row.tenantJoinedAt) : '-',
    },
    // {
    //   keys: ['age'],
    //   label: 'Age',
    //   render: (row) => calculateAgeFromDate(row.dob) || '',
    // },
    // {
    //   keys: ['dob'],
    //   label: 'Date Of Birth',
    //   render: (row) => formatDateToDDMMYYYY(row.dob) || '',
    // },
    {
      keys: ['guardian'],
      label: 'Guardian Details',
      render: (row: any) => {
        const NAME_OF_GUARDIAN = transformLabel(row?.customfield?.guardian_name) || '';
        const RELATION_WITH_GUARDIAN = transformLabel(row?.customfield?.guardian_relation) || '';
        const PARENT_GUARDIAN_PHONE_NO = transformLabel(row?.customfield?.parent_phone) || '';

        const values = [
          NAME_OF_GUARDIAN,
          RELATION_WITH_GUARDIAN,
          PARENT_GUARDIAN_PHONE_NO,
        ];
        const result = values.filter(Boolean).join(', ');
        return result;
      },
    },
    {
      keys: ['gender'],
      label: 'Gender',
      render: (row) => transformLabel(row.gender) || '',
    },
    // {
    //   keys: ['mobile'],
    //   label: 'Mobile',
    //   render: (row) => transformLabel(row.mobile) || '',
    // },
    {
      keys: ['STATE', 'DISTRICT', 'BLOCK', 'VILLAGE'],
      label: 'State, District, Block, Village',
      render: (row: any) => {
        const state = transformLabel(row?.customfield?.state) || '';
        const district = transformLabel(row?.customfield?.district) || '';
        const block = transformLabel(row?.customfield?.block) || '';
        const village = transformLabel(row?.customfield?.village) || '';
        return `${state == '' ? '' : `${state}`}${district == '' ? '' : `, ${district}`
          }${block == '' ? '' : `, ${block}`}${village == '' ? '' : `, ${village}`
          }`;
      },
    },
    {
      key: 'center',
      label: 'Center',
      render: (row) => {
        // return (
        //   <CenterLabel
        //     parentId={
        //       row.customFields.find((field) => field.label === 'CENTER')
        //         ?.selectedValues?.[0]
        //     }
        //   />
        // );
        let centers =
        row.cohortData
          ?.filter(
            (c: any) =>
              c.centerStatus === 'active' &&
              c.cohortMember?.status === 'active'
          )
          .map((c: any) => transformLabel(c.centerName))
          .filter(Boolean) || [];

          // If no active centers → fallback to archived
          if (centers.length === 0) {
            centers =
              row.cohortData
                ?.filter(
                  (c: any) =>
                    c.centerStatus === 'active' &&
                    c.cohortMember?.status === 'archived' || c.cohortMember?.status === 'dropout'
                )
                .map((c: any) => transformLabel(c.centerName))
                .filter(Boolean) || [];
          }

          return centers.join(', ');

      },
    },
    {
      key: 'batch',
      label: 'Batch',
      render: (row) => {
        // console.log('BacthRow', row?.cohortData)
        let batches =
        row.cohortData
          ?.filter(
            (c: any) =>
              c.batchStatus === 'active' &&
              c.cohortMember?.status === 'active'
          )
          .map((c: any) => transformLabel(c.batchName))
          .filter(Boolean) || [];

          // If no active batches → fallback to archived
          if (batches.length === 0) {
            batches =
              row.cohortData
                ?.filter(
                  (c: any) =>
                    c.batchStatus === 'active' &&
                    c.cohortMember?.status === 'archived' || c.cohortMember?.status === 'dropout'
                )
                .map((c: any) => transformLabel(c.batchName))
                .filter(Boolean) || [];
          }

          return batches.join(', ');

      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(getOverallStatus(row?.cohortData)),
      getStyle: (row) => ({ color: getOverallStatus(row?.cohortData) === 'active' ? 'green' : 'red' }),
    },
  ];

  const userDelete = async () => {
    try {
      // Latest user details (reuse the User Read result fetched on dialog open)
      const roleSummary = await getTenantRoleSummary(
        userID,
        tenantId,
        selectedUserDetails?.userData?.userId === userID ? selectedUserDetails : undefined
      );
      let membershipIds = null;

      // Attempt to get the cohort list
      try {
        const userCohortResp = await getCohortList(userID);
        if (userCohortResp?.result?.length) {
          membershipIds = userCohortResp?.result
              ?.filter((c: any) => c.cohortMemberStatus === 'active')
              ?.map((c: any) => c.cohortMembershipId) || [];

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
              memberStatus: 'archived',
              statusReason: reason,
              membershipId,
            });

            if (updateResponse?.responseCode !== 200) {
              console.error(
                `Failed to update user with membershipId ${membershipId}:`,
                updateResponse
              );
              showToastMessage(
                updateResponse?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'),
                'error'
              );
              return;
            } else {
              console.log(
                `User with membershipId ${membershipId} successfully updated.`
              );
            }
          } catch (error) {
            console.error(
              `Error updating user with membershipId ${membershipId}:`,
              error
            );
            showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
            return;
          }
        }
      }

      // User Role Archival API, then Tenant Status Update API only when
      // this was the last active role in the current tenant
      const resp = await archiveUserRoleAndTenant({
        userId: userID,
        roleId,
        tenantId,
        reason,
        summary: roleSummary,
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
  const archiveToactive = async () => {
    try {
      let membershipIds = null;

      // Attempt to get the cohort list
      try {
        const userCohortResp = await getCohortList(userID);
        if (userCohortResp?.result?.length) {
          membershipIds = userCohortResp?.result
              ?.filter((c: any) => c.cohortMemberStatus === 'archived')
              ?.map((c: any) => c.cohortMembershipId) || [];
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
                `Failed to update user with membershipId ${membershipId}:`,
                updateResponse
              );
              showToastMessage(
                updateResponse?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'),
                'error'
              );
              return;
            } else {
              console.log(
                `User with membershipId ${membershipId} successfully updated.`
              );
            }
          } catch (error) {
            console.error(
              `Error updating user with membershipId ${membershipId}:`,
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
        roleId,
        tenantId,
        userDetails:
          selectedUserDetails?.userData?.userId === userID ? selectedUserDetails : undefined,
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
        console.error('Failed to activate learner:', resp);
        showToastMessage(resp?.params?.errmsg || t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }

      return resp;
    } catch (error) {
      console.error('Error updating team leader:', error);
    }
  };
  // Define actions
  const actions = [
    // {
    //   icon: (
    //     <Box
    //       sx={{
    //         display: 'flex',
    //         flexDirection: 'column',
    //         alignItems: 'center',
    //         cursor: 'pointer',
    //         backgroundColor: 'rgb(227, 234, 240)',
    //         padding: '10px',
    //       }}
    //     >
    //       <Image src={editIcon} alt="" />
    //     </Box>
    //   ),
    //   callback: (row) => {
    //     // console.log('row:', row);
    //     // console.log('AddSchema', addSchema);
    //     // console.log('AddUISchema', addUiSchema);

    //     let tempFormData = extractMatchingKeys(row, addSchema);
    //     // console.log('tempFormData', tempFormData);
    //     setPrefilledAddFormData(tempFormData);
    //     setIsEdit(true);
    //     setEditableUserId(row?.userId);
    //     handleOpenModal();
    //   },
      // show: (row) => row?.cohortData?.some(
      //   (cohort) =>
      //     cohort?.cohortMember?.status === 'active'
      // ),
    // },

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
          title="Delete Learner"
        >
          {' '}
          <Image src={deleteIcon} alt="" />{' '}
        </Box>
      ),
      callback: async (row) => {
        console.log('row:', row);
        const selectedUserId = row?.userId;
        const selectedUserDetails = await getUserDetailsInfo(
          selectedUserId,
          true
        );
        setSelectedUserDetails(selectedUserDetails?.userData ? selectedUserDetails : null);
        // console.log('selectedUserDetails:', selectedUserDetails);

        const findVillage = selectedUserDetails?.userData?.customFields.find((item) => {
          if (item.label === 'VILLAGE') {
            return item;
          }
        });

        // console.log('row:', row?.customFields[2].selectedValues[0].value);
        setEditableUserId(row?.userId);

        setOpen(true);

        setUserId(row?.userId);

        setUserData({
          firstName: row?.firstName || '',
          lastName: row?.lastName || '',
          village: findVillage?.selectedValues?.[0]?.value || '',
          center:
          row?.cohortData
            ?.filter((cohort) => cohort?.cohortMember?.status === 'active')
            ?.map((cohort) => cohort?.centerName)
            ?.join(', ') || '',
        });
        setReason('');
        setChecked(false);
      },
      show: (row) => row?.cohortData?.some(
        (cohort) =>
          cohort?.cohortMember?.status === 'active'
      )
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
          title="Reactivate Learner"
        >
          {' '}
          <Image src={restoreIcon} alt="" />{' '}
        </Box>
      ),
      callback: async (row) => {
        const selectedUserId = row?.userId;
        const selectedUserDetails = await getUserDetailsInfo(
          selectedUserId,
          true
        );
        setSelectedUserDetails(selectedUserDetails?.userData ? selectedUserDetails : null);
        const findVillage = selectedUserDetails?.userData?.customFields.find((item) => {
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
          center: 
          row?.cohortData
            ?.filter((cohort) => cohort?.cohortMember?.status === 'archived')
            ?.map((cohort) => cohort?.centerName)
            ?.join(', ') || '',
        });
        // setReason('');'
        // setChecked(false);
      },
      show: (row) => row?.cohortData?.some(
        (cohort) =>
          cohort?.cohortMember?.status === 'archived')
    },
    // {
    //   icon: (
    //     <Box
    //       sx={{
    //         display: 'flex',
    //         flexDirection: 'column',
    //         alignItems: 'center',
    //         cursor: 'pointer',
    //         backgroundColor: 'rgb(227, 234, 240)',
    //         padding: '10px',
    //       }}
    //     >
    //       <Image src={apartment} alt="" />
    //     </Box>
    //   ),
    //   callback: async (row) => {
    //     console.log('row:', row);
    //     const centerField = row.customFields.find(
    //       (field) => field.label === 'CENTER'
    //     );
    //     if (centerField) {
    //       setCenterSelectiveValue(centerField.selectedValues);
    //     } else {
    //       console.log('CENTER field not found');
    //     }
    //     // console.log('AddSchema', addSchema);
    //     // console.log('AddUISchema', addUiSchema);

    //     let batchList = await fetchUserData(row?.userId);
    //     let tempFormData = extractMatchingKeys(row, addSchema);
    //     tempFormData = {
    //       ...tempFormData,
    //       batch: batchList,
    //     };
    //     setPrefilledAddFormData(tempFormData);
    //     // setIsEdit(true);
    //     setIsReassign(true);
    //     setEditableUserId(row?.userId);
    //     handleOpenModal();
    //   },
      // show: (row) => row?.cohortData?.some(
      //   (cohort) =>
      //     cohort?.cohortMember?.status === 'active'
      // ),
    // },
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
    program: tenantId,
    // username: 'Leaner',
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage = 'LEARNERS.LEARNER_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'scp-learner-updated-successfully';
  const failureUpdateMessage = 'COMMON.NOT_ABLE_UPDATE_LEARNER';
  const successCreateMessage = 'LEARNERS.LEARNER_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'scp-learner-created-successfully';
  const failureCreateMessage = 'COMMON.NOT_ABLE_CREATE_LEARNER';
  const notificationKey = 'onLearnerCreated';
  const notificationMessage = 'LEARNERS.USER_CREDENTIALS_WILL_BE_SEND_SOON';
  const notificationContext = 'USER';
  const blockReassignmentNotificationKey = 'LEARNER_REASSIGNMENT_NOTIFICATION';
  const profileUpdateNotificationKey = 'LEARNER_PROFILE_UPDATE_ALERT';

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
              prefilledFormData={prefilledFormData}
            />
          )
        )}
        <Box mt={4} sx={pageActionBarSx}>
          <ResetFiltersButton
            searchStoreKey="learner"
            formRef={formRef}
            SubmitaFunction={SubmitaFunction}
            setPrefilledFormData={setPrefilledFormData}
          />
          {/* <Button
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
              setPrefilledAddFormData(initialFormData);
              setIsEdit(false);
              setIsReassign(false);
              setEditableUserId('');
              handleOpenModal();
            }}
          >
            {t('COMMON.ADD_NEW')}
          </Button> */}
        </Box>

        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          primaryText={
            isEdit ? t('Update') : isReassign ? t('Reassign') : t('Create')
          }
          id="dynamic-form-id"
          modalTitle={
            isEdit
              ? t('LEARNERS.EDIT_LEARNER')
              : isReassign
                ? t('LEARNERS.RE_ASSIGN_LEARNER')
                : t('LEARNERS.NEW_LEARNER')
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
            isReassign={isReassign}
            isExtraFields={true}
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
            blockFieldId={blockFieldId}
            districtFieldId={districtFieldId}
            villageFieldId={villageFieldId}
            hideSubmit={true}
            type={'learner'}
            blockReassignmentNotificationKey={blockReassignmentNotificationKey}
            profileUpdateNotificationKey={profileUpdateNotificationKey}
          />
        </SimpleModal>

        {response != null ? (
          <Box mt={4}>
            {response && response?.result?.totalCount > 0 ? (
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
                  {t('LEARNERS.NO_LEARNERS_FOUND')}
                </Typography>
              </Box>
            )}
          </Box>
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
        onClickPrimary={userDelete}
      >

        <DeleteDetails
          firstName={userData.firstName}
          lastName={userData.lastName}
          village={userData.village}
          center={userData.center}
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
            {userData.firstName} {userData.lastName} {t("FORM.BELONG_TO")}
          </Typography>
          <TextField fullWidth value={userData.center} disabled sx={{ mt: 1 }} />
        </Box>
        <Typography fontWeight="bold">
          {t("FORM.CONFIRM_TO_ACTIVATE")}

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

export default Learner;
