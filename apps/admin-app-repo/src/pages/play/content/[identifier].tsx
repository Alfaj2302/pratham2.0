import React, { useEffect } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const index = () => {
  const router = useRouter();
  const { identifier, hideBackButton } = router.query;
  // Set only when opened from the curriculum planner resource list, where this
  // page's own Back control above makes the player's back button redundant.
  const sb_player =
    process.env.NEXT_PUBLIC_ADMIN_SBPLAYER +
    `?identifier=${identifier}` +
    (hideBackButton === 'true' ? '&hideBackButton=true' : '');
  if (typeof window !== "undefined" && window.localStorage) {
  localStorage.setItem("showHeader"  , "true")
  }
  console.log(sb_player);

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}
        onClick={() => router.back()}
      >
        <IconButton>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{'Back'}</Typography>
      </Box>
      <Box margin={'1rem 0'}>
        <Typography
          color={'#024f9d'}
          sx={{ padding: '0 0 4px 4px', fontWeight: 'bold' }}
        >
        </Typography>
        {(
          <div style={{ height: "100vh", width: "100%" }}>
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
          </div>
        )}
      </Box>
    </Box>
  );
};

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}

export default index;