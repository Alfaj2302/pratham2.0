'use client';

import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';

import {
  Experimental_CssVarsProvider as CssVarsProvider,
  useTheme,
} from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { initGA, logPageView } from '../utils/googleAnalytics';

import Notification from '@/components/Notification';
import { metaTags, Telemetry } from '@/utils/app.constant';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { appWithTranslation, UserConfig, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Poppins } from 'next/font/google';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { fullWidthPages, TENANT_DATA } from '../../app.config';
import nextI18NextConfig from '../../next-i18next.config.js';
import { useDirection } from '../hooks/useDirection';
import customTheme from '../styles/customTheme';
import { telemetryFactory } from '../utils/telemetry';
import AllowNotification from '@/components/AllowNotification';
import dynamic from 'next/dynamic';
import { LanguageProvider } from '@shared-lib-v2/lib/context/LanguageContext';
import { useChunkErrorReload } from '@shared-lib-v2/hooks/useChunkErrorReload';
import '@shared-lib-v2/utils/API/secureAuthInterceptor';
import { useLanguageFromStorage } from '@shared-lib-v2/hooks/useLanguageFromStorage';

const InstallPopup = dynamic(() => import(`@/components/InstallPopup`), { ssr: false });

const ColorModeContext = React.createContext({ toggleColorMode: () => {} });
const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  fallback: ['sans-serif'],
  subsets: ['latin'],
});

const emptyInitialI18NextConfig: UserConfig = {
  i18n: {
    defaultLocale: nextI18NextConfig.i18n.defaultLocale,
    locales: nextI18NextConfig.i18n.locales,
  },
};

let myTheme: any;

export function DarkTheme() {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        borderRadius: 1,
      }}
    >
      <IconButton onClick={colorMode.toggleColorMode} color="inherit">
        {theme.palette.mode === 'dark' ? (
          <Brightness7Icon />
        ) : (
          <Brightness4Icon />
        )}
      </IconButton>
    </Box>
  );
}

function App({ Component, pageProps }: AppProps) {
  useChunkErrorReload();
  const { i18n } = useTranslation(); // Get the i18n object to access the selected language
  useLanguageFromStorage();
  const [client] = React.useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 1000 * 60 * 60 * 24, // 24 hours
          staleTime: 1000 * 60 * 60 * 24, // 24 hours
        },
      },
    })
  );

  const router = useRouter();
  const isFullWidthPage = fullWidthPages.includes(router.pathname);

  // Route Guard: Only allow access if userProgram is "Second Chance Program"
  useEffect(() => {
    const checkAccess = () => {
      // Skip check for public pages
      const publicPages = ['/login', '/forgot-password', '/reset-password', '/create-password', '/unauthorized'];
      if (publicPages.includes(router.pathname)) {
        return;
      }

      if (typeof window !== 'undefined') {
        const userProgram = localStorage.getItem('userProgram');
        const tenantName = localStorage.getItem('tenantName');
        
        const isAuthorized =
          userProgram?.toLowerCase() === TENANT_DATA.SECOND_CHANCE_PROGRAM?.toLowerCase() ||
          userProgram?.toLowerCase() === TENANT_DATA.SECOND_CHANCE_PROGRAM_PATHWAYS?.toLowerCase() ||
          userProgram?.toLowerCase() === TENANT_DATA.PRATHAM_SCP?.toLowerCase() ||
          tenantName?.toLowerCase() === TENANT_DATA.SECOND_CHANCE_PROGRAM?.toLowerCase() ||
          tenantName?.toLowerCase() === TENANT_DATA.SECOND_CHANCE_PROGRAM_PATHWAYS?.toLowerCase() ||
          tenantName?.toLowerCase() === TENANT_DATA.PRATHAM_SCP?.toLowerCase();

        if (!isAuthorized) {
          console.warn('Access denied: Invalid program for scp-teacher-repo');
          // Redirect to unauthorized or back to appropriate application
          router.push('/unauthorized');
        }
      }
    };

    checkAccess();
    router.events.on('routeChangeComplete', checkAccess);

    return () => {
      router.events.off('routeChangeComplete', checkAccess);
    };
  }, [router.pathname, router.events]);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (i18n.language === 'ur') {
      htmlElement.setAttribute('dir', 'rtl');
    } else {
      htmlElement.setAttribute('dir', 'ltr');
    }
  }, [i18n.language]);

  useEffect(() => {
    telemetryFactory.init();
  }, []);

  useEffect(() => {
    // Initialize GA only once
    if (!window.GA_INITIALIZED) {
      initGA(`${process.env.NEXT_PUBLIC_MEASUREMENT_ID_TEACHER}`);
      window.GA_INITIALIZED = true;
    }

    const handleRouteChange = (url: string) => {
      const windowUrl = url;
      const cleanedUrl = windowUrl.replace(/^\//, '');

      const telemetryImpression = {
        context: {
          env: cleanedUrl,
          cdata: [],
        },
        edata: {
          type: Telemetry.VIEW,
          subtype: '',
          pageid: cleanedUrl,
          uri: '',
        },
      };
      telemetryFactory.impression(telemetryImpression);

      logPageView(url);
    };

    // Log initial page load
    handleRouteChange(window.location.pathname);

    // Subscribe to route changes and log page views
    router.events.on('routeChangeComplete', handleRouteChange);

    // Clean up the subscription on unmount
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  const theme = useTheme<any>();
  const { dir, isRTL } = useDirection();

  const rtlCache = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
  });

  const ltrCache = createCache({
    key: 'mui',
  });
  const login = router.pathname === '/login';

  return (
    <>

      <style jsx global>{`
        html {
          font-family: ${poppins.style.fontFamily} !important;
        }
      `}</style>
      <Head>
        <title>{metaTags?.title}</title>
        <meta name="description" content={metaTags?.description} />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </Head>
      <LanguageProvider>

      <CacheProvider value={isRTL ? rtlCache : ltrCache}>
        <CssVarsProvider theme={customTheme}>
          <Box
            sx={{
              padding: '0',
              '@media (min-width: 900px)': {
                width: !isFullWidthPage ? 'calc(100% - 351px)' : '100%',
                marginLeft: !isFullWidthPage ? '351px' : '0',
              },
              background: theme.palette.warning['A400'],
              overflowX: 'hidden',
            }}
          >
            <InstallPopup />
            <QueryClientProvider client={client}>
              <Component {...pageProps} />
            </QueryClientProvider>
            <ToastContainer
              position="bottom-left"
              autoClose={3000}
              stacked={false}
            />
            <Notification />
            {!login && <AllowNotification />}
            
          </Box>
        </CssVarsProvider>
      </CacheProvider>
      </LanguageProvider>

    </>
  );
}

export default appWithTranslation(App, emptyInitialI18NextConfig);
