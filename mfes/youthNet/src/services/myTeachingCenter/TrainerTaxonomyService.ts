import { getUserDetails } from '../youthNet/Dashboard/UserServices';
import { TrainerAssignedTaxonomy } from '../../utils/Interfaces';

const findField = (node: any, label: string) =>
  node?.customFields?.find((field: any) => field.label === label);

const uniq = (values: any[]): string[] =>
  Array.from(new Set((values || []).filter(Boolean)));

// Confirmed against a real GET /user/read/{userId}?fieldvalue=true
// response: the Trainer's own profile carries both DOMAIN and SKILLS
// customFields directly (`getUserDetails()` already builds this exact
// path/query — same helper l2-interested-queue.tsx already uses to resolve
// "tagged by" names). No cohort/mycohorts call is needed for this — that
// endpoint isn't used anywhere in this flow any more.
export const getTrainerTaxonomy = async (userId: string): Promise<TrainerAssignedTaxonomy> => {
  const userResp = await getUserDetails(userId, true);
  const node = userResp?.userData;
  return {
    domains: uniq(findField(node, 'DOMAIN')?.selectedValues),
    skills: uniq(findField(node, 'SKILLS')?.selectedValues),
  };
};
