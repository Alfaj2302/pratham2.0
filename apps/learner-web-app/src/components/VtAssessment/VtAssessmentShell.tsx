'use client';

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import Layout from '@learner/components/Layout';
import { useVtAssessmentEligibility } from '@learner/utils/hooks/useVtAssessmentEligibility';
import type { VtAssessmentEligibility } from '@learner/utils/hooks/useVtAssessmentEligibility';

interface VtAssessmentShellProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  children: (eligibility: VtAssessmentEligibility) => React.ReactNode;
}

/**
 * Chrome shared by every /l2-courses page: the app Layout, a back/title bar, and
 * the VT eligibility gate. A learner who reaches one of these routes without an
 * active batch (deep link, batch removed mid-session) is sent to their landing
 * page rather than shown an empty screen.
 */
const VtAssessmentShell: React.FC<VtAssessmentShellProps> = ({
  title,
  subtitle,
  onBack,
  children,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const eligibility = useVtAssessmentEligibility();
  const { loading, eligible } = eligibility;

  // The program comes from useSyncExternalStore, whose server snapshot is null,
  // so the first (hydration) render always looks non-VT. Deciding to redirect on
  // that render would bounce an eligible learner off the page before the store
  // resolves, so hold off until after the first commit.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    if (!hasMounted || loading || eligible) return;
    const landingPage =
      (typeof window !== 'undefined' && localStorage.getItem('landingPage')) ||
      '/home';
    router.replace(landingPage);
  }, [hasMounted, loading, eligible, router]);

  return (
    <Layout>
      <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {onBack && (
            <IconButton
              onClick={onBack}
              aria-label={t('LEARNER_APP.VT_ASSESSMENT.BACK')}
              sx={{ color: '#1E1B16', ml: -1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography
            sx={{
              fontSize: { xs: '20px', md: '24px' },
              fontWeight: 600,
              color: '#1E1B16',
            }}
          >
            {title}
          </Typography>
        </Box>
        {subtitle && <Box sx={{ mb: 2 }}>{subtitle}</Box>}

        {!hasMounted || loading || !eligible ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          children(eligibility)
        )}
      </Box>
    </Layout>
  );
};

export default VtAssessmentShell;
