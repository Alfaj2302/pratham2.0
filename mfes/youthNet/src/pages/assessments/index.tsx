import ArrowDropDownSharpIcon from '@mui/icons-material/ArrowDropDownSharp';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AssessmentReportCard from '../../components/assessment/AssessmentReportCard';
import AssessmentSortModal from '../../components/assessment/AssessmentSortModal';
import TrainerCohortSelection from '../../components/assessment/TrainerCohortSelection';
import NoDataFound from '../../components/common/NoDataFound';
import Header from '../../components/Header';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Searchbar';
import { showToastMessage } from '../../components/Toastify';
import {
  getAssessmentStatus,
  getDoIdForAssessmentDetails,
} from '../../services/AssesmentService';
import { getBatchLearners } from '../../services/myTeachingCenter/LearnerListService';
import {
  accessControl,
  AttendanceAPILimit,
  loggedInProgram,
} from '../../utils/app.config';
import { AssessmentStatus } from '../../utils/app.constant';
import { getAssessmentType, toPascalCase } from '../../utils/helper';
import withAccessControl from '../../utils/hoc/withAccessControl';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';

// Assessments (Trainer) — per-learner online assessment report for the selected batch.
//
// Ported from scp-teacher-repo/src/pages/assessments/index.tsx with two YouthNet-specific changes:
//  - Center/Batch selection uses TrainerCohortSelection (not scp's CohortSelectionSection).
//  - No `board` filter and no "no assigned board" empty state: YouthNet centers carry no board, so
//    scoping comes from the selected batch instead (see D6/§5.1 in the L2 plan).

const SORT_STORAGE_KEY = 'assessmentSortOption';

const DEFAULT_STATUS_ORDER = {
  [AssessmentStatus.NOT_STARTED]: 0,
  [AssessmentStatus.IN_PROGRESS]: 1,
  [AssessmentStatus.COMPLETED]: 2,
};

const Assessments = () => {
  const theme = useTheme<any>();
  const router = useRouter();
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [assessmentList, setAssessmentList] = useState<string[]>([]);
  const [classId, setClassId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<MyTeachingCenterBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [assessmentType, setAssessmentType] = useState<string>('pre');
  const [cohortMembers, setCohortMembers] = useState<any>([]);
  const [learnerList, setLearnerList] = useState<any>([]);
  const [filteredLearnerList, setFilteredLearnerList] = useState<any>([]);
  const [testCompletionCount, setTestCompletionCount] = useState<any>({
    completionCount: 0,
    totalCount: 0,
  });

  const [selectedSortOption, setSelectedSortOption] = useState<{
    sortByKey: string;
    sortByValue: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem(SORT_STORAGE_KEY);
      return savedSort ? JSON.parse(savedSort) : null;
    }
    return null;
  });

  const { query } = router;

  const resetValues = () => {
    setFilteredLearnerList([]);
    setLearnerList([]);
    setCohortMembers([]);
    setTestCompletionCount({ completionCount: 0, totalCount: 0 });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
    }
  }, []);

  // Learners of the selected batch.
  useEffect(() => {
    const getCohortMemberList = async () => {
      resetValues();
      setIsLoading(true);
      try {
        // Uses getBatchLearners, not getMyCohortMemberList: in the YouthNet Trainer /
        // Vocational Training context cohortmember/list's `status` field carries the
        // learner-progress enum (in_training / course_completed / placed / retention_complete /
        // dropout), NOT the generic active/dropout/archived enum the SCP and L2 flows use on the
        // same endpoint. Filtering on 'active' here matched nothing and returned an empty list.
        const { userDetails } = await getBatchLearners({
          batchCohortId: classId,
          limit: AttendanceAPILimit,
          offset: 0,
        });

        setCohortMembers(
          (userDetails || []).map((user: any) => ({
            ...user,
            name:
              toPascalCase(user?.firstName || '') +
              ' ' +
              (user?.lastName ? toPascalCase(user.lastName) : ''),
            userId: user.userId,
          }))
        );
      } catch (error) {
        console.error('Error fetching cohort list:', error);
        resetValues();
      } finally {
        setIsLoading(false);
      }
    };

    if (classId) {
      getCohortMemberList();
    } else {
      resetValues();
    }
  }, [classId]);

  // Resolve the assessment do_ids for the selected assessment type.
  //
  // Scoped to the assessments attached to the selected batch (its ASSESSMENTS customField), the same
  // source the Manual Assessment flow uses. A broad program-wide search — the scp-teacher-repo
  // approach — returns assessments that have nothing to do with this Trainer's batch.
  useEffect(() => {
    const getDoIdForAssessmentReport = async () => {
      const batchAssessmentIds = selectedBatch?.assessmentIds ?? [];

      if (!batchAssessmentIds.length) {
        setAssessmentList([]);
        setIsLoading(false);
        return;
      }

      const filters = {
        program: loggedInProgram,
        status: ['Live'],
        assessmentType: getAssessmentType(assessmentType),
        primaryCategory: ['Practice Question Set'],
        evaluationType: ['online'],
        identifier: batchAssessmentIds,
      };

      try {
        setIsLoading(true);
        setLearnerList([]);
        setFilteredLearnerList([]);
        setAssessmentList([]);

        const searchResults = await getDoIdForAssessmentDetails({ filters });
        if (searchResults?.responseCode === 'OK') {
          const result = searchResults?.result;
          if (result?.QuestionSet?.length > 0) {
            setAssessmentList(
              result.QuestionSet.map((item: any) => item?.IL_UNIQUE_ID)
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

    if (assessmentType) {
      getDoIdForAssessmentReport();
    }
  }, [assessmentType, selectedBatch]);

  const applySort = (
    list: any[],
    option: { sortByKey: string; sortByValue: string }
  ) => {
    const sorted = [...list];
    switch (option.sortByKey) {
      case 'attendanceStatus': {
        const statusOrder: any = { ...DEFAULT_STATUS_ORDER };
        if (
          option.sortByValue &&
          Object.prototype.hasOwnProperty.call(statusOrder, option.sortByValue)
        ) {
          statusOrder[option.sortByValue] = -1;
          let orderIndex = 0;
          for (const key in statusOrder) {
            if (key !== option.sortByValue) {
              statusOrder[key] = orderIndex++;
            }
          }
        }
        sorted.sort((a: any, b: any) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      }
      case 'marksObtained':
        sorted.sort((a: any, b: any) => Number(a.percentage) - Number(b.percentage));
        if (option.sortByValue === 'asc') {
          sorted.reverse();
        }
        break;
      case 'names':
        if (option.sortByValue === 'A_To_Z') {
          sorted.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } else {
          sorted.sort((a: any, b: any) => b.name.localeCompare(a.name));
        }
        break;
    }
    return sorted;
  };

  // Per-learner assessment status for the resolved assessments.
  useEffect(() => {
    const getAssessmentsForLearners = async () => {
      try {
        const options = {
          userId: cohortMembers?.map((user: any) => user.userId),
          courseId: assessmentList,
          unitId: assessmentList,
          contentId: assessmentList,
        };
        const assessmentStatus = await getAssessmentStatus(options);
        let completionCount = 0;

        if (assessmentStatus) {
          const userList = cohortMembers.map((user: any) => {
            const assessment = assessmentStatus?.find(
              (item: any) => item.userId === user.userId
            );
            if (assessment) {
              if (assessment?.status === AssessmentStatus.COMPLETED) {
                completionCount++;
              }
              return {
                ...user,
                percentageString: assessment?.percentageString,
                percentage: assessment?.percentage,
                status: assessment?.status,
              };
            }
            return user;
          });

          setLearnerList(userList);
          setFilteredLearnerList(
            selectedSortOption ? applySort(userList, selectedSortOption) : userList
          );
        }

        setTestCompletionCount({
          completionCount,
          totalCount: cohortMembers?.length,
        });
      } catch (error) {
        console.error('Error fetching assessment status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentList?.length && cohortMembers?.length) {
      getAssessmentsForLearners();
    } else if (cohortMembers?.length) {
      // Batch has learners but no assessment of this type is attached to it. Show the learners
      // anyway (status-less) rather than an unexplained "No Data Found" — the notice below says why.
      setLearnerList(cohortMembers);
      setFilteredLearnerList(
        selectedSortOption ? applySort(cohortMembers, selectedSortOption) : cohortMembers
      );
      setTestCompletionCount({ completionCount: 0, totalCount: cohortMembers.length });
      setIsLoading(false);
    }
  }, [assessmentList, cohortMembers, selectedSortOption]);

  const handleSearch = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (term.length > 0) {
      setFilteredLearnerList(
        learnerList?.filter((item: any) =>
          item?.name?.toLowerCase().includes(term.toLowerCase())
        )
      );
    } else {
      setFilteredLearnerList(learnerList);
    }
  };

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  const handleSorting = (selectedValue: {
    sortByKey: string;
    sortByValue: string;
  }) => {
    setModalOpen(false);
    setSelectedSortOption(selectedValue);
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(selectedValue));
    setFilteredLearnerList(applySort(filteredLearnerList, selectedValue));
  };

  const handleAssessmentTypeChange = (newType: string) => {
    setAssessmentType(newType);

    const queryParams = { ...query };
    if (newType === 'post') queryParams.type = 'post';
    else if (newType === 'other') queryParams.type = 'other';
    else delete queryParams.type;
    router.push({ pathname: router.pathname, query: queryParams }, undefined, {
      shallow: true,
    });
  };

  useEffect(() => {
    setAssessmentType(
      query.type === 'post' ? 'post' : query.type === 'other' ? 'other' : 'pre'
    );
  }, [query.type]);

  // Drop the saved sort when the Trainer navigates out of the Assessments tree.
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!url.includes('/assessments')) {
        localStorage.removeItem(SORT_STORAGE_KEY);
        setSelectedSortOption(null);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return (
    <>
      <Box>
        <Header />
      </Box>

      {loading && <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: theme?.palette?.warning['A200'],
          padding: '20px 20px 5px',
        }}
        width="100%"
      >
        <Typography fontSize="22px">{t('ASSESSMENTS.ASSESSMENTS')}</Typography>
      </Box>

      <SearchBar onSearch={handleSearch} placeholder={t('COMMON.SEARCH')} />

      <Grid container>
        <Grid item xs={12} md={6}>
          <Box sx={{ mt: 2, px: '20px', width: '100%' }}>
            <TrainerCohortSelection
              classId={classId}
              setClassId={setClassId}
              onBatchChange={setSelectedBatch}
              loading={loading}
              setLoading={setLoading}
              showFloatingLabel={true}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ mt: 2, px: '20px', width: '100%' }}>
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
          <Loader showBackdrop={false} />
        </Box>
      )}

      {/* No learners in the batch at all. */}
      {!isLoading && !filteredLearnerList?.length && <NoDataFound />}

      {/* Learners exist, but this batch has no assessment of the selected type. */}
      {!isLoading && filteredLearnerList?.length > 0 && !assessmentList?.length && (
        <Box
          sx={{
            background: theme.palette.action.selected,
            py: 0.5,
            borderRadius: 2,
            m: 2.5,
            p: 2,
          }}
        >
          <Typography variant="h2" sx={{ ml: 2 }}>
            {t('ASSESSMENTS.NO_ASSESSMENTS_FOUND')}
          </Typography>
        </Box>
      )}

      {!isLoading && filteredLearnerList?.length > 0 && (
        <Grid
          sx={{
            mt: 2,
            px: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
          container
        >
          <Grid
            xs={8}
            item
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: theme?.palette?.warning['400'],
            }}
          >
            {testCompletionCount?.totalCount > 0 && (
              <span>
                {`${testCompletionCount.completionCount} ${t('ASSESSMENTS.OUT_OF')} ${
                  testCompletionCount.totalCount
                }`}{' '}
                {t('ASSESSMENTS.COMPLETED_THE_ASSESSMENT')}
              </span>
            )}
          </Grid>
          <Grid sx={{ display: 'flex', justifyContent: 'flex-end' }} xs={4} item>
            <Button
              onClick={handleOpenModal}
              sx={{
                color: theme.palette.warning.A200,
                borderRadius: '10px',
                fontSize: '14px',
              }}
              endIcon={<ArrowDropDownSharpIcon />}
              size="small"
              variant="outlined"
              className="one-line-text"
            >
              {t('COMMON.SORT_BY')}
            </Button>
          </Grid>
        </Grid>
      )}

      {!isLoading && filteredLearnerList?.length > 0 && (
        <Box sx={{ background: '#FBF4E4', padding: '20px' }}>
          <Grid container spacing={2}>
            {filteredLearnerList?.map((member: any) => (
              <AssessmentReportCard
                key={member.userId}
                assessmentStatus={member.status}
                cardTitle={member.name}
                overallPercentage={member.percentage}
                userId={member.userId}
                classId={classId}
                assessmentType={assessmentType}
                username={member.username}
              />
            ))}
          </Grid>
        </Box>
      )}

      {modalOpen && (
        <AssessmentSortModal
          open={modalOpen}
          onClose={handleCloseModal}
          modalTitle={t('COMMON.SORT_BY')}
          btnText={t('COMMON.APPLY')}
          onFilterApply={handleSorting}
          selectedOption={selectedSortOption || undefined}
        />
      )}
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withAccessControl('accessAssessments', accessControl)(Assessments);
