'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, Grid, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';
import WelcomeScreen from '@learner/components/WelcomeComponent/WelcomeScreen';
import Header from '@learner/components/Header/Header';
import { getUserId, login } from '@learner/utils/API/LoginService';
import { getTenantInfo } from '@learner/utils/API/ProgramService';
import { showToastMessage } from '@learner/components/ToastComponent/Toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import { getAcademicYear } from '@learner/utils/API/AcademicYearService';
import { preserveLocalStorage } from '@learner/utils/helper';
import Loader from '@learner/components/Loader/Loader';
import { getDeviceId } from '@shared-lib-v2/DynamicForm/utils/helper';
import {
  isCaptchaError,
  preloadRecaptcha,
} from '@shared-lib-v2/utils/recaptcha';
import { getUserDetails, profileComplitionCheck } from '@learner/utils/API/userService';
import { telemetryFactory } from '@shared-lib-v2/DynamicForm/utils/telemetry';
import Image from 'next/image';
import playstoreIcon from '../../../public/images/playstore.png';
import prathamQRCode from '../../../public/images/prathamQR.png';
import welcomeGIF from '../../../public/images/welcome.gif';
import { logEvent } from '@learner/utils/googleAnalytics';
import { FilterKey, TenantName } from '../../utils/app.constant';
import { ContentSearch } from '@learner/utils/API/contentService';
import { getAssessmentStatus } from '@learner/utils/API/AssesmentService';
import { getCohortList } from '@learner/utils/API/CohortService';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
import { clearSecureRefreshToken, getSecureRefreshToken, setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';

const Login = dynamic(
  () => import('@login/Components/LoginComponent/LoginComponent'),
  {
    ssr: false,
  }
);

export type RegistrationTestStatus =
  | 'clear'
  | 'assessmentPending'
  | 'assessmentUnavailable';

export const checkRegistrationTestStatus = async (
  uiConfig: any,
  enrolledProgramName?: string,
  tenantDataDetails?:any
): Promise<RegistrationTestStatus> => {
  const isRegistrationTestEnabled =
    uiConfig?.RegisterationTest === true || uiConfig?.RegisterationTest === 'true';

  if (!isRegistrationTestEnabled) {
    return 'clear';
  }

  const storedUserId = localStorage.getItem('userId');
  if (!storedUserId) return 'clear';

  // User just completed enrollment — skip assessment popup
  if (localStorage.getItem('onboardTenantId')) {
    return 'clear';
  }

  try {
    

    if (tenantDataDetails?.[0]?.tenantType !== 'elearning') {
      const academicYearList = await getAcademicYear();
    const allAcademicYearIds = Array.isArray(academicYearList)
      ? academicYearList
          .map((year: { id?: string; isActive?: boolean }) => year?.id)
          .filter(Boolean)
      : [];
const activeAcademicYear = Array.isArray(academicYearList)
      ? academicYearList.find((year: { id?: string; isActive?: boolean }) => year?.isActive)
      : undefined
    if (activeAcademicYear?.id) {
      localStorage.setItem('academicYearId', activeAcademicYear.id);
    }
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

      // Restore active academic year after iterating all IDs
      if (activeAcademicYear?.id) {
        localStorage.setItem('academicYearId', activeAcademicYear.id);
      }

      if (userHasActiveBatch) {
        return 'clear';
      }
    }
  } catch (error) {
    console.error('checkRegistrationTestStatus: getCohortList failed', error);
  }

  let questionSetIdentifier: string | undefined;
  const targetProgramName = enrolledProgramName || localStorage.getItem('userProgram');
  const programFilter =
    targetProgramName === 'Second Chance Program'
      ? [targetProgramName, 'Second Chance']
      : targetProgramName
      ? [targetProgramName]
      : [];

  const preferredLanguage = localStorage.getItem('preferred_language');

  try {
    const response = await ContentSearch({
      query: '',
      filters: {
        status: ['Live'],
        primaryCategory: ['Practice Question Set'],
        assessmentType: 'Eligibility Test',
        program: programFilter,
        ...(preferredLanguage ? { contentLanguage: [preferredLanguage] } : {}),
      },
      sort_by: { lastUpdatedOn: 'desc' },
      limit: 1,
      offset: 0,
    });
    questionSetIdentifier = response?.result?.QuestionSet?.[0]?.identifier;
  } catch (error) {
    console.error('checkRegistrationTestStatus: ContentSearch failed', error);
  }

  if (!questionSetIdentifier) {
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
      return 'assessmentPending';
    }

    return 'clear';
  } catch (error) {
    console.error('checkRegistrationTestStatus: getAssessmentStatus failed', error);
    return 'clear';
  }
};

const AppDownloadSection = () => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      maxWidth="500px"
    >
      {/* QR Code Section */}
      <Grid item xs={5} sm={5} md={4}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
        >
          <Image
            src={prathamQRCode}
            alt={t('LEARNER_APP.LOGIN.qr_image_alt')}
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
          <Box textAlign="center">
            <Typography fontWeight={600} fontSize="14px">
              {t('LEARNER_APP.LOGIN.GET_THE_APP')}
            </Typography>
            <Typography fontSize="12px" color="textSecondary">
              {t('LEARNER_APP.LOGIN.POINT_YOUR_PHONE')}
              <br />
              {t('LEARNER_APP.LOGIN.POINT_CAMERA')}
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* OR Divider */}
      <Grid
        item
        xs={2}
        sm={2}
        md={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography fontWeight={500} fontSize="14px">
          {t('LEARNER_APP.LOGIN.OR')}
        </Typography>
      </Grid>

      {/* Play Store Section */}
      <Grid item xs={5} sm={5} md={5}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          sx={{ cursor: 'pointer' }}
          onClick={() => {
            router.push(
              'https://play.google.com/store/apps/details?id=com.pratham.learning'
            );
          }}
        >
          <Image
            src={playstoreIcon}
            alt={t('LEARNER_APP.LOGIN.playstore_image_alt')}
            width={100}
            height={32}
          />
          <Box textAlign="center">
            <Typography fontSize="12px" color="textSecondary">
              {t('LEARNER_APP.LOGIN.SEARCH_PLAYSTORE')}
              <br />
              {t('LEARNER_APP.LOGIN.ON_PLAYSTORE')}
            </Typography>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

const WelcomeMessage = () => {
  const { t } = useTranslation();

  return (
    <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
      <Image
        src={welcomeGIF}
        alt={t('LEARNER_APP.LOGIN.welcome_image_alt')}
        width={60}
        height={60}
        style={{ marginBottom: '8px' }}
      />

      <Typography
        fontWeight={400}
        fontSize={{ xs: '24px', sm: '32px' }}
        lineHeight={{ xs: '32px', sm: '40px' }}
        letterSpacing="0px"
        textAlign="center"
        sx={{ verticalAlign: 'middle' }}
      >
        {t('LEARNER_APP.LOGIN.welcome_title')}
      </Typography>
      <Typography
        fontWeight={400}
        fontSize={{ xs: '18px', sm: '22px' }}
        lineHeight={{ xs: '24px', sm: '28px' }}
        letterSpacing="0px"
        textAlign="center"
        sx={{ verticalAlign: 'middle' }}
        mb={2}
      >
        {t('LEARNER_APP.LOGIN.welcome_subtitle')}
      </Typography>
    </Box>
  );
};

const LoginPageContent = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultUsername = searchParams.get('username') || '';
  const handleAddAccount = () => {
    router.push('/');
  };
  const { t } = useTranslation();

  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');
  const [isAndroidApp, setIsAndroidApp] = useState(true);
  const [assessmentPendingModal, setAssessmentPendingModal] = useState(false);
  const [assessmentUnavailableModal, setAssessmentUnavailableModal] = useState(false);
  const [notEnrolledModal, setNotEnrolledModal] = useState(false);
  const [notEnrolledProgramName, setNotEnrolledProgramName] = useState('');
  const [notEnrolledTenantId, setNotEnrolledTenantId] = useState('');
  // Non-Learner roles the user already holds in the target program tenant
  // (e.g. Instructor in Second Chance). Any role here blocks self-enrollment.
  const [notEnrolledExistingRoles, setNotEnrolledExistingRoles] = useState<
    string[]
  >([]);
  const [enrollConfirmModal, setEnrollConfirmModal] = useState(false);
  const [enrollConfirmTargetName, setEnrollConfirmTargetName] = useState('');
  const [enrollConfirmTargetId, setEnrollConfirmTargetId] = useState('');
  const [enrolledProgramNames, setEnrolledProgramNames] = useState<string[]>([]);
  const [enrollConfirmProgramData, setEnrollConfirmProgramData] = useState<any>(null);

  const handleSuccessfulLogin = useCallback(
    async (
      response: { access_token: string; refresh_token?: string | null },
      data: { remember: boolean }
    ) => {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      setLoading(true);

      const token = response.access_token;
      const refreshToken = response?.refresh_token;
      // Only store refreshToken if it has a valid value
      if (refreshToken) {
        localStorage.setItem('refreshTokenForAndroid', refreshToken);
        await setSecureRefreshToken(refreshToken);
      } else {
        // Clear refreshTokenForAndroid if no refresh token is provided
        localStorage.removeItem('refreshTokenForAndroid');
        clearSecureRefreshToken();
      }
      localStorage.setItem('token', token);

      const userResponse = await getUserId();

      // Find tenantData with active status and Learner role
      //bug fix for roleid empty issue
      const tenantData = userResponse?.tenantData?.find((tenant: any) => {
        return (
          (tenant?.tenantStatus === 'active' || tenant?.tenantStatus === 'pending') &&
          tenant?.roles?.some((role: any) => role?.roleName === 'Learner')
        );
      });
      const tenantDataDetails = userResponse?.tenantData?.filter((tenant: any) => {
        return (
          (tenant?.tenantStatus === 'active' || tenant?.tenantStatus === 'pending') &&
          tenant?.roles?.some((role: any) => role?.roleName === 'Learner') && tenant?.tenantName !== "Pratham"
        );
      });
      // Extract role information from the matching tenant
      const learnerRole = tenantData?.roles?.find(
        (role: any) => role?.roleName === 'Learner'
      );

      const selectedTenantId = tenantData?.tenantId;
      const selectedTenantName = tenantData?.tenantName;
      const selectedRoleId = learnerRole?.roleId || '';
      const selectedRoleName = learnerRole?.roleName || 'Learner';

      setTenantId(selectedTenantId || '');
      setTenantName(selectedTenantName || '');
      setRoleId(selectedRoleId);
      setRoleName(selectedRoleName);

      // --- Program tenant check (from /programs/:tenantId → /login?tenantId=... flow) ---
      const urlQuery = new URLSearchParams(window.location.search);
      const programTenantId = urlQuery.get('tenantId');

      if (programTenantId) {
        const enrolledTenant = userResponse?.tenantData?.find(
          (tenant: any) =>
            tenant?.tenantId === programTenantId &&
            (tenant?.tenantStatus === 'active' || tenant?.tenantStatus === 'pending') &&
            tenant?.roles?.some((role: any) => role?.roleName === 'Learner')
        );

        if (enrolledTenant) {
          // User is already enrolled — log them directly into this program
          const uiConfig = enrolledTenant?.params?.uiConfig;
          const landingPage = uiConfig?.landingPage;
          const learnerRoleId = enrolledTenant?.roles?.find((r: any) => r.roleName === 'Learner')?.roleId || '';
          localStorage.setItem('userId', userResponse?.userId);
          localStorage.setItem('userIdName', userResponse?.username);
          localStorage.setItem('firstName', userResponse?.firstName || '');
          localStorage.setItem('tenantId', enrolledTenant.tenantId);
          localStorage.setItem('userProgram', enrolledTenant.tenantName);
          localStorage.setItem('roleId', learnerRoleId);
          localStorage.setItem('templtateId', enrolledTenant?.templateId || '');
          localStorage.setItem('landingPage', landingPage || '/home');
          localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));
          if (enrolledTenant?.channelId) localStorage.setItem('channelId', enrolledTenant.channelId);
          if (enrolledTenant?.collectionFramework) localStorage.setItem('collectionFramework', enrolledTenant.collectionFramework);
          document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
          await profileComplitionCheck();

          // Fetch user details and store preferred language BEFORE the registration
          // test check — the main-login path does this. Without it, ContentSearch in
          // checkRegistrationTestStatus runs without the contentLanguage filter and
          // resolves a different question set than the one the learner attempted, so
          // getAssessmentStatus returns [] and the Saral popup wrongly re-appears.
          try {
            const userDetails = await getUserDetails(userResponse?.userId, true);
            if (userDetails?.result?.userData?.customFields) {
              userDetails.result.userData.customFields.forEach((field: any) => {
                const { label, selectedValues } = field;
                if (label === 'WHAT_IS_YOUR_PREFERRED_LANGUAGE') {
                  let preferred = '';
                  if (Array.isArray(selectedValues) && selectedValues.length > 0) {
                    const first = selectedValues[0] as unknown;
                    preferred =
                      typeof first === 'string'
                        ? first
                        : (first as { value?: string })?.value ?? String(first);
                  } else if (typeof selectedValues === 'string') {
                    preferred = selectedValues;
                  }
                  if (preferred) {
                    localStorage.setItem('preferred_language', preferred);
                  }
                }
              });
            }
          } catch (error) {
            console.error(
              'Failed to fetch user details for preferred language',
              error
            );
          }

          const assessmentStatus = await checkRegistrationTestStatus(
            uiConfig,
            enrolledTenant.tenantName,
            [enrolledTenant]
          );
          setLoading(false);
          if (assessmentStatus === 'assessmentPending') {
            localStorage.setItem('registerationTestGiven', 'No');
            setAssessmentPendingModal(true);
            return;
          } else if (assessmentStatus === 'assessmentUnavailable') {
            setAssessmentUnavailableModal(true);
            return;
          }

           if(localStorage.getItem('isAndroidApp') == 'yes' && window.ReactNativeWebView)
            {
            //  let refreshToken = localStorage.getItem('refreshTokenForAndroid');
            //  if (!refreshToken || refreshToken === '') {
            //    refreshToken = localStorage.getItem('refreshToken');
            //  }
            //  window.ReactNativeWebView.postMessage(JSON.stringify({
            //    type: 'LOGIN_INTO_SELECTED_PROGRAM_EVENT',
            //    data: {
            //      userId: userResponse?.userId,
            //      selectedTenantId: enrolledTenant.tenantId,
            //      token: localStorage.getItem('token'),
            //      refreshToken: refreshToken,
            //    }
            //  }));
            router.push(`/programs`);
            }
            else
         router.push(landingPage || '/home');
          return;
        } else {
          // User is not enrolled — look up program name then show modal
          let programName = '';
          let allPrograms: any[] = [];
          try {
            const res = await getTenantInfo();
            allPrograms = res?.result || [];
            const found = allPrograms.find((p: any) => p.tenantId === programTenantId);
            programName = found?.name || '';
            if (found) setEnrollConfirmProgramData(found);
          } catch { /* ignore */ }
          localStorage.setItem('userId', userResponse?.userId);
          localStorage.setItem('userIdName', userResponse?.username);
          localStorage.setItem('firstName', userResponse?.firstName || '');
          localStorage.setItem('roleId', selectedRoleId);
          localStorage.setItem('tenantId', selectedTenantId || '');
          document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
          try {
            const userDetails = await getUserDetails(userResponse?.userId, true);
            if (userDetails?.result?.userData?.customFields) {
              userDetails.result.userData.customFields.forEach((field: any) => {
                const { label, selectedValues } = field;
                if (label === 'WHAT_IS_YOUR_PREFERRED_LANGUAGE') {
                  let preferred = '';
                  if (Array.isArray(selectedValues) && selectedValues.length > 0) {
                    const first = selectedValues[0] as unknown;
                    preferred =
                      typeof first === 'string'
                        ? first
                        : (first as { value?: string })?.value ?? String(first);
                  } else if (typeof selectedValues === 'string') {
                    preferred = selectedValues;
                  }
                  if (preferred) {
                    localStorage.setItem('preferred_language', preferred);
                  }
                }
              });
            }
          } catch (error) {
            console.error('Failed to fetch user details for preferred language', error);
          }

          const accountExists = urlQuery.get('AccountExists');
          if (accountExists === 'true') {
            // Came from AccountExistsCard — show enroll-confirmation modal
            const userProgramNames: string[] = (userResponse?.tenantData || [])
              .filter(
                (t: any) =>
                  (t?.tenantStatus === 'active' || t?.tenantStatus === 'pending') &&
                  t?.roles?.some((r: any) => r?.roleName === 'Learner') &&
                  t?.tenantName !== 'Pratham'
              )
              .map((t: any) => t.tenantName as string);
            setEnrolledProgramNames(userProgramNames);
            setEnrollConfirmTargetName(programName);
            setEnrollConfirmTargetId(programTenantId);
            setEnrollConfirmModal(true);
          } else {
            // Collect the programs the user is already enrolled in so the
            // not-enrolled popup can surface them (e.g. "You have already
            // enrolled to the program: Second Chance and Camp to Club").
            const userProgramNames: string[] = (userResponse?.tenantData || [])
              .filter(
                (t: any) =>
                  (t?.tenantStatus === 'active' || t?.tenantStatus === 'pending') &&
                  t?.roles?.some((r: any) => r?.roleName === 'Learner') &&
                  t?.tenantName !== 'Pratham'
              )
              .map((t: any) => t.tenantName as string);
            setEnrolledProgramNames(userProgramNames);

            // A user who already holds a role in this tenant (Instructor,
            // Teacher, Admin, ...) must not self-enroll into it as a Learner.
            // Capture those roles so the Enrol Now handler can block the flow.
            const existingRolesInTenant: string[] = (
              userResponse?.tenantData || []
            )
              .filter((t: any) => t?.tenantId === programTenantId)
              .flatMap((t: any) =>
                (t?.roles || []).map((r: any) => r?.roleName).filter(Boolean)
              );
            setNotEnrolledExistingRoles(existingRolesInTenant);

            setNotEnrolledProgramName(programName);
            setNotEnrolledTenantId(programTenantId);
            setNotEnrolledModal(true);
          }
          setLoading(false);
          return;
        }
      }
      // --- End program tenant check ---

      if(tenantDataDetails[0]?.tenantName === "Pragyanpath" && tenantDataDetails.length === 1){
      setTimeout(async () => {
        const res = await getUserDetails(userResponse?.userId, true);
        console.log('response=========>', res?.result);
        localStorage.setItem(FilterKey.GROUP_MEMBERSHIP, JSON.stringify(["NA"]));
        localStorage.setItem(FilterKey.JOB_FAMILY, JSON.stringify(["NA"]));
        localStorage.setItem(FilterKey.PSU, JSON.stringify(["NA"]));
        
        // Store custom fields in localStorage
        if (res?.result?.userData?.customFields) {
          res.result.userData.customFields.forEach((field: any) => {
            const { label, selectedValues } = field;
            // localStorage.setItem(
            //   FilterKey[label as keyof typeof FilterKey],
            //   JSON.stringify(selectedValues)
            // );
            if(label === 'EMP_GROUP') {
              localStorage.setItem(FilterKey.GROUP_MEMBERSHIP, JSON.stringify(selectedValues));
            }
            
            if(label === 'JOB_FAMILY') {
              localStorage.setItem(FilterKey.JOB_FAMILY, JSON.stringify(selectedValues));
            }
           
            if(label === 'PSU') {
              localStorage.setItem(FilterKey.PSU, JSON.stringify(selectedValues));
            }

          });
        }
        const uiConfig = userResponse?.tenantData?.find(
          (tenant: any) => tenant.tenantName === "Pragyanpath"
         )?.params?.uiConfig;
        console.log('uiConfig', uiConfig);
        const landingPage =
          userResponse?.tenantData?.find(
            (tenant: any) => tenant.tenantName === "Pragyanpath"
           )?.params?.uiConfig?.landingPage;
        localStorage.setItem('landingPage', landingPage);

        localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

      //  setUserResponse(userResponse);

        //setSwitchDialogOpen(true);
      }, 1000);
    }
      if (tenantData && selectedRoleName === 'Learner') {
        localStorage.setItem('userId', userResponse?.userId);
        localStorage.setItem('roleId', selectedRoleId);
        localStorage.setItem('templtateId', tenantData?.templateId);
        localStorage.setItem('userIdName', userResponse?.username);
        localStorage.setItem('firstName', userResponse?.firstName || '');
        localStorage.setItem('tenantId', selectedTenantId || '');

        // Fetch user details and store preferred language for every tenant
        try {
          const userDetails = await getUserDetails(userResponse?.userId, true);
          console.log('userDetails========>', userDetails);
          if (userDetails?.result?.userData?.customFields) {
            userDetails.result.userData.customFields.forEach((field: any) => {
              const { label, selectedValues } = field;
              if (label === 'WHAT_IS_YOUR_PREFERRED_LANGUAGE') {
                let preferred = '';
                if (Array.isArray(selectedValues) && selectedValues.length > 0) {
                  const first = selectedValues[0] as unknown;
                  preferred =
                    typeof first === 'string'
                      ? first
                      : (first as { value?: string })?.value ?? String(first);
                } else if (typeof selectedValues === 'string') {
                  preferred = selectedValues;
                }
                if (preferred) {
                  localStorage.setItem('preferred_language', preferred);
                }
              }
            });
          }
        } catch (error) {
          console.error('Failed to fetch user details for preferred language', error);
        }

        const uiConfig = tenantData?.params?.uiConfig;
        const landingPage = tenantData?.params?.uiConfig?.landingPage;
        localStorage.setItem('landingPage', landingPage);
        localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

        localStorage.setItem('tenantId', selectedTenantId || '');
        localStorage.setItem('userProgram', selectedTenantName || '');
        await profileComplitionCheck();
        if (selectedTenantName === TenantName.YOUTHNET) {
          const academicYearResponse = await getAcademicYear();
          if (academicYearResponse[0]?.id) {
            localStorage.setItem('academicYearId', academicYearResponse[0]?.id);
          }
        }
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'login-success',
            type: 'CLICK',
            pageid: 'sign-in',
            uid: userResponse?.userId || 'Anonymous',
          },
        };
        telemetryFactory.interact(telemetryInteract);

        const channelId = tenantData?.channelId;
        localStorage.setItem('channelId', channelId);

        const collectionFramework = tenantData?.collectionFramework;
        localStorage.setItem('collectionFramework', collectionFramework);

        document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
        const query = new URLSearchParams(window.location.search);
        const redirectUrl = query.get('redirectUrl');
        const activeLink = query.get('activeLink');
        logEvent({
          action: 'successfully-login-in-learner-app',
          category: 'Login Page',
          label: 'Login Button Clicked',
        });
        if (redirectUrl && redirectUrl.startsWith('/')) {
          router.push(
            `${redirectUrl}${activeLink ? `?activeLink=${activeLink}` : ''}`
          );
        } else {
        console.log('tenantData===>', tenantDataDetails);
        if(tenantDataDetails.length ===1) {
          const assessmentStatus = await checkRegistrationTestStatus(
            uiConfig,
            selectedTenantName,
            tenantDataDetails
          );
          if (assessmentStatus === 'assessmentPending') {
            localStorage.setItem('registerationTestGiven', "No");
    
            setAssessmentPendingModal(true);
          }
          // Redirect to landing page
          else if (assessmentStatus === 'assessmentUnavailable') {
            setLoading(false);
            setAssessmentUnavailableModal(true);
            return;
          }
        else  if(localStorage.getItem('isAndroidApp') == 'yes')
            {
             // Send message to React Native WebView
             // Get refreshToken with fallback - check refreshTokenForAndroid first, then refreshToken
             let refreshToken = localStorage.getItem('refreshTokenForAndroid');
             // Fallback to refreshToken if refreshTokenForAndroid is null or empty
             if (!refreshToken || refreshToken === '') {
               refreshToken = localStorage.getItem('refreshToken');
             }
             if (window.ReactNativeWebView) {
               window.ReactNativeWebView.postMessage(JSON.stringify({
                 type: 'LOGIN_INTO_ONLY_ONE_PROGRAM_EVENT', // Event type identifier
                 data: {
                   userId: userResponse?.userId,
                   tenantId:selectedTenantId,
                   token: localStorage.getItem('token'),
                   refreshToken: refreshToken,
                 
                   // Add any data you want to send
                 }
               }));
             }
            }
            else{
         router.push(`${landingPage}`)
            }
         // router.push(`/programs?tenantId=${tenantDataDetails[0]?.tenantId}`);
        }
        else{
        router.push('/programs');
        }
      }
      } else {
        showToastMessage('Username or password not correct', 'error');
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'login-failed',
            type: 'CLICK',
            pageid: 'sign-in',
          },
        };
        telemetryFactory.interact(telemetryInteract);
      }
      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    preloadRecaptcha();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const isAndroid = localStorage.getItem('isAndroidApp') === 'yes';
        setIsAndroidApp(isAndroid);
        // localStorage.clear();()
        preserveLocalStorage();

        const access_token = localStorage.getItem('token');
        const refresh_token = await getSecureRefreshToken();
        if (access_token) {
          const response = {
            result: {
              access_token,
              refresh_token: refresh_token || undefined,
            },
          };
          handleSuccessfulLogin(response?.result, { remember: false });
        }
        if (!localStorage.getItem('did')) {
          const visitorId = await getDeviceId();
          localStorage.setItem(
            'did',
            typeof visitorId === 'string' ? visitorId : ''
          );
          console.log('Device fingerprint generated successfully');
        }
      } catch (error) {
        console.error('Error generating device fingerprint:', error);
      }
    };
    init();
  }, [handleSuccessfulLogin]);

  const handleForgotPassword = () => {
    localStorage.setItem('redirectionRoute', '/login');
    //   router.push('/password-forget?redirectRoute=/login');

    router.push('/password-forget');
  };
  const handleLogin = async (data: {
    username: string;
    password: string;
    remember: boolean;
  }) => {
    const username = data?.username;
    const password = data?.password;
    try {
      const response = await login({ username, password });
      if (response?.result?.access_token) {
        handleSuccessfulLogin(response?.result, data);
      } else {
        showToastMessage(
          t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT'),
          'error'
        );
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'login-failed',
            type: 'CLICK',
            pageid: 'sign-in',
          },
        };
        telemetryFactory.interact(telemetryInteract);
      }
      // setLoading(false);
    } catch (error: any) {
      //   setLoading(false);
      const errorMessage = isCaptchaError(error)
        ? t('LOGIN_PAGE.CAPTCHA_VERIFICATION_FAILED')
        : t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT');
      showToastMessage(errorMessage, 'error');
      const telemetryInteract = {
        context: { env: 'sign-in', cdata: [] },
        edata: {
          id: 'login-failed',
          type: 'CLICK',
          pageid: 'sign-in',
        },
      };
      telemetryFactory.interact(telemetryInteract);
    }
  };

  return (
    <>
      <Box
        //height="100vh"
        // width="100vw"
        display="flex"
        flexDirection="column"
        //  overflow="hidden"
        sx={{
          //  overflowWrap: 'break-word',
          wordBreak: 'break-word',
          background: 'linear-gradient(135deg, #FFFDF6, #F8EFDA)',
        }}
      >
        {/* Fixed Header */}
        <Header />

        {/* Main Content: Split screen */}
        <Box
          flex={1}
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
        >
          {/* Left: Welcome Screen - Hidden on mobile */}
          <Box
            flex={1}
            display={{ xs: 'none', sm: 'flex' }}
            justifyContent="center"
            alignItems="center"
            sx={{
              minHeight: { xs: 'auto', sm: '100%' },
              py: { xs: 4, sm: 0 },
            }}
          >
            <WelcomeScreen />
          </Box>

          {/* Right: Login Component */}
          <Box
            flex={1}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            px={3}
            boxSizing="border-box"
            sx={{
              minHeight: { xs: 'auto', sm: '100%' },
              py: { xs: 2, sm: 0 },
            }}
          >
            {/* Welcome Message - Only visible on mobile */}
            <Box
              display={{ xs: 'flex', sm: 'none' }}
              justifyContent="center"
              alignItems="center"
              width="100%"
              mb={1}
            >
              <WelcomeMessage />
            </Box>

            <Login
              onLogin={handleLogin}
              handleForgotPassword={handleForgotPassword}
              handleAddAccount={handleAddAccount}
              defaultUsername={defaultUsername}
            />

            {/* App Download Section - Only visible on mobile */}
           { !isAndroidApp && (<Box
              display={{ xs: 'flex', sm: 'none' }}
              justifyContent="center"
              alignItems="center"
              width="100%"
              mt={4}
            >
              <AppDownloadSection />
            </Box>)
}
          </Box>
        </Box>
      </Box>
      {/* <SwitchAccountDialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={userResponse?.tenantData}
      /> */}
      {loading && (
        <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
      )}

      <SimpleModal
        open={assessmentPendingModal}
        onClose={() => setAssessmentPendingModal(false)}
        showFooter={true}
        primaryText={t('LEARNER_APP.REGISTRATION_FLOW.START_ASSESSMENT')}
        primaryActionHandler={() => {
          setAssessmentPendingModal(false);
          // Mark the registration test as addressed (parity with Close) so the
          // ClientLayout route guard doesn't lock the user out of programs if they
          // start the test and then abort it. The Saral popup still re-appears based
          // on remaining attempts (getAssessmentStatus), not this flag.
          localStorage.setItem('registerationTestGiven', 'Yes');
          const pendingAssessmentIdentifier = localStorage.getItem(
            'registerationTestQuestionSetIdentifier'
          );
          if (pendingAssessmentIdentifier) {
            setTimeout(() => {
              window.location.href = `/player/${pendingAssessmentIdentifier}?previousPage=${encodeURIComponent('/scp-dashboard')}&exitLink=${encodeURIComponent('/reattempt-check')}`;
            }, 100);
          }
        }}
        secondaryText={t('COMMON.CLOSE')}
        secondaryActionHandler={() => {
          setAssessmentPendingModal(false);
          localStorage.setItem('registerationTestGiven', 'Yes');
          if(localStorage.getItem('isAndroidApp') == 'yes')
            {
              // Android: hand back to the native dashboard instead of loading the
              // web /programs page in the WebView.
              if ((window as any).ReactNativeWebView) {
                let refreshToken = localStorage.getItem('refreshTokenForAndroid');
                if (!refreshToken || refreshToken === '') {
                  refreshToken = localStorage.getItem('refreshToken');
                }
                (window as any).ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: 'ENROLL_PROGRAM_EVENT',
                    data: {
                      userId: localStorage.getItem('userId'),
                      tenantId: localStorage.getItem('tenantId'),
                      token: localStorage.getItem('token'),
                      refreshToken: refreshToken,
                    },
                  })
                );
              }
            }
            else{
                const landingPage = localStorage.getItem('landingPage') || '/home';
          window.location.href = landingPage;
            }
              }}
      >
        <Box p="10px">
          <Typography variant="body1" textAlign="center">
            {t('LEARNER_APP.REGISTRATION_FLOW.ASSESSMENT_BEFORE_ACCESS_MESSAGE')}
          </Typography>
        </Box>
      </SimpleModal>

      <SimpleModal
        open={assessmentUnavailableModal}
        onClose={() => {
          setAssessmentUnavailableModal(false);
          if (localStorage.getItem('isAndroidApp') == 'yes') {
            // Android: hand back to the native dashboard instead of loading the
            // web /scp-dashboard page in the WebView.
            if ((window as any).ReactNativeWebView) {
              let refreshToken = localStorage.getItem('refreshTokenForAndroid');
              if (!refreshToken || refreshToken === '') {
                refreshToken = localStorage.getItem('refreshToken');
              }
              (window as any).ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'ENROLL_PROGRAM_EVENT',
                  data: {
                    userId: localStorage.getItem('userId'),
                    tenantId: localStorage.getItem('tenantId'),
                    token: localStorage.getItem('token'),
                    refreshToken: refreshToken,
                  },
                })
              );
            }
          } else {
            router.push('/scp-dashboard');
          }
        }}
        showFooter={true}
        primaryText={t('COMMON.OK')}
        primaryActionHandler={() => {
          setAssessmentUnavailableModal(false);
          if (localStorage.getItem('isAndroidApp') == 'yes') {
            // Android: hand back to the native dashboard instead of loading the
            // web /scp-dashboard page in the WebView.
            if ((window as any).ReactNativeWebView) {
              let refreshToken = localStorage.getItem('refreshTokenForAndroid');
              if (!refreshToken || refreshToken === '') {
                refreshToken = localStorage.getItem('refreshToken');
              }
              (window as any).ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'ENROLL_PROGRAM_EVENT',
                  data: {
                    userId: localStorage.getItem('userId'),
                    tenantId: localStorage.getItem('tenantId'),
                    token: localStorage.getItem('token'),
                    refreshToken: refreshToken,
                  },
                })
              );
            }
          } else {
            router.push('/scp-dashboard');
          }
        }}
        modalTitle={t('LEARNER_APP.REGISTRATION_FLOW.COME_BACK_LATER')}
      >
        <Box p="10px">
          <Typography variant="body1">
            {t('LEARNER_APP.REGISTRATION_FLOW.ASSESSMENT_UNAVAILABLE_MESSAGE')}
          </Typography>
        </Box>
      </SimpleModal>

      {/* Not enrolled in program modal */}
      <SimpleModal
        open={notEnrolledModal}
        onClose={() => { setNotEnrolledModal(false); router.push('/programs'); }}
        showCloseIcon
        showFooter={true}
        primaryText={t('LANDING.ENROL_NOW') || 'Enrol Now'}
        primaryActionHandler={() => {
          // Block self-enrollment when the user already holds a role in this
          // tenant (e.g. an Instructor of Second Chance cannot enroll into
          // Second Chance as a Learner). Enrolling into any tenant where they
          // hold no role is still allowed.
          if (notEnrolledExistingRoles.length > 0) {
            const placeholderValues: Record<string, string> = {
              '{role}': notEnrolledExistingRoles.join(', '),
              '{program}': notEnrolledProgramName || 'this program',
            };
            // Split on the placeholders rather than replacing them, so the
            // role and program can be emphasised while the rest of the
            // sentence stays at the base weight. Splitting also keeps the
            // locale free to order the two placeholders however it needs.
            const message = (
              <>
                {t('LANDING.ALREADY_HAS_ROLE_IN_PROGRAM', {
                  defaultValue:
                    'You already have the {role} role in {program}, so you cannot enroll into this program.',
                })
                  .split(/(\{role\}|\{program\})/)
                  .map((part, index) =>
                    placeholderValues[part] ? (
                      <Box component="span" key={index} fontWeight={600}>
                        {placeholderValues[part]}
                      </Box>
                    ) : (
                      part
                    )
                  )}
              </>
            );
            showToastMessage(message, 'error', { fontWeight: 500 });
            return;
          }

          setNotEnrolledModal(false);
          const currentTenantId = localStorage.getItem('tenantId');
          localStorage.setItem('previousTenantId', currentTenantId || '');
          localStorage.setItem('tenantId', notEnrolledTenantId);
          localStorage.setItem('userProgram', notEnrolledProgramName);
          localStorage.setItem('onboardTenantId', notEnrolledTenantId);
          if (enrollConfirmProgramData?.params?.uiConfig) {
            localStorage.setItem('uiConfig', JSON.stringify(enrollConfirmProgramData.params.uiConfig));
          }
          if (enrollConfirmProgramData?.params?.uiConfig?.landingPage) {
            localStorage.setItem('landingPage', enrollConfirmProgramData.params.uiConfig.landingPage);
          }
          localStorage.setItem('enrolledProgramData', JSON.stringify({
            tenantId: notEnrolledTenantId,
            name: notEnrolledProgramName,
            params: enrollConfirmProgramData?.params || {},
          }));
          if (enrollConfirmProgramData?.type) {
            localStorage.setItem('temp_program_type', enrollConfirmProgramData.type);
          }
          router.push('/enroll-profile-completion');
        }}
        // secondaryText={t('LEARNER_APP.PROGRAMS.MY_PROGRAMS') || 'My Programs'}
        // secondaryActionHandler={() => { setNotEnrolledModal(false); router.push('/programs'); }}
      >
        <Box p="10px" display="flex" flexDirection="column" alignItems="center" gap={1}>
          {enrolledProgramNames.length === 1 && (
            <Typography variant="body1" textAlign="center">
              {t('LANDING.ALREADY_ENROLLED_TO_PROGRAM') ||
                'You have already enrolled to the program:'}{' '}
              <Box component="span" fontWeight={700}>
                {enrolledProgramNames[0]}
              </Box>
              .
            </Typography>
          )}
          {enrolledProgramNames.length > 1 && (
            <Box width="100%">
              <Typography variant="body1" textAlign="center">
                {t('LANDING.ALREADY_ENROLLED_TO_PROGRAMS') ||
                  'You have already enrolled to the programs:'}
              </Typography>
              <Box component="ul" sx={{ pl: 3, m: 0, mt: 0.5 }}>
                {enrolledProgramNames.map((name, idx) => (
                  <Box component="li" key={idx}>
                    <Typography variant="body1" fontWeight={700}>
                      {name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          <Typography variant="body1" textAlign="center">
            {t('LANDING.NOT_ENROLLED_IN_PROGRAM') || 'You are not registered in'}{' '}
            <Box component="span" fontWeight={700}>
              {notEnrolledProgramName || 'this program'}
            </Box>
            .
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            {t('LANDING.YOU_CAN_ENROLL') || 'You can enroll into this program.'}
          </Typography>
        </Box>
      </SimpleModal>

      {/* Enroll confirmation modal (AccountExists flow) */}
      <Dialog
        open={enrollConfirmModal}
        onClose={() => setEnrollConfirmModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: '#FFFDF7',
            border: '1px solid #F5E199',
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Close button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1.5, pr: 1.5 }}>
            <IconButton size="small" onClick={() => setEnrollConfirmModal(false)} sx={{ color: '#666' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Title + program list — only when user is already enrolled elsewhere */}
            {enrolledProgramNames.length > 0 && (
              <>
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#1F1B13',
                    lineHeight: 1.5,
                  }}
                >
                  {t('LANDING.ENROLLED_TO_BELOW_PROGRAMS') || 'We can see that you are enrolled to below programs:'}
                </Typography>

                <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                  {enrolledProgramNames.map((name, idx) => (
                    <Box component="li" key={idx}>
                      <Typography sx={{ fontFamily: 'Poppins', fontSize: '14px', color: '#1F1B13' }}>
                        {name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* Confirmation question */}
            <Typography sx={{ fontFamily: 'Poppins', fontSize: '14px', color: '#1F1B13', lineHeight: 1.6 }}>
              {t('LANDING.SURE_TO_ENROLL_INTO') || 'Are you sure you want to enroll into'}{' '}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {enrollConfirmTargetName}
              </Box>
              ?
            </Typography>

            {/* Yes button */}
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={() => {
                setEnrollConfirmModal(false);
                const currentTenantId = localStorage.getItem('tenantId');
                localStorage.setItem('previousTenantId', currentTenantId || '');
                localStorage.setItem('tenantId', enrollConfirmTargetId);
                localStorage.setItem('userProgram', enrollConfirmTargetName);
                localStorage.setItem('onboardTenantId', enrollConfirmTargetId);
                if (enrollConfirmProgramData?.params?.uiConfig) {
                  localStorage.setItem('uiConfig', JSON.stringify(enrollConfirmProgramData.params.uiConfig));
                }
                if (enrollConfirmProgramData?.params?.uiConfig?.landingPage) {
                  localStorage.setItem('landingPage', enrollConfirmProgramData.params.uiConfig.landingPage);
                }
                localStorage.setItem('enrolledProgramData', JSON.stringify({
                  tenantId: enrollConfirmTargetId,
                  name: enrollConfirmTargetName,
                  params: enrollConfirmProgramData?.params || {},
                }));
                if (enrollConfirmProgramData?.type) {
                  localStorage.setItem('temp_program_type', enrollConfirmProgramData.type);
                }
                router.push('/enroll-profile-completion');
              }}
              sx={{
                backgroundColor: '#FDBE16',
                color: '#1F1B13',
                fontFamily: 'Poppins',
                fontWeight: 700,
                fontSize: '15px',
                textTransform: 'none',
                borderRadius: '8px',
                py: 1.4,
                '&:hover': { backgroundColor: '#f0b000' },
              }}
            >
              {t('LANDING.YES') || 'Yes'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LoginPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <LoginPageContent />
  </Suspense>
);

export default LoginPage;