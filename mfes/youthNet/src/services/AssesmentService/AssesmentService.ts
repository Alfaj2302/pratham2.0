// LEGACY — volunteer / village Manual Assessment flow only (`src/pages/manual-assessments`).
//
// This file overlaps with `src/services/AssesmentService.ts` (the flat one), which exports its own
// `searchAiAssessment` and `getOfflineAssessmentDetails`. The flat file is the canonical assessment
// service: new code — including the Assessments and Manual Assessment (Trainer) flows — must import
// from `services/AssesmentService`, not from this directory.

import { post } from '@shared-lib';
import {
  GetDoIdServiceParam,
  CompositeSearchParam
} from '../../utils/Interfaces';
import { URL_CONFIG } from "../../utils/url.config";

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

export const getCourses = async ({
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

export const compositeSearch = async ({
  filters,
  fields = []
}: CompositeSearchParam): Promise<any> => {
  const apiUrl = `${URL_CONFIG.API.COMPOSITE_SEARCH}`;

  // Build the request payload
  const data = {
    request: {
      filters: filters,
      ...(fields.length > 0 && { fields: fields })
    }
  };

  try {
    const response = await post(apiUrl, data);
    return {
      result: response?.data?.result,
      responseCode: response?.data?.responseCode,
    };
  } catch (error) {
    console.error('Error in compositeSearch Service:', error);
    throw error;
  }
};


