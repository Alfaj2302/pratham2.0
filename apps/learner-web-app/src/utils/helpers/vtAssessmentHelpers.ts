import { IAssessmentStatusSummary } from '@learner/utils/API/AssesmentService';

/** Category order on the Assessment landing screen (mirrors learner-app `Assessment.js`). */
export const ASSESSMENT_TYPE_ORDER = [
  'Pre Test',
  'Post Test',
  'Other',
  'Mock Test',
  'Unit Test',
];

export interface VtQuestionSet {
  identifier?: string;
  IL_UNIQUE_ID?: string;
  name?: string;
  description?: string;
  assessmentType?: string;
  evaluationType?: string;
  medium?: string[] | string;
  lastPublishedOn?: string;
  mimeType?: string;
  // merged from the learner's latest attempt
  totalScore?: number;
  totalMaxScore?: number;
  timeSpent?: number;
  createdOn?: string;
  lastAttemptedOn?: string;
  [key: string]: unknown;
}

export const getQuestionSetId = (questionSet: VtQuestionSet): string =>
  (questionSet?.IL_UNIQUE_ID ?? questionSet?.identifier ?? '') as string;

/**
 * Group question sets by `assessmentType`, known types first in the order above,
 * anything else after them in the order the API returned it.
 */
export const groupByAssessmentType = (
  questionSets: VtQuestionSet[]
): Array<{ type: string; items: VtQuestionSet[] }> => {
  const groups = new Map<string, VtQuestionSet[]>();
  questionSets.forEach((questionSet) => {
    const type = questionSet?.assessmentType ?? 'Other';
    const existing = groups.get(type);
    if (existing) existing.push(questionSet);
    else groups.set(type, [questionSet]);
  });

  return [...groups.entries()]
    .map(([type, items], apiIndex) => ({ type, items, apiIndex }))
    .sort((a, b) => {
      const indexA = ASSESSMENT_TYPE_ORDER.indexOf(a.type);
      const indexB = ASSESSMENT_TYPE_ORDER.indexOf(b.type);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.apiIndex - b.apiIndex;
    })
    .map(({ type, items }) => ({ type, items }));
};

/**
 * Merge each question set's *latest* attempt onto it, matching on `contentId`.
 * Equivalent to the mobile pair `getLastMatchingData` + `mergeDataWithQuestionSet`.
 */
export const mergeLatestAttempts = (
  questionSets: VtQuestionSet[],
  statusRecord: IAssessmentStatusSummary | undefined
): VtQuestionSet[] => {
  const attempts = Array.isArray(statusRecord?.assessments)
    ? (statusRecord?.assessments as Array<Record<string, any>>)
    : [];

  return questionSets.map((questionSet) => {
    const id = getQuestionSetId(questionSet);
    const matching = attempts.filter((attempt) => attempt?.contentId === id);
    const latest = matching[matching.length - 1];
    if (!latest) return questionSet;
    return {
      ...questionSet,
      totalScore: latest.totalScore,
      totalMaxScore: latest.totalMaxScore,
      timeSpent: latest.timeSpent,
      createdOn: latest.createdOn,
      lastAttemptedOn: latest.lastAttemptedOn,
    };
  });
};

/**
 * Offline (written) assessments are the ones the learner uploads an answer sheet
 * for. AI assessments are out of scope, so `ai-assessment/search` is never called
 * and `evaluationType: 'ai'` is not treated as offline.
 */
export const isOfflineAssessment = (questionSet: VtQuestionSet): boolean =>
  questionSet?.evaluationType === 'offline';

export const stripHtml = (html?: string | null): string =>
  (html ?? '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Learner's answer for one question, from the stored `resValue` JSON.
 * Returns an empty string when there is nothing to show (caller renders "NA").
 */
export const parseAnswerLabel = (resValue?: string | null): string => {
  if (!resValue || resValue === '[]') return '';
  try {
    const parsed = JSON.parse(resValue);
    if (!Array.isArray(parsed) || parsed.length === 0) return '';
    const label = parsed[0]?.label;
    if (!label) return '';
    return stripHtml(String(label))
      .replace(/^\d+\.\s*/, '')
      .replace(/^\([क-ह]\)\s*/, '')
      .replace(/^\([a-zA-Z]\)\s*/, '')
      .trim();
  } catch (error) {
    console.error('parseAnswerLabel: could not parse resValue', error);
    return '';
  }
};

/** Remove figures/images from solution HTML so it renders as plain text. */
export const removeImagesFromHtml = (html?: string | null): string => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<figure[^>]*class=["']image["'][^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
};

export const toPercentage = (score?: number, maxScore?: number): number => {
  if (!score || !maxScore) return 0;
  return Math.round((score / maxScore) * 100);
};

/** Mobile colours a score green above 35% and red at or below it. */
export const PASS_PERCENTAGE_THRESHOLD = 35;

export const formatSubmittedDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
