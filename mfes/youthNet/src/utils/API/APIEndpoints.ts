const baseurl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;

const API_ENDPOINTS = {
  resetPassword: `${baseurl}/user/reset-password`,
  userRead: (userId: string | string[]) => `${baseurl}/user/read/${userId}`,
  userUpdate: (userId: string | string[]) => `${baseurl}/user/update/${userId}`,
  userAuth: `${baseurl}/user/auth`,
  notificationSend: `${baseurl}/notification/send`,
  userReadWithField: (userId: string | string[]) =>
    `${baseurl}/user/v1/read/${userId}?fieldvalue=true`,
  academicYearsList: `${baseurl}/academicyears/list`,
  userList: `${baseurl}/user/list`,
  fieldOptionsRead: `${baseurl}/fields/options/read`,
  accountCreate: `${baseurl}/account/create`,
  assessmentList: `${baseurl}/tracking/assessment/list`,
  accountLogin: `${baseurl}/account/login`,

  cohortMemberList: `${baseurl}/cohortmember/list`,
  myCohorts: (
    userId: string | string[],
    children?: boolean,
    customField?: boolean
  ) => {
    const url = `${baseurl}/cohort/mycohorts/${userId}`;
    const params = new URLSearchParams();
    if (children !== undefined) params.append('children', String(children));
    if (customField !== undefined)
      params.append('customField', String(customField));
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },
  assessmentSearchStatus: `${baseurl}/tracking/assessment/search/status`,
  assessmentSearch: `${baseurl}/tracking/assessment/search`,
  userTenantStatus: (userId: string, tenantId: string) =>`${baseurl}/user-tenant/status?userId=${userId}&tenantId=${tenantId}`,
  userCertificateStatusSearch: `${baseurl}/tracking/user_certificate/status/search`,
  contentSearchStatus: `${baseurl}/tracking/content/search/status`,
  courseStatusSearch: `${baseurl}/tracking/content/course/status`,
  contentCreate: `${baseurl}/tracking/content/create`,
  hierarchicalSearch: `${baseurl}/user/hierarchical-search`,
  cohortMemberBulkCreate: `${baseurl}/cohortmember/bulkCreate`,
  cohortSearch: `${baseurl}/cohort/search`,
  cohortUpdateStatus: `${baseurl}/cohort/updateStatus`,
  rbacUsersRolesBulkUpdate: `${baseurl}/rbac/usersRoles/bulkUpdate`,
  cohortCreate: `${baseurl}/cohort/create`,
  cohortMemberUpdate: (membershipId: string | number) =>
    `${baseurl}/cohortmember/update/${membershipId}`,
  fieldValuesDelete: `${baseurl}/fields/values/delete`,

};

export default API_ENDPOINTS;
