'use client';

import React from 'react';
import NextLink from 'next/link';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Grid,
  Link,
  Typography,
} from '@mui/material';
import SpeakableText from '@shared-lib-v2/lib/textToSpeech/SpeakableText';
import { scaledFontSize } from '@learner/utils/scaledFontSize';
import Layout from '../layout/Layout';
import SubHeader from '../subHeader/SubHeader';
import PartnerImage from './PartnerImage';
import { KnowledgePartner } from './partnersData';

const bodyTextSx = {
  fontSize: scaledFontSize(15),
  color: 'rgb(31, 41, 55)',
  lineHeight: 1.7,
};

const PartnerDetails = ({ partner }: { partner: KnowledgePartner }) => (
  <Layout>
    {/* Search row is hidden here, so add the gap it normally provides */}
    <Box sx={{ backgroundColor: '#fff', pb: '24px' }}>
      <SubHeader showFilter={false} showSearch={false} />
    </Box>
    <Box
      sx={{
        backgroundImage: `url('/images/mainpagebig.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        py: '20px !important',
      }}
    >
      <Box className="bs-container bs-px-5">
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '6px',
            px: 2,
            py: 1.25,
            mb: 2,
          }}
        >
          <Breadcrumbs
            separator="›"
            aria-label="breadcrumb"
            sx={{ fontSize: scaledFontSize(14) }}
          >
            <Link
              component={NextLink}
              href="/themantic"
              underline="hover"
              sx={{ color: 'secondary.main', fontSize: 'inherit' }}
            >
              <SpeakableText>Home</SpeakableText>
            </Link>
            <Link
              component={NextLink}
              href="/themantic#knowledge-partners"
              underline="hover"
              sx={{ color: 'secondary.main', fontSize: 'inherit' }}
            >
              <SpeakableText>Knowledge Partners</SpeakableText>
            </Link>
            <Typography
              sx={{ fontSize: 'inherit', color: '#000', fontWeight: 600 }}
            >
              <SpeakableText>{partner.name}</SpeakableText>
            </Typography>
          </Breadcrumbs>
        </Box>

        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            p: { xs: 2.5, sm: 3.5, md: 5 },
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontSize: scaledFontSize(30),
              fontWeight: 700,
              color: '#000',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            <SpeakableText>{partner.name}</SpeakableText>
          </Typography>
          <Typography
            sx={{
              fontSize: scaledFontSize(15),
              fontWeight: 600,
              color: '#212529',
              mt: 0.75,
            }}
          >
            <SpeakableText>{partner.partnerType}</SpeakableText>
          </Typography>

          <Box sx={{ pt: '20px !important' }}>
            <Grid container rowSpacing={3} columnSpacing={{ xs: 3, md: 5 }}>
              <Grid item xs={12} sm={5} md={3.5} lg={3}>
                <PartnerImage
                  partner={partner}
                  sx={{
                    height: '280px',
                  }}
                />
                {partner.website && (
                  <Button
                    fullWidth
                    variant="contained"
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      mt: 1.5,
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgb(56, 145, 206)',
                      color: 'rgb(255, 255, 255)',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      boxShadow: 'none',
                      textTransform: 'none',
                      transition:
                        'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      fontSize: scaledFontSize(14),
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgb(56, 145, 206)',
                        textDecoration: 'none',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 0.15rem 1.75rem 0 rgba(33, 40, 50, 0.15)',
                      },
                    }}
                  >
                    Visit website ↗
                  </Button>
                )}
              </Grid>

              <Grid item xs={12} sm={7} md={8.5} lg={9}>
                {partner.descriptor && (
                  <Typography
                    sx={{
                      fontSize: scaledFontSize(15),
                      color: '#6c757d',
                      pb: 1.5,
                      mb: 2,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <SpeakableText>{partner.descriptor}</SpeakableText>
                  </Typography>
                )}

                {partner.about.map((paragraph) => (
                  <Typography key={paragraph} sx={{ ...bodyTextSx, mb: 1.5 }}>
                    <SpeakableText>{paragraph}</SpeakableText>
                  </Typography>
                ))}

                {partner.contributions && (
                  <>
                    <Typography
                      component="h2"
                      sx={{
                        ...bodyTextSx,
                        fontWeight: 600,
                        color: '#212529',
                        mt: 2,
                      }}
                    >
                      <SpeakableText>
                        Contribution to the Education Sector:
                      </SpeakableText>
                    </Typography>
                    <Box component="ul" sx={{ pl: 3, my: 1 }}>
                      {partner.contributions.map((item) => (
                        <Typography component="li" key={item} sx={bodyTextSx}>
                          <SpeakableText>{item}</SpeakableText>
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}

                {partner.summary && (
                  <Typography sx={{ ...bodyTextSx, mb: 1.5 }}>
                    <SpeakableText>{partner.summary}</SpeakableText>
                  </Typography>
                )}

                {partner.expertise.length > 0 && (
                  <Box
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}
                  >
                    {partner.expertise.map((area) => (
                      <Chip
                        key={area}
                        label={area}
                        variant="outlined"
                        size="small"
                        sx={{
                          border: '1px solid rgb(185, 211, 236)',
                          color: '#1F6FB8',
                          fontSize: scaledFontSize(13),
                          fontWeight: 600,
                          height: 'auto',
                          padding: '6px 14px',
                          borderRadius: '16px',
                          textDecoration: 'none',
                          '&:hover': { color: '#124f86' },
                          '& .MuiChip-label': { whiteSpace: 'normal', p: 0 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>
    </Box>
  </Layout>
);

export default PartnerDetails;
