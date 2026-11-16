import { get, post, patch } from '@shared-lib';
import axios from 'axios';
import API_ENDPOINTS from 'mfes/youthNet/src/utils/API/APIEndpoints';
import { Role, Status } from 'mfes/youthNet/src/utils/app.constant';
import { withEncryptedPassword } from '@shared-lib-v2/utils/passwordEncryption';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const MENTOR_DETAILS = {
  MENTOR_NAME: 'Mentor',
  MENTOR_OPTIONS: [
    'Shivan Mathur',
    'Vivek kasture',
    'Rohan Nene',
    'Sanket Jadhav',
  ],
};
export interface UserDetailParam {
  userData?: object;

  customFields?: any;
}
export interface userListParam {
  limit?: number;
  //  page: number;
  filters: {
    role?: string;
    tenantStatus?: string[];
    state?: string;
    district?: string[];
    block?: string[];
    fromDate?: string;
    toDate?: string;
    village?: string[];
    l2_interested?: string;
    domain?: string;
    courses?: string[];
    name?: string;
  };
  fields?: any;
  sort?: object;
  offset?: number;
}
export const fetchUserData = async (): Promise<any> => {
  if (MENTOR_DETAILS) {
    return MENTOR_DETAILS;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/userList`);
    return response?.data?.surveyAvailable || false;
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return false;
  }
};

export const fetchUserList = async ({
  limit,
  //  page,
  filters,
  sort,
  offset,
  fields,
}: userListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userList;
  try {
    const response = await post(apiUrl, {
      limit,
      filters,
      sort,
      offset,
      fields,
    });
    return response?.data?.result;
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 404) {
        return [];
      }
      console.error('API error:', error.response.status, error.response.data);
    } else {
      console.error('Network or unknown error:', error);
    }
  }
};

export const getUserDetails = async (
  userId: string | string[],
  fieldValue?: boolean
): Promise<any> => {
  let apiUrl: string = API_ENDPOINTS.userRead(userId);
  apiUrl = fieldValue ? `${apiUrl}?fieldvalue=true` : apiUrl;

  try {
    const response = await get(apiUrl);
    return response?.data?.result;
  } catch (error) {
    console.error('error in fetching user details', error);
    return error;
  }
};
export const getYouthDataByDate = async (
  fromDate: Date,
  toDate: Date,
  villageId: string[]
) => {
  try {
    const filters = {
      role: Role.LEARNER,
      tenantStatus: [Status.ACTIVE],
      fromDate: fromDate.toLocaleDateString('en-CA').split('T')[0],
      toDate: toDate.toLocaleDateString('en-CA').split('T')[0],
      village: villageId,
    };
    const limit = 100;
    const offset = 0;
    const response = await fetchUserList({ limit, filters, offset });
    return response;
  } catch (error) {}
};

// Helper function to extract all villages from WORKING_LOCATION structure
const extractVillagesFromWorkingLocation = (
  workingLocationField: any
): any[] => {
  if (
    !workingLocationField?.selectedValues ||
    !Array.isArray(workingLocationField.selectedValues)
  ) {
    return [];
  }

  const allVillages: any[] = [];

  // Iterate through all states
  workingLocationField.selectedValues.forEach((state: any) => {
    if (state.districts && Array.isArray(state.districts)) {
      // Iterate through all districts in the state
      state.districts.forEach((district: any) => {
        if (district.blocks && Array.isArray(district.blocks)) {
          // Iterate through all blocks in the district
          district.blocks.forEach((block: any) => {
            if (block.villages && Array.isArray(block.villages)) {
              // Add all villages from this block
              allVillages.push(...block.villages);
            }
          });
        }
      });
    }
  });

  return allVillages;
};

export const getVillages = async (userId: any) => {
  try {
    const storedUserId = localStorage.getItem('userId');
    let userDataString = localStorage.getItem('userData');
    let userData: any = userDataString ? JSON.parse(userDataString) : null;

    // for mobilizer
    if (userData && userId === storedUserId && userData.customFields) {
      // If cached userData exists and matches stored userId, return villages
      const workingLocationResult = userData.customFields.find(
        (item: any) => item.label === 'WORKING_LOCATION'
      );
      return extractVillagesFromWorkingLocation(workingLocationResult);
    }

    let selectedMentorDataString = localStorage.getItem('selectedmentorData');
    let selectedmentorId = localStorage.getItem('selectedmentorId');

    let selectedMentorData = selectedMentorDataString
      ? JSON.parse(selectedMentorDataString)
      : null;

    if (selectedMentorData && selectedMentorData.userId === userId) {
      // If selected mentor data matches, use it
      userData = selectedMentorData;
    } else {
      // Fetch from API only if no valid local data
      const data = await getUserDetails(userId, true);
      if (!data?.userData) return null;

      userData = data.userData;
      localStorage.setItem('selectedmentorData', JSON.stringify(userData));
      localStorage.setItem('selectedmentorId', userId);

      // for mobilizer
      if (userId === storedUserId) {
        userData.customFields = data.userData.customFields;
        localStorage.setItem('userData', JSON.stringify(userData));
      }
    }

    const workingLocationResult = userData?.customFields?.find(
      (item: any) => item.label === 'WORKING_LOCATION'
    );
    return extractVillagesFromWorkingLocation(workingLocationResult);
  } catch (error) {
    console.error('Error fetching villages:', error);
    return null;
  }
};

export const createUser = async (userData: any): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.accountCreate;
  try {
    const response = await post(apiUrl, await withEncryptedPassword(userData));
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting cohort list', error);
    throw error;
  }
};
export const updateUser = async (
  userId: string,
  { userData, customFields }: UserDetailParam
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userUpdate(userId);

  try {
    const response = await patch(apiUrl, { userData, customFields });
    return response;
  } catch (error) {
    console.error('error in fetching user details', error);
    return error;
  }
};

export const deleteUser = async (
  userId: string,
  userData: object
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userUpdate(userId);
  try {
    const response = await patch(apiUrl, userData);
    return response?.data;
  } catch (error) {
    console.error('error in deleting user', error);
    return error;
  }
};

export const updateUserTenantStatus = async (
  userId: string,
  tenantId: string,
  userDetails?: object
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userTenantStatus(userId, tenantId);
  try {
    const response = await patch(apiUrl, userDetails);
    return response?.data;
  } catch (error) {
    console.error('error in updating user tenant status', error);
    return error;
  }
};
