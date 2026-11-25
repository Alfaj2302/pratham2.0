// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { debounce } from 'lodash';
import { Box, Button, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import AddEditPlacementPropertyModal from '@/components/AddEditPlacementPropertyModal';
import ResetFiltersButton from '@/components/ResetFiltersButton/ResetFiltersButton';
import { showToastMessage } from '@/components/Toastify';
import {
  MasterPlacementPropertySearchSchema,
  MasterPlacementPropertySearchUISchema,
} from '@/constant/Forms/MasterPlacementPropertySearch';
import editIcon from '../../public/images/editIcon.svg';
import Image from 'next/image';
import {
  searchPlacementProperties,
  updatePlacementPropertyStatus,
  PlacementPropertyStatus,
} from '@/services/PlacementPropertyService';
import {
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

const mapRowToFormData = (row: any) => ({
  placementPropertyId: row?.placementPropertyId,
  propertyName: row?.propertyName,
  state: row?.stateId,
  district: row?.districtId,
  pincode: row?.pincode,
  industryType: row?.industry,
  domain: row?.domain,
  propertyContact: row?.propertyContact,
  propertyEmail: row?.propertyEmail,
  medicalInsurance: row?.medicalInsurance ? 'yes' : 'no',
  medicalAssistance: row?.medicalAssistance ? 'yes' : 'no',
  propertySanitised: row?.propertySanitised ? 'yes' : 'no',
  transportationFacility: row?.transportationFacility ? 'yes' : 'no',
});

const PlacementProperty = () => {
  const { t } = useTranslation();
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [response, setResponse] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (response?.result?.total !== 0) {
      searchData(prefilledFormData, 0);
    }
  }, [pageLimit]);

  const debouncedGetList = useCallback(
    debounce(async (data) => {
      const resp = await searchPlacementProperties(data);
      setResponse({ result: resp?.result });
    }, 1000),
    []
  );

  const searchData = async (formData: any = {}, newPage = 0) => {
    const { propertyName, state, district, pincode, industry, domain, status } =
      formData;
    const filters = {
      ...(propertyName && { propertyName }),
      ...(state && { stateId: state }),
      ...(district && { districtId: district }),
      ...(pincode && { pincode }),
      ...(industry && { industry }),
      ...(domain && { domain }),
      ...(status && { status }),
    };

    setCurrentPage(newPage);
    setResponse(null);

    const data = { ...filters, page: newPage + 1, limit: pageLimit };

    if (propertyName) {
      debouncedGetList(data);
    } else {
      const resp = await searchPlacementProperties(data);
      setResponse({ result: resp?.result });
    }
  };

  const SubmitaFunction = async (formData: any) => {
    setPrefilledFormData(formData);
    await searchData(formData, 0);
  };

  const updatedUiSchema = {
    ...MasterPlacementPropertySearchUISchema,
    'ui:submitButtonOptions': {
      norender: true,
    },
  };

  const handlePageChange = (newPage: number) => {
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setPageLimit(newRowsPerPage);
  };

  const refreshList = () => {
    searchData(prefilledFormData, currentPage);
  };

  const handleAddNew = () => {
    setIsEdit(false);
    setEditData(null);
    setOpenModal(true);
  };

  const handleEdit = (row: any) => {
    setIsEdit(true);
    setEditData(mapRowToFormData(row));
    setOpenModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) {
      return;
    }
    const nextStatus =
      statusTarget.status === PlacementPropertyStatus.ACTIVE
        ? PlacementPropertyStatus.INACTIVE
        : PlacementPropertyStatus.ACTIVE;
    try {
      await updatePlacementPropertyStatus({
        placementPropertyId: statusTarget.placementPropertyId,
        status: nextStatus,
      });
      showToastMessage(t('COMMON.STATUS_UPDATED_SUCCESSFULLY'), 'success');
      refreshList();
    } catch (error) {
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
      setStatusTarget(null);
    }
  };

  const yesNo = (value: boolean) =>
    value ? t('COMMON.YES') : t('COMMON.NO');

  const columns = [
    {
      keys: ['propertyName'],
      label: t('MASTER.ORGANIZATION_NAME'),
      minWidth: 200,
      render: (row) => row.propertyName,
    },
    {
      keys: ['stateName'],
      label: t('STATE'),
      minWidth: 200,
      render: (row) => row.stateName ?? row.stateId,
    },
    {
      keys: ['districtName'],
      label: t('DISTRICT'),
      minWidth: 200,
      render: (row) => row.districtName ?? row.districtId,
    },
    {
      keys: ['pincode'],
      label: t('MASTER.PINCODE'),
      minWidth: 100,
      render: (row) => row.pincode,
    },
    {
      keys: ['industry'],
      label: t('MASTER.INDUSTRY_TYPE'),
      minWidth: 150,
      render: (row) => row.industry,
    },
    {
      keys: ['domain'],
      label: t('MASTER.DOMAIN'),
      minWidth: 200,
      render: (row) => row.domain,
    },
    {
      keys: ['propertyContact'],
      label: t('MASTER.PLACEMENT_PROPERTY_CONTACT'),
      minWidth: 150,
      render: (row) => row.propertyContact,
    },
    {
      keys: ['propertyEmail'],
      label: t('MASTER.PLACEMENT_PROPERTY_EMAIL'),
      minWidth: 200,
      render: (row) => row.propertyEmail,
    },
    {
      keys: ['medicalInsurance'],
      label: t('MASTER.MEDICAL_INSURANCE'),
      minWidth: 150,
      render: (row) => yesNo(row.medicalInsurance),
    },
    {
      keys: ['medicalAssistance'],
      label: t('MASTER.MEDICAL_ASSISTANCE'),
      minWidth: 150,
      render: (row) => yesNo(row.medicalAssistance),
    },
    {
      keys: ['propertySanitised'],
      label: t('MASTER.PROPERTY_SANITISED'),
      minWidth: 150,
      render: (row) => yesNo(row.propertySanitised),
    },
    {
      keys: ['transportationFacility'],
      label: t('MASTER.TRANSPORTATION_FACILITY'),
      minWidth: 150,
      render: (row) => yesNo(row.transportationFacility),
    },
    {
      keys: ['status'],
      label: t('COMMON.STATUS'),
      minWidth: 100,
      render: (row) =>
        row.status === PlacementPropertyStatus.ACTIVE
          ? t('COMMON.ACTIVE')
          : t('COMMON.INACTIVE'),
      getStyle: (row) => ({
        color:
          row.status === PlacementPropertyStatus.ACTIVE ? 'green' : 'red',
      }),
    },
  ];

  const actions = [
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '10px',
          }}
          title={t('COMMON.EDIT')}
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: handleEdit,
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '10px',
          }}
          title={t('COMMON.CHANGE_STATUS')}
        >
          <ToggleOnIcon color="success" />
        </Box>
      ),
      callback: (row: any) => setStatusTarget(row),
      show: (row: any) => row.status === PlacementPropertyStatus.ACTIVE,
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '10px',
          }}
          title={t('COMMON.CHANGE_STATUS')}
        >
          <ToggleOffIcon color="disabled" />
        </Box>
      ),
      callback: (row: any) => setStatusTarget(row),
      show: (row: any) => row.status !== PlacementPropertyStatus.ACTIVE,
    },
  ];

  return (
    <>
      <Box display={'flex'} flexDirection={'column'} gap={2}>
        <DynamicForm
          schema={MasterPlacementPropertySearchSchema}
          uiSchema={updatedUiSchema}
          SubmitaFunction={SubmitaFunction}
          isCallSubmitInHandle={true}
          prefilledFormData={prefilledFormData || {}}
          ref={formRef}
        />

        <Box sx={pageActionBarSx}>
          <ResetFiltersButton
            searchStoreKey="placementProperty"
            formRef={formRef}
            SubmitaFunction={SubmitaFunction}
            setPrefilledFormData={setPrefilledFormData}
            defaultFilter={{}}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            color="primary"
            sx={{ textTransform: 'none', fontSize: '14px', width: '200px' }}
            onClick={handleAddNew}
          >
            {t('COMMON.ADD_NEW')}
          </Button>
        </Box>

        {response != null ? (
          <>
            {response && response?.result?.data?.length > 0 ? (
              <Box sx={pageTableSectionSx}>
                <PaginatedTable
                  count={response?.result?.total}
                  data={response?.result?.data}
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
                  {t('COMMON.NO_PLACEMENT_PROPERTY_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}
      </Box>

      {openModal && (
        <AddEditPlacementPropertyModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          isEdit={isEdit}
          editData={editData}
          onSuccess={refreshList}
        />
      )}

      <ConfirmationPopup
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={
          statusTarget?.status === PlacementPropertyStatus.ACTIVE
            ? t('COMMON.CONFIRM_DEACTIVATE_PLACEMENT_PROPERTY')
            : t('COMMON.CONFIRM_ACTIVATE_PLACEMENT_PROPERTY')
        }
        secondary={t('COMMON.CANCEL')}
        centerPrimary={
          statusTarget?.status === PlacementPropertyStatus.ACTIVE
            ? t('COMMON.DEACTIVATE')
            : t('COMMON.ACTIVATE')
        }
        onClickPrimary={handleConfirmStatusChange}
      />
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

export default PlacementProperty;
