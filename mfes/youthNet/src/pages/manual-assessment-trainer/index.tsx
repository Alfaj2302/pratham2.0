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
import React, { useEffect, useState } from 'react';
import AssessmentSortModal from '../../components/assessment/AssessmentSortModal';
import TrainerCohortSelection from '../../components/assessment/TrainerCohortSelection';
import NoDataFound from '../../components/common/NoDataFound';
import Header from '../../components/Header';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Searchbar';
import { showToastMessage } from '../../components/Toastify';
import {
  getCoursesForAssessments,
  getOfflineAssessmentDetails,
} from '../../services/AssesmentService';
import { accessControl, loggedInProgram } from '../../utils/app.config';
import { toPascalCase } from '../../utils/helper';
import withAccessControl from '../../utils/hoc/withAccessControl';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';

// Manual Assessment (Trainer) — offline assessments attached to the Trainer's selected batch.
//
// A deliberate sibling of the existing /manual-assessments route, which serves the volunteer/village
// flow and is left untouched (see D1 in the L2 plan).
//
// Unlike scp-teacher-repo's equivalent, this does NOT run a broad "every Live offline assessment"
// search. A batch carries its own assessment do_ids in its ASSESSMENTS customField, surfaced as
// `batch.assessmentIds`, so the search is scoped to exactly those (D9/§5.5).

const SORT_STORAGE_KEY = 'assessmentListSortOption';

const AssessmentList = () => {
  const theme = useTheme<any>();
  const router = useRouter();
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [assessmentList, setAssessmentList] = useState<any[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<MyTeachingCenterBatch | null>(null);
  const [availableAssessmentTypes, setAvailableAssessmentTypes] = useState<
    string[] | null
  >(null);
  const [assessmentType, setAssessmentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
    }
  }, []);

  // Filters the already-fetched list by the active type + search term.
  const applyFilters = (
    list: any[],
    type: string,
    term: string
  ) => {
    const needle = term.trim().toLowerCase();
    return list.filter((assessment: any) => {
      // Before any type is chosen, show everything the batch has.
      if (type && assessment.assessmentType !== type) return false;
      if (needle === '') return true;
      const subject = assessment.subject?.toLowerCase() || '';
      const description = assessment.description?.toLowerCase() || '';
      return subject.includes(needle) || description.includes(needle);
    });
  };

  // Fetch the assessments attached to the selected batch.
  useEffect(() => {
    const fetchBatchAssessments = async () => {
      const assessmentIds = selectedBatch?.assessmentIds ?? [];

      if (!assessmentIds.length) {
        setAssessmentList([]);
        setFilteredAssessments([]);
        setAvailableAssessmentTypes([]);
        setIsLoading(false);
        return;
      }

      const filters = {
        program: loggedInProgram,
        status: ['Live'],
        primaryCategory: ['Practice Question Set'],
        evaluationType: ['offline'],
        identifier: assessmentIds,
      };

      try {
        setIsLoading(true);
        setAssessmentList([]);
        setFilteredAssessments([]);
        setAvailableAssessmentTypes(null);

        const searchResults = await getOfflineAssessmentDetails({ filters });

        if (searchResults?.responseCode === 'OK') {
          const result = searchResults?.result;
          if (result?.QuestionSet?.length > 0) {
            const assessmentData = result.QuestionSet.map((item: any) => ({
              subject: item?.name,
              identifier: item?.IL_UNIQUE_ID,
              createdOn: item?.createdOn,
              updatedOn: item?.lastUpdatedOn,
              description: item?.description,
              // Board is read off the assessment, never used to filter (D6).
              board: item?.board,
              medium: item?.medium,
              gradeLevel: item?.gradeLevel,
              assessmentType: item?.assessmentType,
            }));
            // Resolve each assessment's owning Course. The detail pages need it as `parentId`:
            // assessment tracking keys off course + unit, not the assessment id alone.
            const courses = await getCoursesForAssessments(
              assessmentData.map((item: any) => item.identifier),
              loggedInProgram
            );
            const parentIdByAssessment = new Map<string, string>();
            courses.forEach((course: any) => {
              (course?.leafNodes || []).forEach((leaf: string) => {
                if (!parentIdByAssessment.has(leaf)) {
                  parentIdByAssessment.set(leaf, course.identifier);
                }
              });
            });
            assessmentData.forEach((item: any) => {
              item.parentId = parentIdByAssessment.get(item.identifier) ?? '';
            });

            setAssessmentList(assessmentData);

            const uniqueTypes = Array.from(
              new Set(
                assessmentData.map((i: any) => i?.assessmentType).filter(Boolean)
              )
            ) as string[];
            setAvailableAssessmentTypes(uniqueTypes);
            setFilteredAssessments(
              applyFilters(assessmentData, assessmentType, searchTerm)
            );
          } else {
            setAssessmentList([]);
            setFilteredAssessments([]);
            setAvailableAssessmentTypes([]);
          }
        }
      } catch (error) {
        console.error('Error fetching offline assessment details:', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchAssessments();
  }, [selectedBatch]);

  // Default the type dropdown to the first type the batch actually offers.
  useEffect(() => {
    if (availableAssessmentTypes?.length) {
      const fromQuery =
        typeof query.type === 'string' && availableAssessmentTypes.includes(query.type)
          ? query.type
          : null;
      const next = fromQuery ?? availableAssessmentTypes[0];
      setAssessmentType(next);
      setFilteredAssessments(applyFilters(assessmentList, next, searchTerm));
    } else {
      setAssessmentType('');
    }
  }, [availableAssessmentTypes]);

  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setFilteredAssessments(
      applyFilters(assessmentList, assessmentType, newSearchTerm)
    );
  };

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  const handleAssessmentTypeChange = (newType: string) => {
    setAssessmentType(newType);
    const queryParams = { ...query, type: newType };
    router.push({ pathname: router.pathname, query: queryParams }, undefined, {
      shallow: true,
    });
    setFilteredAssessments(applyFilters(assessmentList, newType, searchTerm));
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
        return toPascalCase(type);
    }
  };

  const handleSorting = (selectedValue: {
    sortByKey: string;
    sortByValue: string;
  }) => {
    setSelectedSortOption(selectedValue);
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(selectedValue));

    const sorted = [...filteredAssessments];
    switch (selectedValue.sortByKey) {
      case 'names':
        sorted.sort((a: any, b: any) =>
          selectedValue.sortByValue === 'A_To_Z'
            ? (a.subject || '').localeCompare(b.subject || '')
            : (b.subject || '').localeCompare(a.subject || '')
        );
        break;
      case 'marksObtained':
        // No per-assessment score on this list; fall back to recency so the action still does
        // something predictable rather than silently no-op.
        sorted.sort((a: any, b: any) => {
          const dateA = new Date(a.createdOn || 0).getTime();
          const dateB = new Date(b.createdOn || 0).getTime();
          return selectedValue.sortByValue === 'asc' ? dateB - dateA : dateA - dateB;
        });
        break;
      default:
        break;
    }

    setFilteredAssessments(sorted);
    setModalOpen(false);
  };

  const handleAssessmentDetails = (
    identifier: string,
    subject: string,
    parentId?: string
  ) => {
    if (identifier && classId) {
      router.push({
        pathname: `/manual-assessment-trainer/${identifier}`,
        query: {
          cohortId: classId,
          subject,
          ...(parentId ? { parentId } : {}),
        },
      });
    } else {
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    }
  };

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!url.includes('/manual-assessment-trainer')) {
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
        <Typography fontSize="22px">
          {t('ASSESSMENTS.MANUAL_ASSESSMENT_LIST')}
        </Typography>
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
            <FormControl fullWidth disabled={!availableAssessmentTypes?.length}>
              <InputLabel
                style={{
                  color: theme?.palette?.warning['A200'],
                  background: theme?.palette?.warning['A400'],
                  paddingLeft: '2px',
                  paddingRight: '2px',
                }}
                id="manual-assessment-type-label"
              >
                {t('ASSESSMENTS.ASSESSMENT_TYPE')}
              </InputLabel>
              <Select
                labelId="manual-assessment-type-label"
                id="manual-assessment-type-select"
                label={t('ASSESSMENTS.ASSESSMENT_TYPE')}
                style={{ borderRadius: '4px' }}
                onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                value={assessmentType}
              >
                {(availableAssessmentTypes ?? []).map((type) => (
                  <MenuItem key={type} value={type}>
                    {getAssessmentTypeLabel(type)}
                  </MenuItem>
                ))}
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

      {!isLoading && filteredAssessments.length > 0 && (
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
            {t('ASSESSMENTS.ASSESSMENTS_FOUND', {
              count: filteredAssessments.length,
            })}
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

      {!isLoading && filteredAssessments.length === 0 && <NoDataFound />}

      {!isLoading && filteredAssessments.length > 0 && (
        <Box sx={{ background: '#FBF4E4', padding: '20px' }}>
          <Grid container spacing={2}>
            {filteredAssessments.map((assessment: any) => (
              <Grid item xs={12} sm={12} md={6} lg={4} key={assessment.identifier}>
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.warning['A100']}`,
                    background: theme.palette.warning['A400'],
                    padding: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    height: '100%',
                  }}
                  onClick={() =>
                    handleAssessmentDetails(
                      assessment.identifier,
                      assessment.subject,
                      assessment.parentId
                    )
                  }
                >
                  <Box
                    sx={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: theme.palette.warning['300'],
                    }}
                    className="one-line-text"
                  >
                    {assessment.subject}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      pt: '6px',
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: theme.palette.warning['300'],
                      }}
                    >
                      {assessment.gradeLevel}
                    </Box>
                    <FiberManualRecordIcon
                      sx={{ fontSize: '10px', color: theme.palette.warning['400'] }}
                    />
                  </Box>
                  <Box
                    sx={{
                      fontSize: '12px',
                      fontWeight: '400',
                      color: theme.palette.warning['400'],
                      pt: '6px',
                    }}
                  >
                    {assessment.board}
                  </Box>
                </Box>
              </Grid>
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

export default withAccessControl('accessAssessments', accessControl)(AssessmentList);
