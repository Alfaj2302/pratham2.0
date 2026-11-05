import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import React, { useEffect, useRef, useState } from 'react';
import appLogo from '../../public/images/appLogo.png';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { applyLanguage, storeLanguage } from '@shared-lib-v2/utils/languageSync';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { getUserId, login } from '../services/LoginService';
import {
  isCaptchaError,
  preloadRecaptcha,
} from '@shared-lib-v2/utils/recaptcha';
import loginImg from '../../assets/images/login-image.jpg';
import Loader from './components/Loader';
import { useDirection } from '../hooks/useDirection';
import config from '../../config.json';
import ReactGA from 'react-ga4';
import { Snackbar, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Telemetry } from '../utils/app.constant';
import { telemetryFactory } from '../utils/telemetry';
import { setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';
import { startSessionTimer } from '@shared-lib-v2/utils/sessionTimeout';


type LoginPageProps = {
  onLoginSuccess: (response: any) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme<any>();
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
  const [scrolling, setScrolling] = useState(false);
  const [open, setOpen] = useState(false);
  const [isCaptchaFailure, setIsCaptchaFailure] = useState(false);
  const { isRTL } = useDirection();
  const router = useRouter();

  const passwordRef = useRef<HTMLInputElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const telemetryOnSubmit = () => {
    const telemetryInteract = {
      context: {
        env: 'sign-in',
        cdata: [],
      },
      edata: {
        id: 'login-success',
        type: Telemetry.CLICK,
        subtype: '',
        pageid: 'sign-in',
      },
    };
    telemetryFactory.interact(telemetryInteract);
  };
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      let lang;
      if (localStorage.getItem('preferredLanguage')) {
        lang = localStorage.getItem('preferredLanguage') ?? 'en';
      } else {
        lang = 'en';
      }
      setLanguage(lang);
      setLang(lang);
      const token = localStorage.getItem('token');
      const tenant = localStorage.getItem('tenantName');
    }
  }, []);

  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
  };

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  useEffect(() => {
    preloadRecaptcha();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!usernameError && !passwordError) {
      setLoading(true);

      try {
        const response = await login({ username, password });

        if (response?.result?.access_token) {
          if (typeof window !== 'undefined' && window.localStorage) {
            const token = response.result.access_token;
            const refreshToken = response?.result?.refresh_token;

            if (token) {
              localStorage.setItem('token', token);
            }

            await setSecureRefreshToken(refreshToken);
            startSessionTimer();

            const userResponse = await getUserId();

            telemetryOnSubmit();
            if (onLoginSuccess) {
              onLoginSuccess(userResponse);
              setLoading(false)
            }
          }
        }
      } catch (error: any) {
        setIsCaptchaFailure(isCaptchaError(error));
        setOpen(true)
        setLoading(false);
      }
    }
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const trimmedValue = value.trim();
    setUsername(trimmedValue);
    const containsSpace = /\s/.test(trimmedValue);
    setUsernameError(containsSpace);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPassword(value);
  };
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };
  const handleChange = (event: SelectChangeEvent) => {
    const newLocale = event.target.value;
    if (typeof window !== 'undefined' && window.localStorage) {
      storeLanguage(newLocale);
      setLanguage(event.target.value);
      ReactGA.event('select-language-login-page', {
        selectedLanguage: event.target.value,
      });
      setSelectedLanguage(newLocale);
      applyLanguage(i18n, newLocale, router.basePath);
    }
  };

  const darkMode =
    typeof window !== 'undefined' && window.localStorage
      ? localStorage.getItem('mui-mode')
      : null;

  return (
    <Box sx={{ overflowY: 'auto', background: theme.palette.warning['A400'] }}>
      
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
        marginBottom={'10px'}
        alignItems={'center'}
        width={'100% !important'}
      >
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
        <Grid item xs={12} sm={12} md={6}>
          <form onSubmit={handleFormSubmit}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                    boxShadow:
                      darkMode === 'dark'
                        ? 'rgba(0, 0, 0, 0.9) 0px 2px 8px 0px'
                        : 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
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
                    <Loader
                      showBackdrop={true}
                      loadingText={t('COMMON.LOADING')}
                    />
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
                <Box
                  sx={{
                    width: '100%',
                    '@media (max-width: 700px)': {
                      width: '100%',
                    },
                  }}
                >
                  <Box mt={'0.5rem'}>
                    <FormControl sx={{ m: '1rem 0 1rem' }}>
                      <Select
                        inputProps={{
                          'aria-label': 'Select Language',
                        }}
                        className="select-languages"
                        value={i18n.language}
                        onChange={handleChange}
                        displayEmpty
                        sx={{
                          borderRadius: '0.5rem',
                          width: '117px',
                          height: '32px',
                          marginBottom: '0rem',
                          fontSize: '14px',
                          '& .MuiSelect-icon': {
                            right: isRTL ? 'unset' : '7px',
                            left: isRTL ? '7px' : 'unset',
                          },
                        }}
                      >
                        {config?.languages.map((lang) => (
                          <MenuItem value={lang.code} key={lang.code}>
                            {lang.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box
                    marginY={'1rem'}
                    sx={{
                      width: '668px',
                      '@media (max-width: 700px)': {
                        width: '100%',
                      },
                      '@media (min-width: 900px)': {
                        width: '100%',
                      },
                    }}
                  >
                    <TextField
                      id="username"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      label={t('LOGIN_PAGE.USERNAME')}
                      placeholder={t('LOGIN_PAGE.USERNAME_PLACEHOLDER')}
                      value={username}
                      onChange={handleUsernameChange}
                      error={usernameError}
                      className="userName"
                    />
                  </Box>
                  <Box
                    sx={{
                      width: '668px',
                      '@media (max-width: 768px)': {
                        width: '100%',
                      },
                      '@media (min-width: 900px)': {
                        width: '100%',
                      },
                    }}
                    margin={'2rem 0 0'}
                  >
                    <TextField
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onClick={() => setScrolling(!scrolling)}
                      className="password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={handleClickShowPassword}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                            >
                              {showPassword ? (
                                <Visibility />
                              ) : (
                                <VisibilityOff />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      label={t('LOGIN_PAGE.PASSWORD')}
                      placeholder={t('LOGIN_PAGE.PASSWORD_PLACEHOLDER')}
                      value={password}
                      onChange={handlePasswordChange}
                      error={passwordError}
                      inputRef={passwordRef}
                    />
                  </Box>

                  <Box
                    sx={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: theme.palette.secondary.main,
                      mt: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const resetAppUrl =
                        process.env.NEXT_PUBLIC_RESET_PASSWORD_URL;
                      window.open(
                        `${resetAppUrl}?redirectUrl=${window.location.origin}/login`,
                        '_self'
                      );
                    }}
                  >
                    {t('LOGIN_PAGE.FORGOT_PASSWORD')}
                  </Box>

                  <Box marginTop={'1.2rem'} className="">
                    <Checkbox
                      // color="info"
                      onChange={(e) => setRememberMe(e.target.checked)}
                      checked={rememberMe}
                      inputProps={{ 'aria-label': 'Remember Me' }}
                    />
                    <button
                      type="button"
                      style={{
                        cursor: 'pointer',
                        color: theme.palette.warning['300'],
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                      }}
                      className="fw-400"
                      onClick={() => {
                        setRememberMe(!rememberMe);
                      }}
                    >
                      {t('LOGIN_PAGE.REMEMBER_ME')}
                    </button>
                  </Box>
                  <Box
                    alignContent={'center'}
                    textAlign={'center'}
                    marginTop={'2rem'}
                    width={'100%'}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      fullWidth={true}
                      ref={loginButtonRef}
                      sx={{
                        '@media (min-width: 900px)': {
                          width: '50%',
                        },
                      }}
                    >
                      {t('LOGIN_PAGE.LOGIN')}
                    </Button>
                  </Box>
                  
                  {/* SSO Login Buttons */}
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
                        // Get SSO option from ssoOptions if available, otherwise use defaults
                         
                        // Construct SSO URL with callback parameters
                        const currentBaseUrl =
                          typeof window !== 'undefined'
                            ? window.location.origin
                            : '';
                        const callbackUrl = `${currentBaseUrl}/youthnet/sso?env=newton`;
                        const encodedCallbackUrl = callbackUrl;
                        // encodeURIComponent(callbackUrl);
                        
                        // Get SSO URL from ssoOption, environment variable
                        const ssoBaseUrl = "https://prathamerp.org/Config/OAuthLogin/PRATHAM";
                        
                        // Debug logging
                     
                        
                        // if (!ssoBaseUrl) {
                        //   console.error('SSO URL not configured');
                        //   alert('SSO URL not configured. Please check your configuration.');
                        //   return;
                        // }
                        
                        // if (!tenantId) {
                        //   console.error('Tenant ID not found');
                        //   alert('Tenant ID not found. Please ensure tenant ID is set.');
                        //   return;
                        // }
                        
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
                </Box>
              </Box>
            </Box>
          </form>
        </Grid>
      </Grid>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
<Alert
          onClose={handleClose}
          severity="error"
          sx={{ width: "100%", color: "white", backgroundColor: "red" }}
          icon={<ErrorOutlineIcon sx={{ color: "white" }} />} 
        >
          {isCaptchaFailure
            ? t('LOGIN_PAGE.CAPTCHA_VERIFICATION_FAILED')
            : t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT')}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
