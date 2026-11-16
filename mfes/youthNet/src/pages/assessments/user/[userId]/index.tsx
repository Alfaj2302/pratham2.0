import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import { GetStaticPaths } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NoDataFound from '../../../../components/common/NoDataFound';
import Header from '../../../../components/Header';
import Loader from '../../../../components/Loader';
import { showToastMessage } from '../../../../components/Toastify';
import { useDirection } from '../../../../hooks/useDirection';
import {
  getAssessmentStatus,
  getDoIdForAssessmentDetails,
} from '../../../../services/AssesmentService';
import { getUserDetails } from '../../../../services/ProfileService';
import { accessControl, loggedInProgram } from '../../../../utils/app.config';
import { AssessmentStatus } from '../../../../utils/app.constant';
import { logEvent } from '../../../../utils/googleAnalytics';
import {
  format2DigitDate,
  getAssessmentType,
  toPascalCase,
} from '../../../../utils/helper';
import withAccessControl from '../../../../utils/hoc/withAccessControl';

// Per-learner assessment detail: overall score plus a per-subject breakdown.
// Ported from scp-teacher-repo with the `board`/`state` filters removed (D6/§5.1) — YouthNet resolves
// assessments without a board, so the search runs on program + type alone.

const statusKeyMap: any = {
  [AssessmentStatus.COMPLETED]: 'ASSESSMENTS.COMPLETED',
  [AssessmentStatus.IN_PROGRESS]: 'ASSESSMENTS.IN_PROGRESS',
  [AssessmentStatus.NOT_STARTED]: 'ASSESSMENTS.NOT_STARTED',
};

function AssessmentsDetails() {
  const theme = useTheme<any>();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const assessmentTypeParam = searchParams.get('assessmentType');
  const params = useParams<{ userId: string }>();

  const [assessmentType, setAssessmentType] = useState<string>(
    assessmentTypeParam ?? 'pre'
  );
  const [assessmentList, setAssessmentList] = useState([]);
  const [subject, setSubject] = useState<any>([]);
  const [fullName, setFullName] = useState<any>('');
  const [assessmentInfo, setAssessmentInfo] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);

  const handleBackEvent = () => {
    window.history.back();
    logEvent({
      action: 'back-button-clicked-assessment-details',
      category: 'Assessment Details Page',
      label: 'Back Button Clicked',
    });
  };

  useEffect(() => {
    logEvent({
      action: 'page-loaded-assessment-details',
      category: 'Assessment Details Page',
      label: 'Page Loaded',
    });
  }, []);

  useEffect(() => {
    setAssessmentType(assessmentTypeParam ?? 'pre');
  }, [assessmentTypeParam]);

  useEffect(() => {
    const getDoIdForAssessmentReport = async () => {
      const filters = {
        program: loggedInProgram,
        status: ['Live'],
        assessmentType: getAssessmentType(assessmentType),
        primaryCategory: ['Practice Question Set'],
        evaluationType: ['online'],
      };

      try {
        setIsLoading(true);
        setAssessmentList([]);
        setSubject([]);
        setAssessmentInfo({});

        const searchResults = await queryClient.fetchQuery({
          queryKey: ['contentSearch', { filters }],
          queryFn: () => getDoIdForAssessmentDetails({ filters }),
        });

        if (searchResults?.responseCode === 'OK') {
          const result = searchResults?.result;
          if (result?.QuestionSet?.length > 0) {
            setAssessmentList(
              result.QuestionSet.map((item: any) => ({
                subject: item?.name,
                identifier: item?.IL_UNIQUE_ID,
              }))
            );
          } else {
            setAssessmentList([]);
          }
        }
      } catch (error) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error('Error fetching getDoIdForAssessmentDetails results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getDoIdForAssessmentReport();
  }, [assessmentType]);

  useEffect(() => {
    const getAssessmentsForLearners = async () => {
      try {
        const identifiers = assessmentList.map(
          (item: any) => item.identifier
        ) as string[];
        const options = {
          userId: [params.userId],
          courseId: identifiers,
          unitId: identifiers,
          contentId: identifiers,
        };

        const assessmentStatus = await getAssessmentStatus(options);
        if (assessmentStatus?.length) {
          const info = assessmentStatus[0];

          if (info?.assessments?.length) {
            const { totalObtainedScore, totalMaxScore } = info.assessments.reduce(
              (acc: any, item: any) => {
                acc.totalObtainedScore += item.totalScore;
                acc.totalMaxScore += item.totalMaxScore;
                return acc;
              },
              { totalObtainedScore: 0, totalMaxScore: 0 }
            );

            info.totalObtainedScore = totalObtainedScore;
            info.totalMaxScore = totalMaxScore;

            const currentAssessmentList: any = assessmentList.map((item: any) => {
              const assessment = info.assessments.find(
                (entry: any) => entry.contentId === item.identifier
              );
              if (assessment) {
                assessment.updatedOn = format2DigitDate(assessment.updatedOn);
              }
              return assessment ? { ...item, ...assessment } : item;
            });

            setSubject(currentAssessmentList);
          } else {
            setSubject(assessmentList);
          }
          setAssessmentInfo(assessmentStatus[0]);
        }
      } catch (error) {
        console.error('Error in getAssessmentStatus', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentList.length) {
      getAssessmentsForLearners();
    }
  }, [assessmentList]);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await queryClient.fetchQuery({
          queryKey: ['userRead', params.userId],
          queryFn: () => getUserDetails(params.userId),
        });

        if (response?.result?.userData) {
          const data = response.result.userData;
          let name = '';
          if (data?.firstName) name += toPascalCase(data.firstName);
          if (data?.middleName) name += (name ? ' ' : '') + toPascalCase(data.middleName);
          if (data?.lastName) name += (name ? ' ' : '') + toPascalCase(data.lastName);
          setFullName(name);
        }
      } catch (error) {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error('Error fetching user details:', error);
      }
    };

    if (params?.userId) {
      getUserInfo();
    }
  }, [params]);

  const handleAssessmentSubjectDetails = (
    subjectId: string,
    subjectName: string,
    updatedOn: string
  ) => {
    if (updatedOn) {
      const fullPath = router.asPath;
      const [basePath, queryString] = fullPath.split('?');
      let newFullPath = `${basePath}/subject/${subjectId}`;
      if (queryString) {
        newFullPath = `${newFullPath}?${queryString}&assessmentName=${subjectName}`;
      }
      router.push(newFullPath);
    } else {
      showToastMessage(t('ASSESSMENTS.ASSESSMENT_NOT_STARTED_YET'), 'error');
    }
  };

  const getStatusIcon = (status: AssessmentStatus) => {
    const style = { color: theme.palette.warning['300'], fontSize: '22px' };
    switch (status) {
      case AssessmentStatus.COMPLETED:
        return <CheckCircleIcon sx={style} />;
      case AssessmentStatus.IN_PROGRESS:
        return <RadioButtonUncheckedIcon sx={style} />;
      case AssessmentStatus.NOT_STARTED:
        return <RemoveIcon sx={style} />;
      default:
        return null;
    }
  };

  const getTrackingStatus = () => {
    if (assessmentInfo?.status === AssessmentStatus.IN_PROGRESS) {
      return `(${t('ASSESSMENTS.NUMBER_OUT_OF_COMPLETED', {
        completedCount: assessmentInfo?.assessments?.length || 0,
        totalCount: assessmentList?.length,
      })})`;
    }
    return '';
  };

  const handleAssessmentTypeChange = (newType: string) => {
    setAssessmentType(newType);
    const queryParams = { ...router.query };
    if (newType === 'post') {
      queryParams.assessmentType = 'post';
    } else if (newType === 'other') {
      queryParams.assessmentType = 'other';
    } else {
      delete queryParams.assessmentType;
    }

    router.push({ pathname: router.pathname, query: queryParams }, undefined, {
      shallow: true,
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
        }}
        width={'100%'}
        onClick={handleBackEvent}
      >
        <KeyboardBackspaceOutlinedIcon
          cursor={'pointer'}
          sx={{
            color: theme.palette.warning['A200'],
            transform: isRTL ? ' rotate(180deg)' : 'unset',
          }}
        />
        <Typography fontSize={'22px'} m={'1rem'}>
          {fullName}
        </Typography>
      </Box>

      <Grid container>
        <Grid item xs={12} md={6}>
          <Box sx={{ mt: 2, px: '20px' }}>
            <FormControl fullWidth>
              <InputLabel
                style={{
                  color: theme?.palette?.warning['A200'],
                  background: theme?.palette?.warning['A400'],
                  paddingLeft: '2px',
                  paddingRight: '2px',
                }}
                id="assessment-type-label"
              >
                {t('ASSESSMENTS.ASSESSMENT_TYPE')}
              </InputLabel>
              <Select
                labelId="assessment-type-label"
                id="assessment-type-select"
                label={t('ASSESSMENTS.ASSESSMENT_TYPE')}
                style={{ borderRadius: '4px' }}
                onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                value={assessmentType}
              >
                <MenuItem value={'pre'}>{t('PROFILE.PRE_TEST')}</MenuItem>
                <MenuItem value={'post'}>{t('PROFILE.POST_TEST')}</MenuItem>
                <MenuItem value={'other'}>{t('FORM.OTHER')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Grid>
      </Grid>

      {assessmentInfo?.status && (
        <Box
          sx={{
            mt: 2,
            px: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          {getStatusIcon(assessmentInfo?.status)}
          <Box
            sx={{
              fontSize: '14px',
              fontWeight: '400',
              color: theme.palette.warning['A200'],
            }}
          >
            {t(statusKeyMap[assessmentInfo.status])} {getTrackingStatus()}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          mt: 2,
          color: theme.palette.warning['300'],
          fontWeight: 500,
          fontSize: '14px',
          px: '16px',
        }}
      >
        {t('ASSESSMENTS.OVERALL_SCORE')}
        {': '}
        {assessmentInfo?.status === AssessmentStatus.COMPLETED ? (
          <span>
            {`${assessmentInfo?.totalObtainedScore}/${assessmentInfo?.totalMaxScore}`} (
            {assessmentInfo?.percentageString})
          </span>
        ) : (
          <span> --</span>
        )}
      </Box>

      {subject?.length > 0 && (
        <Box
          sx={{
            mt: 2,
            background: '#FBF4E4',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <Grid container spacing={2}>
            {subject?.map((assessment: any) => (
              <Grid item xs={12} sm={12} md={6} lg={4} key={assessment.identifier}>
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.warning['A100']}`,
                    background: theme.palette.warning['A400'],
                    padding: '14px',
                    borderRadius: '8px',
                  }}
                  onClick={() =>
                    handleAssessmentSubjectDetails(
                      assessment?.identifier,
                      assessment?.subject,
                      assessment?.updatedOn
                    )
                  }
                >
                  <Box
                    sx={{
                      fontSize: '16px',
                      fontWeight: '400',
                      color: theme.palette.warning['300'],
                    }}
                    className="one-line-text"
                  >
                    {assessment?.subject}
                  </Box>

                  {assessment?.updatedOn ? (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        pt: '4px',
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.palette.warning['300'],
                        }}
                      >
                        {assessment?.totalScore}/{assessment?.totalMaxScore}
                      </Box>
                      <FiberManualRecordIcon
                        sx={{
                          fontSize: '12px',
                          color: theme.palette.warning['400'],
                        }}
                      />
                      <Box
                        sx={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.palette.warning['400'],
                        }}
                      >
                        {assessment?.updatedOn}
                      </Box>
                    </Box>
                  ) : (
                    <em>{t('ASSESSMENTS.NOT_STARTED')}</em>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!isLoading && !assessmentList?.length && <NoDataFound />}

      {isLoading && (
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
)(AssessmentsDetails);
