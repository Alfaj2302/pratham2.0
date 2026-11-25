'use client';
import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
// import Header from '../../../components/themantic/header/Header';
import {
  Box,
  Grid,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  Container,
} from '@mui/material';
import { useTranslation } from '@shared-lib';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import { useRouter, useSearchParams } from 'next/navigation';
import GenericModal from '../../components/GenericModal/GenericModal';
import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';

import {
  getAssessmentDetails,
  getAssessmentTracking,
  getOfflineAssessmentStatus,
  updateAssessmentScore,
  hierarchyContent,
  searchAssessment,
} from '../../utils/API/AssesmentService';
import {
  UploadOptionsPopup,
  UploadedImage,
} from '../../components/assessment';
import { getUserDetails } from '../../utils/API/ProfileService';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Button from '@mui/material/Button';
import {
  getStatusIcon,
  getStatusLabel,
  mapAnswerSheetStatusToInternalStatus,
} from './index';
import {
  createQuestionNumberingMap,
  createSectionMapping,
} from '../../utils/questionNumbering';
import {
  AssessmentTrackingData,
} from '../../components/assessment/AnswerSheet';
import MinimizeIcon from '@mui/icons-material/Minimize';
import { toPascalCase } from '../../utils/helper';
import UploadFiles from '../../components/UploadFiles/UploadFiles';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarksManualUpdate from '../../components/assessment/QuestionMarksManualUpdate';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
interface ScoreDetail {
  questionId: string | null;
  pass: string;
  sectionId: string;
  resValue: string;
  duration: number;
  score: number;
  maxScore: number;
  queTitle: string;
}

interface AssessmentSummaryItem {
  item: {
    id: string;
    title: string;
    type: string;
    maxscore: number;
  params: unknown[];
  sectionId: string;
  };
  index: number;
  pass: string;
  score: number;
    resvalues: Array<{
      label?: string;
      value: unknown;
      selected: boolean;
      AI_suggestion: string;
    }>;
  duration: number;
  sectionName: string;
}

interface AssessmentSection {
  sectionId: string;
  sectionName: string;
  data: AssessmentSummaryItem[];
}

interface UpdateAssessmentScorePayload {
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
  submitedBy?: string; // Optional field for evaluation source
}

interface AssessmentRecord {
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
        value: unknown;
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

interface OfflineAssessmentData {
  userId: string;
  status: 'AI Pending' | 'AI Processed' | 'Approved';
  fileUrls: string[];
  records: AssessmentRecord[];
  hasLongShortAnswers?: boolean;
  // Add other properties as needed based on API response
}

const stripHtmlTags = (html: string) => {
  return html.replace(/<[^>]*>/g, '');
};

// Safely format answer text from resValue for display (handles MCQ arrays and objects)
const formatAnswerForDisplay = (
  resValue: string | undefined | null
): string => {
  if (!resValue) return 'No answer provided';
  try {
    const parsed = JSON.parse(resValue);
    // If array of options (MCQ)
    if (Array.isArray(parsed)) {
      const selectedItem =
        parsed.find((i: any) => i && i.selected) || parsed[0];
      if (!selectedItem) return 'No answer provided';

      if (selectedItem.label !== undefined && selectedItem.label !== null) {
        if (Array.isArray(selectedItem.label)) {
          return selectedItem.label
            .map((l: any) =>
              typeof l === 'string'
                ? l.replace(/<[^>]*>/g, '').trim()
                : String(l)
            )
            .join(', ');
        }
        if (typeof selectedItem.label === 'string') {
          return selectedItem.label.replace(/<[^>]*>/g, '').trim();
        }
        return String(selectedItem.label);
      }

      if (selectedItem.value !== undefined && selectedItem.value !== null) {
        return Array.isArray(selectedItem.value)
          ? selectedItem.value.join(', ')
          : String(selectedItem.value);
      }

      return 'No answer provided';
    }

    // Object format
    if (parsed.label !== undefined && parsed.label !== null) {
      if (Array.isArray(parsed.label)) {
        return parsed.label
          .map((l: any) =>
            typeof l === 'string' ? l.replace(/<[^>]*>/g, '').trim() : String(l)
          )
          .join(', ');
      }
      if (typeof parsed.label === 'string') {
        return parsed.label.replace(/<[^>]*>/g, '').trim();
      }
      return String(parsed.label);
    }

    if (parsed.value !== undefined && parsed.value !== null) {
      return Array.isArray(parsed.value)
        ? parsed.value.join(', ')
        : String(parsed.value);
    }

    if (parsed.answer) return String(parsed.answer);
    if (parsed.response) return String(parsed.response);

    return 'No answer provided';
  } catch (e) {
    // Not JSON; return as-is
    return resValue;
  }
};

const AssessmentDetails = () => {
  console.log('🚀 AssessmentDetails component rendering');
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get parameters from URL search params
  const assessmentId = searchParams.get('assessmentId')
  const parentId = searchParams.get('parentId')
  const userId = searchParams.get('userId')
  const returnUrl = searchParams.get('returnUrl')
  // Vocational Training entry point (/assessment -> offline test card). It is a
  // standalone question set with no parent course, and the mobile app allows a
  // single submission only — so re-upload is withheld and the mobile file rules
  // apply. Every other caller of this page keeps its existing behaviour.
  const isVtFlow = searchParams.get('flow') === 'vt'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuestion] = useState<ScoreDetail | null>(null);
  const [editScore, setEditScore] = useState<string>('');
  const [editSuggestion, setEditSuggestion] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [assessmentTrackingData, setAssessmentTrackingData] =
    useState<AssessmentTrackingData | null>();
  const [assessmentStatusData, setAssessmentStatusData] = useState<ScoreDetail[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<string>('');

console.log('assessmentStatusData>>>>>:', assessmentStatusData);
  // Hierarchy data for question numbering
  const [, setHierarchyData] = useState<any>(null);
  const [, setQuestionNumberingMap] = useState<
    Record<string, string>
  >({});
  const [, setSectionMapping] = useState<Record<string, string>>(
    {}
  );

  // Upload Options Popup state
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false);
  const [isReUploadMode, setIsReUploadMode] = useState(false);
  const [uploadViewerOpen, setUploadViewerOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    name: string;
    lastName: string;
  }>({
    name: '',
    lastName: '',
  });
  const [assessmentName, setAssessmentName] = useState<string>('');
  const [userAssessmentStatus, setUserAssessmentStatus] = useState<string | null>(null);
  const [foundChild, setFoundChild] = useState<any>(undefined); // Course hierarchy child data

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Sample uploaded images data
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const previousUploadedImagesRef = useRef<UploadedImage[] | null>(null);
  // Upload Options Popup handlers

  const handleCloseUploadPopup = () => {
    // If re-upload was cancelled without submission, restore previous images
    if (isReUploadMode && previousUploadedImagesRef.current) {
      setUploadedImages(previousUploadedImagesRef.current);
      previousUploadedImagesRef.current = null;
    }
    setUploadPopupOpen(false);
    setIsReUploadMode(false);
  };

  // New handler for re-upload that clears existing images
  const handleReUpload = () => {
    // Clear the uploadedImages state to provide a fresh start
    previousUploadedImagesRef.current = uploadedImages;
    setUploadedImages([]);
    setIsReUploadMode(true);
    setUploadPopupOpen(true);
  };

  const handleImageUpload = (newImage: UploadedImage) => {
    setUploadedImages((prev) => [...prev, newImage]);

    // In re-upload mode, we don't update assessmentData immediately
    // We'll update it when the user clicks "Save and Upload"
    if (!isReUploadMode && assessmentData) {
      setAssessmentData({
        ...assessmentData,
        fileUrls: [...assessmentData.fileUrls, newImage.url],
      });
    }
  };

  const handleImageRemove = (imageId: string) => {
    // Remove from uploadedImages state
    const imageToRemove = uploadedImages.find((img) => img.id === imageId);
    if (imageToRemove) {
      setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));

      // Update assessmentData by removing the file URL
      if (assessmentData) {
        setAssessmentData({
          ...assessmentData,
          fileUrls: assessmentData.fileUrls.filter(
            (url) => url !== imageToRemove.url
          ),
        });
      }
    }
  };

  const [assessmentData, setAssessmentData] =
    useState<OfflineAssessmentData | null>(null);

  // Sync uploadedImages with assessmentData.fileUrls when data is loaded
  useEffect(() => {
    if (assessmentData?.fileUrls) {
      const imagesFromFileUrls = assessmentData.fileUrls.map((url, index) => ({
        id: `existing-${index}`,
        url: url,
        previewUrl: url,
        name: `uploaded-image-${index + 1}`,
        uploadedAt: new Date().toISOString(),
      }));
      setUploadedImages(imagesFromFileUrls);
    }
  }, [assessmentData]);

  const fetchOfflineAssessmentData = useCallback(async (showSuccessMessage = false) => {
    try {
      const userData = await getOfflineAssessmentStatus({
        userIds: [userId as string],
        questionSetId: assessmentId as string,
        parentId: parentId as string,
      });

      if (userData?.result?.length > 0) {
      //  console.log('userData>>>>>:', userData.result);
        setAssessmentStatus(userData.result[0].status);
        // Find the assessment data for the current user
        const currentUserData = userData.result.find(
          (item: OfflineAssessmentData) => item.userId === userId
        );
        if (currentUserData) {
          // Ensure fileUrls and records are arrays
          const sanitizedData: OfflineAssessmentData = {
            ...currentUserData,
            fileUrls: Array.isArray(currentUserData.fileUrls)
              ? currentUserData.fileUrls
              : [],
            records: Array.isArray(currentUserData.records)
              ? currentUserData.records
              : [],
          };
          setAssessmentData(sanitizedData);
          if (sanitizedData) {
            try {
              const userDataAssessmentStatus = await searchAssessment({
                userId: userId as string,
                courseId: parentId as string,
                unitId: foundChild?.parent ? foundChild.parent : (assessmentId as string),
                contentId: assessmentId as string,
              });
              console.log('🔍 searchAssessment payload - unitId:', foundChild?.parent ? foundChild.parent : assessmentId);
              // console.log('userData>>>>>:', userDataAssessmentStatus);

              // clone first element safely
              let status = userDataAssessmentStatus[0]?.status || "Not Started";

              // apply Image_Uploaded override
              if (
                sanitizedData?.fileUrls?.length > 0 &&
                status !== "Completed"
              ) {
                status = "Image_Uploaded";
              }

              // update state only once
              setUserAssessmentStatus(status);

            } catch (error) {
              console.error("Error fetching assessment status:", error);
              setUserAssessmentStatus("Not Started");
            }
          }


          if (showSuccessMessage) {
            setSnackbar({
              open: true,
              message: 'Assessment status updated successfully',
              severity: 'success',
            });
          }

          // Check if we should fetch assessment tracking data
          if (
            currentUserData.status &&
            currentUserData.status !== 'AI Pending'
          ) {
            // If status is AI Processed and we have records with evaluatedBy: "AI"
            if (
              currentUserData.status === 'AI Processed' &&
              currentUserData.records?.length > 0 &&
              currentUserData.records[0].evaluatedBy === 'AI'
            ) {
              // Get the latest record based on updatedOn timestamp
              const latestRecord = currentUserData.records.reduce(
                (latest: AssessmentRecord, current: AssessmentRecord) => {
                  const currentDate = new Date(current.updatedOn).getTime();
                  const latestDate = new Date(latest.updatedOn).getTime();
                  return currentDate > latestDate ? current : latest;
                },
                currentUserData.records[0]
              );

              // Transform the record into AssessmentTrackingData format
              const transformedData: AssessmentTrackingData = {
                assessmentTrackingId: latestRecord.assessmentTrackingId,
                userId: latestRecord.userId,
                courseId: latestRecord.courseId,
                contentId: latestRecord.contentId,
                attemptId: latestRecord.attemptId,
                createdOn: latestRecord.createdOn,
                lastAttemptedOn: latestRecord.lastAttemptedOn,
                updatedOn: latestRecord.updatedOn,
                timeSpent: latestRecord.timeSpent,
                totalMaxScore: latestRecord.totalMaxScore,
                totalScore: latestRecord.totalScore,
                unitId: latestRecord.unitId,
                score_details: latestRecord.assessmentSummary.flatMap(
                  (section: {
                    data: Array<{
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
                    }>;
                  }) =>
                    section.data.map(
                      (item: {
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
                      }) => {
                        // Check localStorage for edited score and suggestion
                        const savedData = localStorage.getItem(
                          `tracking_${userId}_${item.item.id}`
                        );
                        const savedScore = savedData
                          ? JSON.parse(savedData).score
                          : item.score;

                        // Update resValue with saved suggestion if available
                        const updatedResValue = { ...item.resvalues[0] };
                        if (savedData) {
                          const parsedSavedData = JSON.parse(savedData);
                          if (parsedSavedData.suggestion) {
                            updatedResValue.AI_suggestion =
                              parsedSavedData.suggestion;
                          }
                        }

                        return {
                          questionId: item.item.id,
                          pass: savedScore > 0 ? 'yes' : 'no',
                          sectionId: item.item.sectionId,
                          resValue: JSON.stringify(updatedResValue),
                          duration: item.duration,
                          score: savedScore,
                          maxScore: item.item.maxscore,
                          queTitle: stripHtmlTags(item.item.title),
                        };
                      }
                    )
                ),
              };

              // Recalculate total score based on localStorage values
              transformedData.totalScore = transformedData.score_details.reduce(
                (total: number, detail: ScoreDetail) => total + detail.score,
                0
              );

              setAssessmentTrackingData(transformedData);
            } else {
              // Fallback to existing assessment tracking API call
              const response = await getAssessmentTracking({
                userId: userId as string,
                contentId: assessmentId as string,
                courseId: parentId as string,
                unitId: foundChild?.parent ? foundChild.parent : [],
              });
              console.log('🔍 getAssessmentTracking payload - unitId:', foundChild?.parent ? foundChild.parent : assessmentId);
              if (response?.data?.length > 0) {
                // Find the latest assessment data by comparing timestamps
                const latestAssessment = response.data.reduce(
                  (
                    latest: AssessmentTrackingData,
                    current: AssessmentTrackingData
                  ) => {
                    const currentDate = Math.max(
                      new Date(current.createdOn).getTime(),
                      new Date(current.lastAttemptedOn).getTime(),
                      new Date(current.updatedOn).getTime()
                    );

                    const latestDate = Math.max(
                      new Date(latest.createdOn).getTime(),
                      new Date(latest.lastAttemptedOn).getTime(),
                      new Date(latest.updatedOn).getTime()
                    );

                    return currentDate > latestDate ? current : latest;
                  },
                  response.data[0]
                );

                // Check localStorage for any edited scores before setting the state
                if (latestAssessment.score_details) {
                  latestAssessment.score_details =
                    latestAssessment.score_details.map(
                      (detail: ScoreDetail) => {
                        const savedData = localStorage.getItem(
                          `tracking_${userId}_${detail.questionId}`
                        );
                        if (savedData) {
                          const parsedSavedData = JSON.parse(savedData);
                          const savedScore = parsedSavedData.score;

                          // Update resValue with saved suggestion if available
                          const updatedResValue = detail.resValue
                            ? JSON.parse(detail.resValue)
                            : {};
                          if (parsedSavedData.suggestion) {
                            updatedResValue.AI_suggestion =
                              parsedSavedData.suggestion;
                          }

                          return {
                            ...detail,
                            score: savedScore,
                            pass: savedScore > 0 ? 'yes' : 'no',
                            resValue: JSON.stringify(updatedResValue),
                          };
                        }
                        return detail;
                      }
                    );

                  // Recalculate total score
                  latestAssessment.totalScore =
                    latestAssessment.score_details.reduce(
                      (total: number, detail: ScoreDetail) =>
                        total + detail.score,
                      0
                    );
                }

                setAssessmentTrackingData(latestAssessment);
              }
            }
          }
        }
      } else {
        console.log('No offline assessment data found for user:', userId);
      }
    } catch (error) {
      console.error('Error fetching offline assessment data:', error);
      if (showSuccessMessage) {
        setSnackbar({
          open: true,
          message: 'Failed to refresh assessment status',
          severity: 'error',
        });
      }
      throw error;
    }
  }, [userId, assessmentId, parentId, foundChild]);

  useEffect(() => {
    const fetchUserAssessmentStatus = async () => {
      try {
        if (typeof userId !== 'string' || typeof assessmentId !== 'string' || typeof parentId !== 'string' || typeof foundChild !== 'object') {
          return;
        }
        const statusResponse = await searchAssessment({
          userId: userId,
          courseId: parentId as string,
          unitId: foundChild?.parent ? foundChild.parent : [],
          contentId: assessmentId,
        });
        setAssessmentStatusData(statusResponse[0]?.score_details || []);
        // console.log('statusResponse[0]?.assessments || []', statusResponse[0]?.score_details || []);
      } catch (error) {
        console.error('Failed to fetch assessment status:', error);
      }
    };
    fetchUserAssessmentStatus();
  }, [userId, assessmentId, parentId, foundChild]);

  // First useEffect: Fetch foundChild data
  useEffect(() => {
    console.log('🔄 First useEffect: Fetching course hierarchy');
    const fetchCourseHierarchy = async () => {
      if (assessmentId && parentId) {
        try {
          const courseResponse = await getAssessmentDetails(parentId as string);
          let tempFoundChild = null;

          for (const item of courseResponse?.children || []) {
            if (item.children && item.children.length > 0) {
              for (const child of item.children) {
                if (child.identifier === assessmentId) {
                  tempFoundChild = child;
                  break;
                }
              }
            }
            if (tempFoundChild) break; // stop after finding one
          }
          
          console.log('tempFoundChild:', tempFoundChild?.parent);
          console.log('Course Details Response:', courseResponse?.children);
          
          if (!tempFoundChild?.parent) {
            console.warn('⚠️ foundChild.parent not found, falling back to assessmentId as unitId');
          }
          
          console.log('Using unitId:', tempFoundChild?.parent ? tempFoundChild.parent : assessmentId);
          
          // Update the component state (null if not found, object if found)
          setFoundChild(tempFoundChild);
        } catch (error) {
          console.error('Error fetching course hierarchy:', error);
          setFoundChild(null);
        }
      } else if (!parentId) {
        // If no parentId, set foundChild to null to avoid waiting
        setFoundChild(null);
      }
    };

    fetchCourseHierarchy();
  }, [assessmentId, parentId]);

  // Second useEffect: Fetch assessment data after foundChild is determined
  useEffect(() => {
    console.log('🔄 Second useEffect: Fetching assessment data, foundChild:', foundChild?.parent);
    const fetchAssessmentData = async () => {
      if (assessmentId && userId && foundChild !== undefined) {
        try {
          if (assessmentId) {
            const response1 = await getAssessmentDetails(
              assessmentId as string
            );
            setAssessmentName(response1?.name);
          }
          if (userId) {
            const userDetailsResponse = await getUserDetails(
              userId as string,
              true
            );
            setUserDetails({
              name: userDetailsResponse?.result?.userData?.firstName,
              lastName: userDetailsResponse?.result?.userData?.lastName,
            });
          }

          // Fetch hierarchy data for question numbering
          if (assessmentId) {
            try {
              const hierarchyResponse = await hierarchyContent(
                assessmentId as string
              );
              if (hierarchyResponse) {
                setHierarchyData(hierarchyResponse);
                const numberingMap =
                  createQuestionNumberingMap(hierarchyResponse);
                const sectionMap = createSectionMapping(hierarchyResponse);
                setQuestionNumberingMap(numberingMap);
                setSectionMapping(sectionMap);
                console.log('Question numbering map created:', numberingMap);
                console.log('Section mapping created:', sectionMap);
              }
            } catch (error) {
              console.error('Error fetching hierarchy data:', error);
            }
          }

          await fetchOfflineAssessmentData(false);
        } catch (error) {
          console.error('Error fetching assessment data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAssessmentData();
  }, [assessmentId, userId, foundChild, fetchOfflineAssessmentData]);

  const handleBack = () => {
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    router.back();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSaveScore = async () => {
    if (!selectedQuestion || !assessmentTrackingData) return;

    // Validate that the score is not negative
    const scoreValue = Number(editScore);
    if (scoreValue < 0) {
      setSnackbar({
        open: true,
        message: 'Marks cannot be negative. Please enter a valid score.',
        severity: 'error',
      });
      return;
    }

    // Validate that the score doesn't exceed maximum marks
    if (scoreValue > selectedQuestion.maxScore) {
      setSnackbar({
        open: true,
        message: `Marks cannot exceed maximum marks (${selectedQuestion.maxScore}).`,
        severity: 'error',
      });
      return;
    }

    try {
      setEditLoading(true);

      // If status is AI Processed, only save to localStorage
      if (assessmentData?.status === 'AI Processed') {
        const resValue = selectedQuestion.resValue
          ? JSON.parse(selectedQuestion.resValue)
          : {};
        localStorage.setItem(
          `tracking_${userId}_${selectedQuestion.questionId}`,
          JSON.stringify({
            score: Number(editScore),
            suggestion: editSuggestion,
            answer: resValue.value || '',
            editedAt: new Date().toISOString(),
          })
        );

        // Update local state without API call
        const updatedLocalScoreDetails =
          assessmentTrackingData.score_details.map((detail: ScoreDetail) => {
            if (detail.questionId === selectedQuestion.questionId) {
              const updatedResValue = {
                ...JSON.parse(detail.resValue),
                AI_suggestion: editSuggestion,
              };
              return {
                ...detail,
                score: Number(editScore),
                pass: Number(editScore) > 0 ? 'yes' : 'no',
                resValue: JSON.stringify(updatedResValue),
              };
            }
            return detail;
          });

        // Calculate new total score by summing all scores
        const newTotalScore = updatedLocalScoreDetails.reduce(
          (total: number, detail: ScoreDetail) => total + detail.score,
          0
        );

        setAssessmentTrackingData({
          ...assessmentTrackingData,
          totalScore: newTotalScore,
          score_details: updatedLocalScoreDetails,
        });

        setSnackbar({
          open: true,
          message: 'Score and suggestion saved successfully',
          severity: 'success',
        });
        setIsEditModalOpen(false);
        return;
      }

      // For other statuses, proceed with API call
      const updatedAssessmentSummary = assessmentTrackingData.score_details.map(
        (detail: ScoreDetail) => {
          const resValue = detail.resValue ? JSON.parse(detail.resValue) : {};
          if (detail.questionId === selectedQuestion.questionId) {
            resValue.AI_suggestion = editSuggestion;
          }

          const section: AssessmentSection = {
            sectionId: detail.sectionId,
            sectionName: 'Section 1',
            data: [
              {
                item: {
                  id: detail.questionId || '',
                  title: stripHtmlTags(detail.queTitle),
                  type: 'sa',
                  maxscore: detail.maxScore,
                  params: [],
                  sectionId: detail.sectionId,
                },
                index: 1,
                pass:
                  detail.questionId === selectedQuestion.questionId
                    ? Number(editScore) > 0
                      ? 'yes'
                      : 'no'
                    : detail.pass,
                score:
                  detail.questionId === selectedQuestion.questionId
                    ? Number(editScore)
                    : detail.score,
                resvalues: [resValue],
                duration: detail.duration,
                sectionName: 'Section 1',
              },
            ],
          };
          return section;
        }
      );

      const payload: UpdateAssessmentScorePayload = {
        userId: assessmentTrackingData.userId,
        courseId: assessmentTrackingData.courseId,
        contentId: assessmentTrackingData.contentId,
        attemptId: assessmentTrackingData.attemptId,
        lastAttemptedOn: assessmentTrackingData.lastAttemptedOn,
        timeSpent: parseInt(assessmentTrackingData.timeSpent),
        totalMaxScore: assessmentTrackingData.totalMaxScore,
        totalScore:
          assessmentTrackingData.totalScore -
          selectedQuestion.score +
          Number(editScore),
        unitId: assessmentTrackingData.unitId,
        assessmentSummary: updatedAssessmentSummary,
      };

      await updateAssessmentScore(payload);

      // Update local state
      const updatedApiScoreDetails = assessmentTrackingData.score_details.map(
        (detail: ScoreDetail) => {
          if (detail === selectedQuestion) {
            return {
              ...detail,
              score: Number(editScore),
              pass: Number(editScore) > 0 ? 'yes' : 'no',
            };
          }
          return detail;
        }
      );

      setAssessmentTrackingData({
        ...assessmentTrackingData,
        totalScore: payload.totalScore,
        score_details: updatedApiScoreDetails,
      });

      setSnackbar({
        open: true,
        message: 'Score updated successfully',
        severity: 'success',
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating assessment score:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update score. Please try again.',
        severity: 'error',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // const handleApproveClick = () => {
  //   setIsConfirmModalOpen(true);
  // };

  const handleConfirmApprove = async () => {
    if (!assessmentTrackingData) return;

    try {
      setEditLoading(true);

      // Create payload with all current scores including any edited ones from localStorage
      const updatedAssessmentSummary = assessmentTrackingData.score_details.map(
        (detail: ScoreDetail) => {
          // Check if there's an edited score in localStorage
          const savedData = localStorage.getItem(
            `tracking_${userId}_${detail.questionId}`
          );
          const score = savedData ? JSON.parse(savedData).score : detail.score;

          const section: AssessmentSection = {
            sectionId: detail.sectionId,
            sectionName: 'Section 1',
            data: [
              {
                item: {
                  id: detail.questionId || '',
                  title: stripHtmlTags(detail.queTitle),
                  type: 'sa',
                  maxscore: detail.maxScore,
                  params: [],
                  sectionId: detail.sectionId,
                },
                index: 1,
                pass: Number(score) > 0 ? 'yes' : 'no',
                score: Number(score),
                resvalues: [JSON.parse(detail.resValue)],
                duration: detail.duration,
                sectionName: 'Section 1',
              },
            ],
          };
          return section;
        }
      );

      const payload: UpdateAssessmentScorePayload = {
        userId: assessmentTrackingData.userId,
        courseId: assessmentTrackingData.courseId,
        contentId: assessmentTrackingData.contentId,
        attemptId: assessmentTrackingData.attemptId,
        lastAttemptedOn: assessmentTrackingData.lastAttemptedOn,
        timeSpent: parseInt(assessmentTrackingData.timeSpent),
        totalMaxScore: assessmentTrackingData.totalMaxScore,
        totalScore: assessmentTrackingData.score_details.reduce(
          (total: number, detail: ScoreDetail) => {
            const savedData = localStorage.getItem(
              `tracking_${userId}_${detail.questionId}`
            );
            return (
              total + (savedData ? JSON.parse(savedData).score : detail.score)
            );
          },
          0
        ),
        unitId: assessmentTrackingData.unitId,
        assessmentSummary: updatedAssessmentSummary,
        submitedBy: 'Manual',
      };

      await updateAssessmentScore(payload);

      // After successful approval, fetch fresh data from tracking API
      const response = await getAssessmentTracking({
        userId: userId as string,
        contentId: assessmentId as string,
        courseId: parentId as string,
        unitId: foundChild?.parent ? foundChild.parent : [],
      });
      console.log('🔍 handleRefreshAssessmentData - unitId:', foundChild?.parent ? foundChild.parent : assessmentId);

      if (response?.data?.length > 0) {
        setAssessmentTrackingData(response.data[0]);
      }

      setSnackbar({
        open: true,
        message: 'Assessment approved successfully',
        severity: 'success',
      });

      // Clear localStorage after approval
      assessmentTrackingData.score_details.forEach((detail: ScoreDetail) => {
        localStorage.removeItem(`tracking_${userId}_${detail.questionId}`);
      });

      await handleRefreshAssessmentData();
      setIsConfirmModalOpen(false);
    } catch (error) {
      console.error('Error approving assessment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to approve assessment. Please try again.',
        severity: 'error',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleRefreshAssessmentData = async () => {
    await fetchOfflineAssessmentData(true);
  };
  const handleDownloadQuestionPaper = async () => {
    try {
     // setDownloading(true);
      // Simulate download delay
      /*await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create download link
      const element = document.createElement('a');
      element.href =
        'data:text/plain;charset=utf-8,' +
        encodeURIComponent('Sample Assessment Question Paper Content');
      element.download = `${
        assessmentData?.title?.replace(/\s+/g, '_').toLowerCase() ||
        'assessment'
      }.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);*/

      const downloadUrl =
        process.env.NEXT_PUBLIC_ADMIN_SBPLAYER?.replace('sbplayer', '') +
        '/qp?do_id=' +
        assessmentId;
      const newWindow = window.open(
        downloadUrl,
        '_blank',
        'noopener,noreferrer'
      );
      if (newWindow) newWindow.focus();

      showToastMessage(
        t('ASSESSMENTS.DOWNLOAD_SUCCESS') ||
        'Question paper downloaded successfully',
        'success'
      );
      //setShowDownloadPopup(false);
    } catch (error) {
      console.error('Error downloading question paper:', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
     // setDownloading(false);
    }
  };
  const handleSubmissionSuccess = async () => {
    if (isReUploadMode) {
      // In re-upload mode, update the assessmentData with the new uploaded images
      if (assessmentData && uploadedImages.length > 0) {
        const newFileUrls = uploadedImages.map((img) => img.url);
        setAssessmentData({
          ...assessmentData,
          fileUrls: newFileUrls,
        });
      }
      // Reset re-upload mode
      setIsReUploadMode(false);
      previousUploadedImagesRef.current = null;
    }
    await fetchOfflineAssessmentData(true);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #FFF8E1 0%, #F5F5F5 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 193, 7, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(26, 26, 26, 0.05) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      {/* <Header /> */}

      <Box
        component="header"
        sx={{
          width: '100%',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: { xs: '8px 16px 8px 8px', md: '10px 24px 10px 12px' },
          }}
        >
          <IconButton
            onClick={handleBack}
            sx={{
              width: '40px',
              height: '40px',
              backgroundColor: '#F5F5F5',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#FFC107',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(255,193,7,0.3)',
                '& .MuiSvgIcon-root': {
                  color: '#1A1A1A',
                },
              },
              '& .MuiSvgIcon-root': {
                color: '#424242',
                width: '20px',
                height: '20px',
              },
            }}
          >
            <KeyboardBackspaceOutlinedIcon />
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0 0 0 16px',
              flex: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                color: '#1A1A1A',
                fontSize: { xs: '18px', md: '20px' },
                lineHeight: 1.3,
                fontWeight: 600,
                mb: 0.25,
              }}
            >
              {toPascalCase(userDetails?.name)}{' '}
              {toPascalCase(userDetails?.lastName)}
            </Typography>
            <Typography
              sx={{
                color: '#666666',
                fontSize: { xs: '14px', md: '15px' },
                lineHeight: 1.4,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#FFC107',
                  boxShadow: '0 0 4px rgba(255,193,7,0.6)',
                }}
              />
              {toPascalCase(assessmentName)}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1, md: 2 },
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Professional Status Card */}
        {/* <Box
          sx={{
            background: 'linear-gradient(135deg, #FFFDE7 0%, #FFF8E1 100%)',
            borderRadius: '12px',
            p: { xs: 1, md: 1.25 },
            mb: { xs: 1, md: 1.5 },
            border: '1px solid rgba(255,193,7,0.3)',
            boxShadow: '0 2px 8px rgba(255,193,7,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: userAssessmentStatus === 'Completed'
                  ? 'linear-gradient(135deg, #FFC107, #FFB300)'
                  : userAssessmentStatus === 'Image_Uploaded'
                  ? 'linear-gradient(135deg, #FFC107, #FF9800)'
                  : 'linear-gradient(135deg, #424242, #1A1A1A)',
                boxShadow: '0 1px 4px rgba(255,193,7,0.2)',
              }}
            >
              {userAssessmentStatus ? (
                React.cloneElement(getStatusIcon(
                  mapAnswerSheetStatusToInternalStatus(userAssessmentStatus)
                ), { 
                  sx: { 
                    color: '#FFFFFF', 
                    fontSize: '16px',
                  } 
                })
              ) : (
                <MinimizeIcon sx={{ color: '#FFFFFF', fontSize: '16px' }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  color: '#1A202C',
                  fontSize: { xs: '14px', md: '16px' },
                  fontWeight: 600,
                  mb: 0.1,
                }}
              >
                Assessment Status
              </Typography>
              <Typography
                sx={{
                  color: '#4A5568',
                  fontSize: { xs: '12px', md: '13px' },
                  fontWeight: 500,
                }}
              >
                {userAssessmentStatus ? getStatusLabel(userAssessmentStatus) : 'Not Submitted'}
              </Typography>
            </Box>
          
          </Box>
        </Box> */}

        {/* Main content layout */}
        <Grid
          container
          spacing={{ xs: 2, md: 3 }}
          sx={{ 
            flex: 1, 
            minHeight: 0, 
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <Grid item xs={12}>
            {/* Main content section */}
            <Box sx={{ width: '100%', maxWidth: '100%' }}>
              {/* Professional Image Upload Card */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fffef7 100%)',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  borderRadius: '24px',
                  p: { xs: 3, md: 4 },
                  mb: 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 40px rgba(255,193,7,0.08)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    position: 'relative',
                    zIndex: 1,
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    overflow: { xs: 'visible', md: 'visible' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1.5, md: 2 },
                    }}
                  >
                    {/* Status Icon */}
                    <Box
                      sx={{
                        width: { xs: '48px', md: '52px' },
                        height: { xs: '48px', md: '52px' },
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: (assessmentData?.fileUrls?.length || 0) > 0
                          ? 'linear-gradient(135deg, #FFC107, #FFB300)'
                          : 'linear-gradient(135deg, #FFFDE7, #FFF8E1)',
                        boxShadow: '0 4px 16px rgba(255,193,7,0.15)',
                        border: (assessmentData?.fileUrls?.length || 0) > 0 ? 'none' : '2px solid rgba(255,193,7,0.3)',
                      }}
                    >
                      <FileUploadIcon 
                        sx={{ 
                          color: (assessmentData?.fileUrls?.length || 0) > 0 ? '#FFFFFF' : '#FFC107', 
                          fontSize: { xs: '24px', md: '26px' },
                        }} 
                      />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          color: '#1A202C',
                          fontSize: { xs: '16px', md: '18px' },
                          fontWeight: 600,
                          mb: 0.25,
                        }}
                      >
                        Assessment Images
                      </Typography>
                      <Typography
                        sx={{
                          color: '#4A5568',
                          fontSize: { xs: '13px', md: '14px' },
                          fontWeight: 500,
                          mb: 1.5,
                        }}
                      >
                        {assessmentData?.fileUrls &&
                        assessmentData.fileUrls.length > 0
                          ? `${assessmentData.fileUrls.length} ${
                              assessmentData.fileUrls.length === 1
                                ? 'image'
                                : 'images'
                            } uploaded successfully`
                          : 'Upload your assessment images using the button below'}
                      </Typography>

                      {/* Action Buttons */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        {assessmentData?.fileUrls &&
                        assessmentData.fileUrls.length > 0 ? (
                          <>
                            <Button
                              variant="contained"
                              onClick={() => setUploadViewerOpen(true)}
                              sx={{
                                textTransform: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: { xs: '12px', md: '13px' },
                                px: { xs: 1.5, md: 2 },
                                py: { xs: 0.5, md: 0.75 },
                                background: 'linear-gradient(135deg, #FFC107, #FFB300)',
                                color: '#1A1A1A',
                                boxShadow: '0 2px 8px rgba(255, 193, 7, 0.25)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #FFB300, #FF9800)',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.35)',
                                },
                              }}
                            >
                              View Images
                            </Button>
                            {!isVtFlow &&
                              [
                                'AI Processed',
                                'Awaiting Your Approval',
                                'AI Pending',
                                'Approved',
                              ].includes(assessmentData?.status || '') && (
                              <Button
                                variant="outlined"
                                onClick={handleReUpload}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  fontSize: { xs: '12px', md: '13px' },
                                  px: { xs: 1.5, md: 2 },
                                  py: { xs: 0.5, md: 0.75 },
                                  borderColor: 'rgba(255, 193, 7, 0.4)',
                                  color: '#1A1A1A',
                                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                  '&:hover': {
                                    borderColor: '#FFC107',
                                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                    transform: 'translateY(-1px)',
                                  },
                                }}
                              >
                                Re-upload
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => setUploadPopupOpen(true)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: '10px',
                              fontWeight: 600,
                              fontSize: { xs: '12px', md: '13px' },
                              px: { xs: 1.5, md: 2 },
                              py: { xs: 0.5, md: 0.75 },
                              background: 'linear-gradient(135deg, #FFC107, #FFB300)',
                              color: '#1A1A1A',
                              boxShadow: '0 2px 8px rgba(255, 193, 7, 0.25)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #FFB300, #FF9800)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.35)',
                              },
                            }}
                          >
                            Upload Images
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Download Question Paper Button */}
                  <Box
                    onClick={handleDownloadQuestionPaper}
                    sx={{
                      backgroundColor: '#ECE6F0',
                      borderRadius: { xs: '12px', md: '24px 24px 24px 24px' },
                      p: { xs: 1.5, md: 2 },
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      mt: { xs: 2, md: 0 },

                      ml: { xs: 1.5, md: '30px' },
                      mr: { xs: 0, md: 0 },
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: { xs: 0.5, md: 1.5 },
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: { xs: '1px solid rgba(236, 230, 240, 0.6)', md: '1px solid rgba(236, 230, 240, 0.6)' },
                      borderLeft: { xs: '1px solid rgba(236, 230, 240, 0.6)', md: 'none' },
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      boxShadow: '0 4px 16px rgba(236, 230, 240, 0.4)',
                      flexShrink: { xs: 1, md: 0 },
                      minWidth: { xs: 0, md: 'auto' },
                      maxWidth: { xs: '100%', md: 'none' },
                      width: { xs: 'auto', md: 'auto' },
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(236, 230, 240, 0.5)',
                      },
                    }}
                  >
                    {/* Icons wrapper - only on mobile */}
                    <Box
                      sx={{
                        display: { xs: 'flex', md: 'contents' },
                        alignItems: 'center',
                        gap: { xs: 0.5, md: 0 },
                      }}
                    >
                      <PictureAsPdfIcon
                        sx={{ 
                          color: '#D32F2F', 
                          fontSize: { xs: '20px', md: '24px' },
                        }}
                      />
                      <DownloadIcon
                        sx={{
                          color: '#666666',
                          fontSize: { xs: '18px', md: '20px' },
                          display: { xs: 'block', md: 'none' },
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        color: '#1A1A1A',
                        fontSize: { xs: '11px', md: '14px' },
                        fontWeight: 500,
                        textAlign: 'center',
                        whiteSpace: { xs: 'normal', md: 'nowrap' },
                        lineHeight: { xs: 1.2, md: 1.5 },
                        wordBreak: { xs: 'break-word', md: 'normal' },
                        overflowWrap: { xs: 'break-word', md: 'normal' },
                        maxWidth: { xs: '100%', md: 'none' },
                      }}
                    >
                      Download Question Paper.pdf
                    </Typography>
                    {/* Download icon for desktop only */}
                    <DownloadIcon
                      sx={{
                        color: '#666666',
                        fontSize: { xs: '18px', md: '20px' },
                        display: { xs: 'none', md: 'block' },
                      }}
                    />
                  </Box>
                </Box>

                {/* Main content */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {!assessmentTrackingData ? (
                    assessmentData?.status === 'AI Pending' ||
                      assessmentData?.status === 'Approved' ? null : (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: 0,
                        }}
                      >
                        <Typography>
                          No answer sheet has been submitted yet
                        </Typography>
                      </Box>
                    )
                  ) : null}
                </Box>
              </Box>

                {/* Professional Manual Assessment Section */}
                {assessmentStatus === 'Approved' && (
                  <Box
                    sx={{
                      mt: { xs: 3, md: 4 },
                      background: 'linear-gradient(135deg, #ffffff 0%, #fffef7 100%)',
                      border: '1px solid rgba(255, 193, 7, 0.2)',
                      borderRadius: '24px',
                      p: { xs: 3, md: 4 },
                      boxShadow: '0 10px 40px rgba(255,193,7,0.08)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #FFC107, #FFB300)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#1A202C',
                        fontSize: { xs: '20px', md: '24px' },
                        fontWeight: 700,
                        mb: { xs: 2, md: 3 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#FFC107',
                          boxShadow: '0 0 12px rgba(255,193,7,0.8)',
                        }}
                      />
                      Manual Assessment Review
                    </Typography>
                    <QuestionMarksManualUpdate
                      assessmentDoId={assessmentId}
                      userId={userId}
                      assessmentStatusData={assessmentStatusData}
                    />
                  </Box>
                )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Edit Modal */}
      <GenericModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Marks"
        onSave={handleSaveScore}
        maxWidth={{ xs: '90%', sm: '90%', md: '80%', lg: '80%', xl: '80%' }}
      >
        <Box sx={{ width: '100%', position: 'relative' }}>
          {selectedQuestion && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Answer:{' '}
                {selectedQuestion.resValue
                  ? formatAnswerForDisplay(selectedQuestion.resValue)
                  : 'No answer provided'}
              </Typography>
              <TextField
                label="Suggestion"
                multiline
                rows={4}
                value={editSuggestion}
                onChange={(e) => setEditSuggestion(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                disabled={editLoading || assessmentData?.status === 'Approved'}
              />
              <TextField
                label="Marks"
                type="number"
                value={editScore}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = Number(value);
                  if (
                    selectedQuestion &&
                    numValue <= selectedQuestion.maxScore
                  ) {
                    setEditScore(value);
                  }
                }}
                fullWidth
                required
                inputProps={{
                  min: 0,
                  max: selectedQuestion?.maxScore || 0,
                }}
                helperText={
                  Number(editScore) < 0
                    ? 'Negative marks are not allowed'
                    : `Maximum marks: ${selectedQuestion?.maxScore || 0}`
                }
                error={Number(editScore) < 0}
                disabled={editLoading || assessmentData?.status === 'Approved'}
              />
            </>
          )}
          {editLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </GenericModal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        buttonNames={{ primary: 'Approve', secondary: 'Cancel' }}
        modalOpen={isConfirmModalOpen}
        handleCloseModal={() => setIsConfirmModalOpen(false)}
        handleAction={handleConfirmApprove}
        // title="Are you sure you want to approve Marks?"
        message="Be sure to review the answers and make any necessary changes to the marks before approving the final scores."
      />
      {/* Upload Files Viewer Popup */}
      <Dialog
        open={uploadViewerOpen}
        onClose={() => setUploadViewerOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { height: { xs: '80vh', md: '80vh' } } }}
      >
        <DialogContent sx={{ p: 0, height: { xs: '80vh', md: '80vh' } }}>
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <IconButton
              aria-label="Close"
              onClick={() => setUploadViewerOpen(false)}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            <Box sx={{ width: '100%', height: '100%', pt: 6 }}>
              <UploadFiles
                images={uploadedImages.map((img) => ({
                  id: img.id,
                  url: img.url,
                  name: img.name,
                }))}
              />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Upload Options Popup */}
      <UploadOptionsPopup
        isOpen={uploadPopupOpen}
        onClose={handleCloseUploadPopup}
        uploadedImages={uploadedImages}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        userId={typeof userId === 'string' ? userId : undefined}
        questionSetId={
          typeof assessmentId === 'string' ? assessmentId : undefined
        }
        identifier={typeof assessmentId === 'string' ? assessmentId : undefined}
        onSubmissionSuccess={handleSubmissionSuccess}
        isReUploadMode={isReUploadMode}
        setAssessmentTrackingData={setAssessmentTrackingData}
        parentId={parentId as string}
        customMaxImages={isVtFlow ? null : 10}
        maxFileSizeMb={isVtFlow ? 10 : 5}
        recommendedMaxImages={isVtFlow ? 20 : null}
        formatHintKey={
          isVtFlow
            ? 'LEARNER_APP.VT_ASSESSMENT.FORMAT_JPG_SIZE_10MB_UP_TO_20_IMAGES'
            : 'AI.FORMAT_JPG_SIZE_5MB_UP_TO_4_IMAGES'
        }
        showResubmitWarning={isVtFlow}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}

// export async function getStaticProps({
//   locale,
// }: {
//   params: { assessmentId: string; userId: string };
//   locale: string;
// }) {
//   return {
//     props: {
//       ...(await serverSideTranslations(locale, ['common'])),
//     },
//   };
// }

// Wrapper component with Suspense boundary
const AssessmentDetailsWithSuspense = () => {
  return (
    <Suspense fallback={
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    }>
      <AssessmentDetails />
    </Suspense>
  );
};

export default AssessmentDetailsWithSuspense;
