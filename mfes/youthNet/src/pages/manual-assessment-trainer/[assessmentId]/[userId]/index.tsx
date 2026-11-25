// Answer-sheet review and marking for one learner on one manual (offline) assessment.
//
// Copied from the volunteer flow's equivalent page (src/pages/manual-assessments/[assessmentId]/
// [userId]) rather than re-ported from scp-teacher-repo: that file is the YouthNet-adapted version
// and already keys its tracking calls off `parentId`/`unitId`, which the Trainer list and detail
// pages now supply. The two are intentionally independent copies — the volunteer flow must not
// change when this one does (D1).
//
// Only difference from the source: this one is role-gated with withAccessControl.

import React, { useState, useEffect, useRef } from 'react';
import Header from '../../../../components/Header';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withAccessControl from '../../../../utils/hoc/withAccessControl';
import { accessControl } from '../../../../utils/app.config';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';
import { useRouter } from 'next/router';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import {
  getAssessmentDetails,
  getAssessmentTracking,
  getOfflineAssessmentStatus,
  updateAssessmentScore,
  hierarchyContent,
  searchAssessment,
  getAssessmentStatus,
} from '../../../../services/AssesmentService';
import {
  UploadOptionsPopup,
  UploadedImage,
} from '../../../../components/assessment';
import { getUserDetails } from '../../../../services/ProfileService';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Button from '@mui/material/Button';
import {
  getStatusIcon,
  getStatusLabel,
  mapAnswerSheetStatusToInternalStatus,
} from '../../../../components/assessment/manualAssessmentStatus';
import {
  createQuestionNumberingMap,
  createSectionMapping,
} from '../../../../utils/questionNumbering';
import AnswerSheet, {
  AssessmentTrackingData,
} from '../../../../components/assessment/AnswerSheet';
import MinimizeIcon from '@mui/icons-material/Minimize';
import { toPascalCase } from '../../../../utils/helper';
import UploadFiles from '../../../../components/UploadFiles/UploadFiles';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarksManualUpdate from '../../../../components/assessment/QuestionMarksManualUpdate';
import GenericModal from '../../../../components/GenericModal';
import { pdf } from '@react-pdf/renderer';
// @ts-expect-error - file-saver doesn't have TypeScript definitions
import { saveAs } from 'file-saver';
import ManualAssessmentResultPDF from '../../../../components/assessment/ManualAssessmentResultPDF';

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

interface OfflineAssessmentData {
  userId: string;
  status: 'AI Pending' | 'AI Processed' | 'Approved';
  fileUrls: string[];
  records: AssessmentRecord[];
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
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { assessmentId, userId, parentId, unitId } = router.query;

  // L2 / Vocational Training assessments are standalone question sets created in
  // the workspace with no parent course, so the list page has no parentId/unitId
  // to hand on. scp-teacher-repo hits exactly this case and keys every tracking
  // call off the question-set id; do the same, and keep using the real course +
  // unit when a course-based assessment does supply them.
  const effectiveParentId = (parentId as string) || (assessmentId as string);
  const effectiveUnitId = (unitId as string) || (assessmentId as string);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [editScore, setEditScore] = useState<string>('');
  const [editSuggestion, setEditSuggestion] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [assessmentTrackingData, setAssessmentTrackingData] =
    useState<AssessmentTrackingData | null>();
  const [assessmentStatusData, setAssessmentStatusData] = useState<any>([]);

  // Hierarchy data for question numbering
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [questionNumberingMap, setQuestionNumberingMap] = useState<
    Record<string, string>
  >({});
  const [sectionMapping, setSectionMapping] = useState<Record<string, string>>(
    {}
  );

  // Upload Options Popup state
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false);
  const [isReUploadMode, setIsReUploadMode] = useState(false);
  const [uploadViewerOpen, setUploadViewerOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<any>({
    name: '',
    lastName: '',
  });
  const [assessmentName, setAssessmentName] = useState<any>('');
  const [userAssessmentStatus, setUserAssessmentStatus] = useState<any>(null);

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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  // Upload Options Popup handlers
  const handleUploadInfoClick = () => {
    const hasImages =
      (assessmentData?.fileUrls?.length || 0) > 0 || uploadedImages.length > 0;
    if (hasImages) {
      setUploadViewerOpen(true);
      return;
    }
    setUploadPopupOpen(true);
  };

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

  const fetchOfflineAssessmentData = async (showSuccessMessage = false) => {
    try {
      const userData = await getOfflineAssessmentStatus({
        userIds: [userId as string],
        questionSetId: assessmentId as string,
        parentId: effectiveParentId,
      });

      if (userData?.result?.length > 0) {
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
              const userDataAssessmentStatus = await getAssessmentStatus({
                userId: [userId as string],
                courseId: [effectiveParentId],
                unitId: [effectiveUnitId],
                contentId: [assessmentId as string],
              });
              console.log('unitId>>>>>:', unitId);

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
                (total, detail) => total + detail.score,
                0
              );

              setAssessmentTrackingData(transformedData);
            } else {
              // Fallback to existing assessment tracking API call
              const response = await getAssessmentTracking({
                userId: userId as string,
                contentId: assessmentId as string,
                courseId: effectiveParentId,
                unitId: effectiveUnitId,
              });
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
  };

  useEffect(() => {
    const fetchUserAssessmentStatus = async () => {
      try {
        if (typeof userId !== 'string' || typeof assessmentId !== 'string') {
          return;
        }
        const statusResponse = await searchAssessment({
          userId: userId,
          courseId: effectiveParentId,
          unitId: effectiveUnitId,
          contentId: assessmentId,
        });
        setAssessmentStatusData(statusResponse[0]?.score_details || []);
        // console.log('statusResponse[0]?.assessments || []', statusResponse[0]?.score_details || []);
      } catch (error) {
        console.error('Failed to fetch assessment status:', error);
      }
    };
    fetchUserAssessmentStatus();
  }, [userId, assessmentId, effectiveUnitId, effectiveParentId]);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      if (assessmentId && userId) {
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
  }, [assessmentId, userId, effectiveUnitId, effectiveParentId]);

  const handleBack = () => {
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
          assessmentTrackingData.score_details.map((detail) => {
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
          (total, detail) => total + detail.score,
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
        (detail) => {
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
        (detail) => {
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

  const handleApproveClick = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!assessmentTrackingData) return;

    try {
      setEditLoading(true);

      // Create payload with all current scores including any edited ones from localStorage
      const updatedAssessmentSummary = assessmentTrackingData.score_details.map(
        (detail) => {
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
          (total, detail) => {
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
        courseId: effectiveParentId,
        unitId: effectiveUnitId,
      });

      if (response?.data?.length > 0) {
        setAssessmentTrackingData(response.data[0]);
      }

      setSnackbar({
        open: true,
        message: 'Assessment approved successfully',
        severity: 'success',
      });

      // Clear localStorage after approval
      assessmentTrackingData.score_details.forEach((detail) => {
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

  const handleDownloadPDF = async () => {
    if (!assessmentTrackingData || !assessmentName) {
      setSnackbar({
        open: true,
        message: 'Assessment data not available for download',
        severity: 'error',
      });
      return;
    }

    try {
      setIsDownloadingPDF(true);

      const userName = `${toPascalCase(userDetails?.name || '')} ${toPascalCase(
        userDetails?.lastName || ''
      )}`.trim();

      const blob = await pdf(
        <ManualAssessmentResultPDF
          assessmentTrackingData={assessmentTrackingData}
          userName={userName || 'Student'}
          assessmentName={toPascalCase(assessmentName)}
          questionNumberingMap={questionNumberingMap}
          sectionMapping={sectionMapping}
        />
      ).toBlob();

      const sanitizedUserName =
        (userName && userName.replace(/[^a-zA-Z0-9]/g, '_')) || 'Student';
      const sanitizedAssessmentName = toPascalCase(assessmentName).replace(
        /[^a-zA-Z0-9]/g,
        '_'
      );
      const filename = `Assessment_Result_${sanitizedUserName}_${sanitizedAssessmentName}_${new Date()
        .toISOString()
        .split('T')[0]}.pdf`;

      saveAs(blob, filename);
      setSnackbar({
        open: true,
        message: 'PDF downloaded successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate PDF. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsDownloadingPDF(false);
    }
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
        // _app.tsx paints every youthNet page on #F3F5F8; this screen is a white
        // marking sheet like its scp-teacher-repo counterpart, so it opts out
        // here rather than changing the app-wide shell.
        bgcolor: '#FFFFFF',
      }}
    >
      <Header />

      <Box
        component="header"
        sx={{
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          padding: { xs: '12px 12px 8px 4px', md: '16px 24px 12px 16px' },
          bgcolor: '#FFFFFF',
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            width: '48px',
            height: '48px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& .MuiSvgIcon-root': {
              color: '#4D4639',
              width: '24px',
              height: '24px',
            },
          }}
        >
          <KeyboardBackspaceOutlinedIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0 0',
            flex: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: '#4D4639',
              fontSize: { xs: '22px', md: '24px' },
              lineHeight: 1.27,
              fontWeight: 400,
            }}
          >
            {toPascalCase(userDetails?.name)}{' '}
            {toPascalCase(userDetails?.lastName)}
          </Typography>
          <Typography
            sx={{
              color: '#7C766F',
              fontSize: { xs: '14px', md: '16px' },
              lineHeight: 1.43,
              fontWeight: 500,
              letterSpacing: '0.71%',
            }}
          >
            {toPascalCase(assessmentName)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          mx: '16px',
          my: '16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Assessment Status & Actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {userAssessmentStatus ? (
              <>
                {getStatusIcon(
                  mapAnswerSheetStatusToInternalStatus(userAssessmentStatus)
                )}
                <Typography
                  sx={{
                    color: '#1F1B13',
                    fontSize: { xs: '14px', md: '16px' },
                    fontWeight: 400,
                  }}
                >
                  {getStatusLabel(userAssessmentStatus)}
                </Typography>
              </>
            ) : (
              <Typography
                sx={{
                  color: '#1F1B13',
                  fontSize: { xs: '14px', md: '16px' },
                  fontWeight: 400,
                }}
              >
                <MinimizeIcon />
                Not Submitted
              </Typography>
            )}
          </Box>

          {assessmentTrackingData &&
            (userAssessmentStatus === 'Completed' ||
              userAssessmentStatus === 'Approved' ||
              assessmentData?.status === 'Approved') && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPDF}
                disabled={isDownloadingPDF}
                sx={{
                  bgcolor: '#1A8825',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 2,
                  py: 1,
                  fontSize: '14px',
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: '#15701A',
                  },
                  '&:disabled': {
                    bgcolor: '#cccccc',
                    color: '#666666',
                  },
                }}
              >
                {isDownloadingPDF ? 'Preparing PDF...' : 'Download Result PDF'}
              </Button>
            )}
        </Box>

        {/* Two-column layout: Left - existing content, Right - question paper placeholder */}
        <Grid
          container
          spacing={2}
          sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <Grid item xs={12} md={12}>
            {/* Left column */}
            <>
              {/* Images Info */}
              <Box
                onClick={handleUploadInfoClick}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #DBDBDB',
                  borderRadius: '12px',
                  p: { xs: 2, md: 2 },
                  mb: { xs: 2, md: 1 },
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: '#f5f5f5',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Box
                  mb={0.1}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReUpload();
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 0.5, md: 1 },
                      flexWrap: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#635E57',
                        fontSize: { xs: '12px', md: '16px' },
                        fontWeight: 400,
                        letterSpacing: '0.1px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {assessmentData?.fileUrls &&
                      assessmentData.fileUrls.length > 0
                        ? `${assessmentData.fileUrls.length} ${
                            assessmentData.fileUrls.length === 1
                              ? 'image'
                              : 'images'
                          } uploaded`
                        : 'No images uploaded'}
                    </Typography>
                    {assessmentData?.fileUrls &&
                      assessmentData.fileUrls.length > 0 && (
                        <>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadInfoClick();
                            }}
                            sx={{
                              ml: 0,
                              textTransform: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: { xs: '12px', md: '14px' },
                              height: { xs: '28px', md: '32px' },
                              px: { xs: 1, md: 1.5 },
                              backgroundColor: '#FFC107',
                              color: '#1F1B13',
                              '&:hover': { backgroundColor: '#FFB300' },
                            }}
                          >
                            {t('ASSESSMENTS.VIEW')}
                          </Button>
                          {[
                            'AI Processed',
                            'Awaiting Your Approval',
                            'AI Pending',
                            'Approved',
                          ].includes(assessmentData?.status || '') && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(e) => {
                                // e.stopPropagation();
                                // handleReUpload();
                              }}
                              sx={{
                                ml: 0,
                                textTransform: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: { xs: '12px', md: '14px' },
                                height: { xs: '28px', md: '32px' },
                                px: { xs: 1, md: 1.5 },
                                backgroundColor: '#FFC107',
                                color: '#1F1B13',
                                '&:hover': { backgroundColor: '#FFB300' },
                              }}
                            >
                              {t('ASSESSMENTS.REUPLOAD')}
                            </Button>
                          )}
                        </>
                      )}
                  </Box>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReUpload();
                    }}
                    sx={{
                      color: '#1F1B13',
                      p: 0,
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: 22, md: 28 },
                      },
                      mb: 0,
                    }}
                  >
                    <FileUploadIcon />
                    {/* {!assessmentData?.status ? <FileUploadIcon /> : null} */}
                  </IconButton>
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
            </>
          </Grid>
          <Grid item xs={12} md={12}>
            {/* Right column - Question Paper placeholder */}
            <Box
              sx={{
                border: '1px solid #DBDBDB',
                borderRadius: '12px',
                p: { xs: 2, md: 2 },
                height: 'fit-content',
                position: 'static',
                bgcolor: '#FFFFFF',
              }}
            >
              {/* <Typography
                sx={{
                  color: '#635E57',
                  fontSize: { xs: '14px', md: '16px' },
                  fontWeight: 500,
                }}
              >
                Question Paper UI coming soon
              </Typography> */}
              <QuestionMarksManualUpdate
                assessmentDoId={assessmentId}
                userId={userId}
                assessmentStatusData={assessmentStatusData}
                parentId={effectiveParentId}
                unitId={effectiveUnitId}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

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
        parentId={effectiveParentId}
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
        customMaxImages={10}
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

export async function getStaticProps({
  params,
  locale,
}: {
  params: any;
  locale: string;
}) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withAccessControl(
  'accessAssessments',
  accessControl
)(AssessmentDetails);
