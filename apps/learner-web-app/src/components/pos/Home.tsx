'use client';
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@learner/components/pos/Layout';

import { Container, Typography, Grid, Box, useMediaQuery, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WhatsNewCarousel from '@learner/components/WhatsNewCarousel';
import MoreWayCarousel from '@learner/components/MoreWayCarousel';
import KnwoledgeCarousel from '@learner/components/KnwoledgeCarousel';
import OtherWebsiteCarousel from '@learner/components/OtherWebsiteCarousel';
import Learning from '@learner/components/Learning';
import Image from 'next/image';
import SpeakableText from '@shared-lib-v2/lib/textToSpeech/SpeakableText';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { SearchButton } from '@learner/components/pos/SearchButton';
import { ContentSearch, getfilterList } from '@learner/utils/API/contentService';
import { staticFilterContent } from '@shared-lib-v2/utils/AuthService';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const Content = dynamic(() => import('@Content'), {
  ssr: false,
});
const descriptions = [
  `
  Learning for School focuses on scholastic subjects, which include early years education and learning to read, write, and think. These skills are crucial for building children's confidence and dignity among their peers.
  `,
  'Learning for Work equips adolescents and youth with the skills and knowledge needed for employment and livelihoods.',
  'Learning for Life encompasses skills and knowledge that are a part of lifelong learning like transferable skills, interests, hobbies, and creativity. These also include life skills but are not limited to them.  It emphasises environmental awareness, physical and mental well-being, and extends learning beyond scholastic subjects.',
];

const Page = () => {
  const [search, setSearch] = useState('');
    const [totalResources, setTotalResources] = useState<number>(0);
  const [videosCount, setVideosCount] = useState<number>(0);
  const [gamesCount, setGamesCount] = useState<number>(0);
  const [audiosCount, setAudiosCount] = useState<number>(0);
  const [languagesCount, setLanguagesCount] = useState<number>(0);

  const [otherFormatsCount, setOtherFormatsCount] = useState<number>(0);
  
  const router = useRouter();
  
  useEffect(() => {
    // Helper function to get content count for specific mimeTypes
    const getContentCountByMimeType = async (mimeTypes: string[]) => {
      const baseFilter = {
        "status": ["live"],
        "primaryCategory": ["Learning Resource", "Practice Question Set"],
        "channel": "pos-channel",
        "program": ["Open School"]
      };
      
      const filter = {
        ...baseFilter,
        "mimeType": mimeTypes
      };
      
      const response = await ContentSearch({
        filters: filter,
        offset: 0,
        limit: 1,
        fields: ["name"]
      });
      
      return response?.result?.count || 0;
    };

    const fetchContentCounts = async () => {
      try {
        // Define mimeType categories
        const mimeTypeCategories = {
          videos: ["video/Webm", "video/mp4", "video/x-youtube"],
          games: ["application/vnd.ekstep.h5p-archive", "application/vnd.ekstep.html-archive", "application/vnd.ekstep.ecml-archive"],
          audios: ["audio/mp3", "audio/wav", "video/mp3","audio/mpeg"],
          otherFormats: ["application/pdf", "application/epub", "application/vnd.sunbird.questionset"]
        };

        // Make all API calls in parallel
        const [
          videosCountResult,
          gamesCountResult,
          audiosCountResult,
          otherFormatsCountResult,
        //  filterListResponse
        ] = await Promise.all([
          getContentCountByMimeType(mimeTypeCategories.videos),
          getContentCountByMimeType(mimeTypeCategories.games),
          getContentCountByMimeType(mimeTypeCategories.audios),
          getContentCountByMimeType(mimeTypeCategories.otherFormats),
         // getfilterList()
        ]);

        // Set all counts
        setVideosCount(videosCountResult);
        setGamesCount(gamesCountResult);
        setAudiosCount(audiosCountResult);
        setOtherFormatsCount(otherFormatsCountResult);

        // Handle language count
        // console.log('response======>', filterListResponse);
        const instantFramework = localStorage.getItem('channelId') ?? '';
      const staticResp = await staticFilterContent({ instantFramework });  
      console.log('staticResp======>', staticResp?.objectCategoryDefinition?.forms?.create?.properties);
      const data = staticResp?.objectCategoryDefinition?.forms?.create?.properties;
      const contentLanguageField = data
  .flatMap((section: any) => section.fields)
  .find((field: any) => field.code === "contentLanguage");

const rangeLength = contentLanguageField?.range?.length || 0;
        //     const contentLangField = filterListResponse.find((field: any) => field.code === "contentLanguage");
        // const contentLangCount = contentLangField?.range?.length || 0;
        setLanguagesCount(rangeLength);

        // Calculate and set total resources
        const total = videosCountResult + gamesCountResult + audiosCountResult + otherFormatsCountResult;
        setTotalResources(total);

        console.log('Content counts:', {
          videos: videosCountResult,
          games: gamesCountResult,
          audios: audiosCountResult,
          otherFormats: otherFormatsCountResult,
          languages: rangeLength,
          total: total
        });

      } catch (error) {
        console.error('Error fetching content counts:', error);
      }
    };

    fetchContentCounts();
  }, []);
  
  const partners = [
    { src: 'images/knowledge/Abhivyaktilogo.png', alt: 'Adobe' },
    { src: 'images/knowledge/Arpan.png', alt: 'EAA' },
    { src: 'images/knowledge/Ccmb_logo_color.png', alt: 'Google' },
    { src: 'images/knowledge/GCF-Mobile-Logo-Medium.jpg', alt: 'Hemant-Goradia' },
    { src: 'images/knowledge/IISER-Pune.png', alt: 'Jaideep-Khanna' },
    { src: 'images/knowledge/Khetee_Transparent.png', alt: 'Schmidt-Futures' },
    { src: 'images/knowledge/menstrupedia.png', alt: 'Schmidt-Futures' },
    { src: 'images/knowledge/Sarmaya.png', alt: 'Schmidt-Futures' },
    { src: 'images/knowledge/Terra-Conscious.png', alt: 'Schmidt-Futures' },
    { src: 'images/knowledge/ThinkTac.png', alt: 'Schmidt-Futures' },
  ];
  const ourPartners = [
    { src: '/our-partner/1.jpg', alt: 'logo1' },
    { src: '/our-partner/2.jpg', alt: 'logo2' },
    { src: '/our-partner/3.jpg', alt: 'logo3' },
    { src: '/our-partner/4.jpg', alt: 'logo4' },
    { src: '/our-partner/5.jpg', alt: 'logo5' },
    { src: '/our-partner/6.jpg', alt: 'logo6' },
    { src: '/our-partner/7.jpg', alt: 'logo7' },
    { src: '/our-partner/8.jpg', alt: 'logo8' },
    { src: '/our-partner/9.jpg', alt: 'logo9' },
    { src: '/our-partner/10.jpg', alt: 'logo10' },
    { src: '/our-partner/11.jpg', alt: 'logo11' },
    { src: '/our-partner/12.jpg', alt: 'logo12' },
    { src: '/our-partner/13.jpg', alt: 'logo13' },
    { src: '/our-partner/14.jpg', alt: 'logo14' },
    { src: '/our-partner/15.jpg', alt: 'logo15' },
    { src: '/our-partner/16.jpg', alt: 'logo16' },
    { src: '/our-partner/17.jpg', alt: 'logo17' },
    { src: '/our-partner/18.jpg', alt: 'logo18' },
    { src: '/our-partner/19.jpg', alt: 'logo19' },
    { src: '/our-partner/20.jpg', alt: 'logo20' },
    { src: '/our-partner/21.jpg', alt: 'logo21' },
    { src: '/our-partner/22.jpg', alt: 'logo22' },
    { src: '/our-partner/23.jpg', alt: 'logo23' },
    { src: '/our-partner/24.jpg', alt: 'logo24' },
    { src: '/our-partner/25.jpg', alt: 'logo25' },
    { src: '/our-partner/26.jpg', alt: 'logo26' },
    { src: '/our-partner/27.jpg', alt: 'logo27' },
    { src: '/our-partner/28.jpg', alt: 'logo28' },
    { src: '/our-partner/29.jpg', alt: 'logo29' },
    { src: '/our-partner/30.jpg', alt: 'logo30' },
    { src: '/our-partner/31.jpg', alt: 'logo31' },
    { src: '/our-partner/32.jpg', alt: 'logo32' },
    { src: '/our-partner/33.jpg', alt: 'logo33' },
    { src: '/our-partner/34.jpg', alt: 'logo34' },
    { src: '/our-partner/Adobe.png', alt: 'logo35' },
    { src: '/our-partner/EAA.png', alt: 'logo36' },
    { src: '/our-partner/Google.png', alt: 'logo37' },
    { src: '/our-partner/Hemant-Goradia.png', alt: 'logo38' },
    { src: '/our-partner/Jaideep-Khanna.png', alt: 'logo38' },
    { src: '/our-partner/Schmidt-Futures.png', alt: 'logo38' },
    { src: '/our-partner/SMFT.png', alt: 'logo38' },
    { src: '/our-partner/Sulzer-Logo.jpg', alt: 'logo38' },
    { src: '/our-partner/UBS.png', alt: 'logo38' },
    { src: '/our-partner/WD.png', alt: 'logo38' },
  ];
  const otherWebsites = [
    {
      src: '/images/ASER.jpg',
      alt: 'UBS',
      href: 'https://asercentre.org/',
    },
    {
      src: '/images/info-foundation.png',
      alt: 'Education Above All',
      href: 'https://pif.org.in/',
    },
    {
      src: '/images/pratham-shah-centre2.png',
      alt: 'Sulzer',
      href: 'https://www.pradigi.org/',
    },
    {
      src: '/images/Pratham-International.png',
      alt: 'Schmidt Futures',
      href: 'https://prathaminternational.org/',
    },
  ];

  const mediaMD = useMediaQuery('(max-width: 900px)');
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  // Update navigation when refs are ready
  useEffect(() => {
    if (swiperInstance && prevRef.current && nextRef.current) {
      const navigation = swiperInstance.params.navigation;
      if (navigation && typeof navigation !== 'boolean') {
        navigation.prevEl = prevRef.current;
        navigation.nextEl = nextRef.current;
        swiperInstance.navigation.init();
        swiperInstance.navigation.update();
      }
    }
  }, [swiperInstance]);

  return (
    <Layout onlyHideElements={['footer']} _topAppBar={{ _config: {} }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ width: '100%', height: '500px', position: 'relative' }}>
            <Button
              ref={prevRef}
              sx={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                minWidth: '40px',
                width: '40px',
                height: '40px',
                p: 0,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0px 2px 4px 0px #0000004D',
                color: '#1F1B13',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: '28px' }} />
            </Button>
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={0}
              slidesPerView={1}
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              pagination={{
                clickable: true,
              }}
              navigation={true}
              onSwiper={setSwiperInstance}
              style={{ width: '100%', height: '100%' }}
            >
              <SwiperSlide style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src="/images/PLP Photos-02.png"
                  alt="PLP Photos 02"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </SwiperSlide>
              <SwiperSlide style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src="/images/PLP Photos-03.png"
                  alt="PLP Photos 03"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </SwiperSlide>
              <SwiperSlide style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src="/images/PLP Photos-04.png"
                  alt="PLP Photos 04"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </SwiperSlide>
              <SwiperSlide style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src="/images/PLP Photos-05.png"
                  alt="PLP Photos 05"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </SwiperSlide>
              <SwiperSlide style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src="/images/PLP Photos-06.png"
                  alt="PLP Photos 06"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </SwiperSlide>
            </Swiper>
            <Button
              ref={nextRef}
              sx={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                minWidth: '40px',
                width: '40px',
                height: '40px',
                p: 0,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0px 2px 4px 0px #0000004D',
                color: '#1F1B13',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <ChevronRightIcon sx={{ fontSize: '28px' }} />
            </Button>
          </Box>
        </Grid>
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            '@media (max-width: 900px)': {
              marginTop: '-90px',
            },
          }}
        >
          <Box sx={{ p: 3, '@media (max-width: 900px)': { px: '16px' } }}>
            <Typography
              variant={mediaMD ? 'body10' : 'body3'}
              component="h1"
              sx={{
                fontWeight: 800,
                // fontSize: '72px',
                lineHeight: '110%',
                letterSpacing: '0%',
                color: '#FDBE16',
                // position: 'relative',
                zIndex: 1000,
                mt: { xs: 4, md: 0 },
                '@media (min-width: 900px)': {
                  //marginLeft: '-120px',
                },
              }}
            >
              <SpeakableText>Pratham</SpeakableText>
            </Typography>
            <Typography
              variant={mediaMD ? 'body10' : 'body3'}
              component="h1"
              sx={{
                fontWeight: 800,
                // fontSize: '72px',
                lineHeight: '110%',
                letterSpacing: '0%',
                color: '#FDBE16',
                '@media (max-width: 900px)': {
                  marginLeft: '60px',
                },
              }}
            >
              <SpeakableText>Open School</SpeakableText>
            </Typography>

            <Typography
              variant={mediaMD ? 'body1' : 'body4'}
              component="h1"
              sx={{
                my: 2,
                fontFamily: 'Poppins',
                fontWeight: 400,
                lineHeight: '36px',
                letterSpacing: '0px',
                color: '#1F1B13',
                mt: 2,
              }}
            >
              <SpeakableText>
                Opening doors to knowledge and skills
              </SpeakableText>
            </Typography>

            <Typography
              variant={mediaMD ? 'body1' : 'h1'}
              component="h1"
              sx={{
                fontWeight: 400,
                lineHeight: '28px',
                letterSpacing: '0px',
                color: '#1F1B13',
                background:
                  'linear-gradient(87.94deg, #E9A416 -32.81%, #FBCC4C 22.95%, #FDE6AA 77.57%)',
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: '8px',
                mt: 1,
              }}
            >
              {/* <SpeakableText>In {languagesCount} languages</SpeakableText> */}
              <SpeakableText>In 15 languages</SpeakableText>

            </Typography>

            <Typography
              variant={mediaMD ? 'body1' : 'body5'}
              component="h1"
              sx={{
                mb: 3,
                fontFamily: 'Poppins',
                fontWeight: 400,
                // fontSize: '18px',
                // lineHeight: '24px',
                letterSpacing: '0.5px',
                color: '#1F1B13',
                mt: 3,
                textAlign: 'justify',
              }}
            >
              <SpeakableText>
                Pratham Open School offers free, downloadable videos, games,
                reading material and stories in 15 languages for ages 1 to 18+,
                designed to support self-led learning and group learning through
                activities and projects.
              </SpeakableText>
            </Typography>
            <Box sx={{ '@media (min-width: 900px)': { mb: 8 } }}>
              <SearchButton
                searchValue={search}
                onSearch={() => router.push('/pos/search?q=' + search)}
                handleSearch={setSearch}
                _box={{
                  mx: 'auto',
                  mt: 4,
                  '@media (min-width: 900px)': {
                    mb: '100px',
                  },
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          mx: 7,
          boxShadow: '1px 0px 16px 0px #00000026',
          backgroundColor: '#F1F2F2',
          p: '32px',
          marginTop: '-60px',
          zIndex: 1,
          position: 'relative',
          '@media (max-width: 900px)': {
            mx: '16px',
            marginTop: '20px',
          },
        }}
      >
        <Typography
          variant={mediaMD ? 'h1' : 'body6'}
          component="h3"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            // fontSize: '36px',
            lineHeight: '64px',
            letterSpacing: '-0.25px',
            color: '#1F1B13',
            textAlign: 'center',
          }}
        >
          <SpeakableText>Our Learning Pillars</SpeakableText>
        </Typography>
        <Learning descriptions={descriptions} />
      </Box>

      {/* Total Resources section  */}

      <Box sx={{ marginTop: '50px' }}>
        <Box
          sx={{
            '@media (max-width: 900px)': {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center',
            },
          }}
        >
          <Typography
            variant={mediaMD ? 'body8' : 'body7'}
            component="h1"
            sx={{
              // fontFamily: 'Poppins',
              fontWeight: 700,
              // fontSize: '46px',
              // lineHeight: '100%',
              letterSpacing: '-0.25px',
              textAlign: 'center',
              color: '#1F1B13',
            }}
          >
<SpeakableText>
  {videosCount+gamesCount+otherFormatsCount}
</SpeakableText>
          </Typography>
          <Typography
            variant="body8"
            component="h1"
            sx={{
              fontWeight: 400,
              // fontSize: '24px',
              // lineHeight: '32px',
              letterSpacing: '0px',
              textAlign: 'center',
              color: '#1F1B13',
              mt: 1.5,
              '@media (max-width: 900px)': {
                mt: 0,
              },
            }}
          >
            <SpeakableText>Total Resources</SpeakableText>
          </Typography>
        </Box>

        {/* Resource Stats Section */}
        <Container>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 2, mb: 2 }}
          >
            {[
              { value: videosCount, label: 'Videos' },
              // { value: 1700, label: 'Stories' },
              { value: gamesCount, label: 'Games' },
              // { value: audiosCount, label: 'Audios' },
              { value: otherFormatsCount, label: 'Other Formats' },
              { value: 15, label: 'Languages' },
            ].map((item, idx) => (
              <Grid
                item
                xs={6}
                sm={6}
                md={4}
                lg={2}
                key={item.label}
                sx={{ textAlign: 'center' }}
              >
                <Typography
                  variant={mediaMD ? 'body8' : 'body6'}
                  component="h1"
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 700,
                    fontSize: '36px',
                    lineHeight: '44px',
                    letterSpacing: '0px',
                    textAlign: 'center',
                    color: '#F17B06',
                  }}
                >
                  <SpeakableText>{item.value}</SpeakableText>
                </Typography>
                <Typography
                  variant={mediaMD ? 'h2' : 'body8'}
                  component="h1"
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    // fontSize: '24px',
                    lineHeight: '32px',
                    letterSpacing: '0px',
                    textAlign: 'center',
                    color: '#1F1B13',
                  }}
                >
                  <SpeakableText>{item.label}</SpeakableText>
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      {/* Featured Gallery section  */}

      <Box>
        <Typography
          variant="body7"
          component="h1"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            // fontSize: '46px',
            lineHeight: '100%',
            letterSpacing: '-0.25px',
            textAlign: 'center',
            mt: 5,
          }}
        >
          <SpeakableText>Featured Gallery</SpeakableText>
        </Typography>

        <Box
          sx={{
            mt: 4,
          }}
        >
          {/* <FeautureCarousel /> */}
          <Content
            isShowLayout={false}
            contentTabs={['Content']}
            showFilter={false}
            showSearch={false}
            filters={{ limit: 10 }}
            // showHelpDesk={false}
            hasMoreData={false}
            _config={{
              contentBaseUrl: '/pos',
              _carousel: {
                loop: true,
                autoplay: { delay: 2500, disableOnInteraction: false },
              },
              isHideNavigation: true,
              isShowInCarousel: true,
              default_img: '/images/image_ver.png',
              _card: {
                isHideProgressStatus: true,
              },
            }}
            totalResources={totalResources}
            setTotalResources={setTotalResources}
          />
        </Box>
      </Box>

      {/* What's New */}
      <Box>
        <Typography
          variant="body6"
          component="h1"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            // fontSize: '36px',
            // lineHeight: '44px',
            letterSpacing: '0px',
            textAlign: 'center',
            mt: 4,
          }}
        >
          <SpeakableText>What's New</SpeakableText>
        </Typography>

        <Box>
          <WhatsNewCarousel />
        </Box>

        {/* More way to Learn */}
      </Box>
      <Box
        sx={{
          mt: 8,
          mx: 7,
          '@media (max-width: 900px)': {
            mx: '16px',
          },
        }}
      >
        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
          <Grid item xs={12} md={5}>
            <Typography
              variant={mediaMD ? 'h1' : 'body6'}
              component="h1"
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 700,
                // fontSize: '36px',
                // lineHeight: '44px',
                letterSpacing: '0px',
                color: '#1F1B13',
                '@media (max-width: 900px)': {
                  textAlign: 'center',
                },
              }}
            >
              <SpeakableText>
                More Ways to Learn – Check Out Our Products!
              </SpeakableText>
            </Typography>
          </Grid>
          <Grid item xs={12} md={7}>
            <MoreWayCarousel />
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          mt: 7,
          mx: 7,
          '@media (max-width: 900px)': {
            mx: '16px',
          },
        }}
      >
        <Typography
          variant={mediaMD ? 'h1' : 'body6'}
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: '36px',
            lineHeight: '44px',
            letterSpacing: '0px',
            textAlign: 'center',
            color: '#1F1B13',
          }}
        >
          <SpeakableText>Knowledge Partners</SpeakableText>
        </Typography>

        <Container maxWidth="xl">
          <Box sx={{ mt: 3 }}>
            <KnwoledgeCarousel images={partners} />
          </Box>
        </Container>
      </Box>

      <Box
        sx={{
          mt: 7,
          mx: 7,
          '@media (max-width: 900px)': {
            mx: '16px',
          },
        }}
      >
        <Typography
          variant={mediaMD ? 'h1' : 'body6'}
          component="h1"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            // fontSize: '36px',
            // lineHeight: '44px',
            letterSpacing: '0px',
            textAlign: 'center',
            color: '#1F1B13',
          }}
        >
          <SpeakableText>Our Partners</SpeakableText>
        </Typography>

        <Container maxWidth="xl">
          <Box sx={{ mt: 3 }}>
            <KnwoledgeCarousel images={ourPartners} />
          </Box>
        </Container>
      </Box>

      <Box
        sx={{
          mt: 7,
          mx: 7,
          mb: 2,
          '@media (max-width: 900px)': {
            mx: '16px',
          },
        }}
      >
        <Typography
          variant={mediaMD ? 'h1' : 'body6'}
          component="h1"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            // fontSize: '36px',
            // lineHeight: '44px',
            letterSpacing: '0px',
            textAlign: 'center',
            color: '#1F1B13',
          }}
        >
          <SpeakableText>Other Websites</SpeakableText>
        </Typography>

        <Container maxWidth="xl">
          <Box sx={{ mt: 3 }}>
            <OtherWebsiteCarousel images={otherWebsites} />
          </Box>
        </Container>
      </Box>
    </Layout>
  );
};

export default Page;
