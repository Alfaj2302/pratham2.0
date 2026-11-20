'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeakableText from '@shared-lib-v2/lib/textToSpeech/SpeakableText';
import { scaledFontSize } from '@learner/utils/scaledFontSize';
import PartnerCard from './PartnerCard';
import { KnowledgePartner } from './partnersData';
import { getKnowledgePartners } from '@learner/utils/API/KnowledgePartnerService';

const navButtonSx = {
  bgcolor: 'white',
  borderRadius: '16px',
  position: 'absolute',
  top: '50%',
  zIndex: 2,
  transform: 'translateY(-50%)',
  color: 'primary.main',
  '@media (hover: hover)': {
    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
  },
  // Touch screens keep the arrow background instead of a sticky hover state
  '@media (hover: none)': { '&:hover': { backgroundColor: 'white' } },
  // Smaller arrows below md so they sit beside the cards
  '@media (max-width:899.95px)': {
    padding: '4px',
    '& .MuiSvgIcon-root': { fontSize: '20px' },
  },
  '&.swiper-button-disabled': { opacity: 0.4 },
};

// Carousel dots are off for now; pass showPagination to enable them
const KnowledgePartners = ({
  showPagination = false,
}: {
  showPagination?: boolean;
}) => {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const [partners, setPartners] = useState<KnowledgePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPartners = async () => {
      try {
        const data = await getKnowledgePartners();
        if (!cancelled) setPartners(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPartners();
    return () => {
      cancelled = true;
    };
  }, []);

  let statusMessage: string | null = null;
  if (error) {
    statusMessage =
      'Unable to load knowledge partners. Please try again later.';
  } else if (!loading && partners.length === 0) {
    statusMessage = 'No knowledge partners available.';
  }

  return (
    <Box
      id="knowledge-partners"
      sx={{
        backgroundColor: '#fff',
        py: 3,
        px: 1,
        position: 'relative',
        zIndex: 1000,
        borderRadius: '0px 6px 6px 6px',
        mt: '110px',
      }}
    >
      <Box
        sx={{
          backgroundColor: '#FFC107',
          width: 'fit-content',
          position: 'absolute',
          top: '-46px',
          left: 0,
          p: 1,
          border: '1px solid white',
          borderTopLeftRadius: '0.25rem',
          borderTopRightRadius: '0.25rem',
        }}
      >
        <Typography
          component="h2"
          sx={{ fontSize: scaledFontSize(20), fontWeight: 600, color: '#000' }}
        >
          <SpeakableText>Knowledge Partners</SpeakableText>
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : statusMessage ? (
        <Typography
          sx={{
            fontSize: scaledFontSize(16),
            color: '#555',
            textAlign: 'center',
            py: 6,
          }}
        >
          <SpeakableText>{statusMessage}</SpeakableText>
        </Typography>
      ) : (
        <>
          <Box sx={{ position: 'relative', px: 3 }}>
            <IconButton
              ref={prevRef}
              aria-label="Previous partners"
              sx={{ ...navButtonSx, left: 0 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton
              ref={nextRef}
              aria-label="Next partners"
              sx={{ ...navButtonSx, right: 0 }}
            >
              <ArrowForwardIcon />
            </IconButton>

            <Box
              sx={{
                '& .swiper-slide': { height: 'auto', pb: '0 !important' },
              }}
            >
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={16}
                slidesPerView={1}
                rewind
                watchOverflow={false}
                autoplay={{
                  delay: 3000,
                  // On touch screens stop autoplay once a card is touched
                  disableOnInteraction:
                    typeof window !== 'undefined' &&
                    window.matchMedia('(hover: none)').matches,
                  pauseOnMouseEnter: true,
                }}
                navigation={{
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }}
                pagination={
                  showPagination
                    ? { el: paginationRef.current, clickable: true }
                    : false
                }
                onBeforeInit={(swiper: any) => {
                  swiper.params.navigation.prevEl = prevRef.current;
                  swiper.params.navigation.nextEl = nextRef.current;
                  if (showPagination) {
                    swiper.params.pagination.el = paginationRef.current;
                  }
                }}
                // Same breakpoints as New Arrivals, capped at 4 cards
                breakpoints={{
                  640: { slidesPerView: 2 },
                  900: { slidesPerView: 3 },
                  1200: { slidesPerView: 4 },
                }}
              >
                {partners.map((partner) => (
                  <SwiperSlide
                    key={partner.id}
                    style={{ height: 'auto', paddingBottom: '8px' }}
                  >
                    <PartnerCard partner={partner} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
          </Box>

          {showPagination && (
            <Box
              ref={paginationRef}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                mt: 3,
                '& .swiper-pagination-bullet': {
                  width: '8px',
                  height: '8px',
                  m: '0 !important',
                  backgroundColor: '#D0D4DA',
                  opacity: 1,
                },
                '& .swiper-pagination-bullet-active': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default KnowledgePartners;
