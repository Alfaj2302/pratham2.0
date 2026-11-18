import { updateCohortMemberStatus } from '../DynamicForm/services/CohortService/cohortService';
import { getCohortList } from '../DynamicForm/services/GetCohortList';
import { RoleId } from '../utils/app.constant';
import {
  archiveUserRoleAndTenant,
  getTenantRoleSummary,
  TenantRoleSummary,
} from './UserRoleArchival';

type DeleteUserParams = {
  userId: string;
  roleId: string;
  tenantId: string;
  reason?: string;
  status?: string;
  /** Optional User Read API result already fetched by the caller (avoids a duplicate call). */
  userDetails?: any;
};

// adjust these based on your actual role ids/constants
const ROLES_ASSIGNED_TO_COHORTS = [RoleId.TEACHER, RoleId.TEAM_LEADER, RoleId.STUDENT, RoleId.MOBILIZER];

/**
 * Archival flow (scoped to the current tenant):
 *  1. Cohort Status Update API   – roles that have centers only
 *  2. User Role Archival API     – always
 *  3. Tenant Status Update API   – only when no other active role remains
 * A failure stops the remaining steps.
 */
export const deleteUser = async ({
  userId,
  roleId,
  tenantId,
  reason,
  status = 'archived',
  userDetails,
}: DeleteUserParams) => {
  try {
    // 0. Latest user details (User Read API) -> tenant-scoped role summary
    let summary: TenantRoleSummary;
    try {
      summary = await getTenantRoleSummary(userId, tenantId, userDetails);
    } catch (err: any) {
      console.error('Failed to read user details:', err);
      return {
        responseCode: err?.response?.status ?? 500,
        params: { status: 'failed', errmsg: 'Failed to read user details' },
      };
    }

    const shouldHandleCohorts = ROLES_ASSIGNED_TO_COHORTS.includes(roleId as RoleId);

    /**
     * 1. Handle cohort archival ONLY for roles that have centers
     */
    if (shouldHandleCohorts) {
      const userCohortResp = await getCohortList(userId);
      if (userCohortResp instanceof Error) {
        console.error('Failed to fetch cohort list:', userCohortResp);
        return {
          responseCode: 500,
          params: { status: 'failed', errmsg: 'Failed to fetch cohort list' },
        };
      }

      const membershipIds =
        userCohortResp?.result
          ?.filter((item: any) => item.cohortMemberStatus !== 'archived')
          ?.map((item: any) => item.cohortMembershipId) || [];

      for (const membershipId of membershipIds) {
        const updateResponse = await updateCohortMemberStatus({
          memberStatus: status,
          statusReason: reason,
          membershipId,
        });

        if (updateResponse?.responseCode !== 200) {
          console.error(
            `Failed to archive cohort membership ${membershipId}`,
            updateResponse
          );
          return updateResponse ?? {
            responseCode: 500,
            params: { status: 'failed', errmsg: 'Failed to archive cohort membership' },
          };
        }
      }
    }

    /**
     * 2 & 3. User Role Archival API, then Tenant Status Update API when
     *        this was the last active role in the current tenant.
     */
    const resp = await archiveUserRoleAndTenant({
      userId,
      roleId,
      tenantId,
      reason,
      status,
      summary,
    });

    if (resp?.responseCode !== 200) {
      console.error('Failed to archive user:', resp);
    }

    return resp;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
