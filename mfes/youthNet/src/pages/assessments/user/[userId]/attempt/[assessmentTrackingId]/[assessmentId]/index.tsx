import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GetStaticPaths } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../../../../components/Header';
import Loader from '../../../../../../../components/Loader';
import { showToastMessage } from '../../../../../../../components/Toastify';
import { useDirection } from '../../../../../../../hooks/useDirection';
import { getAssessmentAttemptDetails } from '../../../../../../../services/AssesmentService';
import { getUserDetails } from '../../../../../../../services/ProfileService';
import { accessControl } from '../../../../../../../utils/app.config';
import { Pagination } from '../../../../../../../utils/app.constant';
import { logEvent } from '../../../../../../../utils/googleAnalytics';
import { toPascalCase } from '../../../../../../../utils/helper';
import withAccessControl from '../../../../../../../utils/hoc/withAccessControl';
import { IQuestion } from '../../../../../../../utils/Interfaces';

// One specific attempt at one assessment, question by question.
// Ported from scp-teacher-repo, with its hardcoded English strings replaced by locale keys and
// `getStaticProps`/`getStaticPaths` added so translations resolve on a hard refresh.

function AssessmentAttemptDetail() {
  const theme = useTheme<any>();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const params = useParams<{
    userId: string;
    assessmentTrackingId: string;
    assessmentId: string;
  }>();

  const [currentPage, setCurrentPage] = useState(1);
  const [userDetails, setUserDetails] = useState<any>({});
  const [attemptDetails, setAttemptDetails] = useState<any>({});
  const [totalPages, setTotalPages] = useState(0);
  const [paginatedQuestions, setPaginatedQuestions] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  const setPagination = (questions: IQuestion[], pageNumber?: number) => {
    const activePage = pageNumber || currentPage;
    setPaginatedQuestions(
      questions.slice(
        (activePage - 1) * Pagination.ITEMS_PER_PAGE,
        activePage * Pagination.ITEMS_PER_PAGE
      )
    );
  };

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await getUserDetails(params.userId);
        if (response?.result?.userData) {
          setUserDetails(response?.result?.userData);
        }
      } catch (error) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error('Error fetching user details:', error);
      }
    };

    if (params?.userId) {
      getUserInfo();
    }
  }, [params?.userId]);

  useEffect(() => {
    const getAttemptDetails = async () => {
      setLoading(true);
      try {
        const assessmentRes = await getAssessmentAttemptDetails(
          params.userId,
          params.assessmentId
        );

        if (assessmentRes?.length) {
          const specificAttempt = assessmentRes.find(
            (attempt: any) =>
              attempt.assessmentTrackingId === params.assessmentTrackingId
          );

          if (specificAttempt) {
            setAttemptDetails(specificAttempt);
            if (specificAttempt?.score_details?.length) {
              setTotalPages(
                Math.ceil(
                  specificAttempt.score_details.length / Pagination.ITEMS_PER_PAGE
                )
              );
              setPagination(specificAttempt.score_details);
            }
          } else {
            showToastMessage(t('ASSESSMENTS.ATTEMPT_NOT_FOUND'), 'error');
          }
        } else {
          showToastMessage(t('ASSESSMENTS.NO_DATA_FOUND'), 'error');
        }
      } catch (error) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error('Error fetching assessment attempt details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params?.userId && params?.assessmentId && params?.assessmentTrackingId) {
      getAttemptDetails();
    }
  }, [params]);

  const handleBackEvent = () => {
    window.history.back();
    logEvent({
      action: 'back-button-clicked-assessment-attempt-detail',
      category: 'Assessment Attempt Detail Page',
      label: 'Back Button Clicked',
    });
  };

  const handlePageChange = (
    _event: React.MouseEvent<HTMLElement> | null,
    newPage: number
  ) => {
    setCurrentPage(() => newPage);
    setPagination(attemptDetails?.score_details, newPage);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--';
    return (
      date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const getScoreColor = (pass: string) => (pass === 'Yes' ? '#2E7D32' : '#D32F2F');

  // Guards against a divide-by-zero when an attempt carries no max score.
  const percentage =
    attemptDetails?.totalMaxScore > 0
      ? Math.round((attemptDetails.totalScore / attemptDetails.totalMaxScore) * 100)
      : 0;

  const isPassing =
    attemptDetails?.totalMaxScore > 0 &&
    attemptDetails.totalScore >= attemptDetails.totalMaxScore * 0.6;

  if (loading) {
    return (
      <>
        <Header />
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
      </>
    );
  }

  return (
    <>
      <Header />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'left',
          alignItems: 'flex-start',
          color: theme.palette.warning['A200'],
          padding: '15px 20px 0px',
        }}
        width={'100%'}
        onClick={handleBackEvent}
      >
        <KeyboardBackspaceOutlinedIcon
          cursor={'pointer'}
          sx={{
            color: theme.palette.warning['A200'],
            marginTop: '14px',
            transform: isRTL ? ' rotate(180deg)' : 'unset',
          }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', margin: '0.8rem' }}>
          <Typography textAlign={'left'} fontSize={'22px'}>
            {t('ASSESSMENTS.ATTEMPT_DETAILS')}
          </Typography>
          <Typography
            color={theme.palette.warning['A200']}
            textAlign={'left'}
            fontWeight={'500'}
            fontSize={'11px'}
          >
            {toPascalCase(userDetails?.name)}
          </Typography>
        </Box>
      </Box>

      {attemptDetails?.assessmentTrackingId && (
        <Box sx={{ m: 2, mb: 1 }}>
          <Box
            sx={{
              padding: '12px 16px',
              background: theme.palette.warning['800'],
              border: `1px solid ${theme.palette.warning['A100']}`,
              borderRadius: '12px',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontSize: '16px', fontWeight: 600 }}>
              {t('ASSESSMENTS.ATTEMPT_SUMMARY')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip
                label={`${t('ASSESSMENTS.SCORE')}: ${attemptDetails.totalScore}/${
                  attemptDetails.totalMaxScore
                }`}
                sx={{
                  backgroundColor: isPassing ? '#E8F5E8' : '#FFEBEE',
                  color: isPassing ? '#2E7D32' : '#D32F2F',
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${t('ASSESSMENTS.PERCENTAGE')}: ${percentage}%`}
                variant="outlined"
              />
              <Chip
                label={`${t('ASSESSMENTS.TIME')}: ${attemptDetails.timeSpent || 0}s`}
                variant="outlined"
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontSize: '12px', color: theme.palette.warning['300'] }}
            >
              {t('ASSESSMENTS.ATTEMPTED_ON')}: {formatDate(attemptDetails.lastAttemptedOn)}
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          m: 2,
          padding: '4px 16px 16px',
          background: theme.palette.warning['800'],
          border: `1px solid ${theme.palette.warning['A100']}`,
          borderRadius: '16px',
        }}
      >
        {paginatedQuestions.map((questionItem: IQuestion, index: number) => (
          <Box key={questionItem?.questionId}>
            <Box
              sx={{
                mt: 1.5,
                fontSize: '14px',
                fontWeight: '400',
                color: theme.palette.warning['300'],
              }}
            >
              <span>{`Q${
                (currentPage - 1) * Pagination.ITEMS_PER_PAGE + 1 + index
              }. `}</span>
              <span dangerouslySetInnerHTML={{ __html: questionItem?.queTitle }} />
            </Box>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.5 }}
            >
              <Chip
                label={
                  questionItem?.pass === 'Yes'
                    ? t('ASSESSMENTS.CORRECT')
                    : t('ASSESSMENTS.INCORRECT')
                }
                size="small"
                sx={{
                  backgroundColor: questionItem?.pass === 'Yes' ? '#E8F5E8' : '#FFEBEE',
                  color: getScoreColor(questionItem?.pass),
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              />
              <Typography sx={{ fontSize: '11px', color: theme.palette.warning['300'] }}>
                {t('ASSESSMENTS.SCORE')}: {questionItem?.score}/{questionItem?.maxScore}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: theme.palette.warning['300'] }}>
                {t('ASSESSMENTS.TIME')}: {questionItem?.duration || 0}s
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 0.8,
                fontSize: '16px',
                fontWeight: '500',
                color: getScoreColor(questionItem?.pass),
              }}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html:
                    JSON.parse(questionItem?.resValue)?.[0]
                      ?.label.replace(/<\/?[^>]+(>|$)/g, '') //NOSONAR
                      .replace(/^\d+\.\s*/, '') || t('ASSESSMENTS.NO_ANSWER'),
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>

      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            my: 2,
            px: '20px',
            '@media (max-width: 500px)': {
              justifyContent: 'space-between',
            },
          }}
        >
          <IconButton
            disabled={currentPage === 1}
            onClick={() => handlePageChange(null, currentPage - 1)}
          >
            <ArrowBackIosNewIcon
              sx={{
                fontSize: '20px',
                color: theme.palette.warning['300'],
                transform: isRTL ? 'rotate(180deg)' : 'unset',
              }}
            />
          </IconButton>
          <Typography
            sx={{
              mx: 2,
              fontSize: '14px',
              fontWeight: '400',
              color: theme.palette.warning['300'],
            }}
          >
            {`${(currentPage - 1) * Pagination.ITEMS_PER_PAGE + 1}-${Math.min(
              currentPage * Pagination.ITEMS_PER_PAGE,
              attemptDetails?.score_details?.length || 0
            )} of ${attemptDetails?.score_details?.length || 0}`}
          </Typography>
          <IconButton
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(null, currentPage + 1)}
          >
            <ArrowForwardIosIcon
              sx={{
                fontSize: '20px',
                color: theme.palette.warning['300'],
                transform: isRTL ? 'rotate(180deg)' : 'unset',
              }}
            />
          </IconButton>
        </Box>
      )}
    </>
  );
}

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
)(AssessmentAttemptDetail);
