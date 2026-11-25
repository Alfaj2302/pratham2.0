import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import { Box, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GetStaticPaths } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../../../../../components/Header';
import { showToastMessage } from '../../../../../../components/Toastify';
import { useDirection } from '../../../../../../hooks/useDirection';
import { searchAssessment } from '../../../../../../services/AssesmentService';
import { getUserDetails } from '../../../../../../services/ProfileService';
import { accessControl } from '../../../../../../utils/app.config';
import { Pagination } from '../../../../../../utils/app.constant';
import { logEvent } from '../../../../../../utils/googleAnalytics';
import { toPascalCase } from '../../../../../../utils/helper';
import withAccessControl from '../../../../../../utils/hoc/withAccessControl';
import { IQuestion } from '../../../../../../utils/Interfaces';

// Question-by-question view of one learner's attempt at one subject assessment.
// Ported from scp-teacher-repo. `getStaticProps`/`getStaticPaths` added (the scp original has
// neither) so next-i18next resolves translations on a hard refresh of this deep route.

function SubjectDetail() {
  const theme = useTheme<any>();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const searchParams = useSearchParams();
  const assessmentName = searchParams.get('assessmentName');
  const params = useParams<{ userId: string; subjectId: string }>();

  const [currentPage, setCurrentPage] = useState(1);
  const [userDetails, setUserDetails] = useState<any>({});
  const [assessmentDetails, setAssessmentDetails] = useState<any>({});
  const [totalPages, setTotalPages] = useState(0);
  const [paginatedQuestions, setPaginatedQuestions] = useState<any>([]);

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
    const getAssessmentDetails = async () => {
      try {
        const body = {
          userId: params.userId,
          courseId: params.subjectId,
          unitId: params.subjectId,
          contentId: params.subjectId,
        };
        const assessmentRes = await searchAssessment(body);

        if (assessmentRes?.length) {
          setAssessmentDetails(assessmentRes[0]);
          if (assessmentRes[0]?.score_details?.length) {
            setTotalPages(
              Math.ceil(
                assessmentRes[0].score_details.length / Pagination.ITEMS_PER_PAGE
              )
            );
            setPagination(assessmentRes[0].score_details);
          }
        }
      } catch (error) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error('Error fetching assessment details:', error);
      }
    };

    // Unlike the scp original this does not also require a `center` query param — YouthNet reaches
    // this page from the learner detail view, which may not carry one.
    if (params?.userId && params?.subjectId) {
      getAssessmentDetails();
    }
  }, [params]);

  const handleBackEvent = () => {
    window.history.back();
    logEvent({
      action: 'back-button-clicked-assessment-subject',
      category: 'Assessment Subject Page',
      label: 'Back Button Clicked',
    });
  };

  const handlePageChange = (
    _event: React.MouseEvent<HTMLElement> | null,
    newPage: number
  ) => {
    setCurrentPage(() => newPage);
    setPagination(assessmentDetails?.score_details, newPage);
  };

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
            {assessmentName}
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
              sx={{
                mt: 0.8,
                fontSize: '16px',
                fontWeight: '500',
                color:
                  questionItem?.pass === 'Yes' ? 'green !important' : 'red !important',
              }}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html:
                    JSON.parse(questionItem?.resValue)?.[0]
                      ?.label.replace(/<\/?[^>]+(>|$)/g, '') //NOSONAR
                      .replace(/^\d+\.\s*/, '') || 'NA',
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
              assessmentDetails?.score_details?.length
            )} of ${assessmentDetails?.score_details?.length}`}
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

export default withAccessControl('accessAssessments', accessControl)(SubjectDetail);
