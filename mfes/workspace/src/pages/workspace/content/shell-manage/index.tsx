import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { Box, useTheme } from '@mui/material';
import useTenantConfig from '../../../../hooks/useTenantConfig';
import { getLocalStoredUserId } from '../../../../services/LocalStorageService';
import WorkspaceHeader from '../../../../components/WorkspaceHeader';

// Built in the content-editor repo (`npm run build:pratham`) and copied to public/webcomponents.
const SHELL_MANAGE_SCRIPT = '/webcomponents/shell-manage.iife.js';

const ShellManagePage = () => {
  const router = useRouter();
  const theme = useTheme();
  const tenantConfig = useTenantConfig();
  const shellRef = useRef<HTMLElement | null>(null);
  const [showHeader, setShowHeader] = useState<boolean | null>(null);

  useEffect(() => {
    setShowHeader(localStorage.getItem('showHeader') === 'true');
  }, []);

  // `<shell-manage>` takes `config` as an object property. Wait for the element to be
  // defined first, otherwise the plain property would shadow the class setter.
  useEffect(() => {
    if (!tenantConfig) return;
    let cancelled = false;
    customElements.whenDefined('shell-manage').then(() => {
      if (cancelled || !shellRef.current) return;
      const userId = getLocalStoredUserId();
      (shellRef.current as any).config = {
        // Same-origin: `/mfe_workspace/action/*` is forwarded by the workspace API proxy.
        baseurl: router.basePath,
        channel: tenantConfig.CHANNEL_ID,
        framework: tenantConfig.CONTENT_FRAMEWORK,
        createdBy: userId,
        createdFor: [tenantConfig.CHANNEL_ID],
        targetFWIds: [tenantConfig.COLLECTION_FRAMEWORK],
        lastUpdatedBy: userId,
        theme: {
          primary: theme.palette.primary.main,
          secondary: theme.palette.secondary.main,
          buttonShape: 'rounded',
        },
      };
    });
    return () => {
      cancelled = true;
    };
  }, [tenantConfig, router.basePath, theme]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const handleBack = () => router.push('/workspace/content/create');
    const handleError = (e: Event) =>
      console.error('shell-manage error:', (e as CustomEvent).detail);
    el.addEventListener('shell:back', handleBack);
    el.addEventListener('shell:error', handleError);
    return () => {
      el.removeEventListener('shell:back', handleBack);
      el.removeEventListener('shell:error', handleError);
    };
  }, [router]);

  return (
    <>
      <Script
        src={`${router.basePath}${SHELL_MANAGE_SCRIPT}`}
        strategy="afterInteractive"
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {showHeader && <WorkspaceHeader />}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {React.createElement('shell-manage', {
            ref: shellRef,
            style: {
              display: 'block',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
            },
          })}
        </Box>
      </Box>
    </>
  );
};

export default ShellManagePage;
