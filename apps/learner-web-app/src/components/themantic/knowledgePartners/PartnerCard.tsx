'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Tooltip, Typography } from '@mui/material';
import SpeakableText from '@shared-lib-v2/lib/textToSpeech/SpeakableText';
import { scaledFontSize } from '@learner/utils/scaledFontSize';
import { KNOWLEDGE_PARTNERS_BASE_URL, KnowledgePartner } from './partnersData';

// Card shell, image area and hover match the New Arrivals CardComponent
const PartnerCard = ({ partner }: { partner: KnowledgePartner }) => {
  return (
    <Box
      component={Link}
      href={`${KNOWLEDGE_PARTNERS_BASE_URL}/${partner.id}`}
      sx={{
        backgroundColor: '#fff',
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out',
        boxShadow: '0 0.15rem 1.75rem 0 rgba(33, 40, 50, 0.15)',
        border: '1px solid rgba(0, 0, 0, .125)',
        minHeight: '286px',
        borderRadius: '.25rem',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        '&:hover': {
          transform: 'scale(1.07)',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ margin: '8px', width: 'calc(100% - 16px)' }}>
          {partner.image && (
            <img
              src={partner.image}
              alt={partner.name}
              style={{
                display: 'block',
                width: '100%',
                height: '200px',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>

        <Tooltip
          title={partner.name}
          arrow
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: '#ffffff',
                color: '#000000',
                border: '1px solid rgba(0, 0, 0, .125)',
                boxShadow: '0 0.15rem 0.6rem 0 rgba(33, 40, 50, 0.1)',
                fontSize: scaledFontSize(11),
                lineHeight: 1.4,
                px: 0.75,
                py: 0.5,
                marginTop: '10px !important',
              },
            },
            arrow: {
              sx: {
                color: '#ffffff',
                '&::before': { border: '1px solid rgba(0, 0, 0, .125)' },
              },
            },
          }}
        >
          <Typography
            sx={{
              mt: 0.3,
              mb: 0.3,
              px: '16px',
              maxWidth: '100%',
              boxSizing: 'border-box',
              fontSize: scaledFontSize(16),
              lineHeight: '22px',
              minHeight: '44px',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 600,
              color: 'black',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0px',
            }}
          >
            <SpeakableText text={partner.name}>{partner.name}</SpeakableText>
          </Typography>
        </Tooltip>

        <Typography
          sx={{
            fontSize: scaledFontSize(12),
            color: 'rgb(75, 85, 99)',
            textAlign: 'center',
            lineHeight: 1.4,
            letterSpacing: '0px',
            px: '16px',
            mb: 2,
            minHeight: '34px',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <SpeakableText text={partner.partnerType}>
            {partner.partnerType}
          </SpeakableText>
        </Typography>
      </Box>
    </Box>
  );
};

export default PartnerCard;
