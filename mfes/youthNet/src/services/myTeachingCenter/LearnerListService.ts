import { put } from '@shared-lib';
import API_ENDPOINTS from '../../utils/API/APIEndpoints';
import { fetchCohortMemberList } from '../MyClassDetailsService';
import { Role } from '../../utils/app.constant';
import { UpdateCohortMemberStatusParams, LearnerProgressStatus } from '../../utils/Interfaces';
import { ALL_LEARNER_STATUSES, OJT_ADDRESS_FIELD_ID } from './myTeachingCenter.config';

// cohortmember/list returns each learner's dynamic fields as `customField`
// (singular key name), but the actual value lives at `.selectedValues[0]`
// — confirmed against a real response; there is no plain `.value` property
// on these entries at all (an earlier, wrong assumption modeled on
// scp-teacher-repo's own `user.customField` reads). This is the same
// {label, selectedValues} shape cohort/mycohorts and cohort/search nodes
// use, just under the singular key `customField` instead of `customFields`.
const findLearnerCustomFieldById = (user: any, fieldId: string) =>
  user?.customField?.find((field: any) => field.fieldId === fieldId);

// The learner-progress status (in_training/course_completed/placed/
// retention_complete/dropout) is cohortmember/list's own core `status`
// field for this Trainer/Vocational-Training context — confirmed against
// the real filters.status contract, not a customField.
export const getLearnerStatus = (user: any): LearnerProgressStatus | null =>
  (user?.status as LearnerProgressStatus) ?? null;

// A saved OJT Address value round-trips through the backend as a
// JSON-encoded string (confirmed against a real response: saving the
// plain text "This is OJT Address" comes back as the string
// `"\"This is OJT Address\""` — i.e. selectedValues[0] is itself the
// JSON.stringify() of the original text). Parse it back to plain text for
// display/prefill; fall back to the raw value untouched if it isn't
// actually JSON (e.g. a value saved before this was understood).
export const getOjtAddress = (user: any): string => {
  const raw = findLearnerCustomFieldById(user, OJT_ADDRESS_FIELD_ID)?.selectedValues?.[0];
  if (typeof raw !== 'string' || raw === '') return raw ?? '';
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
};

export const getLearnerDisplayName = (user: any): string => {
  const first = user?.firstName || user?.name || '';
  const last = user?.lastName || '';
  return [first, last].filter(Boolean).join(' ').trim() || '-';
};

export interface GetBatchLearnersParams {
  batchCohortId: string;
  limit: number;
  offset: number;
  name?: string;
  status?: LearnerProgressStatus | LearnerProgressStatus[];
  // Overrides ALL_LEARNER_STATUSES as the "no status selected" fallback —
  // used by the Placements page so its "All" filter only ever requests
  // course_completed/placed, never My Teaching Center's full 5-value set.
  defaultStatuses?: LearnerProgressStatus[];
}

// Calls fetchCohortMemberList() directly (not the getMyCohortMemberList()
// wrapper — see BatchListService.ts's getLearnerCount() comment for why).
// filters.status carries the learner-progress enum directly: a single
// selected status filters to just that value; with no status selected
// ("All Status"), every value in `defaultStatuses` is sent — confirmed
// backend contract (POST /cohortmember/list filters.status takes an array),
// no client-side filtering needed.
export const getBatchLearners = async ({
  batchCohortId,
  limit,
  offset,
  name,
  status,
  defaultStatuses = ALL_LEARNER_STATUSES,
}: GetBatchLearnersParams): Promise<{ userDetails: any[]; totalCount: number }> => {
  const filters: any = {
    cohortId: batchCohortId,
    role: Role.STUDENT,
    status: status ? (Array.isArray(status) ? status : [status]) : defaultStatuses,
  };
  if (name) filters.name = name;

  const resp = await fetchCohortMemberList({ limit, offset, filters });
  const userDetails: any[] = resp?.result?.userDetails || [];
  const totalCount: number = resp?.result?.totalCount || 0;
  return { userDetails, totalCount };
};

// Ported verbatim (parameter shape/behavior) from
// mfes/scp-teacher-repo/src/services/MyClassDetailsService.ts:108-157, using
// youthNet's own `put` import and the `cohortMemberUpdate` endpoint added
// to APIEndpoints.ts. Used both for the OJT-address save-on-blur (via
// dynamicBody.customFields) and for learner status/dropout-reason updates.
export const updateCohortMemberStatus = async ({
  memberStatus,
  statusReason,
  membershipId,
  dynamicBody = {},
}: UpdateCohortMemberStatusParams): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberUpdate(membershipId);

  const prepareCustomFields = (customFields: any[]): any[] =>
    customFields.map((field) => {
      if (field && field.value !== undefined) {
        return {
          ...field,
          value: Array.isArray(field.value)
            ? field.value
            : typeof field.value === 'object' && field.value !== null
            ? JSON.stringify(field.value)
            : field.value,
        };
      }
      return field;
    });

  const requestBody = {
    ...(memberStatus && { status: memberStatus }),
    ...(statusReason && { statusReason }),
    ...Object.entries(dynamicBody).reduce((acc, [key, value]) => {
      acc[key] =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : value;
      return acc;
    }, {} as Record<string, any>),
    // Only stringify the `value` field of customFields if needed — this
    // spread runs after the generic one above and overwrites its
    // (wrongly stringified) customFields entry with the correct array.
    ...(dynamicBody?.customFields && {
      customFields: prepareCustomFields(dynamicBody.customFields),
    }),
  };

  try {
    const response = await put(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('Error updating cohort member status:', error);
    return null;
  }
};

export const isMutationSuccess = (result: any): boolean =>
  !!result && !result?.isAxiosError && !(result instanceof Error);
