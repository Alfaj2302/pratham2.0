import Header from '@/components/Header';
import PasswordCreate from '@/components/PasswordCreate';
import WestIcon from '@mui/icons-material/West';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useDirection } from '../hooks/useDirection';

/**
 * Set Password screen for users logged in with a temporary password
 * (User Read API -> result.userData.temporaryPassword === true).
 * Shows only the new Password + Confirm Password fields (no old password).
 */
const SetPassword = () => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const router = useRouter();
  const { isRTL } = useDirection();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
    }
  }, []);

  const handleBackEvent = () => {
    window.history.back();
  };

  const handleSetPassword = async (newPassword: string) => {
    // TODO: Integrate the Set Password API once its details are available.
  };

  return (
    <Box>
      <Header />
      <Box sx={{ px: '16px', mt: 2, pb: '20px' }}>
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <WestIcon
            onClick={handleBackEvent}
            sx={{
              color: theme.palette.warning['A200'],
              cursor: 'pointer',
              transform: isRTL ? ' rotate(180deg)' : 'unset',
            }}
          />
          <Box
            sx={{
              color: theme.palette.warning['A200'],
              fontWeight: '400',
              fontSize: '22px',
            }}
          >
            {t('LOGIN_PAGE.SET_PASSWORD')}
          </Box>
        </Box>
        <Box
          sx={{
            fontSize: '14px',
            color: theme.palette.warning['300'],
            fontWeight: '400',
            mt: 1.5,
          }}
        >
          {t('LOGIN_PAGE.CREATE_NEW')}
        </Box>
        <Box
          sx={{
            '@media (min-width: 700px)': {
              width: '50%',
              boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
              marginTop: '1.8rem',
              borderRadius: '16px',
            },
            width: '100%',
            marginTop: '2rem',
          }}
        >
          <Box sx={{ padding: '30px' }}>
            <PasswordCreate
              handleResetPassword={handleSetPassword}
              submitLabel={t('LOGIN_PAGE.SET_PASSWORD')}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default SetPassword;
