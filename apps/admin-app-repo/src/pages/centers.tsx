// @ts-nocheck
import React, { useState, useEffect } from 'react';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { CohortTypes, Status, TenantName, isSecondChanceTenant, resolveFrameworkPlaceholders } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
import { Box, Tooltip, Typography } from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import editIcon from '../../public/images/editIcon.svg';
import deleteIcon from '../../public/images/deleteIcon.svg';
// import MapIcon from '@mui/icons-material/Map';
import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
  enhanceUiSchemaWithGrid,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { FormContext } from '@shared-lib-v2/DynamicForm/components/DynamicFormConstant';
import AddEditUser from '@/components/EntityForms/AddEditUser/AddEditUser';
import {
  CohortSearchSchema,
  CohortSearchUISchema,
} from '@/constant/Forms/CohortSearch';
import {
  fetchCohortMemberList,
  getCohortList,
} from '@/services/CohortService/cohortService';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import { updateCohort } from '@/services/MasterDataService';
import { transformLabel, transformLabelWithoutSpaces } from '@/utils/helper';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import ActiveArchivedLearner from '@/components/ActiveArchivedLearner';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import ActiveArchivedBatch from '@/components/ActiveArchivedBatch';
import BatchFlow from '@/components/BatchFlow/BatchFlow';
import useStore from '@/store/store';
import {
  getVisibleTableActions,
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

//import { DynamicForm } from '@shared-lib';

const Centers = () => {
  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(CohortSearchSchema);
  const [uiSchema, setUiSchema] = useState(CohortSearchUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [originalAddUiSchema, setOriginalAddUiSchema] = useState(null);
  const [prefilledAddFormData, setPrefilledAddFormData] = useState({});
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editableUserId, setEditableUserId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalCountBatch, setTotalCountBatch] = useState(0);

  const storedProgram =
    typeof window !== 'undefined'
      ? localStorage.getItem('tenantName') ?? localStorage.getItem('program')
      : null;

  const { t, i18n } = useTranslation();
  const initialFormData = localStorage.getItem('stateId')
    ? { state: [localStorage.getItem('stateId')] }
    : {};
  const searchStoreKey = 'centers';
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
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.cohort.context}&contextType=${FormContext.cohort.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.cohort.context}&contextType=${FormContext.cohort.contextType}`,
          header: {
            tenantid: savedTenantId,
          },
        },
      ]);
      console.log('responseForm', responseForm);

      //unit name is missing from required so handled from frotnend
      let alterSchema = resolveFrameworkPlaceholders(responseForm?.schema);
      let requiredArray = alterSchema?.required;
      const mustRequired = [
        'name',
        'state',
        'district',
        'block',
        'village',
        // 'catchment_area',
      ];
      if (isSecondChanceTenant(storedProgram)) {
        mustRequired.push('center_type', 'board', 'medium', 'grade');
      }
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
        alterSchema.properties.board.maxSelection = 1000;
      }
      if (alterSchema?.properties?.medium) {
        alterSchema.properties.medium.maxSelection = 1000;
      }
      if (alterSchema?.properties?.grade) {
        alterSchema.properties.grade.maxSelection = 1000;
      }

      // Uncomment for remote center changes
      // if (alterSchema?.properties?.center_type?.enum?.includes('regular')) {
      //   alterSchema.properties.center_type.default = 'regular';
      // }

      // Same label on every program's center form (API form says UNIT_NAME).
      if (alterSchema?.properties?.name) {
        alterSchema.properties.name.title = 'Center Name';
      }

      setAddSchema(alterSchema);

      //set 2 grid layout
      let alterUISchema = responseForm?.uiSchema;
      // YouthNet: ui:order fully driven by the schema's own property order,
      // so any field the form adds/removes is reflected automatically.
      // Other programs: keep the preferred SCP/Pathways field order, limited
      // to fields present on the schema, with any others appended after.
      const schemaKeys = Object.keys(alterSchema?.properties || {});
      if (storedProgram === TenantName.YOUTHNET) {
        alterUISchema['ui:order'] = schemaKeys;
      } else {
        const preferredOrder = [
          'state',
          'district',
          'block',
          'village',
          'board',
          'medium',
          'grade',
          'stream',
          'name',
          'center_type',
          'address',
          'image',
          'google_map_link',
          'industry',
          'catchment_area',
        ].filter((key) => schemaKeys.includes(key));
        alterUISchema['ui:order'] = [
          ...preferredOrder,
          ...schemaKeys.filter((key) => !preferredOrder.includes(key)),
        ];
      }
      alterUISchema = enhanceUiSchemaWithGrid(alterUISchema);

      setAddUiSchema(alterUISchema);
      setOriginalAddUiSchema(alterUISchema);

      // Uncomment for remote center changes
      // // console.log('####1:', alterSchema);
      // const modifiedUiSchema = {
      //   ...responseForm.uiSchema,
      //   center_type: {
      //     'ui:widget': 'hidden',
      //   },
      // };
      // // console.log('####2:', responseForm?.uiSchema);
      // setAddUiSchema(modifiedUiSchema);
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
    if (formData && Object.keys(formData).length > 0) {
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
      const staticFilter = { type: CohortTypes.COHORT };
      const { sortBy } = formData;
      const staticSort = ['name', sortBy || 'asc'];
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
        console.log('Cohort successfully archived.');
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
      label: 'Center Name',
      render: (row: any) => transformLabelWithoutSpaces(row?.name),
    },
    {
      key: 'address',
      label: 'Address',
      render: (row) =>
        transformLabel(
          row.customFields.find((field) => field.label === 'ADDRESS')
            ?.selectedValues
        ) || '-',
    },
    {
      key: 'state',
      label: 'State',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'STATE')
            ?.selectedValues.map((item) => item.value)
            .join(', ')
        ) || '-',
    },
    {
      key: 'district',
      label: 'District',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'DISTRICT')
            ?.selectedValues.map((item) => item.value)
            .join(', ')
        ) || '-',
    },
    {
      key: 'block',
      label: 'Block',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'BLOCK')
            ?.selectedValues.map((item) => item.value)
            .join(', ')
        ) || '-',
    },
    {
      key: 'village',
      label: 'Village',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'VILLAGE')
            ?.selectedValues.map((item) => item.value)
            .join(', ')
        ) || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(row?.status),
    },
  ];
  // const extraColumnsForYouthnet = [
  //   {
  //     key: 'image',
  //     label: 'Images',
  //     render: (row: any) => {
  //       console.log('Row in image column:', row);
  //       return row?.image?.[0];
  //     },
  //   },
  // ];
  const extraColumnsForYouthnet = [
    {
      key: 'domain',
      label: 'Domain',
      render: (row) =>
        transformLabel(
          row.customFields
            .find(
              (field) => field.label === 'DOMAIN'
            )
            ?.selectedValues?.join(', ')
        ) || '-',
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'SKILLS')
            ?.selectedValues?.join(', ')
        ) || '-',
    },
    {
      key: 'active_batches',
      label: 'Active Batches',
      render: (row) => (
        <ActiveArchivedBatch cohortId={row?.cohortId} type={Status.ACTIVE} />
      ),
    },
    {
      key: 'archived_batches',
      label: 'Archived Batches',
      render: (row) => (
        <ActiveArchivedBatch cohortId={row?.cohortId} type={Status.ARCHIVED} />
      ),
    },
    {
      key: 'image',
      label: 'Images',
      render: (row: any) => {
        const rawImage = row?.image;
        const images: string[] = Array.isArray(rawImage)
          ? rawImage
          : typeof rawImage === 'string' && rawImage
          ? [rawImage]
          : [];

        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {images.map((imgUrl: string, index: number) => (
              <img
                key={index}
                src={imgUrl}
                alt={`Image ${index + 1}`}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        );
      },
    },
  ];

  // Extra columns for TenantName.SECOND_CHANCE_PROGRAM
  const extraColumnsForSCP = [
    {
      key: 'type',
      label: 'Type',
      render: (row) =>
        transformLabel(
          row.customFields
            .find((field) => field.label === 'TYPE_OF_CENTER')
            ?.selectedValues.map((item) => item.value)
            .join(', ')
        ) || '-',
    },
    {
      key: 'active_batches',
      label: 'Active Batches',
      render: (row) => (
        <ActiveArchivedBatch cohortId={row?.cohortId} type={Status.ACTIVE} />
      ),
    },
    {
      key: 'archived_batches',
      label: 'Archived Batches',
      render: (row) => (
        <ActiveArchivedBatch cohortId={row?.cohortId} type={Status.ARCHIVED} />
      ),
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
  ];

  if (isSecondChanceTenant(storedProgram)) {
    columns.push(...extraColumnsForSCP);
    if (storedProgram === TenantName.SECOND_CHANCE_PROGRAM_PATHWAYS) {
      columns.push({
        key: 'stream',
        label: 'Stream',
        render: (row) =>
          transformLabel(
            row.customFields
              .find((field) => field.label === 'STREAM')
              ?.selectedValues?.join(', ')
          ) || '-',
      });
    }
  }
  if (storedProgram === TenantName.YOUTHNET) {
    columns.push(...extraColumnsForYouthnet);
  }

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
    //         // backgroundColor: 'rgb(227, 234, 240)',
    //         justifyContent: 'center',
    //         padding: '10px',
    //       }}
    //       title="Google Map Link"
    //     >
    //       <MapIcon />
    //     </Box>
    //   ),
    //   callback: async (row: any) => {
    //     window.open(
    //       row.customFields.find((field) => field.label === 'GOOGLE_MAP_LINK')
    //         ?.selectedValues,
    //       '_blank',
    //       'noopener,noreferrer'
    //     );
    //   },
    //   show: (row) =>
    //     row.customFields.find((field) => field.label === 'GOOGLE_MAP_LINK')
    //       ?.selectedValues,
    // },
    {
      readOnly: true,
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
          title="View Batch"
        >
          <Image src={'/images/centers.svg'} alt="" width={24} height={24} />
        </Box>
      ),
      callback: async (row: any) => {
        setSelectedCenter(row);
        setOpenBatchModal(true);
        // console.log('row in view batch', row);
      },
      // Batch creation/viewing (via BatchFlow) is no longer SCP-only —
      // YouthNet uses the L2 batch form, SCP/Pathways their own forms.
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
          title="Edit Center"
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        let tempFormData = extractMatchingKeys(row, addSchema);
        console.log('######## images value tempFormData', tempFormData);
        // console.log('######## images value row', row);
        // console.log('######## images value addSchema', addSchema);

        // Hide address and google_map_link fields when center_type is 'remote'
        if (tempFormData.center_type === 'remote') {
          const modifiedUiSchema = JSON.parse(
            JSON.stringify(originalAddUiSchema || addUiSchema)
          );
          if (modifiedUiSchema.address) {
            modifiedUiSchema.address = {
              ...modifiedUiSchema.address,
              'ui:widget': 'hidden',
            };
          }
          if (modifiedUiSchema.google_map_link) {
            modifiedUiSchema.google_map_link = {
              ...modifiedUiSchema.google_map_link,
              'ui:widget': 'hidden',
            };
          }
          setAddUiSchema(modifiedUiSchema);
        } else {
          // Restore original UI schema for non-remote centers
          setAddUiSchema(originalAddUiSchema || addUiSchema);
        }

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
          title="Delete Center"
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        console.log('row:', row);
        setEditableUserId(row?.userId);
        setCohortId(row?.cohortId);
        setIsEdit(false);

        //get batch from center id
        const url = API_ENDPOINTS.cohortSearch;
        const header = {
          tenantId: localStorage.getItem('tenantId') || '',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          academicyearid: localStorage.getItem('academicYearId') || '',
        };
        const responseBatch = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...header,
          },
          body: JSON.stringify({
            limit: 200,
            offset: 0,
            filters: {
              type: 'BATCH',
              status: ['active'],
              parentId: [row?.cohortId],
            },
          }),
        });
        const dataBatch = await responseBatch.json();
        if (dataBatch?.result?.results?.cohortDetails) {
          setTotalCountBatch(dataBatch.result.results.cohortDetails.length);
        } else {
          setTotalCountBatch(0);
        }

        setOpen(true);
        setFirstName(row?.name);
      },
      show: (row) => row.status !== 'archived',
    },
  ];

  const visibleActions = getVisibleTableActions(actions, isActiveYear);

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
    // Restore original UI schema when closing modal
    if (originalAddUiSchema) {
      setAddUiSchema(originalAddUiSchema);
    }
    setOpenModal(false);
  };

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    type: CohortTypes.COHORT,
  };
  const successUpdateMessage = 'CENTERS.CENTER_UPDATE_SUCCESSFULLY';
  const telemetryUpdateKey = 'center-updated-successfully';
  const failureUpdateMessage = 'CENTERS.CENTER_UPDATE_FAILED';
  const successCreateMessage = 'CENTERS.CENTER_CREATED';
  const telemetryCreateKey = 'center-created-successfully';
  const failureCreateMessage = 'CENTERS.CENTER_UPDATE_FAILED';
  console.log('prefilledFormData', prefilledFormData);
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
              type="centers"
            />
          )
        )}
        <Box mt={4} sx={pageActionBarSx}>
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
                // Restore original UI schema when creating new center
                if (originalAddUiSchema) {
                  setAddUiSchema(originalAddUiSchema);
                }
                setPrefilledAddFormData(initialFormData);
                setIsEdit(false);
                setEditableUserId('');
                handleOpenModal();
              }}
            >
              {t('COMMON.ADD_NEW')}{' '}
            </Button>
          )}
        </Box>

        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          primaryText={isEdit ? t('Update') : t('Create')}
          id="dynamic-form-id"
          modalTitle={
            isEdit ? t('COMMON.UPDATE_CENTER') : t('CENTERS.NEW_CENTER')
          }
          isFullwidth={false}
          modalWidth="90%"
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
            type="centers"
          />
        </SimpleModal>

        {response != null ? (
          <>
            {response &&
            response?.result?.results?.cohortDetails?.length > 0 ? (
              <Box sx={pageTableSectionSx}>
                <PaginatedTable
                  count={response?.result?.count}
                  data={response?.result?.results?.cohortDetails}
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
                  {t('COMMON.NO_CENTER_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}
        <SimpleModal
          open={openBatchModal}
          onClose={() => setOpenBatchModal(false)}
          showFooter={false}
          modalTitle={t('CENTERS.BATCHES_FOR_CENTER', {
            centerName: transformLabel(selectedCenter?.name || ''),
          })}
          isFullwidth={true}
        >
          {selectedCenter ? (
            <BatchFlow
              initialParentId={selectedCenter?.cohortId}
              centerBoards={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'BOARD'
                )?.selectedValues || []
              }
              centerMediums={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'MEDIUM'
                )?.selectedValues || []
              }
              centerGrades={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'GRADE'
                )?.selectedValues || []
              }
              centerIndustries={
                selectedCenter?.customFields?.find(
                  (field: any) =>
                    field.label === 'INDUSTRY' || field.label === 'DOMAIN'
                )?.selectedValues || []
              }
              centerSkills={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'SKILLS'
                )?.selectedValues || []
              }
              centerStreams={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'STREAM'
                )?.selectedValues || []
              }
              centerType={
                selectedCenter?.customFields?.find(
                  (field: any) => field.label === 'TYPE_OF_CENTER'
                )?.selectedValues?.[0]?.value || null
              }
            />
          ) : null}
        </SimpleModal>
      </Box>
      {totalCount > 0 || totalCountBatch > 0 ? (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`You can't delete the center because it has ${totalCountBatch} Active Batch`}
          secondary={'Cancel'}
        />
      ) : (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`Are you sure you want to delete ${firstName} center?`}
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

export default Centers;