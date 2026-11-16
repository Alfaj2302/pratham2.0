import { L2_FIELD_IDS, L2_INTERESTED_VALUES } from './l2Queue.config';

const findField = (row: any, label: string) =>
  row?.customFields?.find((field: any) => field.label === label);

export const getLearnerDomain = (row: any): string | null =>
  findField(row, 'DOMAIN')?.selectedValues?.[0] ?? null;

// 'SKILLS' label confirmed against real API responses on a person profile
// (see services/myTeachingCenter/myTeachingCenter.config.ts's
// BATCH_SKILLS_LABEL) — same fieldId/label pair as L2BatchCreate.ts's own
// `skills` field. Its selectedValues[0] is already the plain, human-readable
// skill name (unlike the old Course field, which stored a content id
// needing a separate name lookup) — no name-resolution step needed here.
export const getLearnerSkill = (row: any): string | null =>
  findField(row, 'SKILLS')?.selectedValues?.[0] ?? null;

export const getLearnerNote = (row: any): string =>
  findField(row, 'INTERACTION_NOTE')?.selectedValues?.[0] ?? '';

export const getLearnerTaggedByUserId = (row: any): string | null =>
  findField(row, 'DOMAIN')?.updatedBy ?? findField(row, 'SKILLS')?.updatedBy ?? null;

export const getLearnerInterestedAt = (row: any): string | null =>
  findField(row, 'L2_INTERESTED')?.createdAt ?? row?.createdAt ?? null;

export const isLearnerTagged = (row: any): boolean =>
  !!getLearnerDomain(row) && !!getLearnerSkill(row);

export const getLearnerLocationValue = (row: any, label: string): string =>
  findField(row, label)?.selectedValues?.[0]?.value ?? '-';

export const buildTagCustomFields = (
  domain: string,
  skill: string,
  note?: string
) => {
  const customFields = [
    { fieldId: L2_FIELD_IDS.DOMAIN, value: domain },
    { fieldId: L2_FIELD_IDS.SKILLS, value: skill },
  ];
  if (note) {
    customFields.push({ fieldId: L2_FIELD_IDS.INTERACTION_NOTE, value: note });
  }
  return customFields;
};

export const buildBatchEnrollCustomFields = () => [
  { fieldId: L2_FIELD_IDS.L2_INTERESTED, value: L2_INTERESTED_VALUES.ENROLLED },
];

// updateUser() (services/youthNet/Dashboard/UserServices.ts) catches its own
// axios errors and *returns* the error instead of throwing/rejecting — a
// pre-existing pattern in this codebase (see user-profile/[userId].tsx,
// villages/index.tsx, which have the same gap). Promise.all around it never
// rejects, so every call site here must inspect the resolved value itself
// to tell success from failure, instead of relying on try/catch.
//
// updateUser() returns the *raw axios response* on success (not
// response.data) — confirmed by villages/index.tsx's own success check
// (`updateUserResponse?.status === 200`), the only other real caller in this
// codebase that checks this. HTTP status is therefore the primary signal;
// responseCode is kept as a fallback in case a caller ever gets handed an
// already-unwrapped body instead.
export const isUpdateUserSuccess = (result: any): boolean => {
  if (!result || result?.isAxiosError || result instanceof Error) return false;
  const httpStatus = result?.status ?? result?.response?.status;
  if (httpStatus !== undefined) return httpStatus === 200;
  const responseCode = result?.data?.responseCode ?? result?.response?.data?.responseCode;
  return responseCode === undefined || responseCode === 200;
};

// Pulls the backend's own error message (e.g. "userData should not be
// empty") out of a failed updateUser() result, whichever of the two shapes
// it came back as, so the toast can show something more specific than a
// generic failure message when the backend provides one.
export const getUpdateUserErrorMessage = (result: any): string | undefined =>
  result?.data?.params?.errmsg ?? result?.response?.data?.params?.errmsg ?? undefined;

// Whether an awaited call resolved to a real result rather than the
// swallowed-error sentinel these youthNet services return on failure (null,
// or the caught error/axios-error itself, depending on the service). Use
// this for any such service whose success response shape isn't verified
// against the real backend — it's exactly what every real caller of
// bulkCreateCohortMembers() in this codebase (admin-app-repo,
// scp-teacher-repo) already relies on: they just await the call and trust
// its internal try/catch, never inspecting a responseCode.
export const isMutationSuccess = (result: any): boolean =>
  !!result && !result?.isAxiosError && !(result instanceof Error);

// bulkCreateCohortMembers()'s own success check. Requiring
// `responseCode === 200` here was an unverified assumption that produced a
// false "Could not create batch membership" failure on an actually-
// successful call — no real caller of this function anywhere in the
// codebase checks a responseCode, so this now matches that convention.
export const isBulkCreateCohortMembersSuccess = isMutationSuccess;
