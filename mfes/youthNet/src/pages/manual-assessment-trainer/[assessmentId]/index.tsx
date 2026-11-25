import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GetStaticPaths } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import NoDataFound from '../../../components/common/NoDataFound';
import Header from '../../../components/Header';
import Loader from '../../../components/Loader';
import { showToastMessage } from '../../../components/Toastify';
import { useDirection } from '../../../hooks/useDirection';
import {
  getAssessmentDetails,
  getAssessmentStatus,
  getOfflineAssessmentStatus,
} from '../../../services/AssesmentService';
import { getBatchLearners } from '../../../services/myTeachingCenter/LearnerListService';
import { accessControl, AttendanceAPILimit } from '../../../utils/app.config';
import { toPascalCase } from '../../../utils/helper';
import withAccessControl from '../../../utils/hoc/withAccessControl';

// Learner list for one manual (offline) assessment.
// Ported from scp-teacher-repo, minus its console instrumentation and mock-data fallback: when the
// metadata call fails this surfaces the error rather than rendering invented questions/scores.

type AnswerSheetStatus = 'Not_Started' | 'Image_Uploaded' | 'Completed';

// scp-teacher-repo folds status filtering and sorting into one `sortOption`
// surfaced by a single "Sort & Filter" dialog, rather than separate chips and a
// sort dropdown. Matching its UI means matching that model.
type TabKey = 'all' | 'awaiting_approval' | 'marks_approved' | 'not_submitted';

type SortOption =
  | 'all'
  | 'completed'
  | 'awaiting_approval'
  | 'not_started'
  | 'name_asc'
  | 'name_desc'
  | 'score_desc'
  | 'score_asc';

// Which status filter (if any) each option implies; sort-only options filter nothing.
const STATUS_FILTER_FOR_OPTION: Partial<Record<SortOption, TabKey>> = {
  completed: 'marks_approved',
  awaiting_approval: 'awaiting_approval',
  not_started: 'not_submitted',
};

interface LearnerRow {
  userId: string;
  name: string;
  username: string;
  answerSheetStatus: AnswerSheetStatus;
  score: number;
  maxScore: number;
}


const statusForTab = (status: AnswerSheetStatus): TabKey => {
  if (status === 'Completed') return 'marks_approved';
  if (status === 'Image_Uploaded') return 'awaiting_approval';
  return 'not_submitted';
};

const ManualAssessmentLearners = () => {
  const theme = useTheme<any>();
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { assessmentId, cohortId, subject, parentId } = router.query;

  const [assessmentTitle, setAssessmentTitle] = useState<string>('');
  const [maxScore, setMaxScore] = useState<number>(0);
  // The unit (sub-collection) inside the parent Course that actually holds this assessment.
  // Tracking calls key off course + unit, so the learner page needs it alongside parentId.
  const [unitId, setUnitId] = useState<string>('');
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('all');
  const [pendingSortOption, setPendingSortOption] = useState<SortOption>('all');
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Assessment metadata.
  useEffect(() => {
    const fetchAssessmentData = async () => {
      if (!assessmentId) return;
      try {
        const response = await getAssessmentDetails(assessmentId as string);
        if (response) {
          setAssessmentTitle(
            response.name || response.title || (subject as string) || ''
          );
          setMaxScore(response.maxScore || response.maxMarks || 0);
        }

        // Walk the parent Course's hierarchy to find the unit holding this assessment.
        // Falls back to the assessment id itself, matching the existing volunteer flow.
        if (parentId) {
          const courseResponse = await getAssessmentDetails(parentId as string);
          let foundChild: any = null;
          for (const item of courseResponse?.children || []) {
            for (const child of item?.children || []) {
              if (child.identifier === assessmentId) {
                foundChild = child;
                break;
              }
            }
            if (foundChild) break;
          }
          setUnitId(foundChild?.parent || (assessmentId as string));
        } else {
          setUnitId(assessmentId as string);
        }
      } catch (error) {
        console.error('Error fetching assessment details:', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }
    };

    fetchAssessmentData();
  }, [assessmentId, parentId]);

  // Learners plus their upload/approval state.
  useEffect(() => {
    const fetchLearnerData = async () => {
      if (!assessmentId || !cohortId) return;

      setLoading(true);
      try {
        // getBatchLearners, not getMyCohortMemberList + a `status === 'active'` filter: in the
        // YouthNet Trainer context cohortmember/list's `status` carries the learner-progress enum
        // (in_training / course_completed / placed / retention_complete / dropout), so nothing is
        // ever 'active' here and that filter silently removed every learner.
        const { userDetails: activeUsers } = await getBatchLearners({
          batchCohortId: cohortId as string,
          limit: AttendanceAPILimit,
          offset: 0,
        });

        if (!activeUsers.length) {
          setLearners([]);
          return;
        }

        const userIds = activeUsers.map((user: any) => user.userId);

        const [uploadFlags, markStatuses] = await Promise.all([
          getOfflineAssessmentStatus({
            userIds,
            questionSetId: assessmentId as string,
          }),
          getAssessmentStatus({
            userId: userIds,
            courseId: [assessmentId as string],
            unitId: [assessmentId as string],
            contentId: [assessmentId as string],
          }),
        ]);

        // userId -> whether that learner has at least one uploaded answer-sheet image.
        const hasUploadByUserId = new Map<string, boolean>(
          (uploadFlags?.result || []).map((row: any) => [
            row?.userId,
            Array.isArray(row?.fileUrls) && row.fileUrls.length > 0,
          ])
        );

        const rows: LearnerRow[] = activeUsers.map((user: any) => {
          const marks = Array.isArray(markStatuses)
            ? markStatuses.find((entry: any) => entry.userId === user.userId)
            : undefined;

          const isApproved = marks?.status === 'Completed';
          const hasUpload = Boolean(hasUploadByUserId.get(user.userId));

          let answerSheetStatus: AnswerSheetStatus = 'Not_Started';
          if (isApproved) {
            answerSheetStatus = 'Completed';
          } else if (hasUpload) {
            answerSheetStatus = 'Image_Uploaded';
          }

          const name =
            [user.firstName, user.middleName, user.lastName]
              .filter(Boolean)
              .map((part: string) => toPascalCase(part))
              .join(' ') ||
            user.username ||
            '';

          return {
            userId: user.userId,
            name,
            // Blank when `name` already fell back to the username, so the card
            // never prints the same string twice.
            username: user.username && user.username !== name ? user.username : '',
            answerSheetStatus,
            score: Number(marks?.totalScore ?? 0),
            maxScore: Number(marks?.totalMaxScore ?? 0),
          };
        });

        setLearners(rows);
      } catch (error) {
        console.error('Error fetching learner data:', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        setLearners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLearnerData();
  }, [assessmentId, cohortId]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: learners.length,
      awaiting_approval: 0,
      marks_approved: 0,
      not_submitted: 0,
    };
    learners.forEach((learner) => {
      counts[statusForTab(learner.answerSheetStatus)] += 1;
    });
    return counts;
  }, [learners]);

  // The three summary cards above the list, in scp's order.
  const statusCounts = useMemo(
    () => [
      { count: tabCounts.not_submitted, label: t('AI.NOT_SUBMITTED') },
      { count: tabCounts.awaiting_approval, label: t('ASSESSMENTS.IMAGE_UPLOADED') },
      { count: tabCounts.marks_approved, label: t('AI.MARKS_APPROVED') },
    ],
    [tabCounts, t]
  );

  const getSortButtonText = () => {
    switch (sortOption) {
      case 'completed':
        return t('AI.MARKS_APPROVED');
      case 'awaiting_approval':
        return t('ASSESSMENTS.IMAGE_UPLOADED');
      case 'not_started':
        return t('AI.NOT_SUBMITTED');
      case 'name_asc':
        return t('AI.NAME_A_TO_Z');
      case 'name_desc':
        return t('AI.NAME_Z_TO_A');
      case 'score_desc':
        return t('AI.SCORE_HIGH_TO_LOW');
      case 'score_asc':
        return t('AI.SCORE_LOW_TO_HIGH');
      default:
        return t('AI.ALL_LEARNERS');
    }
  };

  const visibleLearners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const statusFilter = STATUS_FILTER_FOR_OPTION[sortOption];

    const filtered = learners.filter((learner) => {
      if (statusFilter && statusForTab(learner.answerSheetStatus) !== statusFilter) {
        return false;
      }
      if (!term) return true;
      return learner.name.toLowerCase().includes(term);
    });

    const sorted = [...filtered];
    switch (sortOption) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      // Learners with no score sort last in both directions, so an unmarked learner never
      // displaces a marked one at the top of the list.
      case 'score_desc':
        sorted.sort((a, b) => b.score - a.score);
        break;
      case 'score_asc':
        sorted.sort((a, b) => {
          if (a.maxScore === 0 && b.maxScore === 0) return 0;
          if (a.maxScore === 0) return 1;
          if (b.maxScore === 0) return -1;
          return a.score - b.score;
        });
        break;
    }
    return sorted;
  }, [learners, searchTerm, sortOption]);

  const getStatusIcon = (status: AnswerSheetStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 24 }} />;
      case 'Image_Uploaded':
        return <ErrorIcon sx={{ color: '#2196F3', fontSize: 24 }} />;
      default:
        return <RemoveIcon sx={{ color: '#9E9E9E', fontSize: 24 }} />;
    }
  };

  const handleDownloadQuestionPaper = () => {
    try {
      setDownloading(true);

      const playerUrl = process.env.NEXT_PUBLIC_ADMIN_SBPLAYER;
      if (!playerUrl || !assessmentId) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        return;
      }

      const baseUrl = playerUrl.replace('sbplayer', '');
      const newWindow = window.open(
        `${baseUrl}/qp?do_id=${assessmentId}`,
        '_blank',
        'noopener,noreferrer'
      );
      if (newWindow) newWindow.focus();

      showToastMessage(t('ASSESSMENTS.DOWNLOAD_SUCCESS'), 'success');
    } catch (error) {
      console.error('Error downloading question paper:', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleLearnerClick = (learnerId: string) => {
    router.push({
      pathname: `/manual-assessment-trainer/${assessmentId}/${learnerId}`,
      query: {
        cohortId: cohortId as string,
        ...(parentId ? { parentId: parentId as string } : {}),
        ...(unitId ? { unitId } : {}),
      },
    });
  };

  return (
    <>
      <Header />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: theme.palette.warning['A200'],
          padding: '15px 20px 5px',
          cursor: 'pointer',
        }}
        width={'100%'}
        onClick={() => router.back()}
      >
        <KeyboardBackspaceOutlinedIcon
          sx={{
            color: theme.palette.warning['A200'],
            transform: isRTL ? 'rotate(180deg)' : 'unset',
          }}
        />
        <Typography fontSize={'22px'} m={'1rem'}>
          {assessmentTitle || (subject as string)}
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, mb: 2, gap: 2, display: 'flex', flexDirection: 'column' }}>
        <TextField
          placeholder={t('ASSESSMENTS.SEARCH_LEARNER')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          size="small"
          sx={{
            backgroundColor: '#EDEDED',
            borderRadius: '24px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              '& fieldset': { borderColor: '#D0C5B4' },
              '&:hover fieldset': { borderColor: '#4D4639' },
              '&.Mui-focused fieldset': { borderColor: '#4D4639' },
            },
            '& .MuiInputBase-input': {
              padding: '10px 16px',
              fontSize: '14px',
              height: '28px',
              color: '#4D4639',
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton edge="end">
                  <SearchIcon sx={{ color: '#4D4639' }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Download question paper */}
        <Button
          variant="contained"
          color="primary"
          disabled={downloading}
          startIcon={
            downloading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PictureAsPdfIcon sx={{ color: '#D32F2F', width: 24, height: 24 }} />
            )
          }
          endIcon={<DownloadIcon sx={{ color: '#4D4639' }} />}
          sx={{
            color: '#4D4639',
            borderRadius: '8px',
            fontWeight: 500,
            textTransform: 'none',
            backgroundColor: '#ECE6F0',
            border: '1px solid #D0C5B4',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E1D5E7', boxShadow: 'none' },
          }}
          onClick={handleDownloadQuestionPaper}
        >
          {t('AI.DOWNLOAD_QUESTION_PAPER')}.pdf
        </Button>
      </Box>

      {/* Total learners + sort/filter */}
      <Box
        sx={{
          px: 2,
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontWeight: 500, fontSize: '14px', color: '#7C766F' }}>
          {t('AI.TOTAL_LEARNERS', {
            count: visibleLearners.length,
            total: learners.length,
          })}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SortIcon />}
          onClick={() => {
            setPendingSortOption(sortOption);
            setShowSortPopup(true);
          }}
          sx={{
            borderColor: '#D0C5B4',
            color: '#4D4639',
            fontWeight: 500,
            fontSize: '14px',
            textTransform: 'none',
            borderRadius: '8px',
            height: '32px',
            '&:hover': {
              borderColor: '#4D4639',
              backgroundColor: 'rgba(77, 70, 57, 0.04)',
            },
          }}
        >
          {getSortButtonText()}
        </Button>
      </Box>

      {/* Status summary cards */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Box
          sx={{
            display: { xs: 'grid', sm: 'grid', md: 'flex' },
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' },
            gap: 2,
            width: '100%',
            flexWrap: { md: 'wrap' },
          }}
        >
          {statusCounts.map((item) => (
            <Card
              key={item.label}
              sx={{
                backgroundColor: '#FDF2E5',
                borderRadius: '12px',
                minHeight: { xs: 80, md: 'auto' },
                minWidth: { md: 100 },
                flex: { md: 1 },
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'none',
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: '16px !important',
                  flex: 1,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#1F1B13',
                    mb: 0.5,
                  }}
                >
                  {item.count}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: '12px',
                    color: '#7C766F',
                    textAlign: 'center',
                    lineHeight: '16px',
                  }}
                >
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {loading && (
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            mt: 2,
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        </Box>
      )}

      {!loading && visibleLearners.length === 0 && (
        <Box sx={{ mt: 2 }}>
          {searchTerm.trim() ? (
            <Typography sx={{ textAlign: 'center', px: '20px' }}>
              {t('AI.NO_LEARNERS_FOUND_MATCHING_SEARCH')}
            </Typography>
          ) : (
            <NoDataFound />
          )}
        </Box>
      )}

      {!loading && visibleLearners.length > 0 && (
        <Box sx={{ px: { xs: 0, md: 2 }, pb: 2 }}>
          <Card
            sx={{
              backgroundColor: '#FBF4E4',
              borderRadius: { md: '12px' },
              border: '1px solid #E0E0E0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <List sx={{ p: 0 }}>
                {visibleLearners.map((learner, index) => (
                  <ListItem
                    key={learner.userId}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: '12px',
                      mb: index < visibleLearners.length - 1 ? 2 : 0,
                      cursor: 'pointer',
                      p: 0,
                      minHeight: '80px',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: '#F5F5F5',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      },
                    }}
                    onClick={() => handleLearnerClick(learner.userId)}
                  >
                    {/* Leading status block */}
                    <Box
                      sx={{
                        backgroundColor: '#FFDEA1',
                        borderRadius: isRTL
                          ? '0px 12px 12px 0px'
                          : '12px 0px 0px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        alignSelf: 'stretch',
                      }}
                    >
                      {getStatusIcon(learner.answerSheetStatus)}
                    </Box>

                    <ListItemText
                      sx={{ mx: 2, flex: 1 }}
                      primary={
                        <>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: '16px',
                              color: '#1F1B13',
                              lineHeight: '24px',
                            }}
                            className="one-line-text"
                          >
                            {learner.name}
                          </Typography>
                          {learner.username && (
                            <Typography
                              sx={{
                                fontSize: '12px',
                                fontWeight: 400,
                                color: '#FFA726',
                              }}
                              className="one-line-text"
                            >
                              {learner.username}
                            </Typography>
                          )}
                        </>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Typography
                          sx={{
                            fontWeight:
                              learner.answerSheetStatus === 'Completed' ? 500 : 400,
                            fontSize: '14px',
                            color: '#4D4639',
                            lineHeight: '20px',
                          }}
                        >
                          {learner.answerSheetStatus === 'Completed'
                            ? // Without a max score there is no marks out of
                              // anything to report, so show the plain approved
                              // label rather than a meaningless "0/0".
                              (learner.maxScore || maxScore)
                              ? t('AI.MARKS_APPROVED_SCORE', {
                                  score: learner.score,
                                  maxScore: learner.maxScore || maxScore,
                                })
                              : t('AI.MARKS_APPROVED')
                            : t(
                                learner.answerSheetStatus === 'Image_Uploaded'
                                  ? 'AI.AWAITING_YOUR_APPROVAL'
                                  : 'AI.NOT_SUBMITTED'
                              )}
                        </Typography>
                      }
                    />

                    <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                      <NavigateNextIcon
                        sx={{
                          color: '#4D4639',
                          transform: isRTL ? 'rotate(180deg)' : 'unset',
                        }}
                      />
                    </ListItemIcon>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Sort & Filter dialog */}
      <Dialog
        open={showSortPopup}
        onClose={() => setShowSortPopup(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1, maxWidth: '400px' } }}
      >
        <DialogTitle>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, fontSize: '18px', color: '#1F1B13' }}
          >
            {t('AI.SORT_AND_FILTER_LEARNERS')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={pendingSortOption}
              onChange={(event) =>
                setPendingSortOption(event.target.value as SortOption)
              }
              sx={{ gap: 1 }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#4D4639',
                  mt: 1,
                  mb: 1,
                  fontSize: '14px',
                }}
              >
                {t('AI.FILTER_BY_STATUS')}
              </Typography>

              {[
                { value: 'all', label: t('AI.ALL_LEARNERS'), count: tabCounts.all },
                {
                  value: 'completed',
                  label: t('AI.MARKS_APPROVED'),
                  count: tabCounts.marks_approved,
                },
                {
                  value: 'awaiting_approval',
                  label: t('ASSESSMENTS.IMAGE_UPLOADED'),
                  count: tabCounts.awaiting_approval,
                },
                {
                  value: 'not_started',
                  label: t('AI.NOT_SUBMITTED'),
                  count: tabCounts.not_submitted,
                },
              ].map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" sx={{ color: '#4D4639' }} />}
                  label={
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <Typography sx={{ fontSize: '14px', color: '#1F1B13' }}>
                        {option.label}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', color: '#7C766F' }}>
                        ({option.count})
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mx: 0,
                    width: '100%',
                    '& .MuiFormControlLabel-label': { width: '100%' },
                  }}
                />
              ))}

              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#4D4639',
                  mt: 2,
                  mb: 1,
                  fontSize: '14px',
                }}
              >
                {t('AI.SORT_BY_NAME')}
              </Typography>

              {[
                { value: 'name_asc', label: t('AI.NAME_A_TO_Z') },
                { value: 'name_desc', label: t('AI.NAME_Z_TO_A') },
              ].map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" sx={{ color: '#4D4639' }} />}
                  label={
                    <Typography sx={{ fontSize: '14px', color: '#1F1B13' }}>
                      {option.label}
                    </Typography>
                  }
                  sx={{ mx: 0 }}
                />
              ))}

              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#4D4639',
                  mt: 2,
                  mb: 1,
                  fontSize: '14px',
                }}
              >
                {t('AI.SORT_BY_SCORE')}
              </Typography>

              {[
                { value: 'score_desc', label: t('AI.SCORE_HIGH_TO_LOW') },
                { value: 'score_asc', label: t('AI.SCORE_LOW_TO_HIGH') },
              ].map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" sx={{ color: '#4D4639' }} />}
                  label={
                    <Typography sx={{ fontSize: '14px', color: '#1F1B13' }}>
                      {option.label}
                    </Typography>
                  }
                  sx={{ mx: 0 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setShowSortPopup(false)}
            sx={{ color: '#7C766F', textTransform: 'none', fontWeight: 500 }}
          >
            {t('AI.CANCEL')}
          </Button>
          <Button
            onClick={() => {
              setSortOption(pendingSortOption);
              setShowSortPopup(false);
            }}
            variant="contained"
            sx={{
              backgroundColor: '#4D4639',
              color: '#FFFFFF',
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              '&:hover': { backgroundColor: '#3A3529' },
            }}
          >
            {t('AI.APPLY')}
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
};

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export async function getStaticProps({ locale }: { params: any; locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withAccessControl(
  'accessAssessments',
  accessControl
)(ManualAssessmentLearners);
