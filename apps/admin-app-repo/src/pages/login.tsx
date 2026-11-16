import { showToastMessage } from '@/components/Toastify';
import { useAccountSwitch } from '@/hooks/useAccountSwitch';
import { Role, TenantName, isSecondChanceTenant } from '@/utils/app.constant';
import { logEvent } from '@/utils/googleAnalytics';
import { telemetryFactory } from '@/utils/telemetry';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery, // Import useMediaQuery hook
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import config from '../../config.json';
import appLogo from '../../public/images/appLogo.png';
import loginImg from '../../public/images/login-image.jpg';
import Loader from '../components/Loader';
import { getUserId, login } from '../services/LoginService';

import SwitchAccountDialog from '@shared-lib-v2/SwitchAccount/SwitchAccount';
import { applyLanguage, storeLanguage } from '@shared-lib-v2/utils/languageSync';
import {
  isCaptchaError,
  preloadRecaptcha,
} from '@shared-lib-v2/utils/recaptcha';
import { setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';
import { startSessionTimer } from '@shared-lib-v2/utils/sessionTimeout';

// Toggle back on to restore the login page's language selector.
const SHOW_LANGUAGE_DROPDOWN = false;

const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [language, setLanguage] = useState(selectedLanguage);
  const theme = useTheme<any>();
  const router = useRouter();
  // Use useMediaQuery to detect screen size
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const passwordRef = useRef<HTMLInputElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const { fetchUserDetail, performAccountSwitch } = useAccountSwitch();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Login always starts on English (see SHOW_LANGUAGE_DROPDOWN above) —
      // ignore any preference a user selected before the dropdown was hidden.
      setLanguage('en');
      setLang('en');
      if (i18n.language !== 'en') i18n.changeLanguage('en');
      const storedUserData = localStorage.getItem('adminInfo');

      const token = localStorage.getItem('token');
      if (token) {
        const { locale } = router;
        if (locale) {
          let role;
          if (storedUserData) {
            role = JSON.parse(storedUserData);
            let tenantId = localStorage.getItem('tenantId');
            let tenantData = role?.tenantData?.find(
              (tenant: any) => tenant.tenantId === tenantId
            );
            if (role?.role === Role.SCTA || role?.role === Role.CCTA) {
              // To do :- hardcoding to be removed
              if (
                !isSecondChanceTenant(tenantData?.tenantName)
              ) {
                // router.push('/workspace');
                router.push('/faqs');
              } else {
                router.push('/course-planner', undefined, { locale: locale });
              }
            } else if (
              role?.role === Role.CENTRAL_ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/programs', undefined, { locale: locale });
            } else if (
              role?.role === Role.ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/centers', undefined, { locale: locale });
            } else if (
              role?.role === Role.ADMIN &&
              tenantData?.tenantName == TenantName.YOUTHNET
            ) {
              router.push('/user-leader');
            }
          }
        } else {
          let role;
          if (storedUserData) {
            role = JSON.parse(storedUserData);
            const tenantId = localStorage.getItem('tenantId');
            const tenantData = role?.tenantData?.find(
              (tenant: any) => tenant.tenantId === tenantId
            );
            if (role?.role === Role.SCTA || role?.role === Role.CCTA) {
              router.push('/course-planner');
            }
            if (
              role?.role === Role.CENTRAL_ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/programs');
            } else if (
              role?.role === Role.ADMIN &&
              isSecondChanceTenant(tenantData?.tenantName)
            ) {
              router.push('/centers');
            } else if (
              (role?.role === Role.CENTRAL_ADMIN ||
                role?.role === Role.ADMIN) &&
              tenantData?.tenantName == TenantName.YOUTHNET
            ) {
              router.push('/user-leader');
            }
          }
        }
      }
    }
  }, []);

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const trimmedValue = value.trim();
    setUsername(trimmedValue);
    setUsernameError(/\s/.test(trimmedValue));
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPassword(value);
  };

  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
    logEvent({
      action: 'show-password-icon-clicked',
      category: 'Login Page',
      label: 'Show Password',
    });
  };

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  useEffect(() => {
    fetchUserDetail();
  }, []);

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [userResponse, setUserResponse] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');

  useEffect(() => {
    preloadRecaptcha();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    logEvent({
      action: 'login-button-clicked',
      category: 'Login Page',
      label: 'Login Button Clicked',
    });
    if (!usernameError && !passwordError) {
      setLoading(true);
      try {
        const response = await login({ username, password });
        if (response?.result?.access_token) {
          if (typeof window !== 'undefined' && window.localStorage) {
            const token = response.result.access_token;
            const refreshToken = response?.result?.refresh_token;
            localStorage.setItem('token', token);
            await setSecureRefreshToken(refreshToken);
            startSessionTimer();

            const userResponse = await getUserId();
            setUserResponse(userResponse);

            setSwitchDialogOpen(true);
          }
        } else {
          showToastMessage(
            t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT'),
            'error'
          );
        }
        setLoading(false);
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'login-success',
            type: 'CLICK',
            pageid: 'sign-in',
            uid: localStorage.getItem('userId') || 'Anonymous',
          },
        };
        telemetryFactory.interact(telemetryInteract);
      } catch (error: any) {
        setLoading(false);
        const errorMessage = isCaptchaError(error)
          ? t('LOGIN_PAGE.CAPTCHA_VERIFICATION_FAILED')
          : t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT');
        showToastMessage(errorMessage, 'error');
      }
    }
  };

  const callBackSwitchDialog = async (
    tenantId: string,
    tenantName: string,
    tenantType: string,
    roleId: string,
    roleName: string
  ) => {
    setSwitchDialogOpen(false);
    setLoading(true);

    // Set the state values
    setTenantId(tenantId);
    setTenantName(tenantName);
    setRoleId(roleId);
    setRoleName(roleName);

    await performAccountSwitch({
      tenantId,
      tenantName,
      tenantType,
      roleId,
      roleName,
      userResponse,
    });

    setLoading(false);
  };

  const isButtonDisabled =
    !username || !password || usernameError || passwordError;

  const handleChange = (event: SelectChangeEvent) => {
    const newLocale = event.target.value;
    if (typeof window !== 'undefined' && window.localStorage) {
      storeLanguage(newLocale);
      setLanguage(newLocale);
      ReactGA.event('select-language-login-page', {
        selectedLanguage: newLocale,
      });
      applyLanguage(i18n, newLocale, router.basePath);
    }
  };

  const handleForgotPasswordClick = () => {
    logEvent({
      action: 'forgot-password-link-clicked',
      category: 'Login Page',
      label: 'Forgot Password Link Clicked',
    });
  };

  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        bgcolor={theme.palette.warning.A200}
        borderRadius={'10px'}
        sx={{
          '@media (min-width: 900px)': {
            display: 'none',
          },
        }}
      >
        {loading && (
          <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
        )}
        <Box
          display={'flex'}
          overflow="auto"
          alignItems={'center'}
          justifyContent={'center'}
          zIndex={99}
          sx={{ margin: '5px 10px 25px' }}
        >
          <Box
            sx={{ width: '55%', '@media (max-width: 400px)': { width: '95%' } }}
          >
            <Image
              src={appLogo}
              alt="App Logo"
              height={80}
              layout="responsive"
            />
          </Box>
        </Box>
      </Box>
      <Grid
        container
        spacing={2}
        justifyContent={'center'}
        px={'30px'}
        alignItems={'center'}
        width={'100% !important'}
      >
        {!(isMobile || isMedium) && ( // Render only on desktop view
          <Grid
            sx={{
              '@media (max-width: 900px)': {
                display: 'none',
              },
            }}
            item
            xs={12}
            sm={12}
            md={6}
          >
            <Image
              className="login-img"
              src={loginImg}
              alt="Login Image"
              layout="responsive"
            />
          </Grid>
        )}
        <Grid item xs={12} md={6} display="flex" alignItems="center">
          <Box
            flexGrow={1}
            // display={'flex'}
            bgcolor={theme.palette.warning['A400']}
            height="auto"
            zIndex={99}
            justifyContent={'center'}
            p={'2rem'}
            borderRadius={'2rem 2rem 0 0'}
            sx={{
              '@media (min-width: 900px)': {
                width: '100%',
                borderRadius: '16px',
                boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                marginTop: '50px',
              },
              '@media (max-width: 900px)': {
                marginTop: '-25px',
              },
            }}
          >
            <Box
              display="flex"
              flexDirection="column"
              bgcolor={theme.palette.warning.A200}
              borderRadius={'10px'}
              sx={{
                '@media (max-width: 900px)': {
                  display: 'none',
                },
              }}
            >
              {loading && (
                <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
              )}
              <Box
                display={'flex'}
                overflow="auto"
                alignItems={'center'}
                justifyContent={'center'}
                zIndex={99}
                // sx={{ margin: '5px 10px 25px', }}
              >
                <Box
                  sx={{
                    width: '60%',
                    '@media (max-width: 700px)': { width: '95%' },
                  }}
                >
                  <Image
                    src={appLogo}
                    alt="App Logo"
                    height={80}
                    layout="responsive"
                  />
                </Box>
              </Box>
            </Box>
            <form onSubmit={handleFormSubmit}>
              {/* <Typography
              variant="h4"
              gutterBottom
              textAlign="center"
              sx={{ mt: 2 }}
            >
              {t("LOGIN_PAGE.LOGIN")}
            </Typography> */}
              {SHOW_LANGUAGE_DROPDOWN && (
                <FormControl fullWidth margin="normal">
                  <Select
                    className="SelectLanguages"
                    value={language}
                    onChange={handleChange}
                    displayEmpty
                    sx={{
                      borderRadius: '0.5rem',
                      color: theme.palette.warning.A200,
                      width: '117px',
                      height: '32px',
                      marginBottom: '0rem',
                      fontSize: '14px',
                    }}
                  >
                    {config.languages.map((lang) => (
                      <MenuItem value={lang.code} key={lang.code}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                fullWidth
                id="username"
                InputLabelProps={{ shrink: true }}
                label={t('LOGIN_PAGE.USERNAME')}
                placeholder={t('LOGIN_PAGE.USERNAME_PLACEHOLDER')}
                value={username}
                onChange={handleUsernameChange}
                error={usernameError}
                margin="normal"
              />
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                id="password"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                label={t('LOGIN_PAGE.PASSWORD')}
                placeholder={t('LOGIN_PAGE.PASSWORD_PLACEHOLDER')}
                value={password}
                onChange={handlePasswordChange}
                error={passwordError}
                margin="normal"
                inputRef={passwordRef}
              />

              <Box
                sx={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.palette.secondary.main,
                  mt: 1,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  window.open(
                    `${process.env.NEXT_PUBLIC_RESET_PASSWORD_URL}?redirectUrl=${window.location.origin}/login`,
                    '_self'
                  );
                }}
              >
                {t('LOGIN_PAGE.FORGOT_PASSWORD')}
              </Box>
              {
                <Box
                  display="flex"
                  alignItems="center"
                  marginTop="1.2rem"
                  className="remember-me-checkbox"
                >
                  <Checkbox
                    onChange={(e) => setRememberMe(e.target.checked)}
                    checked={rememberMe}
                  />
                  <Typography
                    variant="body2"
                    onClick={() => {
                      setRememberMe(!rememberMe);
                      logEvent({
                        action: 'remember-me-button-clicked',
                        category: 'Login Page',
                        label: `Remember Me ${
                          rememberMe ? 'Checked' : 'Unchecked'
                        }`,
                      });
                    }}
                    sx={{
                      cursor: 'pointer',
                      marginTop: '15px',
                      color: theme.palette.warning[300],
                    }}
                  >
                    {t('LOGIN_PAGE.REMEMBER_ME')}
                  </Typography>
                </Box>
              }

              <Box marginTop="2rem" textAlign="center">
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  disabled={isButtonDisabled}
                  ref={loginButtonRef}
                >
                  {t('LOGIN_PAGE.LOGIN')}
                </Button>
              </Box>

              {/* SSO Login Button */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  width: '100%',
                  mt: 2,
                  justifyContent: 'center',
                }}
              >
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  type="button"
                  sx={{
                    borderRadius: 50,
                    backgroundColor: 'transparent',
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      borderColor: '#1565c0',
                      color: '#1565c0',
                    },
                    '@media (min-width: 900px)': {
                      width: '50%',
                    },
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Construct SSO URL with callback parameters
                    const currentBaseUrl =
                      globalThis.window !== undefined
                        ? globalThis.window.location.origin
                        : '';
                    const callbackUrl = `${currentBaseUrl}/sso?env=newton`;
                    const encodedCallbackUrl = callbackUrl;

                    // Get SSO URL from environment variable
                    const ssoBaseUrl = "https://prathamerp.org/Config/OAuthLogin/PRATHAM";

                    // Construct SSO URL - use ? if no existing query params, otherwise use &
                    const hasQueryParams = ssoBaseUrl.includes('?');
                    const ssoUrl = `${ssoBaseUrl}${hasQueryParams ? '&' : '?'}callbackurl=${encodedCallbackUrl}`;

                    console.log('Redirecting to SSO URL:', ssoUrl);

                    // Open SSO URL in new tab (matching OurProgramCarousel behavior)
                    window.open(ssoUrl, '_blank');
                  }}
                >
                  {t('Login with Newton ERP') || 'Login with ERP'}
                </Button>
              </Box>
            </form>
          </Box>
        </Grid>
      </Grid>

      <SwitchAccountDialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={userResponse?.tenantData}
      />
    </>
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

export default LoginPage;
