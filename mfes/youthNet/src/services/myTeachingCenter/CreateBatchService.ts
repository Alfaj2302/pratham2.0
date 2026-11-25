import { post, put } from '@shared-lib';
import API_ENDPOINTS from '../../utils/API/APIEndpoints';
import { L2BatchCreate } from '../../constant/Forms/L2BatchCreate';

// Builds the cohort/create customFields array straight from L2BatchCreate's
// own schema (coreField/fieldId per property) rather than a second,
// hand-kept list of fieldIds — one source of truth for what's core vs a
// customField. `name` is the only coreField (fieldId: null); every other
// property in this schema is a customField with a real fieldId.
//
// domain/skills come through formData as single-element arrays (RJSF
// `type: 'array'`, maxSelection: 1) and are sent to the API as-is — an
// array of strings, e.g. `value: ["Agriculture Education"]` — not unwrapped
// to a plain string. batch_type/startdate/enddate are plain scalar strings
// already and are sent unchanged either way.
const buildCustomFields = (formData: Record<string, any>) =>
  Object.entries(L2BatchCreate.schema.properties)
    .filter(([key, def]: [string, any]) => def.coreField === 0 && key in formData)
    .map(([key, def]: [string, any]) => ({ fieldId: def.fieldId, value: formData[key] }))
    .filter((field) => field.value !== undefined && field.value !== null && field.value !== '');

export interface CreateBatchPayload {
  centerId: string;
  formData: Record<string, any>;
}

// POSTs to /cohort/create with the same generic {type, parentId,
// customFields} shape scp-teacher-repo's createCohort() uses for a
// Vocational Training BATCH cohort.
export const createBatch = async ({ centerId, formData }: CreateBatchPayload): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortCreate;
  const requestBody = {
    name: formData.name,
    type: 'BATCH',
    parentId: centerId,
    customFields: buildCustomFields(formData),
  };
  try {
    const response = await post(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error creating batch:', error);
    return null;
  }
};

export const isCreateBatchSuccess = (result: any): boolean =>
  !!result && !result?.isAxiosError && !(result instanceof Error);

export interface UpdateBatchPayload {
  cohortId: string;
  formData: Record<string, any>;
}

// PUTs to /cohort/update/:cohortId with the same {name, customFields}
// shape createBatch() sends (plus updatedBy, as admin-app-repo's
// updateCohortUpdate does). Only fields present in formData are sent, so
// the Edit form's hidden Domain/Skills are left untouched on the batch.
export const updateBatch = async ({ cohortId, formData }: UpdateBatchPayload): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortUpdate(cohortId);
  const requestBody = {
    name: formData.name,
    customFields: buildCustomFields(formData),
    updatedBy: localStorage.getItem('userId'),
  };
  try {
    const response = await put(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error updating batch:', error);
    return null;
  }
};
