import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import {
  fetchContent,
  getContentStatus,
  getHierarchy,
  getQumlData,
} from '../services/PlayerService';
import { Box, Typography } from '@mui/material';
import { MIME_TYPE } from '../utils/url.config';
import {
  PlayerConfig,
  V1PlayerConfig,
  V2PlayerConfig,
} from '../utils/url.config';
import Loader from '../components/Loader';

const SunbirdPlayers = dynamic(() => import('../components/players/Players'), {
  ssr: false,
});

interface SunbirdPlayerProps {
  identifier?: string; // Allow identifier as a prop
  playerConfig?: PlayerConfig; // Optional playerConfig prop
}

const Players: React.FC<SunbirdPlayerProps> = ({
  identifier: propIdentifier,
  playerConfig: propPlayerConfig,
}) => {
  const router = useRouter();
  const {
    courseId,
    unitId,
    userId,
    identifier: queryIdentifier,
    firstName,
    lastName,
    hideBackButton,
  } = router.query ?? {}; // Get identifier from the query
  const identifier = propIdentifier || queryIdentifier; // Prefer prop over query
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig | undefined>(
    propPlayerConfig
  );
  const [loading, setLoading] = useState(!propPlayerConfig);
  const [isGenerateCertificate, setIsGenerateCertificate] = useState(true);
  const [trackable, setTrackable] = useState(true);

  const [invalidIdentifier, setInvalidIdentifier] = useState<boolean | null>(null);

  useEffect(() => {
    if (playerConfig || !identifier) {
      setInvalidIdentifier(false);
      setLoading(false);
      return;
    }
    else {
      setInvalidIdentifier(true);
    }

    const loadContent = async () => {
      setLoading(true);
      try {
        const name = window.name;
        const jsonParse = name ? JSON.parse(name) : {};
        setIsGenerateCertificate(jsonParse.generateCertificate ?? true);
        setTrackable(jsonParse.trackable ?? true);
        const data = await fetchContent(identifier);
        let config: PlayerConfig;

        if (data.mimeType === MIME_TYPE.QUESTION_SET_MIME_TYPE) {
          config = { ...V2PlayerConfig };
          const Q1 = await getHierarchy(identifier);
          const Q2 = await getQumlData(identifier);
          const metadata = { ...Q1?.questionset, ...Q2?.questionset };
          config.metadata = metadata;
        } else if (MIME_TYPE.INTERACTIVE_MIME_TYPE.includes(data?.mimeType)) {
          config = { ...V1PlayerConfig, metadata: data, data: data.body || {} };
          //@ts-ignore
          config.context['contentId'] = identifier;
        } else {
          config = { ...V2PlayerConfig, metadata: data };
          //@ts-ignore
          config.context['contentId'] = identifier;
        }
        if(data.mimeType === MIME_TYPE.H5P_CONTENT && config.metadata)
        {
          config.metadata.streamingUrl=config.metadata.streamingUrl+"/content";
          console.log("########h5p playerConfig",config);
        }
        //check audio content
        if (MIME_TYPE.AUDIO_MIME_TYPE.includes(data?.mimeType) && config?.metadata?.posterImage) {
          config.extra={...(config?.extra? config.extra : {}),"audio": {
            "icon": config?.metadata?.posterImage
          }};
        }
        //search content details
        // console.log("###########contentStatus outer",userId,courseId,unitId,identifier);
        if(courseId && unitId && identifier)
        {
          let temp_userId:any='';
          if (typeof window !== "undefined") {
            temp_userId = localStorage.getItem("userId");
          }
          let contentStatus = await getContentStatus({
            courseId:courseId,
            userId: temp_userId,
            contentId:identifier,
            unitId:unitId
          });    
          if(contentStatus && contentStatus?.data?.length>0)
          {
            if(contentStatus.data[0]?.resumeData && contentStatus.data[0]?.resumeData!='' && contentStatus.data[0].resumeData!=null)
            {
              // console.log("###########contentStatus",contentStatus.data[0].resumeData);
              config.extra={...(config?.extra? config.extra : {}), resumeData:contentStatus.data[0].resumeData.toString()};
            }
          }
        }
        //set theme
        // console.log("###########contentStatus",contentStatus);
        config.extra={...(config?.extra? config.extra : {}),"theme": {
          "primary": "#DDA613", //FDBE16
          "toolbar": "rgba(30,5,20,0.97)",
          "background": "#1a0512"
        }};
        setPlayerConfig(config);
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [identifier, playerConfig]);

  if (invalidIdentifier===true && loading===false) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography color="error">No identifier provided</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100vh"
        >
          <Loader showBackdrop={false} />
        </Box>
      ) : (
        <Box sx={{ height: 'calc(100vh - 16px)' }}>
          {/* <Typography
            color="#024f9d"
            sx={{ padding: '0 0 4px 4px', fontWeight: 'bold' }}
          >
            {playerConfig?.metadata?.name || 'Loading...'}
          </Typography> */}
          <SunbirdPlayers
            player-config={playerConfig}
            courseId={courseId as string}
            unitId={unitId as string}
            userId={userId as string}
            configFunctionality={{ isGenerateCertificate, trackable }}
            firstName={firstName as string}
            lastName={lastName as string}
            hideBackButton={hideBackButton === 'true'}
          />
        </Box>
      )}
    </Box>
  );
};

export default Players;
