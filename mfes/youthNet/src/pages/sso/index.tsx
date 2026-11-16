'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Card,
  CardContent,
  Fade,
  keyframes,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@shared-lib';
import { RoleId, TenantName, FilterKey } from '../../utils/app.constant';
import { showToastMessage } from '../../components/Toastify';
import Image from 'next/image';
import { getUserId, getUserDetails } from '../../services/ProfileService';
import { getAcademicYear } from '../../services/AcademicYearService';
import { telemetryFactory } from '../../utils/telemetry';
import { logEvent } from '../../utils/googleAnalytics';
import SwitchAccountDialog from '@shared-lib-v2/SwitchAccount/SwitchAccount';
import Loader from '../../components/Loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import welcomeGIF from '../../../public/images/welcome.gif';
import { setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';
import { startSessionTimer } from '@shared-lib-v2/utils/sessionTimeout';

interface SSOAuthParams {
  accessToken: string;
  userId: string;
  roleId: string;
  ssoProvider: string;
}

const NEWTON_SSO_BASE_URL =
  process.env.NEXT_PUBLIC_NEWTON_SSO_URL ||
  'https://prathamerp.org/Config/OAuthLogin/PRATHAM';

const YOUTHNET_BASE_PATH = '/youthnet';

const buildNewtonSsoRedirectUrl = (env = 'newton') => {
  const currentBaseUrl =
    globalThis.window !== undefined ? globalThis.window.location.origin : '';
  const callbackUrl = `${currentBaseUrl}${YOUTHNET_BASE_PATH}/sso?env=${env}`;
  const hasQueryParams = NEWTON_SSO_BASE_URL.includes('?');
  return `${NEWTON_SSO_BASE_URL}${hasQueryParams ? '&' : '?'}callbackurl=${callbackUrl}`;
};

const redirectToNewtonOAuth = (env = 'newton') => {
  const ssoUrl = buildNewtonSsoRedirectUrl(env);
  console.log('Redirecting to SSO URL:', ssoUrl);
  window.location.href = ssoUrl;
};

// Pulse animation for loading dots
const pulseAnimation = keyframes`
  0%, 80%, 100% { 
    transform: scale(0.8);
    opacity: 0.3;
  }
  40% { 
    transform: scale(1.2);
    opacity: 1;
  }
`;

// Success checkmark animation
const checkmarkAnimation = keyframes`
  0% {
    transform: scale(0) rotate(45deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(45deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(45deg);
    opacity: 1;
  }
`;

const SSOContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false); // Prevent duplicate calls
  const authenticationRef = useRef(false); // Additional safeguard with useRef
  const [loading, setLoading] = useState(false);

  const getActiveAcademicYearId = async () => {
    const academicYearResponse = await getAcademicYear();
    let academicYearList: any[] = [];
    if (Array.isArray(academicYearResponse)) {
      academicYearList = academicYearResponse;
    } else if (Array.isArray(academicYearResponse?.data)) {
      academicYearList = academicYearResponse.data;
    }

    if (academicYearList.length) {
      localStorage.setItem('academicYearList', JSON.stringify(academicYearList));
      const activeSession = academicYearList.find((item: any) => item?.isActive);
      localStorage.setItem('session', activeSession?.session ?? '');
      return activeSession?.id || '';
    }

    return '';
  };

  const getRouteByProgramAndRole = (tenantName?: string, roleName?: string, tenantType?: string) => {
    const normalizedTenant = tenantName?.trim().toLowerCase();
    const normalizedRole = roleName?.trim().toLowerCase();
    const normalizedTenantType = tenantType?.trim().toLowerCase();

    if (
      normalizedTenantType === 'volunteeronboarding' &&
      normalizedRole?.includes('lead')
    ) {
      return '/individual-volunteer';
    }

    if (
      normalizedTenant === TenantName.PRAGYANPATH.toLowerCase() &&
      normalizedRole?.includes('lead')
    ) {
      return '/manager-dashboard';
    }

    if (
      normalizedTenant === TenantName.YOUTHNET.toLowerCase() &&
      (normalizedRole?.includes('mobilizer') || normalizedRole?.includes('lead'))
    ) {
      return '/';
    }

    if (normalizedTenant === TenantName.SECOND_CHANCE_PROGRAM.toLowerCase()) {
      return '/teacher';
    }

    return '/unauthorized';
  };

  useEffect(() => {
    // Prevent duplicate authentication calls using both state and ref
    if (hasAuthenticated || authenticationRef.current) {
      console.log('Authentication already in progress or completed');
      return;
    }

    // Check if searchParams are available and contain at least one expected parameter
    const hasSearchParams = searchParams.toString().length > 0;
    const env = searchParams.get('env');
    const accessToken = searchParams.get('accesstoken');
    const userId = searchParams.get('USER_ID');
     if(userId) {
     localStorage.setItem('managrUserId', userId);
     }

    // Newton SSO entry: redirect to ERP OAuth login until callback tokens arrive
    if (env === 'newton' && (!accessToken || !userId)) {
      redirectToNewtonOAuth(env);
      return;
    }

    // Only proceed if we have search params and at least one of the required parameters
    if (!hasSearchParams || (!env && !accessToken && !userId)) {
      console.log('Waiting for search parameters to be loaded...');
      return;
    }

    const handleSSOCallback = async () => {
      try {
        // Mark authentication as started to prevent duplicates
        setHasAuthenticated(true);
        authenticationRef.current = true;
        console.log('Starting SSO authentication...');

        // Extract parameters from URL
        const tenantId = searchParams.get('tenantid');
        console.log('env', env);
        console.log('tenantId', tenantId);
        console.log('accessToken', accessToken);
        console.log('userId', userId);

        // Validate required parameters
        if (!env || !accessToken || !userId) {
          console.log("Missing required SSO parameters");
          const missingParams = [];
          if (!env) missingParams.push('env');
          if (!accessToken) missingParams.push('accesstoken');
          if (!userId) missingParams.push('USER_ID');

          throw new Error(
            `Missing required parameters: ${missingParams.join(', ')}`
          );
        }

        // Prepare SSO authentication payload
        const ssoAuthData: SSOAuthParams = {
          accessToken,
          userId,
          
          roleId: RoleId.STUDENT,
          ssoProvider: env,
        };

        // Make API call to authenticate
        const baseUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
        const apiUrl = `${baseUrl}/user/sso/authenticate`;

        const response = await post(apiUrl, ssoAuthData);

        if (response?.data?.success || response?.data?.result) {
          setSuccess(true);
          await handleSuccessfulLogin(
            response?.data?.result,
            { remember: false }
          );
          showToastMessage('Authentication successful!', 'success');
        } else {
          throw new Error(response?.data?.message || 'Authentication failed');
        }
      } catch (error: any) {
        console.error('SSO authentication error:', error);
        showToastMessage(error?.response?.data?.params?.errmsg || 'Authentication failed','error');

        // Reset authentication flags on error so user can retry
        setHasAuthenticated(false);
        authenticationRef.current = false;

        // Redirect to Newton OAuth login after error
        setTimeout(() => {
          redirectToNewtonOAuth(env || 'newton');
        }, 2500);
      } finally {
        setTimeout(() => {
          setProcessing(false);
        }, 800);
      }
    };

    handleSSOCallback();
  }, [searchParams.toString()]); // Use toString() to stabilize the dependency

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [userResponse, setUserResponse] = useState<any>(null);

  const handleSuccessfulLogin = async (
    response: any,
    data: { remember: boolean }
  ) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = response.access_token;
      const refreshToken = response?.refresh_token;
      localStorage.setItem('token', token);
      await setSecureRefreshToken(refreshToken);
      startSessionTimer();

      const userResponse = await getUserId();
        if (userResponse?.tenantData) {
          localStorage.setItem('tenantData', JSON.stringify(userResponse.tenantData));
        }
        localStorage.setItem('userId', userResponse?.userId);
        localStorage.setItem('temporaryPassword', userResponse?.temporaryPassword);
        // Safely set tenantId with fallback - try userResponse first, then URL param
        const tenantIdFromResponse = userResponse?.tenantData?.[0]?.tenantId;
        const tenantIdFromUrl = searchParams.get('tenantid');
        const finalTenantId = tenantIdFromResponse || tenantIdFromUrl;

        // Check across ALL tenants: allow Lead roles (Pragyanpath/YouthNet/VolunteerOnboarding)
        // OR Instructor/Teacher roles in Second Chance Program
        const hasValidRole = userResponse?.tenantData?.some((tenant: any) =>
          tenant.roles.some((role: any) => {
            const rn = role.roleName.toLowerCase();
            const tn = tenant.tenantName?.toLowerCase();
            const tt = tenant.tenantType?.toLowerCase();
            return (
              rn.includes('lead') ||
              (tt === 'volunteeronboarding' && rn.includes('lead')) ||
              (tn === TenantName.YOUTHNET.toLowerCase() &&
                (rn.includes('mobilizer') || rn.includes('lead'))) ||
              (tn === TenantName.SECOND_CHANCE_PROGRAM.toLowerCase() &&
                (rn.includes('instructor') || rn.includes('teacher')))
            );
          })
        );
        if (!hasValidRole) {
          window.location.href = '/unauthorized';
        }
        if (finalTenantId) {
          localStorage.setItem('tenantId', finalTenantId);
          console.log('TenantId stored:', finalTenantId);
        } else {
          console.warn('No tenantId available from response or URL parameters');
        }
        localStorage.setItem('firstName', userResponse?.firstName);
        localStorage.setItem('lastName', userResponse?.lastName);
      setTimeout(async () => {
        const res = await getUserDetails(userResponse?.userId, true);
        console.log('response=========>', res?.result);

        // Store custom fields in localStorage
        if (res?.result?.userData?.customFields) {
          res.result.userData.customFields.forEach((field: any) => {
            // Custom fields handling can be added here if needed
          });
        }
        const uiConfig = userResponse?.tenantData[0]?.params?.uiConfig;
        console.log('uiConfig', uiConfig);

        localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

        setUserResponse(userResponse);

        setSwitchDialogOpen(true);
      }, 1000);
    }
  };

  const callBackSwitchDialog = async (
    tenantId: string,
    tenantName: string,
    tenantType: string,
    roleId: string,
    roleName: string
  ) => {
    console.log("callBackSwitchDialog", tenantId, tenantName, tenantType, roleId, roleName);
    setSwitchDialogOpen(false);
    setLoading(true);

    if (userResponse) {
      const token =
        typeof window !== 'undefined' && window.localStorage
          ? localStorage.getItem('token')
          : '';
      const isLeadRole = roleName?.toLowerCase().includes('lead');
      const isYouthNetMobilizerOrLead =
        tenantName?.trim().toLowerCase() === TenantName.YOUTHNET.toLowerCase() &&
        (roleName?.toLowerCase().includes('mobilizer') ||
          roleName?.toLowerCase().includes('lead'));
      const isSecondChanceProgramRole =
        tenantName?.trim().toLowerCase() ===
          TenantName.SECOND_CHANCE_PROGRAM.toLowerCase() &&
        (roleName?.toLowerCase().includes('instructor') ||
          roleName?.toLowerCase().includes('teacher'));
      const isVolunteerOnboardingLead =
        tenantType === 'VolunteerOnboarding' &&
        roleName?.toLowerCase().includes('lead');

      if (isLeadRole || isYouthNetMobilizerOrLead || isSecondChanceProgramRole || isVolunteerOnboardingLead) {
        const tenantData = userResponse?.tenantData?.find(
          (tenant: any) => tenant.tenantId === tenantId
        );
        localStorage.setItem('userId', userResponse?.userId);
        localStorage.setItem('templtateId', tenantData?.templateId || '');
        localStorage.setItem('userIdName', userResponse?.username);
        localStorage.setItem('firstName', userResponse?.firstName || '');
        localStorage.setItem('lastName', userResponse?.lastName || '');
        localStorage.setItem('userName', userResponse?.firstName);
        localStorage.setItem('userData', JSON.stringify(userResponse));


        localStorage.setItem('roleId', roleId);
        localStorage.setItem('roleName', roleName);
        localStorage.setItem('role', roleName);
        localStorage.setItem('tenantName', tenantName);
        localStorage.setItem('tenantId', tenantId);

        const uiConfig = tenantData?.params?.uiConfig;

        localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

        localStorage.setItem('userProgram', tenantName);
        const isYouthnetTenant =
          tenantName?.trim().toLowerCase() === TenantName.YOUTHNET.toLowerCase();
        if (tenantType !== 'elearning') {
          const activeAcademicYearId = await getActiveAcademicYearId();
          if (activeAcademicYearId) {
            localStorage.setItem('academicYearId', activeAcademicYearId);
          }
        }

        const isSecondChanceProgramTenant =
          tenantName?.trim().toLowerCase() ===
          TenantName.SECOND_CHANCE_PROGRAM.toLowerCase();
        if (isSecondChanceProgramTenant) {
          const activeAcademicYearId = await getActiveAcademicYearId();
          if (activeAcademicYearId) {
            localStorage.setItem('academicYearId', activeAcademicYearId);
          }
          // Seed the scp-teacher-repo Zustand store (persisted under 'teacherApp')
          // so that withAccessControl finds a valid accessToken + userRole on load
          const existingTeacherApp = localStorage.getItem('teacherApp');
          const teacherAppStore = existingTeacherApp
            ? JSON.parse(existingTeacherApp)
            : { state: {}, version: 0 };
          teacherAppStore.state = {
            ...teacherAppStore.state,
            accessToken: token,
            userRole: roleName, // 'Instructor' for SCP teacher
            isActiveYearSelected: activeAcademicYearId || true,
          };
          localStorage.setItem('teacherApp', JSON.stringify(teacherAppStore));
        }
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'sso-login-success',
            type: 'CLICK',
            pageid: 'sign-in',
            uid: userResponse?.userId || 'Anonymous',
          },
        };
        telemetryFactory.interact(telemetryInteract);

        const channelId = tenantData.channelId;
        localStorage.setItem('channelId', channelId);

        const collectionFramework = tenantData?.collectionFramework;
        localStorage.setItem('collectionFramework', collectionFramework);

        document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
        const query = new URLSearchParams(window.location.search);
        const redirectUrl = query.get('redirectUrl');
        const activeLink = query.get('activeLink');
        if (redirectUrl && redirectUrl.startsWith('/')) {
          router.push(
            `${redirectUrl}${activeLink ? `?activeLink=${activeLink}` : ''}`
          );
        }
        logEvent({
          action: 'successfully-login-in-learner-app-sso',
          category: 'SSO ERP',
          label: 'Login Button Clicked',
        });
        setTimeout(() => {
          const targetRoute = getRouteByProgramAndRole(tenantName, roleName, tenantType);
          if (isSecondChanceProgramTenant) {
            // Use window.location.href to escape the '/youthnet' basePath
            // so we land on http://host/teacher instead of http://host/youthnet/teacher
            window.location.href = targetRoute;
          } else {
            router.push(targetRoute);
          }
        }, 3000);
      } else {
        console.log("Authentication failed - invalid user role");
        showToastMessage('Authentication failed - invalid user role', 'error');
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
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFFDF6, #F8EFDA)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: 'flex', alignItems: 'center', py: 4 }}
      >
        <Card
          sx={{
            width: '100%',
            borderRadius: 3,
            boxShadow: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={4}
            >
              {/* Animated GIF - Using placeholder since welcome.gif doesn't exist */}
              <Fade in={true}>
                <Box>
                  <Image
                    src={welcomeGIF}
                    alt="Authentication"
                    width={100}
                    height={100}
                    style={{
                      borderRadius: '50%',
                      boxShadow: '0 4px 20px rgba(253, 190, 22, 0.3)',
                    }}
                  />
                </Box>
              </Fade>

              {/* Loading State */}
              {processing && !success && (
                <Fade in={processing}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={3}
                  >
                    <CircularProgress
                      size={60}
                      thickness={4}
                      sx={{
                        color: '#FDBE16',
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        },
                      }}
                    />

                    {/* Animated loading dots */}
                    <Box display="flex" gap={1} alignItems="center">
                      {[0, 1, 2].map((index) => (
                        <Box
                          key={index}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#FDBE16',
                            animation: `${pulseAnimation} 1.4s ease-in-out infinite`,
                            animationDelay: `${index * 0.2}s`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Fade>
              )}

              {/* Success State */}
              {success && (
                <Fade in={success}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={3}
                  >
                    {/* Success checkmark */}
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: '#1A8825',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        animation: `${checkmarkAnimation} 0.6s ease-in-out`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 12,
                          border: '3px solid white',
                          borderTop: 'none',
                          borderRight: 'none',
                          transform: 'rotate(-45deg)',
                          position: 'absolute',
                          top: '18px',
                          left: '18px',
                        }}
                      />
                    </Box>

                    {/* Success pulse effect */}
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        border: '2px solid #1A8825',
                        position: 'absolute',
                        animation: `${pulseAnimation} 2s ease-in-out infinite`,
                        opacity: 0.3,
                      }}
                    />
                  </Box>
                </Fade>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
      <SwitchAccountDialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={userResponse?.tenantData}
        // isLeadRole={true}
      />
      {loading && (
        <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
      )}
    </Box>
  );
};

const SSOPage = () => {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFDF6, #F8EFDA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress
            size={60}
            thickness={4}
            sx={{
              color: '#FDBE16',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </Box>
      }
    >
      <SSOContent />
    </Suspense>
  );
};
export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
export default SSOPage;