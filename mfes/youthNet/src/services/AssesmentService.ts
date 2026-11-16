import {
  AssessmentListParam,
  GetDoIdServiceParam,
  IAssessmentStatusOptions,
  ISearchAssessment,
} from '../utils/Interfaces';
// import { get, post } from './RestClient';
import { URL_CONFIG } from '../utils/url.config';
import API_ENDPOINTS from '../utils/API/APIEndpoints';
import { post , get} from '@shared-lib';

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

export const getAssessmentList = async ({
  sort,
  pagination,
  filters,
}: AssessmentListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.assessmentList;
  try {
    const response = await post(apiUrl, { pagination, filters, sort });
    return response?.data;
  } catch (error) {
    console.error('error in getting Assessment List Service list', error);

    return error;
  }
};

export const getAssessmentDetails = async (doId: string) => {
  try {
    // Ensure the environment variable is defined
    const searchApiUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
    if (!searchApiUrl) {
      throw new Error('Search API URL environment variable is not configured');
    }
    // Axios request configuration
    // const config: AxiosRequestConfig = {
    //   method: 'get',
    //   maxBodyLength: Infinity,
    //   url: `${searchApiUrl}/api/course/v1/hierarchy/${doId}`,
    //   params: params,
    // };

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

export const getDoIdForAssessmentDetails = async ({
  filters,
}: GetDoIdServiceParam): Promise<any> => {
  const apiUrl = `${URL_CONFIG.API.COMPOSITE_SEARCH}`;
  const data = {
    request: {
      filters: {
        program: filters.program,
        board: filters.board,
        // state: filters.state,
        assessmentType: filters.assessmentType,
        status: ['Live'],
        primaryCategory: ['Practice Question Set'],
        ...(filters?.evaluationType && { evaluationType: filters.evaluationType}),
        // Restricts the search to a known set of assessment do_ids — used by the Trainer flows to
        // scope results to the assessments actually attached to the selected batch.
        ...(filters?.identifier && { identifier: filters.identifier })
      },
    },
  };

  try {
    const response = await post(apiUrl, data);
    return response?.data;
  } catch (error) {
    console.error('Error in getDoIdForAssessmentDetails Service', error);
    return error;
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
  parentId?: string;
  identifier: string;
  fileUrls: string[];
  createdBy: string;

}) => {
  const apiURL = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/answer-sheet-submissions/create`;
  // const apiURL = `https://e49a1216cbca.ngrok-free.app/interface/v1/tracking/answer-sheet-submissions/create`;

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
  const apiUrl: string = API_ENDPOINTS.assessmentSearchStatus;
  try {
    const response = await post(apiUrl, body);
    return response?.data?.data;
  } catch (error) {
    console.error('error in getting Assessment Status Service list', error);

    return error;
  }
};

export const searchAssessment = async (body: ISearchAssessment) => {
  const apiUrl: string = API_ENDPOINTS.assessmentSearch;
  try {
    const response = await post(apiUrl, body);
    return response?.data?.data;
  } catch (error) {
    console.error('error in getting Assessment Status Service list', error);

    return error;
  }
};

export const getAssessmentTracking = async (params: ISearchAssessment) => {
  const apiUrl = API_ENDPOINTS.assessmentSearch;
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
  // const apiUrl = `https://e49a1216cbca.ngrok-free.app/interface/v1/tracking/assessment/offline-assessment-status`;
  try {
    const response = await post(apiUrl, data);
    // console.log('offline assessment status response', response?.data);
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

export const getOfflineAssessmentDetails = async ({
  filters,
}: GetDoIdServiceParam): Promise<any> => {
  const apiUrl = `${URL_CONFIG.API.COMPOSITE_SEARCH}`;

  // Build filters dynamically
  const requestFilters: any = {
    program: filters.program,
    board: filters.board,
    status: ['Live'],
    primaryCategory: ['Practice Question Set'],
  };

  // Optional filters
  if (filters.assessmentType) {
    requestFilters.assessmentType = filters.assessmentType;
  }

  if (filters.evaluationType) {
    requestFilters.evaluationType = filters.evaluationType;
  }

  if (filters.identifier) {
    requestFilters.identifier = filters.identifier;
  }

  const data = {
    request: {
      filters: requestFilters,
    },
  };

  try {
    const response1 = await post(apiUrl, data);

    // 🚀 If evaluationType is provided, return directly without extra API call
    if (filters.evaluationType) {
      return {
        result: {
          ...response1?.data?.result,
        },
        responseCode: response1?.data?.responseCode,
      };
    }

    // ✅ Default behavior (when evaluationType not provided)
    const response = await searchAiAssessment({
      question_set_id: response1?.data?.result?.QuestionSet?.map(
        (item: any) => item.identifier
      ),
    });

    const QuestionSet = response1?.data?.result?.QuestionSet?.filter(
      (item: any) =>
        response.data.find(
          (sub: any) => item.identifier === sub.question_set_id
        )
    );

    return {
      result: {
        ...response1?.data?.result,
        QuestionSet,
        count: QuestionSet.length,
      },
      responseCode: response1?.data?.responseCode,
    };
  } catch (error) {
    console.error('Error in getDoIdForAssessmentDetails Service', error);
    return error;
  }
};

export const createContentTracking = async ({
  userId,
  contentId,
  courseId,
  unitId,
  totalScore,
}: {
  userId: string;
  contentId: string;
  courseId: string;
  unitId: string;
  totalScore: number;
}) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/tracking/content/create`;
  
  const payload = {
    userId,
    contentId,
    courseId,
    unitId,
    contentType: "QUESTION_SET",
    contentMime: "application/vnd.sunbird.questionset",
    lastAccessOn: new Date().toISOString(),
    detailsObject: [
      {
        eid: "START",
        edata: {
          type: "content",
          mode: "play",
          pageid: "",
          duration: 10
        },
        identifier: contentId,
        contentType: "quml"
      },
      {
        eid: "END",
        edata: {
          type: "content",
          mode: "play",
          pageid: "sunbird-player-Endpage",
          summary: [
            {
              progress: 100
            },
            {
              totalNoofQuestions: 0
            },
            {
              visitedQuestions: 0
            },
            {
              endpageseen: true
            },
            {
              score: totalScore
            }
          ],
          duration: 10
        },
        identifier: contentId,
        contentType: "quml"
      }
    ]
  };

  try {
    const response = await post(apiUrl, payload);
    return response?.data;
  } catch (error) {
    console.error('Error in creating content tracking:', error);
    throw error;
  }
};

const API_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
export const hierarchyContent = async (content_do_id: string) => {
  // console.log({ content_do_id });
  const url = `${API_URL}/action/questionset/v2/hierarchy/` + content_do_id;

  let api_response = null;

  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: url,
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json',
    },
  };

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

// Fetches a single assessment attempt for a learner, used by the Assessments attempt-detail page
// (/assessments/user/[userId]/attempt/[assessmentTrackingId]/[assessmentId]).
// Ported from scp-teacher-repo; `contentId`, `courseId` and `unitId` all carry the assessment id,
// matching the shape the tracking search expects there.
export const getAssessmentAttemptDetails = async (
  userId: string,
  assessmentId: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.assessmentSearch;
  const data = {
    userId: userId,
    contentId: assessmentId,
    courseId: assessmentId,
    unitId: assessmentId,
  };

  try {
    const response = await post(apiUrl, data);
    return response?.data?.data;
  } catch (error) {
    console.error('Error in getAssessmentAttemptDetails Service', error);
    throw error;
  }
};

// Finds the parent Course for a set of assessment do_ids, by searching Courses whose `leafNodes`
// contain them. The Manual Assessment (Trainer) flow needs the owning course id (`parentId`) because
// the assessment-tracking calls key off course + unit, not the assessment id alone.
//
// Mirrors the Course lookup the existing volunteer manual-assessments flow performs, but lives here
// in the canonical service rather than the legacy AssesmentService/ directory.
export const getCoursesForAssessments = async (
  assessmentIds: string[],
  program: string | string[]
): Promise<any[]> => {
  if (!assessmentIds?.length) return [];

  const apiUrl = `${URL_CONFIG.API.COMPOSITE_SEARCH}`;
  const data = {
    request: {
      filters: {
        program,
        status: ['Live'],
        primaryCategory: ['Course'],
        leafNodes: assessmentIds,
      },
      fields: ['name', 'identifier', 'primaryCategory', 'children', 'leafNodes'],
    },
  };

  try {
    const response = await post(apiUrl, data);
    return response?.data?.result?.content || [];
  } catch (error) {
    console.error('Error in getCoursesForAssessments Service', error);
    return [];
  }
};
