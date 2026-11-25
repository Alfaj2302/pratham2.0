import { get, post } from './RestClient';
import { URL_CONFIG } from '../app.constant';
import API_ENDPOINTS from './EndUrls';

interface IAssessmentItemParam {
  answer: boolean;
  value: {
    body: string;
    value: number;
  };
}

interface IAssessmentItem {
  id: string;
  title: string;
  type: string;
  maxscore: number;
  params: IAssessmentItemParam[];
  sectionId: string;
}

interface IAssessmentResValue {
  label?: string;
  value: string | number;
  selected: boolean;
  AI_suggestion: string;
}

interface IAssessmentData {
  item: IAssessmentItem;
  index: number;
  pass: 'yes' | 'no';
  score: number;
  resvalues: IAssessmentResValue[];
  duration: number;
  sectionName: string;
}

interface IAssessmentSummarySection {
  sectionId: string;
  sectionName: string;
  data: IAssessmentData[];
}

interface ICreateAssessmentTracking {
  userId: string;
  courseId: string;
  contentId: string;
  attemptId: string;
  lastAttemptedOn: string;
  timeSpent: number;
  totalMaxScore: number;
  totalScore: number;
  unitId: string;
  assessmentSummary: IAssessmentSummarySection[];
}

export interface AssessmentSection {
  sectionId: string;
  sectionName: string;
  data: Array<{
    item: {
      id: string;
      title: string;
      type: string;
      maxscore: number;
      params: any[];
      sectionId: string;
    };
    index: number;
    pass: string;
    score: number;
    resvalues: Array<{
      label?: string;
      value: any;
      selected: boolean;
      AI_suggestion: string;
    }>;
    duration: number;
    sectionName: string;
  }>;
}

export interface UpdateAssessmentScorePayload {
  userId: string;
  courseId: string;
  contentId: string;
  attemptId: string;
  lastAttemptedOn: string;
  timeSpent: number;
  totalMaxScore: number;
  totalScore: number;
  unitId: string;
  assessmentSummary: AssessmentSection[];
  submitedBy?: string;
}

export interface AssessmentRecord {
  assessmentTrackingId: string;
  userId: string;
  courseId: string;
  contentId: string;
  attemptId: string;
  createdOn: string;
  lastAttemptedOn: string;
  assessmentSummary: {
    data: {
      item: {
        id: string;
        title: string;
        maxscore: number;
        sectionId: string;
      };
      pass: string;
      duration: number;
      score: number;
      resvalues: Array<{
        value: any;
        selected: boolean;
        AI_suggestion: string;
      }>;
    }[];
  }[];
  totalMaxScore: number;
  totalScore: number;
  updatedOn: string;
  timeSpent: string;
  unitId: string;
  submitedBy: string;
}

interface IAssessmentStatusOptions {
  userId: string[] | string;
  courseId: string[] | string;
  unitId: string[] | string;
  contentId: string[] | string;
}

interface ISearchAssessment {
  userId: string;
  courseId: string;
  unitId: string;
  contentId: string;
}

export const getAssessmentDetails = async (doId: string) => {
  try {
    // Ensure the environment variable is defined
    const searchApiUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
    if (!searchApiUrl) {
      throw new Error('Search API URL environment variable is not configured');
    }

    // Execute the request
    const response = await get(
      `${searchApiUrl}/api/course/v1/hierarchy/${doId}?mode=edit`,
      { Authorization: `Bearer` }
    );
    const res = response?.data?.result?.content;

    return res;
  } catch (error) {
    console.error('Error in ContentSearch:', error);
    throw error;
  }
};

// answer sheet submissions
export const answerSheetSubmissions = async ({
  userId,
  questionSetId,
  identifier,
  fileUrls,
  createdBy,
  parentId,
}: {
  userId: string;
  questionSetId: string;
  identifier: string;
  fileUrls: string[];
  createdBy: string;
  parentId?: string;
}) => {
  const apiURL = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/answer-sheet-submissions/create`;

  try {
    const response = await post(apiURL, {
      userId,
      questionSetId,
      identifier,
      fileUrls,
      createdBy,
      parentId,
    });
    return response?.data;
  } catch (error) {
    console.error('Error in answer sheet submissions:', error);
    throw error;
  }
};

export const getAssessmentStatus = async (body: IAssessmentStatusOptions) => {
  const apiUrl: string = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/search`;
  try {
    const response = await post(apiUrl, body);
    return response?.data?.data;
  } catch (error) {
    console.error('error in getting Assessment Status Service list', error);

    return error;
  }
};

export const searchAssessment = async (body: ISearchAssessment) => {
  const apiUrl: string = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/search`;
  try {
    const response = await post(apiUrl, body);
    return response?.data?.data;
  } catch (error) {
    console.error('error in getting Assessment Status Service list', error);

    return error;
  }
};

export const getAssessmentTracking = async (params: ISearchAssessment) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/search`;
  try {
    const response = await post(apiUrl, params);
    return response?.data;
  } catch (error) {
    console.error('Error in getting assessment tracking:', error);
    throw error;
  }
};

export const createAssessmentTracking = async (
  data: ICreateAssessmentTracking
) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/create`;
  try {
    const response = await post(apiUrl, data);
    return response?.data;
  } catch (error) {
    console.error('Error in creating assessment tracking:', error);
    throw error;
  }
};

export const updateAssessmentScore = async (
  payload: UpdateAssessmentScorePayload
): Promise<any> => {
  try {
    const response = await post(
      `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/create`,
      payload
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const getOfflineAssessmentStatus = async (data: {
  userIds: string[];
  questionSetId: string;
  parentId?: string | null;
}) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/offline-assessment-status`;
  try {
    const response = await post(apiUrl, data);
    return response?.data;
  } catch (error) {
    console.error('Error in getting offline assessment status:', error);
    throw error;
  }
};

export const searchAiAssessment = async (data: {
  question_set_id: string[];
}) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/ai-assessment/search`;
  try {
    const response = await post(apiUrl, data);
    return response?.data;
  } catch (error) {
    console.error('Error in searching ai assessment:', error);
    throw error;
  }
};

const API_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
export const hierarchyContent = async (content_do_id: string) => {
  const url = `${API_URL}/action/questionset/v2/hierarchy/` + content_do_id;

  let api_response = null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: '*/*',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      api_response = await response.json();
      return api_response;
    } else {
      console.error('Error fetching hierarchy content:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching hierarchy content:', error);
    return null;
  }
};


// ---------------------------------------------------------------------------
// Vocational Training (VT) assessment flow
// ---------------------------------------------------------------------------
// NOTE: `getAssessmentStatus` above posts to /tracking/assessment/search, which
// returns raw attempt records. The category roll-up (status + percentage) the
// VT screens need comes from a different endpoint, /tracking/assessment/search/status,
// which is what the mobile app (learner-app `getAssessmentStatus`) calls. Hence
// this separate wrapper rather than reusing the similarly-named one above.

export interface IAssessmentStatusSummary {
  status?: string;
  percentage?: number | string;
  assessments?: unknown[];
  [key: string]: unknown;
}

export const getAssessmentStatusSummary = async (body: {
  userId: string[];
  courseId: string[];
  unitId: string[];
  contentId: string[];
}): Promise<IAssessmentStatusSummary[]> => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/assessment/search/status`;
  try {
    const response = await post(apiUrl, body);
    const data = response?.data?.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getting assessment status summary:', error);
    return [];
  }
};

/**
 * Look up question sets by identifier. The batch's ASSESSMENTS custom field is
 * the only filter — VT batches carry no BOARD, so no board/program/evaluationType
 * filters are applied here (mirrors learner-app `assessmentListApi` in its
 * `assignedIds` branch).
 *
 * Deliberately NOT the `ContentSearch` wrapper: it injects a `fields` whitelist
 * (name/description/mimeType/identifier/...) that the search honours literally,
 * so `assessmentType`, `evaluationType`, `IL_UNIQUE_ID`, `medium` and
 * `lastPublishedOn` all come back undefined. Every question set would then fall
 * into the "Other" category and look like an online test. Both the mobile app
 * (`assessmentListApi`) and scp (`getDoIdForAssessmentDetails`) send filters with
 * no `fields` and get the full documents; this does the same.
 */
export const getAssessmentsByIds = async (identifiers: string[]) => {
  if (!identifiers?.length) return [];
  const apiUrl =
    `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/action/composite/v3/search` +
    `?orgdetails=orgName,email&licenseDetails=name,description,url`;
  try {
    const response = await post(apiUrl, {
      request: {
        filters: {
          identifier: identifiers,
          status: ['Live'],
          primaryCategory: ['Practice Question Set'],
        },
        sort_by: { lastUpdatedOn: 'desc' },
        query: '',
        limit: 100,
        offset: 0,
      },
    });
    const questionSets = response?.data?.result?.QuestionSet;
    return Array.isArray(questionSets) ? questionSets : [];
  } catch (error) {
    console.error('Error in getting assessments by ids:', error);
    return [];
  }
};

/**
 * Fetch full question bodies (used for the `editorState.solutions` text shown on
 * the read-only answer sheet). Callers pass at most a chunk of 10 identifiers.
 */
export const listQuestions = async (identifiers: string[]) => {
  if (!identifiers?.length) return [];
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/api/question/v2/list`;
  try {
    const response = await post(apiUrl, {
      request: { search: { identifier: identifiers } },
    });
    const questions = response?.data?.result?.questions;
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('Error in listing questions:', error);
    return [];
  }
};
