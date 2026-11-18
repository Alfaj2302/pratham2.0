import API_ENDPOINTS from '../utils/API/APIEndpoints';
import { deleteApi, get, patch } from './RestClient';

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
    throw error;
  }
};

/**
 * User Role Archival API: DELETE /user/v1/rbac/usersRoles/{tenantId}
 * Archives (status: 'archived') or re-activates (status: 'active') the given
 * roles of a user inside a single tenant.
 */
export const updateUserRoleStatus = async ({
  userId,
  roleIds,
  tenantId,
  status,
}: {
  userId: string;
  roleIds: string[];
  tenantId: string;
  status: 'archived' | 'active';
}): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userRoleStatus(tenantId);
  try {
    const response = await deleteApi(
      apiUrl,
      { userId, roleId: roleIds, tenantId, status },
      { tenantid: tenantId }
    );
    return response?.data;
  } catch (error) {
    console.error('error in updating user role status', error);
    throw error;
  }
};

/** User Read API – returns `result` (contains `userData`). */
export const readUser = async (
  userId: string,
  fieldValue: boolean = false
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userRead(userId, fieldValue);
  const response = await get(apiUrl);
  return response?.data?.result;
};
