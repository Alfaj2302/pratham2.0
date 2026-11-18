import {
  readUser,
  updateUserRoleStatus,
  updateUserTenantStatus,
} from '../DynamicForm/services/UserService';

const ACTIVE = 'active';

export type TenantRoleSummary = {
  /** Tenant entry from userData.tenantData matching the current tenant (if any). */
  tenant: any | null;
  /** Roles of the user in the current tenant only. */
  roles: any[];
  /** Roles of the current tenant whose userRoleStatus is active. */
  activeRoles: any[];
  totalRoles: number;
  activeRoleCount: number;
};

const isRoleActive = (role: any) =>
  // Older responses may not carry userRoleStatus; an assigned role without a
  // status is treated as active.
  (role?.userRoleStatus ?? ACTIVE).toString().toLowerCase() === ACTIVE;

/**
 * Accepts either the User Read API `result`, `result.userData`, or a userData-like
 * object, and returns the tenantData array.
 */
const extractTenantData = (userDetails: any): any[] => {
  const userData = userDetails?.userData ?? userDetails;
  return Array.isArray(userData?.tenantData) ? userData.tenantData : [];
};

/**
 * Builds the tenant-scoped role summary. Roles of other tenants are ignored.
 */
export const buildTenantRoleSummary = (
  userDetails: any,
  tenantId: string
): TenantRoleSummary => {
  const tenant =
    extractTenantData(userDetails).find((t: any) => t?.tenantId === tenantId) ??
    null;
  const roles: any[] = Array.isArray(tenant?.roles) ? tenant.roles : [];
  const activeRoles = roles.filter(isRoleActive);
  return {
    tenant,
    roles,
    activeRoles,
    totalRoles: roles.length,
    activeRoleCount: activeRoles.length,
  };
};

/**
 * Fetches the latest user details (User Read API) unless they are passed in,
 * and returns the role summary for the given tenant.
 */
export const getTenantRoleSummary = async (
  userId: string,
  tenantId: string,
  userDetails?: any
): Promise<TenantRoleSummary> => {
  const details = userDetails ?? (await readUser(userId, false));
  return buildTenantRoleSummary(details, tenantId);
};

/**
 * Tenant status must be archived only when no other active role remains in
 * the current tenant after archiving `roleIds`.
 *  - multiple active roles        -> false
 *  - one active role among many   -> true
 *  - single role                  -> true
 */
export const shouldArchiveTenant = (
  summary: TenantRoleSummary,
  roleIds: string[]
) =>
  summary.activeRoles.filter((role) => !roleIds.includes(role?.roleId))
    .length === 0;

const failure = (errmsg: string, error?: any) => ({
  responseCode: error?.response?.status ?? 500,
  params: {
    status: 'failed',
    errmsg: error?.response?.data?.params?.errmsg || errmsg,
  },
});

/**
 * Archives the user's role(s) in the current tenant and archives the tenant
 * membership only if it was the last active role.
 * Cohort membership handling (when applicable) must be done by the caller
 * BEFORE calling this.
 */
export const archiveUserRoleAndTenant = async ({
  userId,
  roleId,
  tenantId,
  reason,
  status = 'archived',
  userDetails,
  summary,
}: {
  userId: string;
  roleId: string | string[];
  tenantId: string;
  reason?: string;
  status?: string;
  userDetails?: any;
  summary?: TenantRoleSummary;
}): Promise<any> => {
  const roleIds = (Array.isArray(roleId) ? roleId : [roleId]).filter(Boolean);
  const roleSummary =
    summary ?? (await getTenantRoleSummary(userId, tenantId, userDetails));

  // 1. User Role Archival API
  let roleResp: any;
  try {
    roleResp = await updateUserRoleStatus({
      userId,
      roleIds,
      tenantId,
      status: 'archived',
    });
  } catch (error) {
    return failure('Failed to archive user role', error);
  }

  // 2. Tenant Status Update API – only when no other active role remains
  if (!shouldArchiveTenant(roleSummary, roleIds)) {
    return { ...roleResp, responseCode: roleResp?.responseCode ?? 200 };
  }

  const tenantResp = await updateUserTenantStatus(userId, tenantId, {
    status,
    ...(reason && { reason }),
  });
  if (tenantResp?.responseCode !== 200) {
    console.error('Failed to archive user tenant:', tenantResp);
  }
  return tenantResp;
};

/**
 * Reassign / reactivate: activates the user's archived role(s) in the current
 * tenant and re-activates the tenant membership when it is not active.
 * Cohort membership activation (when applicable) must be done by the caller
 * BEFORE calling this.
 */
export const reactivateUserRoleAndTenant = async ({
  userId,
  roleId,
  tenantId,
  userDetails,
  tenantStatusPayload,
}: {
  userId: string;
  roleId: string | string[];
  tenantId: string;
  userDetails?: any;
  /** Extra fields for the tenant status payload (status is always 'active'). */
  tenantStatusPayload?: Record<string, any>;
}): Promise<any> => {
  const roleIds = (Array.isArray(roleId) ? roleId : [roleId]).filter(Boolean);
  const summary = await getTenantRoleSummary(userId, tenantId, userDetails);

  // 1. User Role Archival API with status active – only for roles that are
  //    not already active (unknown roles are sent as-is).
  const rolesToActivate = roleIds.filter((id) => {
    const role = summary.roles.find((r: any) => r?.roleId === id);
    return !role || !isRoleActive(role);
  });
  let roleResp: any;
  if (rolesToActivate.length > 0) {
    try {
      roleResp = await updateUserRoleStatus({
        userId,
        roleIds: rolesToActivate,
        tenantId,
        status: 'active',
      });
    } catch (error) {
      return failure('Failed to activate user role', error);
    }
  }

  // 2. Tenant Status Update API – only when tenant membership is not active
  const tenantStatus = summary.tenant?.tenantStatus?.toString().toLowerCase();
  if (summary.tenant && tenantStatus === ACTIVE) {
    return { ...(roleResp ?? {}), responseCode: roleResp?.responseCode ?? 200 };
  }

  return updateUserTenantStatus(userId, tenantId, {
    ...(tenantStatusPayload ?? {}),
    status: 'active',
  });
};
