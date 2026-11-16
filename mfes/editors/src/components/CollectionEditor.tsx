// @ts-ignore

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import { CLOUD_STORAGE_URL } from '../utils/app.config';
import {
  getLocalStoredUserName,
  getLocalStoredUserId,
  getLocalStoredUserSpecificBoard,
} from '../services/LocalStorageService';
import { fetchCCTAList } from '../services/userServices';
import { sendCredentialService } from '../services/NotificationService';
import { sendContentNotification } from '../services/sendContentNotification';
import { ContentStatus, Editor } from '../utils/app.constant';
import useTenantConfig from '../hooks/useTenantConfig';
import useSharedStore from '../../../shared-store';
const CollectionEditor: React.FC = () => {
  const router = useRouter();
  const { identifier, contentMode } = router.query;
  const [mode, setMode] = useState<any>();
  const [fullName, setFullName] = useState('Anonymous User');
  const [deviceId, setDeviceId] = useState('');
  const setFetchContentAPI = useSharedStore(
    (state: any) => state.setFetchContentAPI
  );
  const fetchContentAPI = useSharedStore((state: any) => state.fetchContentAPI);
  const addToContentArray = useSharedStore(
    (state: any) => state.addToContentArray
  );

  const [firstName, lastName] = fullName.split(' ');
  const tenantConfig = useTenantConfig();
  useEffect(() => {
    if (contentMode?.length) {
      setMode(contentMode);
    }
  }, [router.query]);

  const sendReviewNotification = async (notificationData: any) => {
    console.log('notificationData', notificationData);
    const isQueue = false;
    const context = 'CMS';
    const key = 'onContentReview';
    const url = `${process.env.NEXT_PUBLIC_WORKSPACE_BASE_URL}/collection?identifier=${notificationData?.contentId}&contentMode=review`;
    try {
     
      const ContentDetail = await fetch(
        `/action/content/v3/read/${notificationData?.contentId}`
      );
      const data = await ContentDetail.json();
      const board = data?.result?.content?.board;
      const rawSubject = data?.result?.content?.subject;
      let subject: string[];

      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

      if (rawSubject) {
        const arr = Array.isArray(rawSubject) ? rawSubject : [rawSubject];
        subject = arr.map(capitalize);
      } else {
        const hierarchyRes = await fetch(
          `/action/content/v3/hierarchy/${notificationData?.contentId}?mode=edit`
        );
        const hierarchyData = await hierarchyRes.json();
        const targetSubjectIds: string[] =
          hierarchyData?.result?.content?.targetSubjectIds ?? [];
        const PREFIX = 'scp-framework_subject_';
        subject = targetSubjectIds.map((id: string) => {
          const stripped = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id;
          return capitalize(stripped);
        });
      }
      console.log('board=====>', board);
      console.log('subject=====>', subject);
      const response = await fetchCCTAList(board, subject);
      const cctaList = response;


      const promises = cctaList.map(async (user: any) => {
        const replacements = {
          '{reviewerName}': user?.name,
          '{creatorName}': notificationData?.creator,
          '{contentId}': notificationData?.contentId,
          '{appUrl}': url,
          '{submissionDate}': new Date().toLocaleDateString(),
          '{contentType}': 'Course',
          '{contentTitle}': data?.result?.content?.name,
        };

        return sendCredentialService({
          isQueue,
          context,
          key,
          replacements,
          email: { receipients: [user?.email] },
        });
      });

      // Wait for all API calls to complete
      await Promise.all(promises);

      console.log('All emails sent successfully.');

      window.history.back();
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  };

  useEffect(() => {
    const storedFullName = getLocalStoredUserName();
    const storedMode = localStorage.getItem('contentMode');
    setMode(storedMode || 'edit');
    setFullName(storedFullName ?? 'Anonymous User');

    const generatedDeviceId = uuidv4();
    setDeviceId(generatedDeviceId);
  }, []);

  const editorConfig = {
    context: {
      user: {
        id: getLocalStoredUserId(),
        fullName: fullName,
        firstName: firstName || 'Anonymous',
        lastName: lastName || 'User',
        orgIds: [tenantConfig?.CHANNEL_ID],
      },
      identifier: identifier,
      channel: tenantConfig?.CHANNEL_ID,
      framework: tenantConfig?.COLLECTION_FRAMEWORK,
      sid: uuidv4(),
      did: deviceId,
      uid: getLocalStoredUserId(),
      additionalCategories: [],
      pdata: {
        id: 'pratham.admin.portal',
        ver: '1.0.0',
        pid: 'pratham-portal',
      },
      contextRollup: {
        l1: tenantConfig?.CHANNEL_ID,
      },
      tags: [tenantConfig?.CHANNEL_ID],
      cdata: [
        {
          id: tenantConfig?.CHANNEL_ID,
          type: 'pratham-portal',
        },
      ],
      timeDiff: 5,
      objectRollup: {},
      host: '',
      defaultLicense: 'CC BY 4.0',
      endpoint: '/data/v3/telemetry',
      env: 'collection_editor',
      cloudStorageUrls: [CLOUD_STORAGE_URL],
    },
    config: {
      mode: contentMode || mode || 'edit', // edit / review / read / sourcingReview
      userSpecificFrameworkField: getLocalStoredUserSpecificBoard(),
      objectType: 'Collection',
      primaryCategory: 'Course', // Professional Development Course, Curriculum Course
      showAddCollaborator: false,
      enableBulkUpload: false,
      contentPolicyUrl: '/term-of-use.html',
    },
  };

  const getReturnPage = () => {
    try {
      const previousPageUrl = sessionStorage.getItem('previousPage');
      if (previousPageUrl) {
        const url = new URL(previousPageUrl, window.location.origin);
        return url.searchParams.get('page') || undefined;
      }
    } catch {}
    return undefined;
  };

  const sendContentPublishNotification = () =>
    sendContentNotification(
      ContentStatus.PUBLISHED,
      Editor.COLLECTION,
      '',
      identifier,
      undefined,
      router,
      getReturnPage()
    );
  const sendContentRejectNotification = () =>
    sendContentNotification(
      ContentStatus.REJECTED,
      Editor.COLLECTION,
      '',
      identifier,
      undefined,
      router,
      getReturnPage()
    );

  const editorRef = useRef<HTMLDivElement | null>(null);
  const isAppendedRef = useRef(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // Store all API calls made by the editor for debugging/monitoring
  const [apiCalls, setApiCalls] = useState<any[]>([]);
  
  // Expose API calls to window for debugging (optional - remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).editorApiCalls = apiCalls;
    }
  }, [apiCalls]);

  /**
   * Response modifier function - modify this to change API responses before they reach the editor
   * 
   * @param url - The API endpoint URL (e.g., "action/object/category/definition/v1/read?fields=...")
   * @param responseData - The original response data (can be string or object)
   * @returns Modified response data (or original if no modification needed)
   * 
   * @example
   * // Modify category definition response
   * if (url.includes('action/object/category/definition/v1/read')) {
   *   const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
   *   // Modify parsed.result.objectCategoryDefinition here
   *   return typeof responseData === 'string' ? JSON.stringify(parsed) : parsed;
   * }
   */
  const modifyApiResponse = (url: string, responseData: any): any => {
    // Modify ONLY category definition API
    if (url.includes('action/object/category/definition/v1/read')) {
      console.log('Modifying category definition response:', responseData);
  
      // 1️⃣ Parse response if string
      let parsedData = responseData;
      if (typeof responseData === 'string') {
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          console.warn('Could not parse response as JSON:', e);
          return responseData;
        }
      }
  
      // 2️⃣ Modify ONLY the needed part
      if (parsedData?.result?.objectCategoryDefinition) {
        const tenantName = localStorage.getItem('tenantName');
        const uiConfig = localStorage.getItem('uiConfig');
        let selectedPrograms: string[] = [];

        if (uiConfig) {
          try {
            const parsedUiConfig = JSON.parse(uiConfig);
            if (Array.isArray(parsedUiConfig?.program) && parsedUiConfig.program.length > 0) {
              selectedPrograms = parsedUiConfig.program.filter((program: any) => typeof program === 'string' && program.trim());
            }
          } catch (e) {
            console.warn('Could not parse uiconfig from localStorage:', e);
          }
        }

        if (selectedPrograms.length === 0 && tenantName) {
          selectedPrograms = [tenantName];
        }
  
        if (selectedPrograms.length > 0) {
          const objectDef = parsedData.result.objectCategoryDefinition;
  
          // ONLY: forms.create -> properties -> fields -> program
          objectDef.forms?.create?.properties?.forEach((section: any) => {
            section.fields?.forEach((field: any) => {
              if (field.code === 'program' &&  field.default.length === 0) {
                field.range = selectedPrograms;
                if(selectedPrograms.length == 1)
                field.default = selectedPrograms;
              }
            });
          });
        }
  
        console.log('Modified response:', parsedData);
  
        // 3️⃣ Return in original format
        return typeof responseData === 'string'
          ? JSON.stringify(parsedData)
          : parsedData;
      }
    }
  
    // No change → return original
    return responseData;
  };
  
  useEffect(() => {
    const loadJQuery = () => {
      if (!document.getElementById('jquery-script')) {
        const script = document.createElement('script');
        script.id = 'jquery-script';
        script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
        script.async = true;
        script.onload = () => console.log('jQuery loaded successfully.');
        document.body.appendChild(script);
      }
    };
    const loadAssets = () => {
      loadJQuery();
      if (!document.getElementById('collection-editor-js')) {
        const script = document.createElement('script');
        console.log('Hello');

        script.id = 'collection-editor-js';
        script.src =
          "https://cdn.jsdelivr.net/npm/@tekdi/sunbird-collection-editor-web-component@6.1.0-beta.14/sunbird-collection-editor.js";
        script.async = true;
        script.onload = () => setAssetsLoaded(true);
        document.body.appendChild(script);
      } else {
        setAssetsLoaded(true);
      }

      // Load Collection Editor CSS if not already loaded
      if (!document.getElementById('collection-editor-css')) {
        const link = document.createElement('link');
        console.log('PDF Player loaded');
        link.id = 'collection-editor-css';
        link.rel = 'stylesheet';
        link.href =
          'https://cdn.jsdelivr.net/npm/@tekdi/sunbird-collection-editor-web-component@6.1.0-beta.14/styles.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('sunbird-pdf-player-js')) {
        const pdfScript = document.createElement('script');
        pdfScript.id = 'sunbird-pdf-player-js';
        pdfScript.src =
          'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-pdf-player-web-component@1.4.0/sunbird-pdf-player.js';
        pdfScript.async = true;
        document.body.appendChild(pdfScript);
      }

      if (!document.getElementById('sunbird-pdf-player-css')) {
        const pdfLink = document.createElement('link');
        pdfLink.id = 'sunbird-pdf-player-css';
        pdfLink.rel = 'stylesheet';
        pdfLink.href =
          'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-pdf-player-web-component@1.4.0/styles.css';
        document.head.appendChild(pdfLink);
      }

      if (!document.getElementById('sunbird-epub-player-js')) {
        const epubScript = document.createElement('script');
        epubScript.id = 'sunbird-epub-player-js';
        epubScript.src =
          'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-epub-player-web-component@1.4.0/sunbird-epub-player.js';
        epubScript.async = true;
        document.body.appendChild(epubScript);
      }

      if (!document.getElementById('sunbird-epub-player-css')) {
        const epubLink = document.createElement('link');
        epubLink.id = 'sunbird-epub-player-css';
        epubLink.rel = 'stylesheet';
        epubLink.href =
          'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-epub-player-web-component@1.4.0/styles.css';
        document.head.appendChild(epubLink);
      }

      const videoScript = document.createElement('script');
      console.log('Video Player loaded');
      videoScript.id = 'sunbird-video-player.js';
      videoScript.src =
        'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-video-player-web-component@1.2.5/sunbird-video-player.js';
      videoScript.async = true;
      document.body.appendChild(videoScript);

      const videoLink = document.createElement('link');
      videoLink.id = 'sunbird-video-player-css';
      videoLink.rel = 'stylesheet';
      videoLink.href =
        'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-video-player-web-component@1.2.5/styles.css';
      document.head.appendChild(videoLink);
    };

    loadAssets();

    return () => {
      const reflectScript = document.getElementById('reflect-metadata');
      const editorScript = document.getElementById('collection-editor-js');
      const editorCSS = document.getElementById('collection-editor-css');

      if (reflectScript) document.head.removeChild(reflectScript);
      if (editorScript) document.body.removeChild(editorScript);
      if (editorCSS) document.head.removeChild(editorCSS);
    };
  }, []);

  useEffect(() => {
    // Only set up interceptors when identifier is available and assets are loaded
    if (assetsLoaded && editorRef.current && !isAppendedRef.current && identifier) {
      const collectionEditorElement = document.createElement('lib-editor');

      collectionEditorElement.setAttribute(
        'editor-config',
        JSON.stringify(editorConfig)
      );

      /**
       * API CALL INTERCEPTION
       * Only intercepts the specific category definition API endpoint
       * to avoid interfering with other critical APIs (content read, etc.)
       */

      // Helper function to check if URL should be intercepted
      const shouldIntercept = (url: string): boolean => {
        // Only intercept the specific category definition API
        return url.includes('action/object/category/definition/v1/read');
      };

      // Intercept API calls (fetch) made by the editor
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        let [url, options] = args;
        const urlString = String(url);
        
        // Modify request body for composite/v3/search to remove "Failed" from status
        if (urlString.includes('composite/v3/search') && options?.body) {
          try {
            const bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            //auto failed remove bug solve for thumbnail
            if(bodyData?.request?.filters?.contentType!="Resource")
            {
              if (bodyData?.request?.filters?.status && Array.isArray(bodyData.request.filters.status)) {
                const statusArray = bodyData.request.filters.status;
                if (statusArray.includes('Failed')) {
                  bodyData.request.filters.status = statusArray.filter((s: string) => s !== 'Failed');
                  options = { ...options, body: typeof options.body === 'string' ? JSON.stringify(bodyData) : bodyData };
                  args = [url, options];
                }
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
        
        // Only intercept and modify the specific API we care about
        const shouldModify = shouldIntercept(urlString);
        
        if (shouldModify) {
          const apiCallData = {
            url: urlString,
            method: options?.method || 'GET',
            headers: options?.headers,
            body: options?.body,
            timestamp: new Date().toISOString(),
            type: 'fetch',
          };
          
          console.log('Editor API Call - Fetch (intercepted):', apiCallData);
          setApiCalls((prev) => [...prev, { ...apiCallData, status: 'pending' }]);
        }
        
        try {
          const response = await originalFetch(...args);
          
          // Only modify if this is the API we care about
          if (shouldModify) {
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            const isJson = contentType?.includes('application/json');
            
            if (isJson) {
              // Clone response to read it without consuming the original
              const clonedResponse = response.clone();
              const originalData = await clonedResponse.json();
              
              // Modify the response data
              const modifiedData = modifyApiResponse(urlString, originalData);
              
              const responseData = {
                url: urlString,
                status: response.status,
                data: originalData,
                modifiedData: modifiedData !== originalData ? modifiedData : undefined,
                timestamp: new Date().toISOString(),
              };
              
              console.log('Editor API Response (modified):', responseData);
              if (modifiedData !== originalData) {
                console.log('✅ Response was modified:', { original: originalData, modified: modifiedData });
              }
              
              setApiCalls((prev) => {
                const updated = [...prev];
                const lastCall = updated[updated.length - 1];
                if (lastCall && lastCall.url === urlString) {
                  updated[updated.length - 1] = { ...lastCall, ...responseData, status: 'completed' };
                }
                return updated;
              });
              
              // Return modified response if it was changed
              if (modifiedData !== originalData) {
                return new Response(JSON.stringify(modifiedData), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                });
              }
            } else {
              // Handle non-JSON responses
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              const modifiedText = modifyApiResponse(urlString, text);
              
              const responseData = {
                url: urlString,
                status: response.status,
                data: text.substring(0, 500), // Limit text length for logging
                timestamp: new Date().toISOString(),
              };
              
              console.log('Editor API Response (text, modified):', responseData);
              setApiCalls((prev) => {
                const updated = [...prev];
                const lastCall = updated[updated.length - 1];
                if (lastCall && lastCall.url === urlString) {
                  updated[updated.length - 1] = { ...lastCall, ...responseData, status: 'completed' };
                }
                return updated;
              });
              
              // Return modified response if it was changed
              if (modifiedText !== text) {
                return new Response(modifiedText, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                });
              }
            }
          }
          
          return response;
        } catch (error) {
          if (shouldModify) {
            const errorData = {
              url: urlString,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            };
            console.error('Editor API Call Error:', errorData);
            setApiCalls((prev) => {
              const updated = [...prev];
              const lastCall = updated[updated.length - 1];
              if (lastCall && lastCall.url === urlString) {
                updated[updated.length - 1] = { ...lastCall, ...errorData, status: 'error' };
              }
              return updated;
            });
          }
          throw error;
        }
      };

      // Intercept XMLHttpRequest calls made by the editor
      // Only intercept the specific API endpoint we need to modify
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      
      // Store original getters BEFORE we override them
      const originalResponseTextGetter = (function() {
        const descriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
        return descriptor?.get;
      })();
      
      const originalResponseGetter = (function() {
        const descriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
        return descriptor?.get;
      })();
      
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
        const urlString = String(url);
        (this as any)._url = urlString;
        (this as any)._method = method;
        (this as any)._shouldIntercept = shouldIntercept(urlString);
        (this as any)._responseModified = false;
        (this as any)._originalResponseText = null;
        (this as any)._modifiedResponseText = null;
        (this as any)._originalResponse = null;
        (this as any)._modifiedResponse = null;
        return originalXHROpen.apply(this, [method, url, ...rest] as any);
      };
      
      // Override responseText to return modified data (only for intercepted URLs)
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        get: function() {
          const xhr = this as any;
          const urlString = String(xhr._url);
          
          // Only modify when response is ready
          if (xhr.readyState !== 4) {
            return originalResponseTextGetter?.call(this) || '';
          }
          
          // Only intercept if this is the API we care about
          if (!xhr._shouldIntercept) {
            return originalResponseTextGetter?.call(this) || '';
          }
          
          // Get original response text if not cached
          if (xhr._originalResponseText === null) {
            if (originalResponseTextGetter) {
              xhr._originalResponseText = originalResponseTextGetter.call(this);
            } else {
              xhr._originalResponseText = '';
            }
          }
          
          // Modify response if not already modified
          if (!xhr._responseModified && xhr._originalResponseText !== null) {
            const modified = modifyApiResponse(urlString, xhr._originalResponseText);
            xhr._modifiedResponseText = modified;
            xhr._responseModified = true;
            
            if (modified !== xhr._originalResponseText) {
              console.log('✅ XHR ResponseText was modified:', {
                url: urlString,
                originalLength: xhr._originalResponseText.length,
                modifiedLength: typeof modified === 'string' ? modified.length : JSON.stringify(modified).length,
              });
            }
          }
          
          return xhr._modifiedResponseText !== null ? xhr._modifiedResponseText : (xhr._originalResponseText || '');
        },
        configurable: true,
        enumerable: true,
      });
      
      // Override response property (for JSON responses) - only for intercepted URLs
      Object.defineProperty(XMLHttpRequest.prototype, 'response', {
        get: function() {
          const xhr = this as any;
          const urlString = String(xhr._url);
          
          // Only modify when response is ready
          if (xhr.readyState !== 4) {
            return originalResponseGetter?.call(this) || null;
          }
          
          // Only intercept if this is the API we care about
          if (!xhr._shouldIntercept) {
            return originalResponseGetter?.call(this) || null;
          }
          
          // Get original response if not cached
          if (xhr._originalResponse === null) {
            if (originalResponseGetter) {
              xhr._originalResponse = originalResponseGetter.call(this);
            } else {
              xhr._originalResponse = null;
            }
          }
          
          // Modify response if not already modified
          if (!xhr._responseModified && xhr._originalResponse !== null) {
            let modified: any;
            
            // If response is a string, modify it
            if (typeof xhr._originalResponse === 'string') {
              modified = modifyApiResponse(urlString, xhr._originalResponse);
            } else {
              // If response is already parsed JSON, modify it
              modified = modifyApiResponse(urlString, xhr._originalResponse);
            }
            
            xhr._modifiedResponse = modified;
            xhr._responseModified = true;
            
            // Also update responseText if it's a string response
            if (typeof xhr._originalResponse === 'string' && modified !== xhr._originalResponse) {
              xhr._modifiedResponseText = modified;
            }
            
            if (JSON.stringify(modified) !== JSON.stringify(xhr._originalResponse)) {
              console.log('✅ XHR Response (object) was modified:', {
                url: urlString,
                hasChanges: true,
              });
            }
            
            return modified;
          }
          
          return xhr._modifiedResponse !== null ? xhr._modifiedResponse : (xhr._originalResponse || null);
        },
        configurable: true,
        enumerable: true,
      });
      
      XMLHttpRequest.prototype.send = function(body?: any) {
        const xhr = this as any;
        const urlString = String(xhr._url);
        const shouldModify = xhr._shouldIntercept;
        
        // Modify request body for composite/v3/search to remove "Failed" from status
        if (urlString.includes('composite/v3/search') && body) {
          try {
            const bodyData = typeof body === 'string' ? JSON.parse(body) : body;
            //auto failed remove bug solve for thumbnail
            if(bodyData?.request?.filters?.contentType!="Resource")
            {
              if (bodyData?.request?.filters?.status && Array.isArray(bodyData.request.filters.status)) {
                const statusArray = bodyData.request.filters.status;
                if (statusArray.includes('Failed')) {
                  bodyData.request.filters.status = statusArray.filter((s: string) => s !== 'Failed');
                  body = typeof body === 'string' ? JSON.stringify(bodyData) : bodyData;
                }
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
        
        if (shouldModify) {
          const apiCallData = {
            url: urlString,
            method: xhr._method,
            body: body,
            timestamp: new Date().toISOString(),
            type: 'xhr',
          };
          
          console.log('Editor API Call - XHR (intercepted):', apiCallData);
          setApiCalls((prev) => [...prev, { ...apiCallData, status: 'pending' }]);
        }
        
        xhr.addEventListener('load', function() {
          if (shouldModify && xhr.status === 200) {
            // Force modification by accessing responseText/response
            // This ensures our getters are called and response is modified
            void xhr.responseText; // This will trigger modification
            void xhr.response; // This will also trigger modification
            console.log('✅ Load event - response accessed and modified');
            
            const responseData = {
              url: urlString,
              method: xhr._method,
              status: xhr.status,
              response: (xhr._modifiedResponseText || xhr.responseText || '').substring(0, 500),
              timestamp: new Date().toISOString(),
            };
            console.log('Editor API Response - XHR (modified):', responseData);
            setApiCalls((prev) => {
              const updated = [...prev];
              const lastCall = updated[updated.length - 1];
              if (lastCall && lastCall.url === urlString) {
                updated[updated.length - 1] = { ...lastCall, ...responseData, status: 'completed' };
              }
              return updated;
            });
          }
        });
        
        xhr.addEventListener('error', function() {
          if (shouldModify) {
            const errorData = {
              url: urlString,
              method: xhr._method,
              timestamp: new Date().toISOString(),
            };
            console.error('Editor API Error - XHR:', errorData);
            setApiCalls((prev) => {
              const updated = [...prev];
              const lastCall = updated[updated.length - 1];
              if (lastCall && lastCall.url === urlString) {
                updated[updated.length - 1] = { ...lastCall, ...errorData, status: 'error' };
              }
              return updated;
            });
          }
        });
        
        return originalXHRSend.apply(this, [body]);
      };

      collectionEditorElement.addEventListener(
        'editorEmitter',
        (event: any) => {
          // Log complete event data to see all available information
          // console.log('Editor event (full):', event);
          if (
            event.detail?.action === 'backContent' ||
            event.detail?.action === 'submitContent' ||
            event.detail?.action === 'publishContent' ||
            event.detail?.action === 'rejectContent'
          ) {
            if (event.detail?.action === 'submitContent') {
              console.log('collection');

              // Disabled: was emailing every CCTA reviewer matching this content's board/subject ("onContentReview") when content was submitted for review
              // sendReviewNotification({
              //   contentId: identifier,
              //   creator: getLocalStoredUserName(),
              // })
              //   .then(() => {
              //     window.history.back();
              //   })
              //   .catch((error) => {
              //     console.error('Error in sendReviewNotification:', error);
              //   });
              window.history.back();
            }
            else if( event.detail?.action === "publishContent")
              
            {
              console.log("Publishing content");
              setIsPublishing(true);
              
              // Add 5 second delay before executing publish actions
              setTimeout(() => {
                setFetchContentAPI(!fetchContentAPI);
                sendContentPublishNotification();
                setIsPublishing(false);
              }, 5000);

            }
            else if( event.detail?.action === "rejectContent")
            {
              setFetchContentAPI(!fetchContentAPI);

              sendContentRejectNotification();
            } else {
              window.history.back();
            }
            // Add 5 second delay before cleanup operations
            setTimeout(() => {
              localStorage.removeItem("contentMode");

              
              window.addEventListener(
                "popstate",
                () => {
                  window.location.reload();
                },
                { once: true }
              );
            }, 5000);
          }
        }
      );

      editorRef.current.appendChild(collectionEditorElement);
      isAppendedRef.current = true;

      // Cleanup function to restore original fetch and XMLHttpRequest
      return () => {
        // Restore original fetch
        if (window.fetch !== originalFetch) {
          window.fetch = originalFetch;
        }
        
        // Restore original XMLHttpRequest methods
        XMLHttpRequest.prototype.open = originalXHROpen;
        XMLHttpRequest.prototype.send = originalXHRSend;
      };
    }
  }, [assetsLoaded, identifier]); // Add identifier as dependency

  return (
    <div>
      {assetsLoaded ? <div ref={editorRef}></div> : <p>Loading editor...</p>}

      {/* Publishing Loader */}
      {isPublishing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
          //  backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }}></div>
            {/* <p>Publishing content... Please wait 5 seconds</p> */}
            {/* @ts-ignore */}
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};
export default CollectionEditor;
