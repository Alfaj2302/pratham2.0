import { getUserDetails } from '../youthNet/Dashboard/UserServices';

const findField = (node: any, label: string) =>
  node?.customFields?.find((field: any) => field.label === label);

const uniq = (values: any[]): string[] =>
  Array.from(new Set((values || []).filter(Boolean)));

// Same GET /user/read/{userId}?fieldvalue=true + DOMAIN customField pattern
// confirmed for the Trainer role (see TrainerTaxonomyService.getTrainerTaxonomy) —
// a Placement Retention Coordinator's profile is expected to carry the same
// DOMAIN customField, assigned via the admin app's
// user-placement-retention-coordinator page.
export const getCoordinatorDomains = async (userId: string): Promise<string[]> => {
  const userResp = await getUserDetails(userId, true);
  const node = userResp?.userData;
  return uniq(findField(node, 'DOMAIN')?.selectedValues);
};
