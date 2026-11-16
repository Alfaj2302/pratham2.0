'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Link, Divider, Popover } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import {
  getUserDetails,
  profileComplitionCheck,
} from '@learner/utils/API/userService';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import { getAcademicYear } from '@learner/utils/API/AcademicYearService';
import { TenantName } from '@learner/utils/app.constant';
import { ContentSearch } from '@learner/utils/API/contentService';
import { getAssessmentStatus } from '@learner/utils/API/AssesmentService';
import { getCohortList } from '@learner/utils/API/CohortService';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
import { setUserProgram as setActiveUserProgram } from '@learner/utils/hooks/useUserProgram';
import {
  clearActiveVtBatchCache,
  resolveProgramEntryRoute,
  skipFirstBatchCheck,
} from '@learner/utils/helpers/vtBatchHelper';

type RegistrationTestStatus =
  | 'clear'
  | 'assessmentPending'
  | 'assessmentUnavailable';

interface TenantData {
  tenantId: string;
  tenantName: string;
  tenantType?: string;
  templateId?: string;
  channelId?: string;
  collectionFramework?: string;
  roles?: Array<{ roleName: string; roleId: string }>;
  createdAt?: string;
  createdOn?: string;
  enrolledAt?: string;
  enrollmentDate?: string;
  params?: {
    uiConfig?: {
      landingPage?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface ProgramSwitchModalProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSignOut: () => void;
}

const ProgramSwitchModal: React.FC<ProgramSwitchModalProps> = ({
  open,
  anchorEl,
  onClose,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [enrolledPrograms, setEnrolledPrograms] = useState<TenantData[]>([]);
  const [currentProgram, setCurrentProgram] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllProgramRegistred, setIsAllProgramRegistred] = useState<string | null>(null);
  const [userProgram, setUserProgram] = useState<string | null>(null);

  const [assessmentPendingModal, setAssessmentPendingModal] = useState(false);
  const [pendingAssessmentIdentifier, setPendingAssessmentIdentifier] = useState<string | null>(null);
  const [assessmentUnavailableModal, setAssessmentUnavailableModal] = useState(false);
  const [homeHref, setHomeHref] = useState('/home');

  useEffect(() => {
    const landingPage = localStorage.getItem('landingPage');
    if (landingPage) {
      setHomeHref(landingPage);
    }
  }, []);

  useEffect(() => {
    const fetchEnrolledPrograms = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        const currentTenantId = localStorage.getItem('tenantId');
        const currentProgramName = localStorage.getItem('userProgram');
        setUserProgram(currentProgramName);

        if (!userId) {
          setLoading(false);
          return;
        }

        const userResponse = await getUserDetails(userId, true);
        const tenantData = userResponse?.result?.userData?.tenantData || [];

        //set isAllProgramRegistred
        const programsData = JSON.parse(localStorage.getItem('programsDataLogin') || '[]');
        const visiblePrograms = JSON.parse(localStorage.getItem('visibleProgramsLogin') || '[]');
        const filterIds = tenantData.map((item: any) => item.tenantId);
        const filteredPrograms = programsData?.filter((program: any) =>
          filterIds.includes(program.tenantId)
        );
        setIsAllProgramRegistred(visiblePrograms.length <= filteredPrograms.length ? 'yes' : 'no');

        // Find current program
        const current =
          tenantData.find(
            (tenant: TenantData) => tenant.tenantId === currentTenantId
          ) ||
          tenantData.find(
            (tenant: TenantData) => tenant.tenantName === currentProgramName
          );

        setCurrentProgram(current || null);

        // Get other enrolled programs (excluding current)
        const otherPrograms = tenantData.filter(
          (tenant: TenantData) => (tenant.tenantId !== currentTenantId &&tenant?.roles?.some((role: any) => role?.roleName === 'Learner'))
        );

        setEnrolledPrograms(otherPrograms);
      } catch (error) {
        console.error('Failed to fetch enrolled programs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchEnrolledPrograms();
    }
  }, [open]);

  const checkRegistrationTestStatus = async (
    uiConfig: any,
    enrolledProgramName?: string,
    tenantDataDetails?: any
  ): Promise<RegistrationTestStatus> => {
    const isRegistrationTestEnabled =
      uiConfig?.RegisterationTest === true ||
      uiConfig?.RegisterationTest === 'true';

    if (!isRegistrationTestEnabled) {
      return 'clear';
    }

    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) return 'clear';

    try {
      if (tenantDataDetails?.tenantType !== 'elearning') {
        const academicYearList = await getAcademicYear();
        const allAcademicYearIds = Array.isArray(academicYearList)
          ? academicYearList
              .map((year: { id?: string; isActive?: boolean }) => year?.id)
              .filter(Boolean)
          : [];
        const activeAcademicYear = Array.isArray(academicYearList)
          ? academicYearList.find(
              (year: { id?: string; isActive?: boolean }) => year?.isActive
            )
          : undefined;

        let userHasActiveBatch = false;
        for (const yearId of allAcademicYearIds) {
          localStorage.setItem('academicYearId', yearId as string);
          const cohortResponse = await getCohortList(storedUserId, true, true);
          const hasBatch = Array.isArray(cohortResponse?.result)
            ? cohortResponse.result.some(
                (cohort: {
                  type?: string;
                  cohortStatus?: string;
                  cohortMemberStatus?: string;
                }) =>
                  cohort?.type === 'BATCH' &&
                  cohort?.cohortStatus === 'active'
              )
            : false;
          if (hasBatch) {
            userHasActiveBatch = true;
               localStorage.setItem('cohortAssignedToAnyAcademicYearId', 'yes');

            break;
          }
         
        }

        if (activeAcademicYear?.id) {
          localStorage.setItem('academicYearId', activeAcademicYear.id);
        }

        if (userHasActiveBatch) {
          return 'clear';
        }
      }
    } catch (error) {
      console.error(
        'checkRegistrationTestStatus: getCohortList/getAcademicYear failed',
        error
      );
    }

    let questionSetIdentifier: string | undefined;
    const targetProgramName =
      enrolledProgramName || localStorage.getItem('userProgram');
    const programFilter =
      targetProgramName === 'Second Chance Program'
        ? [targetProgramName, 'Second Chance']
        : targetProgramName
        ? [targetProgramName]
        : [];

    try {
      const preferredLanguage = localStorage.getItem('preferred_language');
      const response = await ContentSearch({
        query: '',
        filters: {
          status: ['Live'],
          primaryCategory: ['Practice Question Set'],
          assessmentType: 'Eligibility Test',
          ...(preferredLanguage ? { contentLanguage: [preferredLanguage] } : {}),
          program: programFilter,
        },
        sort_by: { lastUpdatedOn: 'desc' },
        limit: 1,
        offset: 0,
      });
      questionSetIdentifier =
        response?.result?.QuestionSet?.[0]?.identifier;
    } catch (error) {
      console.error('checkRegistrationTestStatus: ContentSearch failed', error);
    }

    if (!questionSetIdentifier) {
      setAssessmentUnavailableModal(true);
      return 'assessmentUnavailable';
    }

    try {
      const result = await getAssessmentStatus({
        userId: storedUserId,
        courseId: questionSetIdentifier,
        unitId: questionSetIdentifier,
        contentId: questionSetIdentifier,
      });

      if (Array.isArray(result) && result.length === 0) {
        localStorage.setItem(
          'registerationTestQuestionSetIdentifier',
          questionSetIdentifier
        );
        setPendingAssessmentIdentifier(questionSetIdentifier);
        return 'assessmentPending';
      }

      return 'clear';
    } catch (error) {
      console.error(
        'checkRegistrationTestStatus: getAssessmentStatus failed',
        error
      );
      return 'clear';
    }
  };

  const handleProgramSwitch = async (program: TenantData) => {
    try {
      localStorage.removeItem('learnerCourseFilters');
      // The L2 Courses tab keeps its own filter state; it is scoped to the
      // previous program's batch, so it must clear with the rest.
      localStorage.removeItem('l2CourseFilters');
      // Forces a fresh batch lookup the next time the learner enters VT.
      clearActiveVtBatchCache();
      // Where a VT learner lands is decided below, once the switch completes.
      skipFirstBatchCheck();

      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      if (!userId || !token) {
        console.error('Missing userId or token');
        return;
      }

      // Get user details to get full tenant data with all fields
      const userResponse = await getUserDetails(userId, true);
      const userData = userResponse?.result?.userData;
      const tenantData = userData?.tenantData?.find(
        (tenant: TenantData) => tenant.tenantId === program.tenantId
      );

      if (!tenantData) {
        console.error('Tenant data not found for this program');
        return;
      }

      // Set all localStorage values for the selected program (same as handleAccessProgram)
      localStorage.setItem('userId', userId);
      if (tenantData.templateId) {
        localStorage.setItem('templtateId', tenantData.templateId);
      }
      if (userData?.username) {
        localStorage.setItem('userIdName', userData.username);
      }
      if (userData?.firstName) {
        localStorage.setItem('firstName', userData.firstName);
      }
      if (userData?.lastName) {
        localStorage.setItem('lastName', userData.lastName);
      }
      // Set tenant-specific data
      const tenantId = tenantData.tenantId;
      const tenantName = tenantData.tenantName;
      const uiConfig = tenantData.params?.uiConfig;
      const landingPage = tenantData.params?.uiConfig?.landingPage;

      localStorage.setItem('tenantId', tenantId);
      setActiveUserProgram(tenantName);
      localStorage.setItem('landingPage', landingPage || '');
      localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

      // Set channel and collection framework
      if (tenantData.channelId) {
        localStorage.setItem('channelId', tenantData.channelId);
      }

      if (tenantData.collectionFramework) {
        localStorage.setItem(
          'collectionFramework',
          tenantData.collectionFramework
        );
      }

      // Set cookie
      document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;

      // Check profile completion (this sets additional custom fields)
      try {
        await profileComplitionCheck();
      } catch (error) {
        console.error('Profile completion check failed:', error);
        // Continue even if this fails
      }

      // Handle academic year for YOUTHNET
      if (tenantName === TenantName.YOUTHNET) {
        try {
          const academicYearResponse = await getAcademicYear();
          if (academicYearResponse?.[0]?.id) {
            localStorage.setItem('academicYearId', academicYearResponse[0].id);
          }
        } catch (error) {
          console.error('Failed to get academic year:', error);
        }
      }

      // Check registration test gate before allowing access
      const assessmentStatus = await checkRegistrationTestStatus(
        uiConfig,
        tenantName,
        tenantData
      );
      if (assessmentStatus === 'assessmentPending') {
        setAssessmentPendingModal(true);
        return;
      }
      if (assessmentStatus === 'assessmentUnavailable') {
        return;
      }

      // Coming back into VT with a batch goes straight to L2 Courses. Reuses the
      // lookup Layout already started for the new program, so no extra call.
      const entryRoute = await resolveProgramEntryRoute(
        userId,
        tenantName,
        landingPage || '/home'
      );

      // Close modal
      onClose();

      // Navigate to landing page to avoid unauthorized issues
      router.push(entryRoute);
    } catch (error) {
      console.error('Failed to switch program:', error);
    }
  };

  const handleShowAllPrograms = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    localStorage.removeItem('learnerCourseFilters');
    localStorage.removeItem('l2CourseFilters');
    clearActiveVtBatchCache();
    onClose();
    router.push('/programs');
  };

  const handleHomeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClose();
    router.push(homeHref);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return '';
    }
  };

  // Get registration date from tenantData - check multiple possible field names
  const getRegistrationDate = (tenant: TenantData) => {
    return (
      tenant.createdAt ||
      tenant.createdOn ||
      tenant.enrolledAt ||
      tenant.enrollmentDate
    );
  };

  return (
    <>
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          mt: 1,
          minWidth: '300px',
          maxWidth: '400px',
          borderRadius: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Top Section with Background Color */}
      {currentProgram && (
        <Box
          sx={{
            backgroundColor: '#FDF2E5',
            p: 2,
            borderRadius: '8px 8px 0 0',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '20px',
              mb: 0.5,
              color: '#1F1B13',
            }}
          >
            {currentProgram.tenantName}
          </Typography>
          {getRegistrationDate(currentProgram) && (
            <Typography
              variant="body2"
              sx={{
                color: '#666',
                fontSize: '14px',
              }}
            >
              {t('LEARNER_APP.PROGRAM_SWITCH_MODAL.REGISTERED_ON')} {formatDate(getRegistrationDate(currentProgram))}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        {/* Other Programs */}
        {(enrolledPrograms.length > 0 &&  (userProgram !== null && userProgram !== 'Pragyanpath')) && (
          <>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                fontSize: '16px',
                mb: 2,
                color: '#1F1B13',
              }}
            >
              {t('LEARNER_APP.PROGRAM_SWITCH_MODAL.OTHER_PROGRAMS_ENROLLED')}
            </Typography>
            <Box
              sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              {enrolledPrograms.map((program) => (
                <Box
                  key={program.tenantId}
                  component="button"
                  onClick={() => handleProgramSwitch(program)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    width: '100%',
                    p: 1.5,
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#fdbe16',
                      backgroundColor: '#FDF2E5',
                      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#1F1B13',
                      flex: 1,
                    }}
                  >
                    {program.tenantName}
                  </Typography>
                  <ArrowForwardIosIcon
                    sx={{
                      fontSize: '16px',
                      color: '#666',
                      ml: 1,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            component="a"
            href={homeHref}
            onClick={handleHomeClick}
            startIcon={<HomeIcon />}
            sx={{
              borderColor: '#000',
              color: '#000',
              backgroundColor: '#fff',
              textTransform: 'none',
              fontWeight: 500,
              py: 1,
              '&:hover': {
                borderColor: '#000',
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            {t('LEARNER_APP.COMMON.HOME')}
          </Button>
          {(isAllProgramRegistred === 'no' ||
            (userProgram !== null && userProgram !== 'Pragyanpath')) && (
          <Button
            variant="outlined"
            fullWidth
            component="a"
            href="/programs"
            onClick={handleShowAllPrograms}
            sx={{
              borderColor: '#000',
              color: '#000',
              backgroundColor: '#fff',
              textTransform: 'none',
              fontWeight: 500,
              py: 1,
              '&:hover': {
                borderColor: '#000',
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            {t('LEARNER_APP.PROGRAM_SWITCH_MODAL.SHOW_ALL_PROGRAMS')}
          </Button>
          )}
          <Button
            variant="outlined"
            fullWidth
            onClick={onSignOut}
            endIcon={<LogoutIcon />}
            sx={{
              borderColor: '#fdbe16',
              color: '#1F1B13',
              backgroundColor: '#fff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '50px',
              py: 1,
              '&:hover': {
                borderColor: '#fdbe16',
                backgroundColor: '#FDF2E5',
              },
            }}
          >
            {t('COMMON.LOGOUT')}
          </Button>
        </Box>
      </Box>
    </Popover>

      {/* Assessment Gate Modal — shown when registration test is pending */}
      <SimpleModal
        open={assessmentPendingModal}
        onClose={() => setAssessmentPendingModal(false)}
        showFooter={true}
        primaryText={t('LEARNER_APP.REGISTRATION_FLOW.START_ASSESSMENT')}
        primaryActionHandler={() => {
          setAssessmentPendingModal(false);
          onClose();
          // Mark the registration test as addressed (parity with Close) so the
          // ClientLayout route guard doesn't lock the user out of programs if they
          // start the test and then abort it.
          localStorage.setItem('registerationTestGiven', 'Yes');
          if (pendingAssessmentIdentifier) {
            setTimeout(() => {
              globalThis.location.href = `/player/${pendingAssessmentIdentifier}?previousPage=${encodeURIComponent('/scp-dashboard')}&exitLink=${encodeURIComponent('/reattempt-check')}`;
            }, 100);
          }
        }}
        secondaryText={t('COMMON.CLOSE')}
        secondaryActionHandler={() => {
          setAssessmentPendingModal(false);
          localStorage.setItem('registerationTestGiven', 'Yes');
          const landingPage = localStorage.getItem('landingPage') || '/home';
          globalThis.location.href = landingPage;
        }}
      >
        <Box p="10px">
          <Typography variant="body1" textAlign="center">
            {t(
              'LEARNER_APP.REGISTRATION_FLOW.ASSESSMENT_BEFORE_ACCESS_MESSAGE'
            )}
          </Typography>
        </Box>
      </SimpleModal>

      <SimpleModal
        open={assessmentUnavailableModal}
        onClose={() => {
          setAssessmentUnavailableModal(false);
          onClose();
          router.push('/scp-dashboard');
        }}
        showFooter={true}
        primaryText={t('LEARNER_APP.REGISTRATION_FLOW.BACK_TO_DASHBOARD')}
        primaryActionHandler={() => {
          setAssessmentUnavailableModal(false);
          onClose();
          router.push('/scp-dashboard');
        }}
      >
        <Box p="10px">
          <Typography variant="body1" textAlign="center">
            {t(
              'LEARNER_APP.REGISTRATION_FLOW.ASSESSMENT_BEFORE_ACCESS_UNAVAILABLE_MESSAGE'
            )}
          </Typography>
        </Box>
      </SimpleModal>
    </>
  );
};

export default ProgramSwitchModal;
