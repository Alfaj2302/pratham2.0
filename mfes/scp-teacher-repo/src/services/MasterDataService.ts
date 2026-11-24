import { showToastMessage } from '@/components/Toastify';
import { deleteApi, patch, post, put } from './RestClient';
import axios from 'axios';
import API_ENDPOINTS from '@/utils/API/APIEndpoints';
export interface CenterListParam {
  limit?: number;
  filters?: any;
  offset?: number;
}

export interface StateListParam {
  limit?: number;
  offset?: number;
  controllingfieldfk?: any; 
  fieldName: string;
  optionName?: string;
  sort?: [string, string]; //
}

export interface DistrictListParam {
  limit?: number;
  offset?: number;
  controllingfieldfk?: string;
  fieldName: string;
  optionName?: string;
  sort?: [string, string]; //
}

export const getStateBlockDistrictList = async ({
  controllingfieldfk,
  fieldName,
  limit,
  offset,
  optionName,
  sort,
}: StateListParam): Promise<any> => {
  const apiUrl = API_ENDPOINTS.fieldOptionsRead;

  const requestBody: StateListParam = {
    fieldName,
    limit,
    offset,
    sort,
  };
  if (controllingfieldfk) {
    requestBody.controllingfieldfk = controllingfieldfk;
  }
  if (optionName) {
    requestBody.optionName = optionName;
  }
  try {
    const response = await post(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error in fetching state, block, and district list', error);
    throw error;
  }
};
// getDistrictsForState
export const getDistrictsForState = async ({
  limit,
  offset,
  controllingfieldfk,
  fieldName,
  optionName,
  sort,
}: {
  limit?: number;
  offset?: number;
  controllingfieldfk?: string | undefined;
  fieldName: string;
  optionName?: string;
  sort?: [string, string];
}): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.fieldOptionsRead;

  const requestBody: {
    limit?: number;
    offset?: number;
    controllingfieldfk?: string;
    fieldName: string;
    optionName?: string;
    sort?: [string, string];
  } = {
    fieldName,
    limit,
    offset,
  };

  if (controllingfieldfk) {
    requestBody.controllingfieldfk = controllingfieldfk;
  }
  if (optionName) {
    requestBody.optionName = optionName;
  }
  if (sort) {
    requestBody.sort = sort;
  }

  try {
    const response = await post(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error fetching blocks for districts', error);
    throw error;
  }
};

export const getBlocksForDistricts = async ({
  limit,
  offset,
  controllingfieldfk,
  fieldName,
  optionName,
  sort,
}: {
  limit?: number;
  offset?: number;
  controllingfieldfk?: string | undefined;
  fieldName: string;
  optionName?: string;
  sort?: [string, string];
}): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.fieldOptionsRead;

  const requestBody: {
    limit?: number;
    offset?: number;
    controllingfieldfk?: string;
    fieldName: string;
    optionName?: string;
    sort?: [string, string];
  } = {
    limit,
    offset,
    fieldName,
  };

  if (controllingfieldfk) {
    requestBody.controllingfieldfk = controllingfieldfk;
  }
  if (optionName) {
    requestBody.optionName = optionName;
  }
  if (sort) {
    requestBody.sort = sort;
  }

  try {
    const response = await post(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error fetching blocks for districts', error);
    throw error;
  }
};

export const getCenterList = async ({
  filters,
  limit,
  offset,
}: CenterListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortSearch;
  try {
    const response = await post(apiUrl, {
      filters,
      limit,
      offset,
    });
    return response?.data;
  } catch (error) {
    console.error('error in fetching user details', error);
    return error;
  }
};

export const deleteOption = async (
  type: 'states' | 'districts' | 'blocks',
  option: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.fieldOptionDelete(type, option);
  const requestBody = {};
  const requestHeaders = {};

  try {
    const response = await deleteApi(apiUrl, requestBody, requestHeaders);
    return response?.data;
  } catch (error) {
    console.error(`Error deleting ${type}`, error);
    return error;
  }
};

export const createOrUpdateOption = async (
  fieldId: string,
  fieldParams: {
    isCreate?: boolean;
    options: {
      name: string;
      value: string;
      controllingfieldfk?: string;
      updatedBy?: string;
    }[];
  },
  t?: any
  // stateId?: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.fieldUpdate(fieldId);

  try {
    const response = await patch(apiUrl, { fieldParams });
    return response?.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 409) {
        showToastMessage(t('COMMON.COHORT_CODE_EXISTS'), 'error');
      }
    }
    console.error(
      'Error in createOrUpdateOption:',
      error.message,
      error.response?.data
    );
    throw new Error('Failed to update options');
  }
};

export const updateCohort = async (
  cohortId: string,
  cohortDetails: any
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortUpdate(cohortId);

  try {
    const response = await put(apiUrl, cohortDetails);
    return response?.data;
  } catch (error) {
    console.error('Error in updating cohort details', error);
    // throw error;
    return null;
  }
};

export const updateBatch = async (
  cohortId: string,
  name: string
): Promise<any> => {
  const apiUrl = API_ENDPOINTS.cohortUpdate(cohortId);
  try {
    const response = await put(apiUrl, { name });
    return response.data.result;
  } catch (error) {
    console.error('Error in updating Batch', error);
    throw error;
  }
};

export const fetchStateOptions = async (data: any) => {
  try {
    const response = await axios.post(API_ENDPOINTS.fieldOptionsRead, data);
    return response.data;
  } catch (error) {
    console.error('Error fetching state options:', error);
  }
};
export const getFieldOptions = async ({
  controllingfieldfk,
  fieldName,
  limit,
  offset,
  optionName,
  sort,
}: StateListParam): Promise<any> => {
  const apiUrl = API_ENDPOINTS.fieldOptionsRead;

  const requestBody: StateListParam = {
    fieldName,
    limit,
    offset,
    sort,
  };
  if (controllingfieldfk) {
    requestBody.controllingfieldfk = controllingfieldfk;
  }
  if (optionName) {
    requestBody.optionName = optionName;
  }
  try {
    const response = await post(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error in fetching state, block, and district list', error);
    throw error;
  }
};
export interface DistrictUserCountParam {
  role: string;
  tenantId: string;
  stateId: (string | number)[];
}

export interface DistrictUserCount {
  name: string;
  user_count: number;
  level?: string;
  [key: string]: any;
}

export const getDistrictUserCount = async ({
  role,
  tenantId,
  stateId,
}: DistrictUserCountParam): Promise<DistrictUserCount[]> => {
  const apiUrl = API_ENDPOINTS.districtUserCount;
  try {
    const response = await post(apiUrl, {
      role,
      tenantId,
      stateId: stateId.map(String),
    });
    return response?.data?.result ?? [];
  } catch (error) {
    console.error('Error in fetching district user count', error);
    throw error;
  }
};
