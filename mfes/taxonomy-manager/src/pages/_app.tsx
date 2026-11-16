import '../styles/globals.css';
import type { AppProps } from 'next/app';
import * as React from 'react';
import { AppCacheProvider } from '@mui/material-nextjs/v15-pagesRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { useChunkErrorReload } from '@shared-lib-v2/hooks/useChunkErrorReload';
import '@shared-lib-v2/utils/API/secureAuthInterceptor';

export default function App(props: AppProps) {
  useChunkErrorReload();
  const { Component, pageProps } = props;
  return (
    <AppCacheProvider {...props}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </AppCacheProvider>
  );
}
