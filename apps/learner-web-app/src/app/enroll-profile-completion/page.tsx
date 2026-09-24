'use client';

import React, { Suspense, useState } from 'react';
import EditProfile from '@learner/components/EditProfile/EditProfile';
import { useRouter } from 'next/navigation';
import { getUserDetails, profileComplitionCheck, updateUser } from '@learner/utils/API/userService';
import { getAcademicYear } from '@learner/utils/API/AcademicYearService';
import { TenantName } from '@learner/utils/app.constant';
import { logEvent } from '@learner/utils/googleAnalytics';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
import AssessmentRequiredModal from '@learner/components/AssessmentRequiredModal/AssessmentRequiredModal';
import { Box, Typography } from '@mui/material';
import SignupSuccess from '@learner/components/SignupSuccess /SignupSuccess ';
import { ContentSearch } from '@learner/utils/API/contentService';
import { enrollUserTenant } from '@learner/utils/API/EnrollmentService';
import { getCohortList } from '@learner/utils/API/CohortService';
import { useTranslation } from '@shared-lib';
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
const EnrollProfileCompletionInner = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [signupSuccessModal, setSignupSuccessModal] = useState(false);
  const [assessmentRequiredModal, setAssessmentRequiredModal] = useState(false);
  const [assessmentUnavailableModal, setAssessmentUnavailableModal] = useState(false);
  const [landingPage, setLandingPage] = useState<string>('');

  const handleAccessProgram = async () => {
    if (typeof window === 'undefined') return;
    try {
      const storedUserId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      const enrolledProgramData = localStorage.getItem('enrolledProgramData');

      if (!storedUserId || !token || !enrolledProgramData) {
        console.error('Missing required data for program access');
        router.push('/programs');
        return;
      }

      const program = JSON.parse(enrolledProgramData);

      // Use program data directly (no enrollment needed)
      const tenantId = program.tenantId;
      const tenantName = program.name;
      const uiConfig = program.params?.uiConfig;
      const landingPage = program.params?.uiConfig?.landingPage;

      // Get user details for identity fields only
      const userResponse = await getUserDetails(storedUserId, true);
      localStorage.setItem('userId', storedUserId);
      localStorage.setItem('userIdName', userResponse?.result?.userData?.username);
      localStorage.setItem('firstName', userResponse?.result?.userData?.firstName || '');
      localStorage.setItem('lastName', userResponse?.result?.userData?.lastName || '');

      if (program.params?.templateId) {
        localStorage.setItem('templtateId', program.params.templateId);
      }
      if (program.params?.channelId) {
        localStorage.setItem('channelId', program.params.channelId);
      }
      if (program.params?.collectionFramework) {
        localStorage.setItem('collectionFramework', program.params.collectionFramework);
      } else {
        // The enrolled-program payload doesn't carry collectionFramework, so
        // clear any value left over from a previously active program instead
        // of leaving it in place. CommonL1ContentList only re-fetches this
        // from getTenantInfo() when nothing is stored, so a stale value here
        // would otherwise keep pointing the dashboard at the old program's
        // framework APIs.
        localStorage.removeItem('collectionFramework');
      }

      localStorage.setItem('landingPage', landingPage || '');
      localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('userProgram', tenantName);

      // Check profile completion
      await profileComplitionCheck();

      // Handle academic year for YOUTHNET
      if (tenantName === TenantName.YOUTHNET) {
        const academicYearResponse = await getAcademicYear();
        if (academicYearResponse?.[0]?.id) {
          localStorage.setItem('academicYearId', academicYearResponse[0].id);
        }
      }

      // Set cookie
      document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;

      // Log analytics event
      logEvent({
        action: 'access-program-after-enrollment',
        category: 'Enrollment Profile Completion',
        label: 'Profile Completed and Program Accessed',
      });

      // Clean up enrolled program data
      localStorage.removeItem('enrolledProgramData');
      localStorage.removeItem('previousTenantId');

      const finalLandingPage = landingPage || '/home';
      setLandingPage(finalLandingPage);

      const isRegisterationTestEnabled =
        uiConfig?.RegisterationTest === true || uiConfig?.RegisterationTest === 'true';
      console.log('isRegisterationTestEnabled', isRegisterationTestEnabled);

      if (isRegisterationTestEnabled) {
        // Enroll the user into the tenant immediately on Finish Enroll (parity with
        // non-test programs). The eligibility test flow below still runs afterwards.
        try {
          const enrollUserId = localStorage.getItem('userId');
          const enrollRoleId = localStorage.getItem('roleId');
          const enrollTenantId = localStorage.getItem('tenantId');
          const userTenantStatus = uiConfig?.isTenantPendingStatus;
          if (enrollUserId && enrollRoleId && enrollTenantId) {
            if (userTenantStatus) {
              await enrollUserTenant({ userId: enrollUserId, tenantId: enrollTenantId, roleId: enrollRoleId, userTenantStatus: 'pending' });
            } else {
              await enrollUserTenant({ userId: enrollUserId, tenantId: enrollTenantId, roleId: enrollRoleId });
            }
            console.log('Enrolled into tenant:', enrollTenantId);
            if (userTenantStatus) {
              try {
                await updateUser(enrollUserId, {
                  userData: {},
                  customFields: [{
                    fieldId: 'f8dc1d5f-9b2b-412e-a22a-351bd8f14963',
                    value: 'pending',
                  }],
                });
              } catch (updateError) {
                console.error('Failed to update pending custom field:', updateError);
              }
            }
          }
        } catch (enrollError) {
          console.error('Enrollment failed:', enrollError);
        }

        // Check if user already has an active batch across all academic years
        try {
          const academicYearList = await getAcademicYear();
          const allAcademicYearIds = Array.isArray(academicYearList)
            ? academicYearList
                .map((year: { id?: string; isActive?: boolean }) => year?.id)
                .filter(Boolean)
            : [];
          const activeAcademicYear = Array.isArray(academicYearList)
            ? academicYearList.find((year: { id?: string; isActive?: boolean }) => year?.isActive)
            : undefined;

          let userHasActiveBatch = false;
          for (const yearId of allAcademicYearIds) {
            localStorage.setItem('academicYearId', yearId as string);
            const cohortResponse = await getCohortList(storedUserId!, true, true);
            const hasBatch = Array.isArray(cohortResponse?.result)
              ? cohortResponse.result.some(
                  (cohort: { type?: string; cohortStatus?: string; cohortMemberStatus?: string }) =>
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
            setSignupSuccessModal(true);
            return;
          }
        } catch (error) {
          console.error('Batch check failed in enroll-profile-completion:', error);
        }

        try {
          const preferredLanguage = localStorage.getItem('preferred_language');
          // Build the search filter from the program actually being enrolled
          // into (matching the pattern used in ProgramSwitchModal,
          // EnrollProgramCarousel, login page, AssessmentAttempts, and
          // AttemptAssessmentButton) so each program finds its own assessment
          // content instead of always searching under SCP's legacy tag.
          const programFilter =
            tenantName === TenantName.SECOND_CHANCE_PROGRAM
              ? [tenantName, 'Second Chance']
              : [tenantName];
          const response = await ContentSearch({
            query: '',
            filters: {
              status: ['Live'],
              primaryCategory: ['Practice Question Set'],
              assessmentType: 'Eligibility Test',
              ...(preferredLanguage ? { contentLanguage: [preferredLanguage] } : {}),
              program: programFilter,
            },
            sort_by: {
              lastUpdatedOn: 'desc',
            },
            limit: 1,
            offset: 0,
          });
          const questionSetIdentifier = response?.result?.QuestionSet?.[0]?.identifier;
          console.log('questionSetIdentifier from API:', questionSetIdentifier);
          if (questionSetIdentifier) {
            localStorage.setItem('registerationTestQuestionSetIdentifier', questionSetIdentifier);
            localStorage.setItem('registerationTestGiven', 'No');
            setAssessmentRequiredModal(true);
          } else {
            setAssessmentUnavailableModal(true);
          }
        } catch (error) {
          console.error('ContentSearch failed:', error);
          setAssessmentUnavailableModal(true);
        }
      } else {
        // No assessment required — enroll directly then show success modal
        try {
          const storedUserId = localStorage.getItem('userId');
          const storedRoleId = localStorage.getItem('roleId');
          const enrollTenantId = localStorage.getItem('tenantId');
          const userTenantStatus = uiConfig?.isTenantPendingStatus;
          if (storedUserId && storedRoleId && enrollTenantId) {
            if (userTenantStatus) {
              await enrollUserTenant({ userId: storedUserId, tenantId: enrollTenantId, roleId: storedRoleId, userTenantStatus: 'pending' });
            } else {
              await enrollUserTenant({ userId: storedUserId, tenantId: enrollTenantId, roleId: storedRoleId });
            }
            console.log('Enrolled into tenant:', enrollTenantId);
            // Always update user with pending custom field after enrollment
            try {
              if (userTenantStatus) {
              await updateUser(storedUserId, {
                userData: {},
                customFields: [{
                  fieldId: 'f8dc1d5f-9b2b-412e-a22a-351bd8f14963',
                  value: 'pending',
                }],
              });
            }
            } catch (updateError) {
              console.error('Failed to update pending custom field:', updateError);
            }
          }
        } catch (enrollError) {
          console.error('Enrollment failed:', enrollError);
        }
        setSignupSuccessModal(true);
      }
    } catch (error) {
      console.error('Failed to access program:', error);
      router.push('/programs');
    }
  };

  const onCloseSignupSuccessModal = () => {
    setSignupSuccessModal(false);
  };

  const onSigin = () => {
    try {
      console.log('========== onSigin CALLED ==========');
      console.log('isAndroidApp:', localStorage.getItem('isAndroidApp'));
      console.log('tenantId:', localStorage.getItem('tenantId'));
      console.log('landingPage from state:', landingPage);
      console.log('landingPage from localStorage:', localStorage.getItem('landingPage'));
      
      const isAndroid = localStorage.getItem('isAndroidApp') === 'yes';
      console.log('isAndroid check:', isAndroid);
      
      if(isAndroid)
        {
         console.log('Android path - sending message to WebView');
         // Send message to React Native WebView

              //  const enrolledProgramData = localStorage.getItem('enrolledProgramData');

              //        const program = JSON.parse(enrolledProgramData || '{}');


            // Get refreshToken with fallback - check refreshTokenForAndroid first, then refreshToken
          let refreshToken = localStorage.getItem('refreshTokenForAndroid');
          // Fallback to refreshToken if refreshTokenForAndroid is null or empty
          if (!refreshToken || refreshToken === '') {
            refreshToken = localStorage.getItem('refreshToken');
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ENROLL_PROGRAM_EVENT', // Event type identifier
              data: {
                userId: localStorage.getItem('userId'),
                tenantId: localStorage.getItem('tenantId'),
                token: localStorage.getItem('token'),
                refreshToken: refreshToken,

                // Add any data you want to send
              }
            }));
          }
         setSignupSuccessModal(false);
        }
        else{
          console.log('Web path - navigating to:', landingPage || '/home');
          localStorage.removeItem('enrollTenantId');
          localStorage.removeItem('temp_program_type');
          localStorage.removeItem('onboardTenantId');
          // Use window.location.href to avoid remounting EditProfile before navigation completes
          window.location.href = landingPage || '/home';
      }
    } catch (error) {
      console.error('Error in onSigin:', error);
    }
  };

  const handleAssessmentModalClose = async () => {
    setAssessmentRequiredModal(false);
    // Enrollment already happened on Finish Enroll (handleAccessProgram); here we
    // only mark the registration test as given and continue.
    localStorage.setItem('registerationTestGiven', 'Yes');
     const isAndroid = localStorage.getItem('isAndroidApp') === 'yes';
      console.log('isAndroid check:', isAndroid);
                localStorage.setItem('registerationTestGiven', 'Yes');

      if(isAndroid)
        {
         console.log('Android path - sending message to WebView');
         // Send message to React Native WebView

              //  const enrolledProgramData = localStorage.getItem('enrolledProgramData');

              //        const program = JSON.parse(enrolledProgramData || '{}');


            // Get refreshToken with fallback - check refreshTokenForAndroid first, then refreshToken
          let refreshToken = localStorage.getItem('refreshTokenForAndroid');
          // Fallback to refreshToken if refreshTokenForAndroid is null or empty
          if (!refreshToken || refreshToken === '') {
            refreshToken = localStorage.getItem('refreshToken');
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ENROLL_PROGRAM_EVENT', // Event type identifier
              data: {
                userId: localStorage.getItem('userId'),
                tenantId: localStorage.getItem('tenantId'),
                token: localStorage.getItem('token'),
                refreshToken: refreshToken,

                // Add any data you want to send
              }
            }));
          }
        // setSignupSuccessModal(false);
        }
        else{
    localStorage.removeItem('onboardTenantId');
    localStorage.removeItem('enrollTenantId');
    const finalLandingPage = localStorage.getItem('landingPage') || '/home';
    window.location.href = finalLandingPage;
        }
  };

  const onAssessmentUnavailableOk = async () => {
    setAssessmentUnavailableModal(false);
    localStorage.removeItem('enrollTenantId');
    // Enrollment already happened on Finish Enroll (handleAccessProgram).
    console.log('========== onAssessmentUnavailableOk CALLED ==========');
    const isAndroid = localStorage.getItem('isAndroidApp') === 'yes';
    console.log('isAndroid check:', isAndroid);

    if (isAndroid) {
      console.log('Android path - sending message to WebView');
      if (window.ReactNativeWebView) {
        let refreshToken = localStorage.getItem('refreshTokenForAndroid');
        if (!refreshToken || refreshToken === '') {
          refreshToken = localStorage.getItem('refreshToken');
        }
        console.log('Posting ENROLL_PROGRAM_EVENT to ReactNativeWebView');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ENROLL_PROGRAM_EVENT', // Event type identifier
          data: {
            userId: localStorage.getItem('userId'),
            tenantId: localStorage.getItem('tenantId'),
            token: localStorage.getItem('token'),
            refreshToken: refreshToken,
          }
        }));
      } else {
        console.log('isAndroidApp is yes but window.ReactNativeWebView is missing');
      }
    } else {
      console.log('Web path - navigating to /scp-dashboard');
      window.location.href = '/scp-dashboard';
    }
  };

  const handleStartAssessment = async () => {
     const questionSetIdentifier = localStorage.getItem('registerationTestQuestionSetIdentifier');

    // Step 1: Try to get identifier from API (non-blocking — failure won't prevent navigation)
  
    // Step 2: Fallback to previously stored identifier if API failed or returned nothing
    // if (!questionSetIdentifier) {
    //   questionSetIdentifier =
    //     localStorage.getItem('registerationTestQuestionSetIdentifier') || undefined;
    //   console.log('questionSetIdentifier from localStorage:', questionSetIdentifier);
    // }

    // if (!questionSetIdentifier) {
    //   console.error('No questionSetIdentifier found, cannot navigate to player');
    //   return;
    // }

    // // Step 3: Store and navigate
    // localStorage.setItem('registerationTestQuestionSetIdentifier', questionSetIdentifier);
    // setAssessmentRequiredModal(false);

    // Use window.location.href for guaranteed navigation (router.push can silently fail in modals)
     if(questionSetIdentifier){
      // Mark the registration test as addressed (parity with Close) so the
      // ClientLayout route guard doesn't lock the user out of programs if they
      // start the test and then abort it.
      localStorage.setItem('registerationTestGiven', 'Yes');
      window.location.href = `/player/${questionSetIdentifier}?previousPage=${encodeURIComponent('/scp-dashboard')}&exitLink=${encodeURIComponent('/reattempt-check')}`;


   }
  };

  return (
    <>
      {!signupSuccessModal && !assessmentRequiredModal && !assessmentUnavailableModal && (
        <EditProfile
          completeProfile={true}
          enrolledProgram={true}
          uponEnrollCompletion={handleAccessProgram}
        />
      )}

      <SimpleModal
        open={signupSuccessModal}
        onClose={onCloseSignupSuccessModal}
        showFooter={true}
        primaryText={'Start learning'}
        primaryActionHandler={onSigin}
      >
        <Box p="10px">
          <SignupSuccess withProgramName={true} />
        </Box>
      </SimpleModal>

      <AssessmentRequiredModal
        open={assessmentRequiredModal}
        onClose={handleAssessmentModalClose}
        onStartAssessment={handleStartAssessment}
      />
      <SimpleModal
        open={assessmentUnavailableModal}
        onClose={onAssessmentUnavailableOk}
        showFooter={true}
        primaryText={t('COMMON.OK')}
        primaryActionHandler={onAssessmentUnavailableOk}
        modalTitle={t('LEARNER_APP.REGISTRATION_FLOW.COME_BACK_LATER')}
      >
        <Box p="10px">
          <Typography variant="body1">
            {t('LEARNER_APP.REGISTRATION_FLOW.ASSESSMENT_UNAVAILABLE_MESSAGE')}
          </Typography>
        </Box>
      </SimpleModal>
    </>
  );
};

const EnrollProfileCompletionPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnrollProfileCompletionInner />
    </Suspense>
  );
};

export default EnrollProfileCompletionPage;
