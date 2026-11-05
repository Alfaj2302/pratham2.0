import React, { useEffect } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Height } from '@mui/icons-material';

const players: React.FC = () => {
  const router = useRouter();
  const { identifier } = router.query;
  const { t } = useTranslation();
  //this page has its own Back header, so hide the player's own back/exit controls
  const sb_player =
    process.env.NEXT_PUBLIC_TEACHER_SBPLAYER +
    `?identifier=${identifier}&hideBackButton=true`;
  if (typeof window !== "undefined" && window.localStorage) {
  localStorage.setItem("showHeader"  , "true")
  }
  console.log(sb_player);

  return (
    <Box>
      <Box>
        <Header />
        <Box
          sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}
          onClick={() => router.back()}
        >
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">{t('COMMON.BACK')}</Typography>
        </Box>
      </Box>
      <Box marginTop={'1rem'} px={'14px'}>
        <Typography
          color={'#024f9d'}
          sx={{ padding: '0 0 4px 4px', fontWeight: 'bold' }}
        >
          {/* {playerConfig?.metadata?.name} */}
        </Typography>
          {/* <div style={{ height: "100vh", width: "100%" }}> */}
            <iframe
              src={sb_player}
              style={{
                // display: 'block',
                // padding: 0,
                width: '100%',
                height: "100vh",
                border: 'none',
              }}
              title="Embedded Localhost"
            />
          {/* </div> */}
      </Box>
    </Box>
  );
};

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}

export async function getStaticProps({ locale, params }: any) {
  const { identifier } = params;
  return {
    props: {
      noLayout: true,
      identifier,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default players;