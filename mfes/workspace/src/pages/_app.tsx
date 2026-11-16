import { AppProps } from 'next/app';
import Head from 'next/head';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import '../styles/global.css';
import customTheme from '../styles/CustomTheme';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useChunkErrorReload } from '@shared-lib-v2/hooks/useChunkErrorReload';
import '@shared-lib-v2/utils/API/secureAuthInterceptor';
import ImportRunningBanner from '../components/bulk-import/ImportRunningBanner';

function CustomApp({ Component, pageProps }: AppProps) {
  useChunkErrorReload();
  const router = useRouter();
  const loginUrl: any = process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL;
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && router.pathname !== '/login') {
      window.location.href = loginUrl;
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>Welcome to workspace!</title>
      </Head>
      <main className="app">
        <CssVarsProvider theme={customTheme}>
          {/* Sits outside <Component> so it survives every route change and
              keeps reporting a running bulk import from any screen. */}
          <ImportRunningBanner />
          <Component {...pageProps} />
        </CssVarsProvider>
      </main>
    </>
  );
}

export default CustomApp;
