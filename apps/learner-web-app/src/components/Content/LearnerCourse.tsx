import dynamic from 'next/dynamic';
import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { Box, Button, Chip, Drawer, Stack, Typography, Fade, Grow } from '@mui/material';
import { useTranslation } from '@shared-lib';
import { Close as CloseIcon, FilterList, Search } from '@mui/icons-material';
import SearchComponent from './SearchComponent';
import FilterComponent from './FilterComponent';
import { gredientStyle } from '@learner/utils/style';
import { logEvent } from '@learner/utils/googleAnalytics';
import { TenantName } from '@learner/utils/app.constant';
import { staticFilterContent } from '@shared-lib-v2/utils/AuthService';

interface LearnerCourseProps {
  title?: string;
  _content?: any;
}

const Content = dynamic(() => import('@Content'), {
  ssr: false,
});

export default memo(function LearnerCourse({
  title,
  _content,
}: LearnerCourseProps) {
  const [filterState, setFilterState] = useState<any>({ limit: 10 });
  const [isOpen, setIsOpen] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const { t } = useTranslation();
  const { staticFilter, filterFramework } = _content ?? {};
  const contentListRef = useRef<HTMLDivElement>(null);
  // Filter state is persisted per listing. Callers that show a different
  // catalogue (e.g. the L2 Courses tab, scoped to the batch's skill) pass their
  // own key so a facet chosen on one listing cannot silently narrow another.
  const filterStorageKey = _content?.filterStorageKey ?? 'learnerCourseFilters';

  useEffect(() => {
    const initFilters = async () => {
      const savedFilters = localStorage.getItem(filterStorageKey);
      if (savedFilters) {
        setFilterState(JSON.parse(savedFilters));
        return;
      }

      const baseFilters = _content?.filters ?? {};
      const preferredLanguage = typeof window !== 'undefined'
        ? localStorage.getItem('preferred_language')
        : null;

      if (!preferredLanguage) {
        setFilterState(baseFilters);
        return;
      }

      // Resolve preferred_language (may be native script) to actual filter option value
      try {
        const channelId = localStorage.getItem('channelId');
        if (channelId) {
          const result = await staticFilterContent({ instantFramework: channelId });
          const searchProps = result?.objectCategoryDefinition?.forms?.search?.properties ?? [];
          const contentLangField = searchProps.find((f: { code: string }) => f.code === 'contentLanguage');
          const matchingOption = contentLangField?.range?.find((option: { identifier?: string; label?: string } | string) => {
            const val = typeof option === 'string' ? option : (option.identifier || option.label || '');
            const lbl = typeof option === 'string' ? option : (option.label || option.identifier || '');
            return val.toLowerCase() === preferredLanguage.toLowerCase()
              || lbl.toLowerCase() === preferredLanguage.toLowerCase();
          });
          if (matchingOption) {
            const optionValue = typeof matchingOption === 'string'
              ? matchingOption
              : (matchingOption.identifier || matchingOption.label || '');
            setFilterState({
              ...baseFilters,
              filters: { ...(baseFilters.filters ?? {}), contentLanguage: [optionValue] },
            });
            return;
          }
        }
      } catch {
        // fall through to raw value
      }

      setFilterState({
        ...baseFilters,
        filters: { ...(baseFilters.filters ?? {}), contentLanguage: [preferredLanguage] },
      });
    };

    initFilters();
  }, [_content?.filters, _content?.searchParams]);

  // Add animation trigger when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentLoaded(true);
    }, 100); // Small delay to ensure smooth animation
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = useCallback((tab: any) => {
    setFilterState((prevState: any) => ({
      ...prevState,
      query: '',
    }));
  }, []);
  const handleSearchClick = useCallback((searchValue: string) => {
    if (typeof window !== 'undefined') {
      const windowUrl = window.location.pathname;
      const cleanedUrl = windowUrl;
      logEvent({
        action: 'search content by ' + searchValue,
        category: cleanedUrl,
        label: 'Search content',
      });
    }
    // setFilterState((prevState: any) => ({
    //   ...prevState,
    //   query: searchValue,
    //   offset: 0,
    // }));
    setFilterState((prevState: any) => {
      const updated = {
        ...prevState,
        query: searchValue,
        offset: 0,

      };
      localStorage.setItem(filterStorageKey, JSON.stringify(updated));
      return updated;
    });
  }, [filterStorageKey]);

  const handleFilterChange = (newFilterState: typeof filterState) => {
    setFilterState((prevState: any) => {
      const updated = {
        ...prevState,
        filters: newFilterState,
      };
      localStorage.setItem(filterStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <Stack sx={{ gap: { xs: 0, sm: 0, md: 2 }, pb: 4 }}>
      {title && (
        <Box
          ref={contentListRef}
          sx={{
            position: 'sticky',
            top: 0,
            bgcolor: '',
            px: { xs: 1, md: 4 },
            py: { xs: 1, md: 2 },
            zIndex: 1,
          }}
          style={gredientStyle}
        >
          <Box
            display="flex"
            flexDirection={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            sx={{
              gap: { xs: 2, md: 0 },
              px: { xs: 1, md: 0 },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 400,
                fontSize: '22px',
                lineHeight: '28px',
              }}
            >
              {t(title ?? 'LEARNER_APP.COURSE.GET_STARTED')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Button
                  variant="outlined"
                  onClick={() => setIsOpen(true)}
                  size="large"
                  sx={{
                    borderRadius: '8px',
                    borderWidth: '1px',
                    borderColor: '#DADADA !important',
                    padding: '8px 10px',
                  }}
                >
                  <FilterList sx={{ width: 20, height: 20, mr: 0.5 }} />
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.1px',
                      mr: 0.5,
                    }}
                  >
                    {t('LEARNER_APP.CONTENT.FILTERS')}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.1px',
                    }}
                  >
                    {Object.keys(filterState?.filters || {}).filter(
                      (e) =>
                        !['limit', ...Object.keys(staticFilter ?? {})].includes(
                          e
                        )
                    ).length
                      ? `(${Object.keys(filterState.filters).filter(
                        (e) =>
                          ![
                            'limit',
                            ...Object.keys(staticFilter ?? {}),
                          ].includes(e)
                      ).length
                      })`
                      : null}
                  </Typography>
                </Button>
              </Box>
              <SearchComponent
                onSearch={handleSearchClick}
                value={filterState?.query}
              />
            </Box>
            <Box
              sx={{
                display: { xs: 'flex', sm: 'flex', md: 'none' },
                overflowY: 'auto',
                width: '100%',
              }}
            >
              <FilterChip
                filters={filterState.filters}
                staticFilter={staticFilter}
                handleFilterChange={handleFilterChange}
              />
            </Box>
          </Box>
        </Box>
      )}
      <Stack
        direction="row"
        sx={{ gap: 4, px: { xs: 2, md: 4 }, py: { xs: 1, md: 2 } }}
      >
        <Drawer
          anchor="left"
          open={isOpen}
          onClose={() => setIsOpen(false)}
          PaperProps={{
            sx: {
              width: '80%',
            },
          }}
        >
          <FilterComponent
            filterFramework={filterFramework}
            staticFilter={staticFilter}
            filterState={filterState}
            handleFilterChange={handleFilterChange}
            onlyFields={_content?.onlyFields ?? []}
            isOpenColapsed={_content?.isOpenColapsed ?? []}
            _config={{
              _filterText: { sx: { pt: 2, px: 2 } },
              _filterBox: { sx: { gap: 0 } },
              _filterBody: {
                sx: {
                  py: 2,
                  px: 2,
                  height: 'calc(100vh - 200px)',
                  overflowY: 'auto',
                },
              },
               _accordionDetails: {
                sx: { maxHeight: '350px', overflow: 'auto' },
              },
            }}
            onlyLanguage={typeof window !== 'undefined' && window.localStorage && localStorage.getItem('userProgram') === TenantName.CAMP_TO_CLUB ? true : false}
          />
          <Box
            sx={{
              bgcolor: '#f1f1f1',
              p: 2,
              position: 'absolute',
              bottom: 0,
              width: '100%',
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={() => setIsOpen(false)}
            >
              {t('LEARNER_APP.COURSE.DONE')}
            </Button>
          </Box>
        </Drawer>

        <Box
          flex={35}
          sx={{
            display: { xs: 'none', md: 'flex' },
            position: 'sticky',
            top: !title ? 0 : 100,
            alignSelf: 'flex-start',
          }}
        >
          <FilterComponent
            filterFramework={filterFramework}
            staticFilter={staticFilter}
            filterState={filterState}
            handleFilterChange={handleFilterChange}
            onlyFields={_content?.onlyFields ?? []}
            isOpenColapsed={_content?.isOpenColapsed ?? []}
            onlyLanguage={typeof window !== 'undefined' && window.localStorage && localStorage.getItem('userProgram') === TenantName.CAMP_TO_CLUB ? true : false}
            _config={{
              _filterBody: {
                sx: {
                  maxHeight: `calc(100vh - ${!title ? 130 : 230}px)`,
                  overflowY: 'auto',
                },
              },
               _accordionDetails: {
                sx: { maxHeight: '350px', overflow: 'auto' },
              },
            }}
          />
        </Box>
        <Box flex={127}>
          {!title && (
            <Box
              display="flex"
              justifyContent="space-between"
              flexDirection={{
                xs: 'column-reverse',
                sm: 'column-reverse',
                md: 'row',
              }}
              gap={2}
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                <FilterChip
                  filters={filterState.filters}
                  staticFilter={staticFilter}
                  handleFilterChange={handleFilterChange}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Button
                    variant="outlined"
                    onClick={() => setIsOpen(true)}
                    size="large"
                    sx={{
                      borderRadius: '8px',
                      borderWidth: '1px',
                      borderColor: '#DADADA !important',
                      padding: '8px 10px',
                    }}
                  >
                    <FilterList sx={{ width: 20, height: 20, mr: 0.5 }} />
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0.1px',
                        mr: 0.5,
                      }}
                    >
                      {t('LEARNER_APP.CONTENT.FILTERS')}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0.1px',
                      }}
                    >
                      {Object.keys(filterState?.filters || {}).filter(
                        (e) =>
                          ![
                            'limit',
                            ...Object.keys(staticFilter ?? {}),
                          ].includes(e)
                      ).length
                        ? `(${Object.keys(filterState.filters).filter(
                          (e) =>
                            ![
                              'limit',
                              ...Object.keys(staticFilter ?? {}),
                            ].includes(e)
                        ).length
                        })`
                        : null}
                    </Typography>
                  </Button>
                </Box>
                <ButtonToggale icon={<Search />} _button={{ color: 'primary' }}>
                  <SearchComponent
                    onSearch={handleSearchClick}
                    value={filterState?.query}
                  />
                </ButtonToggale>
              </Box>
            </Box>
          )}
          <Fade in={isContentLoaded} timeout={800}>
            <Box>
              <Content
                isShowLayout={false}
                contentTabs={_content?.contentTabs || ['Course']}
                showFilter={false}
                showSearch={false}
                showHelpDesk={false}
                {..._content}
                bodyElementObj={{
                  bodyId: 'l1-content-list-home',
                  topPadding: contentListRef.current?.clientHeight
                    ? contentListRef.current?.clientHeight
                    : 0,
                  ..._content?._config?.bodyElementObj,
                }}
                _config={{
                  tabChange: handleTabChange,
                  default_img: '/images/image_ver.png',
                  _card: {
                    isHideProgress: true,
                    sx: {
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      }
                    }
                  },
                  _subBox: {
                    sx: {
                      px: 0.5,
                      '& .MuiGrid-item': {
                        opacity: 0,
                        transform: 'translateY(-50px)',
                        animation: 'slideDownFade 0.8s ease-out forwards',
                        '&:nth-of-type(1)': { animationDelay: '0.1s' },
                        '&:nth-of-type(2)': { animationDelay: '0.2s' },
                        '&:nth-of-type(3)': { animationDelay: '0.3s' },
                        '&:nth-of-type(4)': { animationDelay: '0.4s' },
                        '&:nth-of-type(5)': { animationDelay: '0.5s' },
                        '&:nth-of-type(6)': { animationDelay: '0.6s' },
                        '&:nth-of-type(7)': { animationDelay: '0.7s' },
                        '&:nth-of-type(8)': { animationDelay: '0.8s' },
                        '&:nth-of-type(9)': { animationDelay: '0.9s' },
                        '&:nth-of-type(10)': { animationDelay: '1.0s' },
                        '&:nth-of-type(n+11)': { animationDelay: '1.1s' },
                      }
                    },
                  },
                  _containerGrid: {
                    sx: {
                      '@keyframes slideDownFade': {
                        '0%': {
                          opacity: 0,
                          transform: 'translateY(-50px) scale(0.95)',
                        },
                        '60%': {
                          opacity: 0.8,
                          transform: 'translateY(5px) scale(1.02)',
                        },
                        '100%': {
                          opacity: 1,
                          transform: 'translateY(0) scale(1)',
                        },
                      },
                    }
                  },
                  ..._content?._config,
                }}
                filters={{
                  ...filterState,
                  filters: {
                    ...filterState.filters,
                    ...staticFilter,
                  },
                }}
              />
            </Box>
          </Fade>
        </Box>
      </Stack>
    </Stack>
  );
});

interface FilterChipProps {
  filters: Record<string, any>;
  staticFilter?: Record<string, object>;
  handleFilterChange: (newFilterState: any) => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  filters,
  staticFilter,
  handleFilterChange,
}) => {
  return (
    <>
      {filters
        ? Object.entries(filters)
          .filter(
            ([key, _]) =>
              !['limit', ...Object.keys(staticFilter ?? {})].includes(key)
          )
          .map(([key, value], index) => {
            if (typeof value === 'object') {
              return (value as string[]).map((option, index) => (
                <Chip
                  key={`${key}-${index}`}
                  label={option}
                  onDelete={() => {
                    const { [key]: options, ...rest } = filters ?? {};
                    const newOptions = options.filter(
                      (o: any) => o !== option
                    );
                    if (newOptions.length === 0) {
                      handleFilterChange({
                        ...rest,
                      });
                    } else {
                      handleFilterChange({
                        ...rest,
                        [key]: newOptions,
                      });
                    }
                  }}
                  sx={{ mr: 1, mb: 1, borderRadius: '8px' }}
                />
              ));
            } else {
              return (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  onDelete={() => {
                    const { [key]: _, ...rest } = filters ?? {};
                    handleFilterChange(rest);
                  }}
                  sx={{ mr: 1, mb: 1, borderRadius: '8px' }}
                />
              );
            }
          })
        : null}
    </>
  );
};

const ButtonToggale = ({ children, icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        {isOpen && children}
        <Button
          onClick={toggle}
          variant="contained"
          color="primary"
          sx={{ ml: 1, borderRadius: '8px' }}
        >
          {isOpen ? <CloseIcon /> : icon}
        </Button>
      </Box>
    </Box>
  );
};
