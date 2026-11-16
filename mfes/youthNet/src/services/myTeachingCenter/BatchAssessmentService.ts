import { post } from '@shared-lib';
import { URL_CONFIG } from '../../utils/url.config';
import { getAssessmentStatus } from '../AssesmentService';

export interface BatchAssessment {
  identifier: string;
  name: string;
}

export interface LearnerAssessmentResult {
  contentId: string;
  totalScore?: number;
  totalMaxScore?: number;
  percentage?: number | string;
  lastAttemptedOn?: string;
}

const searchQuestionSets = async (filters: Record<string, any>, fields: string[]) => {
  try {
    const response = await post(URL_CONFIG.API.COMPOSITE_SEARCH, {
      request: {
        filters,
        fields,
        sort_by: { lastUpdatedOn: 'desc' },
      },
    });
    const list: any[] = response?.data?.result?.QuestionSet || [];
    return list.map(
      (item): BatchAssessment => ({
        identifier: item.identifier,
        name: item.name,
      })
    );
  } catch (error) {
    console.error('Error searching batch assessments:', error);
    return [];
  }
};

// Assessment options for the Batch form: the live Practice Question Sets
// tagged with the batch's Domain (the framework's `subject`) and Skill —
// same filters as admin-app-repo's L2BatchCreate.js `assessments` field.
export const searchAssessmentsForSkill = async (
  domain: string,
  skill: string
): Promise<BatchAssessment[]> => {
  if (!domain || !skill) return [];
  return searchQuestionSets(
    {
      status: ['Live'],
      primaryCategory: ['Practice Question Set'],
      channel: 'pos-channel',
      domain: ['Learning for Work'],
      subject: [domain],
      subDomain: ['Career Exploration'],
      skills: [skill],
    },
    ['name', 'identifier']
  );
};

// Names of a batch's own stored Assessment do_ids, in the batch's stored
// order.
export const getAssessmentsByIds = async (ids: string[]): Promise<BatchAssessment[]> => {
  if (ids.length === 0) return [];
  const found = await searchQuestionSets({ identifier: ids }, ['name', 'identifier']);
  const byId = new Map(found.map((item) => [item.identifier, item]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as BatchAssessment[];
};

// userId -> (assessment do_id -> latest attempt). A learner can have
// several attempts of the same assessment; the most recent one is shown.
export const getLearnerAssessmentResults = async (
  userIds: string[],
  assessmentIds: string[]
): Promise<Record<string, Record<string, LearnerAssessmentResult>>> => {
  if (userIds.length === 0 || assessmentIds.length === 0) return {};
  const data = await getAssessmentStatus({
    userId: userIds,
    courseId: assessmentIds,
    unitId: assessmentIds,
    contentId: assessmentIds,
  });
  if (!Array.isArray(data)) return {};

  const results: Record<string, Record<string, LearnerAssessmentResult>> = {};
  data.forEach((learner: any) => {
    if (!learner?.userId) return;
    const byAssessment: Record<string, LearnerAssessmentResult> = {};
    (learner.assessments || []).forEach((attempt: any) => {
      if (!attempt?.contentId) return;
      const current = byAssessment[attempt.contentId];
      const isNewer =
        !current ||
        new Date(attempt.lastAttemptedOn || 0).getTime() >
          new Date(current.lastAttemptedOn || 0).getTime();
      if (isNewer) byAssessment[attempt.contentId] = attempt;
    });
    results[learner.userId] = byAssessment;
  });
  return results;
};
