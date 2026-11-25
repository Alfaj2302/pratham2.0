// @ts-nocheck
import React, { useState, useEffect } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { CohortTypes, Status } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
import { Box, Typography } from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
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
import {
  BatchSearchSchema,
  BatchSearchUISchema,
} from '@/constant/Forms/BatchSearch';
import {
  fetchCohortMemberList,
  getCohortList,
} from '@/services/CohortService/cohortService';
import { toPascalCase, transformLabel } from '@/utils/helper';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CenterLabel from '@/components/Centerlabel';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import ActiveArchivedLearner from '@/components/ActiveArchivedLearner';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import { updateCohort } from '@/services/MasterDataService';

//import { DynamicForm } from '@shared-lib';

const Batch = () => {
  const theme = useTheme<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(BatchSearchSchema);
  const [uiSchema, setUiSchema] = useState(BatchSearchUISchema);
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
  const [cohortId, setCohortId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const { t, i18n } = useTranslation();
  const initialFormData = localStorage.getItem('stateId')
    ? { state: [localStorage.getItem('stateId')] }
    : {};
  const searchStoreKey = 'batch';
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
      const savedTenantId = localStorage.getItem('tenantId');
      setTenantId(savedTenantId);

      const responseForm = await fetchForm([
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.batch.context}&contextType=${FormContext.batch.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.batch.context}&contextType=${FormContext.batch.contextType}`,
          header: {
            tenantid: savedTenantId,
          },
        },
      ]);
      console.log('responseForm', responseForm);

      //unit name is missing from required so handled from frotnend
      let alterSchema = responseForm?.schema;
      let requiredArray = alterSchema?.required;
      const mustRequired = [
        'name',
        'state',
        'district',
        'block',
        'village',
        'parentId',
        'board',
        'medium',
        'grade',
      ];
      // Merge only missing items from required2 into required1
      mustRequired.forEach((item) => {
        if (!requiredArray.includes(item)) {
          requiredArray.push(item);
        }
      });
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
      if (alterSchema?.properties?.board) {
        alterSchema.properties.board.maxSelection = 1;
      }
      if (alterSchema?.properties?.medium) {
        alterSchema.properties.medium.maxSelection = 1;
      }
      if (alterSchema?.properties?.grade) {
        alterSchema.properties.grade.maxSelection = 1;
      }

      if (alterSchema?.properties?.name) {
        alterSchema.properties.name.title = 'Batch Name';
      }

      setAddSchema(alterSchema);
      setAddUiSchema(responseForm?.uiSchema);
    };

    setPrefilledAddFormData(initialFormData);
    setPrefilledFormData(initialFormDataSearch);
    fetchData();
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

  const searchData = async (formData: any, newPage: any) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      const staticFilter = { type: CohortTypes.BATCH };
      const { sortBy } = formData;
      const staticSort = ['name', sortBy || 'asc'];
      delete formData.state;
      delete formData.district;
      delete formData.block;
      delete formData.village;
      if (!formData.parentId) {
        formData.parentId = [];
      }
      await searchListData(
        formData,
        newPage,
        staticFilter,
        pageLimit,
        setPageOffset,
        setCurrentPage,
        setResponse,
        getCohortList,
        staticSort
      );
    }
  };

  // delete center logic

  const deleteCohort = async () => {
    try {
      const resp = await updateCohort(cohortId, { status: Status.ARCHIVED });
      if (resp?.responseCode === 200) {
        // setResponse((prev) => ({
        //   ...prev,
        //   result: {
        //     ...prev?.results,
        //     cohortDetails: prev?.results?.cohortDetails?.filter(
        //       (item) => item?.cohortId !== cohortId
        //     ),
        //   },
        // }));
        searchData(prefilledFormData, currentPage);
        console.log('Batch successfully archived.');
      } else {
        console.error('Failed to archive cohort:', resp);
      }

      return resp;
    } catch (error) {
      console.error('Error updating cohort:', error);
    }
  };

  // Define table columns

  const columns = [
    {
      key: 'name',
      label: 'Batch Name',
      render: (row: any) => transformLabel(row.name),
    },
    {
      key: 'active_learners',
      label: 'Active Learners',
      render: (row) => (
        <ActiveArchivedLearner cohortId={row?.cohortId} type={Status.ACTIVE} />
      ),
    },
    {
      key: 'archived_learners',
      label: 'Archived Learners',
      render: (row) => (
        <ActiveArchivedLearner
          cohortId={row?.cohortId}
          type={Status.ARCHIVED}
        />
      ),
    },
    {
      key: 'center',
      label: 'Center',
      render: (row) => <CenterLabel parentId={row?.parentId} />,
    },
    {
      key: 'board',
      label: 'Boards',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'BOARD')
            ?.selectedValues?.join(', ')
        ) || '-',
    },
    {
      key: 'medium',
      label: 'Medium',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'MEDIUM')
            ?.selectedValues?.join(', ')
        ) || '-',
    },
    {
      key: 'grade',
      label: 'Grade',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'GRADE')
            ?.selectedValues?.join(', ')
        ) || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(row?.status),
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
          title="Edit Batch"
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        let tempFormData = extractMatchingKeys(row, addSchema);
        setPrefilledAddFormData(tempFormData);
        setIsEdit(true);
        setEditableUserId(row?.cohortId);
        handleOpenModal();
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
          title="Delete Batch"
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        console.log('row:', row);
        setEditableUserId(row?.userId);
        setCohortId(row?.cohortId);

        const data = {
          filters: {
            cohortId: row?.cohortId,
            status: ['active'],
            role: 'Learner',
          },
        };
        const response = await fetchCohortMemberList(data);

        let totalCount = response?.result?.totalCount;
        setTotalCount(totalCount);
        setOpen(true);
        setFirstName(row?.name);
      },
      show: (row) => row.status !== 'archived',
    },
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
    type: CohortTypes.BATCH,
  };
  const successUpdateMessage = 'BATCH.BATCH_UPDATE_SUCCESSFULLY';
  const telemetryUpdateKey = 'batch-updated-successfully';
  const failureUpdateMessage = 'BATCH.BATCH_UPDATE_FAILED';
  const successCreateMessage = 'BATCH.BATCH_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'batch-created-successfully';
  const failureCreateMessage = 'BATCH.BATCH_CREATE_FAILED';

  return (
    <>
      <Box display={'flex'} flexDirection={'column'} gap={2}>
        {isLoading ? (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        ) : (
          schema &&
          uiSchema && (
            <DynamicForm
              schema={schema}
              uiSchema={updatedUiSchema}
              SubmitaFunction={SubmitaFunction}
              isCallSubmitInHandle={true}
              prefilledFormData={prefilledFormData}
            />
          )
        )}

        {/* TODO: Add add new button back in future */}
        {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end' }} mt={4}>
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
              setPrefilledAddFormData(initialFormData);
              setIsEdit(false);
              setEditableUserId('');
              handleOpenModal();
            }}
          >
            {t('COMMON.ADD_NEW')}{' '}
          </Button>
        </Box> */}

        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          primaryText={isEdit ? t('Update') : t('Create')}
          id="dynamic-form-id"
          modalTitle={isEdit ? t('BATCH.UPDATE_BATCH') : t('BATCH.NEW_BATCH')}
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
            isNotificationRequired={false}
            hideSubmit={true}
            type="batch"
          />
        </SimpleModal>

        {response != null ? (
          <>
            {response &&
              response?.result?.results?.cohortDetails?.length > 0 ? (
              <Box sx={{ mt: 1 }}>
                <PaginatedTable
                  count={response?.result?.count}
                  data={response?.result?.results?.cohortDetails}
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
                  {t('BATCH.NO_BATCH_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}
      </Box>
      {totalCount > 0 ? (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`You can't delete the batch because it has ${totalCount} Active Learners`}
          secondary={'Cancel'}
        />
      ) : (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`Are you sure you want to delete ${firstName} batch?`}
          centerPrimary={t('COMMON.YES')}
          secondary={t('COMMON.CANCEL')}
          onClickPrimary={deleteCohort}
        />
      )}
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

export default Batch;
