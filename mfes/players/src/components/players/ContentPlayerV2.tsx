import React, { useRef, useEffect, useState } from 'react';
import { getTelemetryEvents, getTelemetryEventsResume } from '../../services/TelemetryService';
import { handleExitEvent } from '../utils/helper';

interface PlayerConfigProps {
  playerConfig: any;
  relatedData?: any;
  configFunctionality?: any;
  /** Hides the content player's own back button inside the player iframe. */
  hideBackButton?: boolean;
}

const basePath = process.env.NEXT_PUBLIC_ASSETS_CONTENT || '/sbplayer';

const ContentPlayerV2 = ({
  playerConfig,
  relatedData: { courseId, unitId, userId },
  configFunctionality,
  hideBackButton,
}: PlayerConfigProps) => {

  console.log("########h5p ContentPlayerV2",playerConfig);
  const contentPlayerV2Ref = useRef<HTMLIFrameElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // iPhone Safari has no element Fullscreen API, so there we "pseudo fullscreen":
  // the player is pinned over the whole viewport and the parent page (learner app)
  // is asked to expand this iframe to cover the whole screen.
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [bottom, setBottom] = useState(10);

  const setPseudoFullscreen = (enter: boolean) => {
    setIsPseudoFullscreen(enter);
    setIsFullscreen(enter);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'player:fullscreen', enter }, '*');
    }
  };

  useEffect(() => {
    const handlePlayerMessage = async (event: MessageEvent) => {
      const { type, detail } = event.data || {};
      const mimeType = playerConfig?.metadata?.mimeType || 'h5p';
      const identifier = playerConfig?.metadata?.identifier;
      let contentType='';
      switch (mimeType) {
        case 'application/vnd.ekstep.h5p-archive':
          contentType='H5P';
          break;
        case 'application/pdf':
          contentType='PDF';
          break;
        case 'video/mp4':
          contentType='VIDEO_MP4';
          break;
        case 'video/webm':    
          contentType='WEBM_VIDEO';
          break;
        case 'video/youtube':
          contentType='YOUTUBE_X_VIDEO';
          break;
        case 'video/x-youtube':
          contentType='YOUTUBE_X_VIDEO';
          break;
        case 'application/vnd.ekstep.html-archive':
          contentType='HTML';
          break;
        case 'application/epub':
          contentType='EPUB';
          break;
        case 'audio/mp3':
          contentType='AUDIO_MP3';
          break;
        case 'audio/wav':
          contentType='AUDIO_WAV';
          break;
        case 'audio/mpeg':
          contentType='AUDIO_MP3';
          break;
        default :
          contentType='CONTENT';
          break;
      }

      const buildTelemetryEvent = (eid: string, edata: any) => ({
        eid,
        ets: Date.now(),
        ver: '3.0',
        mid: `${eid}:${Math.random().toString(36).slice(2)}`,
        actor: { id: userId || '', type: 'User' },
        context: playerConfig?.context || {},
        object: {
          id: identifier,
          ver: '1',
          type: mimeType,
          rollup: { l1: identifier },
        },
        tags: [],
        edata,
      });

      switch (type) {
        case 'telemetry':
          {
            if(detail.eid=='START' || detail.eid=='END')
            {
              console.log("response#######",detail)
              await getTelemetryEvents(detail, contentType, {
                courseId,
                unitId,
                userId,
                configFunctionality,
              });
            }
            if(detail.eid=='PROGRESS' && detail?.edata?.resumeData!='' && contentType!='EPUB')
            {
              await getTelemetryEventsResume(detail, contentType, {
                  courseId,
                  unitId,
                  userId,
                  configFunctionality,
                },
                detail.edata.resumeData,
                mimeType
              );
            }
          }
          break;
        case 'player:ready':
          console.log('[player:ready v2]', detail);
          break;
        case 'player:start': {
          if(mimeType=='application/vnd.ekstep.h5p-archive' || mimeType=='application/vnd.ekstep.html-archive')
          {
            console.log('[player:start]', detail);
            const temp_details = buildTelemetryEvent('START', {
              type: mimeType,
              mode: 'play',
              pageid: '',
              duration: detail?.duration || 0,
            });
            const temp_details_end = buildTelemetryEvent('END', {
              type: mimeType,
              mode: 'play',
              pageid: '',
              duration: detail?.duration || 0,
              summary: [{ progress: 100 }],
            });
            try {
              await getTelemetryEvents(temp_details, contentType, { courseId, unitId, userId, configFunctionality });
              await getTelemetryEvents(temp_details_end, contentType, { courseId, unitId, userId, configFunctionality });
            } catch (error) {
              console.error('Error submitting start telemetry:', error);
            }
          }
          break;
        }
        case 'player:complete': {
          console.log('[player:complete]', detail);
          // const temp_details = buildTelemetryEvent('END', {
          //   type: mimeType,
          //   mode: 'play',
          //   pageid: '',
          //   duration: detail?.duration || 0,
          //   summary: [{ progress: 100 }],
          // });
          // try {
          //   await getTelemetryEvents(temp_details, 'content', { courseId, unitId, userId, configFunctionality });
          // } catch (error) {
          //   console.error('Error submitting complete telemetry:', error);
          // }
          break;
        }
        case 'player:error':
          console.error('[player:error]', detail);
          break;
        case 'player:fullscreen':
          // Pseudo fullscreen requested by the player's own fullscreen button
          // (shim in content-player-v2/index.html, iPhone Safari only).
          setPseudoFullscreen(!!event.data?.enter);
          break;
        case 'player:close':
          console.log('[player:close]', detail);
          // Notify parent learner page so it can redirect via activeLink (sbplayer runs in iframe).
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'player:close' }, '*');
          }
          handleExitEvent();
          break;
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => {
      window.removeEventListener('message', handlePlayerMessage);
    };
  }, [playerConfig, courseId, unitId, userId, configFunctionality]);

  useEffect(() => {
    const handleResize = () => {
      setBottom(window.matchMedia('(max-width: 655px)').matches ? 35 : 10);
    };

    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const playerElement: any = contentPlayerV2Ref.current;
    console.log("########h5p ContentPlayerV2 playerElement",playerElement);
    if (playerElement) {
      const originalSrc = playerElement.src;
      playerElement.src = '';
      playerElement.src = originalSrc;

      const handleLoad = () => {
        setTimeout(() => {
          if (
            playerElement.contentWindow &&
            playerElement.contentWindow.setData
          ) {
            playerElement.contentWindow.setData(playerConfig);
          }
        }, 200);
      };

      playerElement.addEventListener('load', handleLoad);

      return () => {
        playerElement.removeEventListener('load', handleLoad);
      };
    }
  }, [playerConfig, courseId, unitId, userId]);

  // Hide the content player's own back button.
  // Every renderer draws it as a button with aria-label="Go back" inside the
  // <content-player> shadow root, and the bundle exposes no config flag for it.
  // The rule is injected from here rather than from the iframe's index.html
  // because everything under libs/content-player-v2 is a build artifact that a
  // new player build replaces. The iframe is same-origin (same MFE) and the
  // shadow root is open, so it is reachable; React owns only the mount point
  // inside it, so the appended <style> survives the player's own re-renders.
  useEffect(() => {
    if (!hideBackButton) return;
    const iframe = contentPlayerV2Ref.current;
    if (!iframe) return;

    let frame = 0;
    let deadline = 0;

    const inject = () => {
      try {
        const doc = iframe.contentDocument;
        const shadow = (doc?.getElementById('player') as any)?.shadowRoot;
        if (!shadow) {
          // Shadow root is created in connectedCallback, once the player
          // bundle has loaded and upgraded the element.
          if (Date.now() < deadline) frame = requestAnimationFrame(inject);
          return;
        }
        if (shadow.getElementById('hide-back-button')) return;
        const style = doc!.createElement('style');
        style.id = 'hide-back-button';
        style.textContent = '[aria-label="Go back"] { display: none !important; }';
        shadow.appendChild(style);
      } catch (error) {
        // Player assets served from another origin — not reachable from here.
        console.warn('Could not hide player back button:', error);
      }
    };

    const start = () => {
      cancelAnimationFrame(frame);
      deadline = Date.now() + 10000;
      inject();
    };

    iframe.addEventListener('load', start);
    start();

    return () => {
      cancelAnimationFrame(frame);
      iframe.removeEventListener('load', start);
    };
  }, [hideBackButton, playerConfig]);

  const toggleFullscreen = () => {
    const playerContainer: any =
      document.getElementById('content-player') ||
      document.getElementById('content-player');
    if (!playerContainer) {
      alert('Content player not found!');
      return;
    }

    const doc: any = document;
    if (isPseudoFullscreen) {
      setPseudoFullscreen(false);
    } else if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      // Older iPad Safari only has the webkit-prefixed API
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } else {
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen();
      } else if (playerContainer.webkitRequestFullscreen) {
        playerContainer.webkitRequestFullscreen(); // Safari
      } else if (playerContainer.msRequestFullscreen) {
        playerContainer.msRequestFullscreen(); // IE
      } else {
        // iPhone Safari: no element Fullscreen API
        setPseudoFullscreen(true);
        return;
      }
      setIsFullscreen(true);
    }
  };

  return (
    <div
      id="content-player"
      style={
        isPseudoFullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              width: '100%',
              height: '100%',
              background: '#000',
            }
          : {
              position: 'relative',
              width: '100%',
              height: '100%',
            }
      }
    >
      <iframe
        ref={contentPlayerV2Ref}
        id="contentPlayer"
        content-player
        title="Content Player"
        src={`${basePath}/libs/content-player-v2/index.html`}
        aria-label="Content Player"
        style={{ border: 'none', width: '100%', height: '100%' }}
      ></iframe>
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '6px',
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')
        }
        onFocus={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {isFullscreen ? (
          // Exit Fullscreen Icon (improved)
          <svg
            width="25"
            height="25"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            style={{ fill: 'black' }}
          >
            <rect x="0" fill="none" width="20" height="20" />

            <g>
              <path d="M3.4 2L2 3.4l2.8 2.8L3 8h5V3L6.2 4.8 3.4 2zm11.8 4.2L18 3.4 16.6 2l-2.8 2.8L12 3v5h5l-1.8-1.8zM4.8 13.8L2 16.6 3.4 18l2.8-2.8L8 17v-5H3l1.8 1.8zM17 12h-5v5l1.8-1.8 2.8 2.8 1.4-1.4-2.8-2.8L17 12z" />
            </g>
          </svg>
        ) : (
          // Enter Fullscreen Icon
          <svg
            width="25"
            height="25"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            style={{ fill: 'black' }}
          >
            <rect x="0" fill="none" width="20" height="20" />

            <g>
              <path d="M7 2H2v5l1.8-1.8L6.5 8 8 6.5 5.2 3.8 7 2zm6 0l1.8 1.8L12 6.5 13.5 8l2.7-2.7L18 7V2h-5zm.5 10L12 13.5l2.7 2.7L13 18h5v-5l-1.8 1.8-2.7-2.8zm-7 0l-2.7 2.7L2 13v5h5l-1.8-1.8L8 13.5 6.5 12z" />
            </g>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ContentPlayerV2;
