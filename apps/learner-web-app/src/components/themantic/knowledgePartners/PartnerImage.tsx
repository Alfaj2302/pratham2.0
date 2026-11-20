'use client';

import React from 'react';
import { Box } from '@mui/material';
import { scaledFontSize } from '@learner/utils/scaledFontSize';
import { KnowledgePartner } from './partnersData';

// Grey box showing the partner's photo/logo, scaled to fit without cropping
const PartnerImage = ({
  partner,
  sx,
}: {
  partner: KnowledgePartner;
  sx?: any;
}) => (
  <Box
    sx={{
      backgroundColor: 'rgb(246, 247, 249)',
      border: '1px solid rgba(0, 0, 0, 0.125)',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: '16px',
      fontSize: scaledFontSize(12),
      color: 'rgb(75, 85, 99)',
      ...sx,
    }}
  >
    {partner.image && (
      <img
        src={partner.image}
        alt={partner.name}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    )}
  </Box>
);

export default PartnerImage;
