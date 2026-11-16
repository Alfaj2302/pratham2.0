const baseurl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;

const API_ENDPOINTS = {
  contentRead: (doId: string) => `${baseurl}/api/content/v1/read/${doId}?fields=artifactUrl`,
  academicYearsList: `${baseurl}/academicyears/list`,
  coursePlannerUpload: `${baseurl}/prathamservice/v1/course-planner/upload`,
  targetedSolutions: `${baseurl}/solutions/targetedSolutions?type=improvementProject&currentScopeOnly=true`,
  formRead: `${baseurl}/form/read`,
  accountCreate: `${baseurl}/account/create`,
  userUpdate: (userId: string | string[]) => `${baseurl}/user/update/${userId}`,
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
  accountLogin: `${baseurl}/account/login`,
  authRefresh: `${baseurl}/user/auth/refresh`,
  authLogout: `${baseurl}/account/auth/logout`,
  userAuth: `${baseurl}/user/auth`,
  resetPassword: `${baseurl}/user/reset-password`,
  fieldOptionsRead: `${baseurl}/fields/options/read`,
  cohortSearch: `${baseurl}/cohort/search`,
  fieldOptionDelete: (type: string, option: string) => `${baseurl}/fields/options/delete/${type}?option=${option}`,
  fieldUpdate: (fieldId: string) => `${baseurl}/fields/update/${fieldId}`,
  cohortUpdate: (cohortId: string) => `${baseurl}/cohort/update/${cohortId}`,
  notificationSend: `${baseurl}/notification/send`,
  tenantRead: `${baseurl}/tenant/read`,
  tenantCreate: `${baseurl}/tenant/create`,
  tenantUpdate: (tenantId: string) => `${baseurl}/tenant/update/${tenantId}`,
  tenantDelete: (tenantId: string) => `${baseurl}/tenant/delete/${tenantId}`,
  tenantSearch: `${baseurl}/tenant/search`,
  userList: `${baseurl}/user/list`,
  cohortMemberList: `${baseurl}/cohortmember/list`,
  userRead: (userId: string | string[], fieldValue?: boolean) =>
    fieldValue !== undefined
      ? `${baseurl}/user/read/${userId}?fieldvalue=${fieldValue}`
      : `${baseurl}/user/read/${userId}`,
  suggestUsername: `${baseurl}/user/suggestUsername`,
  userTenantStatus: (userId: string, tenantId: string) =>
    `${baseurl}/user-tenant/status?userId=${userId}&tenantId=${tenantId}`,
  cohortUpdateUser: (userId: string | string[]) =>
    `${baseurl}/cohort/update/${userId}`,
  formReadWithContext: (context: string, contextType: string) =>
    `${baseurl}/form/read?context=${context}&contextType=${contextType}`,
  cohortCreate: `${baseurl}/cohort/create`,
  cohortMemberBulkCreate: `${baseurl}/cohortmember/bulkCreate`,
  cohortMemberUpdate: (membershipId: string | number) => `${baseurl}/cohortmember/update/${membershipId}`,
  notificationTemplate: `${baseurl}/notification-templates`,
  assessmentList: `${baseurl}/tracking/assessment/list`,
  assessmentSearchStatus: `${baseurl}/tracking/assessment/search/status`,
  assessmentSearch: `${baseurl}/tracking/assessment/search`,
  bulkAttendance: `${baseurl}/account/attendance/bulkAttendance`,
  bulkAttendanceV2: `${baseurl}/account/attendance/bulkAttendanceV2`,
  attendanceCreate: `${baseurl}/attendance/create`,
  attendanceList: `${baseurl}/account/attendance/list`,
  cohortHierarchy: (cohortId: string) => `${baseurl}/cohort/cohortHierarchy/${cohortId}`,
  eventList: `${baseurl}/event/list`,
  eventCreate: `${baseurl}/event/create`,
  eventDetails: (eventRepetitionId: string) => `${baseurl}/event/${eventRepetitionId}`,
  deleteFieldValues: `${baseurl}/fields/values/delete`,
  forgotPassword: `${baseurl}/user/forgot-password`,
  passwordResetLink: `${baseurl}/user/password-reset-link`,
  userReadWithField: (userId: string | string[]) => `${baseurl}/user/read/${userId}?fieldvalue=false`,
  userReadWithFieldTrue: (userId: string | string[]) => `${baseurl}/user/read/${userId}?fieldvalue=true`,
  contentSearchStatus: `${baseurl}/tracking/content/search/status`,
  contentCreate: `${baseurl}/tracking/content/create`,
  updateCohortUser: (userId: string | string[])=>`${baseurl}/user/v1/cohort/update/${userId}`,
  sendMessage: `${baseurl}/notification/send-raw`,
  hierarchialSearch: `${baseurl}/user/hierarchical-search`,
};

export default API_ENDPOINTS;
