import React from 'react';
import AssessmentSortModal from '../../components/AssessmentSortModal';
import CohortSelectionSection from '../../components/CohortSelectionSection';
import Header from '../../components/Header';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Searchbar';
import { showToastMessage } from '../../components/Toastify';
import NoDataFound from '../../components/common/NoDataFound';
import { getOfflineAssessmentDetails } from '../../services/AssesmentService';
import { ICohort } from '../../utils/Interfaces';
import withAccessControl from '../../utils/hoc/withAccessControl';
import ArrowDropDownSharpIcon from '@mui/icons-material/ArrowDropDownSharp';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
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
import { accessControl, getTenantProgramFilter } from '../../../app.config';
import { toPascalCase } from '../../utils/helper';

const AssessmentList = () => {
  const theme = useTheme<any>();
  const router = useRouter();
  const { t } = useTranslation();

  // Core state management (following /assessments/index.tsx pattern)
  const [modalOpen, setModalOpen] = useState(false);
  const [assessmentList, setAssessmentList] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [availableAssessmentTypes, setAvailableAssessmentTypes] = useState<
    string[] | null
  >(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cohortsData, setCohortsData] = useState<Array<ICohort>>([]);
  const [manipulatedCohortData, setManipulatedCohortData] =
    useState<Array<ICohort>>(cohortsData);
  const [centerData, setCenterData] = useState<{
    board: string;
    state: string;
    stream: string[];
  } | null>(null);
  const [assessmentType, setAssessmentType] = useState<string>('pre');
  const [selectedSortOption, setSelectedSortOption] = useState<{
    sortByKey: string;
    sortByValue: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('assessmentListSortOption');
      return savedSort ? JSON.parse(savedSort) : null;
    }
    return null;
  });

  const { query } = router;

  // Authentication check (following existing pattern)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      const storedClassId = localStorage.getItem('classId') ?? '';

      setClassId(storedClassId);
      if (token) {
        setIsAuthenticated(true);
      } else {
        router.push('/login');
      }
      setUserId(storedUserId);
    }
  }, []);

  // Assessment type from query params
  useEffect(() => {
    const newAssessmentType =
      query.type === 'post' ? 'post' : query.type === 'pre' ? 'pre' : 'other';
    setAssessmentType(newAssessmentType);
  }, [query.type]);

  // Extract center data from cohorts (following /assessments/index.tsx pattern)
  useEffect(() => {
    if (classId && cohortsData?.length) {
      const cohort = cohortsData.find((item: any) => item.cohortId === classId);
      if (!cohort?.customField) {
        setCenterData(null);
        return;
      }
      const selectedState =
        cohort.customField.find((item: any) => item.label === 'STATE')
          ?.selectedValues?.[0]?.value || '';

      const selectedBoard =
        cohort.customField.find((item: any) => item.label === 'BOARD')
          ?.selectedValues?.[0] || '';

      const selectedStream: string[] =
        cohort.customField.find((item: any) => item.label === 'STREAM')
          ?.selectedValues || [];

      setCenterData({
        state: selectedState,
        board: selectedBoard,
        stream: selectedStream,
      });
    }
  }, [classId, cohortsData]);

  // Reset assessment type and related lists when class changes
  useEffect(() => {
    setAvailableAssessmentTypes(null);
    console.log('availableAssessmentTypes');
    setFilteredAssessments([]);
    setAssessmentType('pre');
  }, [classId]);

  // Ensure default selection: pick first available type if current isn't present
  useEffect(() => {
    if (availableAssessmentTypes && availableAssessmentTypes.length > 0) {
      const firstType = availableAssessmentTypes[0];
      if (firstType && !availableAssessmentTypes.includes(assessmentType)) {
        handleAssessmentTypeChange(firstType);
      }
    }
  }, [availableAssessmentTypes]);

  // Get assessment data (following /assessments/index.tsx pattern)
  useEffect(() => {
    const getDoIdForAssessmentReport = async (
      selectedState: string,
      selectedBoard: string,
      selectedStream: string[]
    ) => {
      const filters = {
        program: getTenantProgramFilter(),
        board: [selectedBoard],
        status: ['Live'],
        primaryCategory: ['Practice Question Set'],
        evaluationType: ['offline'],
        stream: selectedStream,
      };
      try {
        if (filters) {
          setIsLoading(true);
          setAssessmentList([]);
          setFilteredAssessments([]);
          setAvailableAssessmentTypes(null);

          const searchResults = await getOfflineAssessmentDetails({ filters });

          if (searchResults?.responseCode === 'OK') {
            const result = searchResults?.result;
            if (result) {
              if (result?.QuestionSet?.length > 0) {
                const assessmentData = result.QuestionSet.map((item: any) => ({
                  subject: item?.name,
                  identifier: item?.IL_UNIQUE_ID,
                  createdOn: item?.createdOn,
                  updatedOn: item?.lastUpdatedOn,
                  description: item?.description,
                  board: item?.board,
                  medium: item?.medium,
                  gradeLevel: item?.gradeLevel,
                  assessmentType: item?.assessmentType,
                }));
                setAssessmentList(assessmentData);

                // Extract unique assessment types
                const uniqueTypes = Array.from(
                  new Set(
                    (result.QuestionSet || [])
                      .map((i: any) => i?.assessmentType)
                      .filter((t: any) => !!t)
                  )
                );
                setAvailableAssessmentTypes(uniqueTypes as string[]);
                const term = searchTerm.trim().toLowerCase();
                const initialFiltered = assessmentData.filter(
                  (assessment: any) => {
                    const matchesType =
                      assessment.assessmentType === assessmentType;
                    if (!matchesType) return false;
                    if (term === '') return true;
                    const subject = assessment.subject?.toLowerCase() || '';
                    const description =
                      assessment.description?.toLowerCase() || '';
                    return subject.includes(term) || description.includes(term);
                  }
                );
                setFilteredAssessments(initialFiltered);
              } else {
                setAssessmentList([]);
                setFilteredAssessments([]);
              }
            }
          } else {
            console.log('❌ API response not OK:', searchResults?.responseCode);
          }
        }
      } catch (error) {
        console.error('💥 API Error:', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        console.error(
          'Error fetching getDoIdForAssessmentDetails results:',
          error
        );
      } finally {
        console.log('🏁 API call finished, setting loading to false');
        setIsLoading(false);
      }
    };

    // Fetch when board info is available
    if (centerData && centerData?.board) {
      getDoIdForAssessmentReport(
        centerData.state,
        centerData.board,
        centerData.stream
      );
    } else {
      // If no board data, ensure loading is false
      setIsLoading(false);
    }
  }, [centerData, t]);

  // Safety mechanism to reset loading state if it gets stuck
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 10000); // 10 seconds timeout

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [loading]);

  // Reset loading state when classId is available (following /assessments/index.tsx pattern)
  useEffect(() => {
    if (classId) {
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, [classId]);

  // Search functionality
  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    const term = newSearchTerm.trim().toLowerCase();
    const filtered = assessmentList.filter((assessment: any) => {
      const matchesType = assessment.assessmentType === assessmentType;
      if (!matchesType) return false;
      if (term === '') return true;
      const subject = assessment.subject?.toLowerCase() || '';
      const description = assessment.description?.toLowerCase() || '';
      return subject.includes(term) || description.includes(term);
    });
    setFilteredAssessments(filtered);
  };

  // Sort modal handlers
  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Assessment type change handler
  const handleAssessmentTypeChange = (newType: string) => {
    setAssessmentType(newType);
    const queryParams = { ...query };

    if (newType === 'post') queryParams.type = 'post';
    else if (newType === 'pre') queryParams.type = 'pre';
    else delete queryParams.type;

    router.push({ pathname: router.pathname, query: queryParams }, undefined, {
      shallow: true,
    });
    const term = searchTerm.trim().toLowerCase();
    const filtered = assessmentList.filter((assessment: any) => {
      const matchesType = assessment.assessmentType === newType;
      if (!matchesType) return false;
      if (term === '') return true;
      const subject = assessment.subject?.toLowerCase() || '';
      const description = assessment.description?.toLowerCase() || '';
      return subject.includes(term) || description.includes(term);
    });
    setFilteredAssessments(filtered);
  };

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'pre':
        return t('PROFILE.PRE_TEST');
      case 'post':
        return t('PROFILE.POST_TEST');
      case 'other':
        return t('FORM.OTHER');
      case 'mock':
        return t('PROFILE.MOCK_TEST');
      case 'unit':
        return t('PROFILE.UNIT_TEST');
      default:
        return type;
    }
  };

  // Sort functionality
  const handleSorting = (selectedValue: {
    sortByKey: string;
    sortByValue: string;
  }) => {
    setSelectedSortOption(selectedValue);
    localStorage.setItem(
      'assessmentListSortOption',
      JSON.stringify(selectedValue)
    );

    const sortedAssessments = [...filteredAssessments];

    switch (selectedValue.sortByKey) {
      case 'name':
        sortedAssessments.sort((a: any, b: any) => {
          if (selectedValue.sortByValue === 'asc') {
            return a.subject.localeCompare(b.subject);
          } else {
            return b.subject.localeCompare(a.subject);
          }
        });
        break;
      case 'date':
        sortedAssessments.sort((a: any, b: any) => {
          const dateA = new Date(a.createdOn || 0);
          const dateB = new Date(b.createdOn || 0);
          if (selectedValue.sortByValue === 'asc') {
            return dateA.getTime() - dateB.getTime();
          } else {
            return dateB.getTime() - dateA.getTime();
          }
        });
        break;
      default:
        break;
    }

    setFilteredAssessments(sortedAssessments);
    setModalOpen(false);
  };

  // Assessment card click handler
  const handleAssessmentDetails = (identifier: string, subject: string) => {
    // Navigate to assessment details page with assessmentId, cohortId, and subject
    if (identifier && classId) {
      const navigationUrl = `/manual-assessments/${identifier}?cohortId=${classId}&subject=${encodeURIComponent(
        subject
      )}`;
      router.push(navigationUrl);
    } else {
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    }
  };

  // Route change cleanup
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!url.startsWith('/scp-teacher-repo/assessments/list')) {
        localStorage.removeItem('assessmentListSortOption');
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

      {loading && (
        <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: theme?.palette?.warning['A200'],
          padding: '20px 20px 5px',
        }}
        width="100%"
      >
        <Typography fontSize="22px">
          {t('ASSESSMENTS.MANUAL_ASSESSMENT_LIST')}
        </Typography>
      </Box>

      <SearchBar onSearch={handleSearch} placeholder={t('COMMON.SEARCH')} />

      {/* Dropdown section - matching main assessments page layout */}
      <Grid container>
        <Grid item xs={12} md={6}>
          <Box sx={{ mt: 2, px: '20px', width: '100%' }}>
            <Box className="w-100 d-md-flex">
              <CohortSelectionSection
                classId={classId}
                setClassId={setClassId}
                userId={userId}
                setUserId={setUserId}
                isAuthenticated={isAuthenticated}
                setIsAuthenticated={setIsAuthenticated}
                loading={loading}
                setLoading={setLoading}
                cohortsData={cohortsData}
                setCohortsData={setCohortsData}
                manipulatedCohortData={manipulatedCohortData}
                setManipulatedCohortData={setManipulatedCohortData}
                isManipulationRequired={false}
                isCustomFieldRequired={true}
                showFloatingLabel={true}
                showDisabledDropDown={true}
              />
            </Box>
          </Box>
        </Grid>
        {availableAssessmentTypes && availableAssessmentTypes?.length > 0 ? (
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 2, px: '20px', width: '100%' }}>
              <FormControl sx={{ marginTop: '24px' }} fullWidth>
                <InputLabel
                  style={{
                    color: theme?.palette?.warning['A200'],
                    background: theme?.palette?.warning['A400'],
                    paddingLeft: '2px',
                    paddingRight: '2px',
                  }}
                  id="assessment-type-select-label"
                >
                  {t('ASSESSMENTS.ASSESSMENT_TYPE')}
                </InputLabel>
                <Select
                  labelId="assessment-type-select-label"
                  id="assessment-type-select"
                  label={t('ASSESSMENTS.ASSESSMENT_TYPE')}
                  style={{
                    borderRadius: '4px',
                  }}
                  value={assessmentType}
                  onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                  disabled={availableAssessmentTypes.length === 1}
                >
                  {availableAssessmentTypes.map((type) => (
                    <MenuItem
                      key={type}
                      value={type}
                      style={{ textAlign: 'right' }}
                    >
                      {getAssessmentTypeLabel(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>
        ) : (
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 7, px: '20px', width: '100%' }}>
              <Typography>{t('ASSESSMENTS.NO_ASSESSMENT_TYPE_FOUND')}</Typography>
            </Box>
          </Grid>
        )}
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

      {!isLoading &&
        (!assessmentList?.length || !filteredAssessments?.length) &&
        centerData?.board && <NoDataFound />}

      {!isLoading &&
        (!assessmentList?.length || !filteredAssessments?.length) &&
        !centerData?.board && (
          <Box
            sx={{
              background: theme.palette.action.selected,
              py: 1,
              borderRadius: 2,
              mx: '20px',
              mt: 2,
              p: 2,
            }}
          >
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              {t('COMMON.NO_ASSIGNED_BOARDS')}
            </Typography>
          </Box>
        )}

      {!isLoading && filteredAssessments?.length > 0 && (
        <>
          {/* Results count and sort section */}
          <Box
            sx={{
              mt: 2,
              px: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '500',
                color: theme?.palette?.warning['400'],
                flex: '1 1 auto',
                minWidth: '200px',
              }}
            >
              {filteredAssessments.length === 1
                ? t('ASSESSMENTS.ASSESSMENTS_FOUND', {
                  count: filteredAssessments.length,
                })
                : t('ASSESSMENTS.ASSESSMENTS_FOUND_PLURAL', {
                  count: filteredAssessments.length,
                })}
            </Typography>
            {/* <Button
              onClick={handleOpenModal}
              sx={{
                color: theme.palette.warning.A200,
                borderRadius: '10px',
                fontSize: '14px',
                borderColor: theme.palette.warning.A200,
                '&:hover': {
                  borderColor: theme.palette.warning.A200,
                  backgroundColor: theme.palette.warning.A400,
                },
                flex: '0 0 auto',
              }}
              endIcon={<ArrowDropDownSharpIcon />}
              size="small"
              variant="outlined"
            >
              {t('COMMON.SORT_BY')}
            </Button> */}
          </Box>

          {/* Assessment cards grid */}
          <Box
            sx={{
              background: '#FBF4E4',
              padding: '20px',
              mx: '20px',
              borderRadius: '8px',
            }}
          >
            <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
              {filteredAssessments?.map((assessment: any) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={6}
                  lg={4}
                  xl={3}
                  key={assessment.identifier}
                >
                  <Box
                    sx={{
                      border: `1px solid ${theme.palette.warning['A100']}`,
                      background: theme.palette.warning['A400'],
                      padding: '16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        borderColor: theme.palette.warning['A200'],
                      },
                    }}
                    onClick={() =>
                      handleAssessmentDetails(
                        assessment?.identifier,
                        assessment?.subject
                      )
                    }
                  >
                    <Typography
                      sx={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: theme.palette.warning['300'],
                        mb: 1,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      title={assessment?.subject}
                    >
                      {toPascalCase(assessment?.subject)}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        mt: 'auto',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.palette.warning['300'],
                        }}
                      >
                        {assessment?.gradeLevel || '--'}
                      </Typography>
                      <FiberManualRecordIcon
                        sx={{
                          fontSize: '8px',
                          color: theme.palette.warning['400'],
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.palette.warning['400'],
                        }}
                      >
                        {toPascalCase(assessment?.board) || '--'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
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

export default withAccessControl(
  'accessAssessments',
  accessControl
)(AssessmentList);
