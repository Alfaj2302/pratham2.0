// Post-switch landing page for a Program (tenant) + Role, shared by every
// header that hosts the Switch Account dialog (youthNet, scp-teacher-repo).
// Mirrors the role-based routing done at login in apps/teachers/src/pages/login.tsx,
// expressed as absolute paths since the switch can happen from any MFE.

// Tenant names as returned by the backend (see each app's TENANT_DATA).
const TENANTS = {
  SECOND_CHANCE_PROGRAM: 'Second Chance Program',
  SECOND_CHANCE_PROGRAM_PATHWAYS: 'Pathways',
  PRATHAM_SCP: 'pratham SCP',
  YOUTHNET: 'Vocational Training',
  PRAGYANPATH: 'Pragyanpath',
  SUMMER_CAMP: 'Summer Camp',
};

// Backend role name strings (see each app's Role / RoleNames enum).
const ROLES = {
  INSTRUCTOR: 'Instructor',
  PLACEMENT_RETENTION_COORDINATOR: 'Placement Retention',
};

const same = (a?: string | null, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.toLowerCase();

// True for the Pragyanpath Lead, who lands on the manager dashboard (the
// caller must also set `managrUserId` in that case, as login does).
export const isPragyanpathLead = (tenantName: string, roleName: string) =>
  same(tenantName, TENANTS.PRAGYANPATH) &&
  !!roleName?.toLowerCase().includes('lead');

// Returns the absolute path to land on after switching to the given
// tenant/role, or null when the tenant is not one these apps serve.
export const getSwitchAccountLandingPath = (
  tenantName: string,
  roleName: string
): string | null => {
  if (
    same(tenantName, TENANTS.SECOND_CHANCE_PROGRAM) ||
    same(tenantName, TENANTS.SECOND_CHANCE_PROGRAM_PATHWAYS) ||
    same(tenantName, TENANTS.PRATHAM_SCP)
  ) {
    return '/scp-teacher-repo/dashboard';
  }

  if (same(tenantName, TENANTS.YOUTHNET)) {
    // Trainer (Instructor): L2 Interested Queue, as at login.
    if (same(roleName, ROLES.INSTRUCTOR)) {
      return '/youthnet/l2-interested-queue';
    }
    if (same(roleName, ROLES.PLACEMENT_RETENTION_COORDINATOR)) {
      return '/youthnet/placements';
    }
    return '/youthnet';
  }

  if (same(tenantName, TENANTS.SUMMER_CAMP)) {
    return '/youthnet/individual-volunteer';
  }

  if (same(tenantName, TENANTS.PRAGYANPATH)) {
    return isPragyanpathLead(tenantName, roleName)
      ? '/youthnet/manager-dashboard'
      : '/youthnet';
  }

  return null;
};
