// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import { fetchForm } from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import SimpleModal from '@/components/SimpleModal';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import { showToastMessage } from '@/components/Toastify';
import {
  createPlacementProperty,
  updatePlacementProperty,
} from '@/services/PlacementPropertyService';

interface AddEditPlacementPropertyModalProps {
  open: boolean;
  onClose: () => void;
  isEdit?: boolean;
  editData?: any;
  onSuccess: () => void;
}

const RADIO_FIELDS = [
  'medicalInsurance',
  'medicalAssistance',
  'propertySanitised',
  'transportationFacility',
];

const AddEditPlacementPropertyModal: React.FC<
  AddEditPlacementPropertyModalProps
> = ({ open, onClose, isEdit = false, editData, onSuccess }) => {
  const { t } = useTranslation();
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const fetchData = async () => {
      const responseForm = await fetchForm([
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.placementProperty.context}&contextType=${FormContext.placementProperty.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.placementProperty.context}&contextType=${FormContext.placementProperty.contextType}`,
          header: {
            tenantid: localStorage.getItem('tenantId'),
          },
        },
      ]);
      const schema = responseForm?.schema ?? null;
      // The backend sends controllingfieldfk as a bare '**', but the
      // fields/options API expects it as an array; wrapping it here lets
      // DynamicForm's replaceControllingField() substitute the state value
      // in place inside the array (it already recurses into arrays).
      if (schema?.properties?.district?.api?.payload) {
        schema.properties.district.api.payload.controllingfieldfk = ['**'];
      }
      setAddSchema(schema);
      setAddUiSchema(responseForm?.uiSchema ?? null);
    };
    fetchData();
  }, [open]);

  const handleSubmit = async (cleanedData: any) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        ...(isEdit && {
          placementPropertyId: editData?.placementPropertyId,
        }),
        propertyName: cleanedData.propertyName,
        stateId: cleanedData.state,
        districtId: cleanedData.district,
        pincode: cleanedData.pincode,
        industry: cleanedData.industryType ?? cleanedData.industry,
        domain: cleanedData.domain,
        propertyContact: cleanedData.propertyContact,
        propertyEmail: cleanedData.propertyEmail,
      };
      RADIO_FIELDS.forEach((field) => {
        payload[field] = cleanedData[field] === 'yes';
      });

      if (isEdit) {
        await updatePlacementProperty(payload);
        showToastMessage(
          t('COMMON.PLACEMENT_PROPERTY_UPDATED_SUCCESSFULLY'),
          'success'
        );
      } else {
        await createPlacementProperty(payload);
        showToastMessage(
          t('COMMON.PLACEMENT_PROPERTY_CREATED_SUCCESSFULLY'),
          'success'
        );
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving placement property', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      showFooter={true}
      primaryText={isEdit ? t('COMMON.UPDATE') : t('COMMON.SUBMIT')}
      primaryDisabled={isSubmitting || !addSchema}
      id="dynamic-form-id"
      modalTitle={
        isEdit
          ? t('COMMON.UPDATE_PLACEMENT_PROPERTY')
          : t('COMMON.ADD_PLACEMENT_PROPERTY')
      }
      isFullwidth={false}
      modalWidth="60%"
    >
      {addSchema && addUiSchema ? (
        <DynamicForm
          schema={addSchema}
          uiSchema={addUiSchema}
          FormSubmitFunction={handleSubmit}
          prefilledFormData={isEdit ? editData || {} : {}}
          hideSubmit={true}
        />
      ) : (
        <CenteredLoader />
      )}
    </SimpleModal>
  );
};

export default AddEditPlacementPropertyModal;
