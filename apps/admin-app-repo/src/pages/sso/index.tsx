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
import { useRouter } from 'next/router';
import Image from 'next/image';
import { post } from '@/services/RestClient';
import { Role, TenantName, isSecondChanceTenant } from '@/utils/app.constant';
import { showToastMessage } from '@/components/Toastify';
import { getUserId, getTenantInfo } from '@/services/LoginService';
import { getUserDetailsInfo } from '@/services/UserList';
import { getAcademicYear } from '@/services/AcademicYearService';
import { telemetryFactory } from '@/utils/telemetry';
import { logEvent } from '@/utils/googleAnalytics';
import SwitchAccountDialog from '@shared-lib-v2/SwitchAccount/SwitchAccount';
import Loader from '@/components/Loader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useUserIdStore } from '@/store/useUserIdStore';
import { Storage } from '@/utils/app.constant';
import useSubmittedButtonStore from '@/utils/useSharedState';
import TenantService from '@/services/TenantService';
import { transformLabel } from '@/utils/helper';
import useStore from '@/store/store';
import { setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';
import { startSessionTimer } from '@shared-lib-v2/utils/sessionTimeout';

interface SSOAuthParams {
  accessToken: string;
  userId: string;
  tenantId?: string;
  roleId?: string;
  ssoProvider: string;
}

const NEWTON_SSO_BASE_URL =
  process.env.NEXT_PUBLIC_NEWTON_SSO_URL ||
  'https://prathamerp.org/Config/OAuthLogin/PRATHAM';

const buildNewtonSsoRedirectUrl = (env = 'newton') => {
  const currentBaseUrl =
    globalThis.window !== undefined ? globalThis.window.location.origin : '';
  const callbackUrl = `${currentBaseUrl}/sso?env=${env}`;
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
  const { t } = useTranslation();
  const { setUserId } = useUserIdStore();
  const setAdminInformation = useSubmittedButtonStore(
    (state: any) => state.setAdminInformation
  );
  const setIsActiveYearSelected = useStore(
    (state: { setIsActiveYearSelected: any }) => state.setIsActiveYearSelected
  );
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const authenticationRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [userResponse, setUserResponse] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');

  useEffect(() => {
    // Prevent duplicate authentication calls
    if (hasAuthenticated || authenticationRef.current) {
      console.log('Authentication already in progress or completed');
      return;
    }

    // Wait for router to be ready before accessing query
    if (!router.isReady) {
      return;
    }

    // Extract query parameters from router
    const { query } = router;
    const env = query.env as string;
    const accessToken = query.accesstoken as string;
    const userId = query.USER_ID as string;
    const tenantIdParam = query.tenantid as string;

    // Newton SSO entry: send user to ERP OAuth login until callback tokens arrive
    if (env === 'newton' && (!accessToken || !userId)) {
      redirectToNewtonOAuth(env);
      return;
    }

    // Check if we have required parameters
    if (!env || !accessToken || !userId) {
      console.log('Waiting for search parameters to be loaded...');
      return;
    }

    const handleSSOCallback = async () => {
      try {
        // Mark authentication as started to prevent duplicates
        setHasAuthenticated(true);
        authenticationRef.current = true;
        console.log('Starting SSO authentication...');

        // Validate required parameters
        if (!env || !accessToken || !userId) {
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
          tenantId: tenantIdParam,
          ssoProvider: env,
        };

        // Make API call to authenticate
        const baseUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;
        const apiUrl = `${baseUrl}/user/sso/authenticate`;

        const response = await post(apiUrl, ssoAuthData);

        if (response?.data?.success || response?.data?.result) {
          setSuccess(true);
          await handleSuccessfulLogin(response?.data?.result, {
            remember: false,
          });
          showToastMessage('Authentication successful!', 'success');
        } else {
          throw new Error(response?.data?.message || 'Authentication failed');
        }
      } catch (error: any) {
        console.error('SSO authentication error:', error);
        showToastMessage(
              error?.response?.data?.params?.errmsg || 'Authentication failed','error'
        );
        setHasAuthenticated(false);
        authenticationRef.current = false;
        setTimeout(() => {
          redirectToNewtonOAuth(typeof env === 'string' ? env : 'newton');
        }, 2500);
      } finally {
        setTimeout(() => {
          setProcessing(false);
        }, 800);
      }
    };

    handleSSOCallback();
  }, [router.isReady, router.query]);

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
      console.log('userResponse=========>', userResponse);
      localStorage.setItem('userId', userResponse?.userId);
      localStorage.setItem('temporaryPassword', userResponse?.temporaryPassword ?? 'false');

      // Safely set tenantId with fallback — prefer the tenant specified by the SSO
      // callback URL (if it matches one of the user's tenants), else default to the first.
      const { query } = router;
      const tenantIdFromUrl = query.tenantid as string;
      const matchesUrlTenant = userResponse?.tenantData?.some(
        (tenant: any) => tenant?.tenantId === tenantIdFromUrl
      );
      const finalTenantId = matchesUrlTenant
        ? tenantIdFromUrl
        : userResponse?.tenantData?.[0]?.tenantId || tenantIdFromUrl;

      if (finalTenantId) {
        localStorage.setItem('tenantId', finalTenantId);
        console.log('TenantId stored:', finalTenantId);
      }

      localStorage.setItem('firstName', userResponse?.firstName);
      localStorage.setItem('lastName', userResponse?.lastName);
      localStorage.setItem(Storage.USER_DATA, JSON.stringify(userResponse));

      setTimeout(async () => {
        try {
          const res = await getUserDetailsInfo(userResponse?.userId, true);
          console.log('response=========>', res);

          // getUserDetailsInfo returns response?.data?.result, and userData is inside result
          const userInfo = res?.userData;
        if (userInfo) {
          if (userInfo?.customFields) {
            const boardField = userInfo.customFields.find(
              (field: any) => field.label === 'BOARD'
            );

            const boardValues = boardField?.selectedValues || [];

            if (boardValues.length > 0) {
              localStorage.setItem(
                'userSpecificBoard',
                JSON.stringify(boardValues)
              );
            }
          }

          localStorage.setItem('adminInfo', JSON.stringify(userInfo));

          const selectedStateName = transformLabel(
            userInfo?.customFields?.find(
              (field: { label: string }) => field?.label === 'WORKING_STATE'
            )?.selectedValues?.[0]?.value
          );
          if (selectedStateName) {
            localStorage.setItem('stateName', selectedStateName);
          }
          const selectedStateId = userInfo?.customFields?.find(
            (field: { label: string }) => field?.label === 'WORKING_STATE'
          )?.selectedValues?.[0]?.id;
          if (selectedStateId !== undefined && selectedStateId !== null) {
            localStorage.setItem('stateId', selectedStateId);
          }
        }

          setUserResponse(userResponse);
          console.log('userResponse&&&&&&&&&&&&&&========>', userResponse);
          setSwitchDialogOpen(true);
        } catch (error) {
          console.error('Error fetching user details:', error);
          showToastMessage('Failed to fetch user details', 'error');
          // Don't redirect on error, let user retry or close dialog
        }
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
    console.log('[SSO] callBackSwitchDialog called:', { tenantId, tenantName, roleId, roleName });
    setSwitchDialogOpen(false);
    setLoading(true);

    // Set the state values
    setTenantId(tenantId);
    setTenantName(tenantName);
    setRoleId(roleId);
    setRoleName(roleName);

    console.log('[SSO] userResponse from state:', userResponse);

    if (!userResponse) {
      console.error('[SSO] userResponse is null/undefined — cannot proceed');
      setLoading(false);
      return;
    }

    try {
      const selectedTenantData = userResponse?.tenantData?.find(
        (tenant: any) => tenant.tenantId === tenantId
      );
      const token = localStorage.getItem('token');
      localStorage.setItem('userId', userResponse?.userId);
      localStorage.setItem('templtateId', tenantId);
      localStorage.setItem('tenantName', tenantName);
      localStorage.setItem('uiConfig', JSON.stringify(selectedTenantData?.params?.uiConfig || {}));
      localStorage.setItem('roleId', roleId);
      localStorage.setItem('roleName', roleName);
      localStorage.setItem('userIdName', userResponse?.username);
      setUserId(userResponse?.userId || '');

      if (userResponse?.userId) {
        document.cookie = `authToken=${token}; path=/; secure; SameSite=Strict`;
        document.cookie = `userId=${userResponse.userId}; path=/; secure; SameSite=Strict`;
      }

      localStorage.setItem('name', userResponse?.firstName);
      localStorage.setItem(Storage.USER_DATA, JSON.stringify(userResponse));
      const frameworkId = selectedTenantData?.collectionFramework;
      const channel = selectedTenantData?.channelId;
      TenantService.setTenantId(tenantId);
      localStorage.setItem('collectionFramework', frameworkId);
      localStorage.setItem('channelId', channel);
      localStorage.setItem('tenantId', tenantId);
      // Used by workspace to build the copy-content (cmslink) URL
      localStorage.setItem('program', tenantName || '');
      try {
        const tenantInfo = await getTenantInfo();
        const matchedTenant = (tenantInfo?.result || []).find(
          (item: { tenantId: string }) => item.tenantId === tenantId
        );
        if (matchedTenant?.domain) {
          localStorage.setItem('tenantDomain', matchedTenant.domain);
        }
      } catch (tenantInfoErr) {
        console.error('[SSO] getTenantInfo failed:', tenantInfoErr);
      }

      const tenantData = userResponse?.tenantData?.find(
        (tenant: any) => tenant.tenantId === tenantId
      );
      console.log('[SSO] tenantData:', tenantData);

      let userInfo: any = null;
      try {
        userInfo = await getUserDetailsInfo(userResponse?.userId, true);
        console.log('[SSO] userInfo from getUserDetailsInfo:', userInfo);
      } catch (infoErr) {
        console.error('[SSO] getUserDetailsInfo failed:', infoErr);
      }

      // Update role in userInfo based on selected role from dialog
      if (userInfo?.userData && roleName) {
        (userInfo.userData as any).role = roleName;
      }

      // Set adminInfo in localStorage BEFORE redirecting to prevent route guard redirect
      if (userInfo?.userData) {
        localStorage.setItem('adminInfo', JSON.stringify(userInfo.userData));
      }

      setAdminInformation(userInfo?.userData);
      console.log('[SSO] tenantType:', tenantData?.tenantType, '| tenantName:', tenantData?.tenantName, '| role:', userInfo?.userData?.role, '| roleName:', roleName);

      // Small delay to ensure localStorage is fully written before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (tenantData?.tenantType === 'elearning') {
        console.log('roleName (selected)=========>', roleName);
        
        // Handle CAMP_TO_CLUB tenant
        if (
          userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
          tenantData?.tenantName == TenantName.CAMP_TO_CLUB
        ) {
          const { locale } = router;
          if (locale) {
            router.push('/learners', undefined, { locale: locale });
          } else {
            router.push('/learners');
          }
        }
        // Handle PRAGYANPATH tenant
        else if (
          userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
          tenantData?.tenantName == TenantName.PRAGYANPATH
        ) {
          router.push('/youth');
        }
        // Handle SCTA/CCTA roles
        else if (
          userInfo?.userData?.role === Role.SCTA ||
          userInfo?.userData?.role === Role.CCTA ||
          roleName === Role.SCTA ||
          roleName === Role.CCTA
        ) {
          const { locale } = router;
          if (isSecondChanceTenant(tenantData?.tenantName)) {
            // For Pragyanpath, CCTA goes to course-planner
            if (locale) {
              router.push('/course-planner', undefined, { locale: locale });
            } else router.push('/course-planner');
          } else if (tenantData?.tenantName == TenantName.PRAGYANPATH) {
            router.push('/faqs');
          } else {
            if (locale) {
              router.push('/course-planner', undefined, { locale: locale });
            } else router.push('/course-planner');
          }
        }
        // Handle ADMIN and CENTRAL_ADMIN roles
        else {
          const { locale } = router;
          if (locale) {
            if (
              userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/programs', undefined, { locale: locale });
            } else if (
              userInfo?.userData?.role === Role.ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/centers', undefined, { locale: locale });
            } else if (
              (userInfo?.userData?.role === Role.ADMIN ||
                userInfo?.userData?.role === Role.CENTRAL_ADMIN) &&
              tenantData?.tenantName == TenantName.YOUTHNET
            ) {
              router.push('/user-leader', undefined, { locale: locale });
            } else {
              router.push('/faqs', undefined, { locale: locale });
            }
          } else {
            if (
              userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/programs');
            } else if (
              userInfo?.userData?.role === Role.ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/centers');
            } else if (
              (userInfo?.userData?.role === Role.ADMIN ||
                userInfo?.userData?.role === Role.CENTRAL_ADMIN) &&
              tenantData?.tenantName == TenantName.YOUTHNET
            ) {
              router.push('/user-leader');
            } else {
              router.push('/faqs');
            }
          }
        }
        } else {
        // For other tenants, proceed with academic year logic
        // Ensure adminInfo is set before redirecting
        if (userInfo?.userData) {
          // Update role based on selected roleName
          if (roleName) {
            (userInfo.userData as any).role = roleName;
          }
          localStorage.setItem('adminInfo', JSON.stringify(userInfo.userData));
        }

        // Vocational Training has academic years too, so it goes through the
        // same flow as every other tenant — only its landing routes differ.
        const getAcademicYearList = async () => {
          const academicYearList = await getAcademicYear();
          if (academicYearList) {
            localStorage.setItem(
              'academicYearList',
              JSON.stringify(academicYearList)
            );
            const extractedAcademicYears = academicYearList?.map(
              ({ id, session, isActive }: { id: string; session: string; isActive: boolean }) => ({ id, session, isActive })
            );
            const activeSession = extractedAcademicYears?.find(
              (item: { id: string; session: string; isActive: boolean }) => item.isActive
            );
            const activeSessionId = activeSession ? activeSession.id : '';
            localStorage.setItem('academicYearId', activeSessionId);
            localStorage.setItem('session', activeSession?.session ?? '');
            if (activeSessionId) {
              setIsActiveYearSelected(true);
              if (
                userInfo?.userData?.role === Role.SCTA ||
                userInfo?.userData?.role === Role.CCTA
              ) {
                const { locale } = router;
                if (tenantData?.tenantName == TenantName.YOUTHNET) {
                  router.push('/workspace');
                } else if (
                  !isSecondChanceTenant(tenantData?.tenantName)
                ) {
                  router.push('/faqs');
                } else {
                  if (locale) {
                    router.push('/course-planner', undefined, { locale: locale });
                  } else router.push('/course-planner');
                }
              } else {
                const { locale } = router;
                if (locale) {
                  if (
                    userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
                    isSecondChanceTenant(tenantData?.tenantName)
                  ) {
                    router.push('/programs', undefined, { locale: locale });
                  } else if (
                    userInfo?.userData?.role === Role.ADMIN &&
                    isSecondChanceTenant(tenantData?.tenantName)
                  ) {
                    router.push('/centers', undefined, { locale: locale });
                  } else if (
                    (userInfo?.userData?.role === Role.ADMIN ||
                      userInfo?.userData?.role === Role.CENTRAL_ADMIN) &&
                    tenantData?.tenantName == TenantName.YOUTHNET
                  ) {
                    router.push('/user-leader', undefined, { locale: locale });
                  }
                } else {
                  if (
                    userInfo?.userData?.role === Role.CENTRAL_ADMIN &&
                    isSecondChanceTenant(tenantData?.tenantName)
                  ) {
                    router.push('/programs');
                  } else if (
                    userInfo?.userData?.role === Role.ADMIN &&
                    isSecondChanceTenant(tenantData?.tenantName)
                  ) {
                    router.push('/centers');
                  } else if (
                    (userInfo?.userData?.role === Role.ADMIN ||
                      userInfo?.userData?.role === Role.CENTRAL_ADMIN) &&
                    tenantData?.tenantName == TenantName.YOUTHNET
                  ) {
                    router.push('/user-leader');
                  }
                }
              }
            }
          }
        };
        await getAcademicYearList();
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

      logEvent({
        action: 'successfully-login-in-admin-app-sso',
        category: 'SSO ERP',
        label: 'Login Button Clicked',
      });
    } catch (err: any) {
      console.error('[SSO] callBackSwitchDialog error:', err);
    } finally {
      setLoading(false);
    }
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
              {/* Always-visible logo */}
              <Fade in={true}>
                <Box>
                  <Image
                    src="/logo.png"
                    alt="Pratham"
                    width={120}
                    height={60}
                    style={{ objectFit: 'contain' }}
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
      noLayout: true,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default SSOPage;
