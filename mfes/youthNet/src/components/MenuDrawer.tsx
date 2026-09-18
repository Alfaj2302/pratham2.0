'use client';

import BusinessIcon from '@mui/icons-material/Business';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import LinkIcon from '@mui/icons-material/Link';
import LocalLibraryOutlinedIcon from '@mui/icons-material/LocalLibraryOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import {
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Tooltip
} from '@mui/material';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import config from '../../config.json';
import { isEliminatedFromBuild } from '../../featureEliminationUtil';
import board from '../assets/images/Board.svg';
import support from '../assets/images/Support.svg';
import assessment from '../assets/images/assessment.svg';
import checkBook from '../assets/images/checkbook.svg';
import surveyForm from '../assets/images/surveyForm.svg';
import { useDirection } from '../hooks/useDirection';
import useStore from '../store/store';
import { accessGranted } from '../utils/helper';
import { AcademicYear } from '../utils/Interfaces';
import {
  accessControl,
  DEFAULT_MANAGER_DASHBOARD_TAB,
  MANAGER_DASHBOARD_NAV_ITEMS,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  TENANT_DATA,
  TENANT_TYPE,
} from '../utils/app.config';
import { Role } from '../utils/app.constant';
import { showToastMessage } from './Toastify';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  collapsed: boolean;
  isActive?: boolean;
  color?: string;
  activeColor?: string;
  endIcon?: boolean;
  sx?: Record<string, unknown>;
  className?: string;
  locked?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  onClick,
  collapsed,
  isActive = false,
  color,
  activeColor = '#2E1500',
  endIcon = false,
  sx = {},
  className = 'fs-14',
  locked = false,
}) => {
  const theme = useTheme<any>();
  const button = (
    <Button
      className={className}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      startIcon={!endIcon ? icon : undefined}
      endIcon={endIcon ? icon : locked ? <LockOutlinedIcon fontSize="small" /> : undefined}
      sx={{
        gap: '10px',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive ? theme.palette.primary.main : 'transparent',
        padding: collapsed
          ? '12px !important'
          : isActive
          ? '16px 18px !important'
          : '0px 18px !important',
        color: isActive ? activeColor : color ?? theme.palette.warning.A200,
        fontWeight: isActive ? '600' : 500,
        '&.Mui-disabled': { opacity: 0.5, color: color ?? theme.palette.warning.A200 },
        '& .MuiButton-startIcon': collapsed ? { margin: 0 } : undefined,
        '& .MuiButton-endIcon': collapsed ? { margin: 0 } : undefined,
        '&:hover': {
          background: isActive ? theme.palette.primary.main : 'transparent',
        },
        ...sx,
      }}
    >
      {!collapsed && label}
    </Button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip title={label} placement="right">
      <span style={{ display: 'block', width: '100%' }}>{button}</span>
    </Tooltip>
  );
};

interface DrawerProps {
  toggleDrawer?: (open: boolean) => () => void;
  open: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  handleToggleDrawer?: (open: boolean) => () => void;
}

const MenuDrawer: React.FC<DrawerProps> = ({
  toggleDrawer,
  open,
  language,
  setLanguage,
  handleToggleDrawer,
}) => {
  const theme = useTheme<any>();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [isOpen, setIsOpen] = useState(open);
  const [academicYearList, setAcademicYearList] = useState<AcademicYear[]>([]);
  const [modifiedAcademicYearList, setModifiedAcademicYearList] = useState<
    AcademicYear[]
  >([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantType, setTenantType] = useState<string>('');
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const store = useStore();
  const userRole = store.userRole;
  const { isRTL } = useDirection();
  const setIsActiveYearSelected = useStore(
    (state: { setIsActiveYearSelected: any }) => state.setIsActiveYearSelected
  );
  const isActiveYear = store.isActiveYearSelected;
  const isSidebarCollapsed = useStore(
    (state: { isSidebarCollapsed: boolean }) => state.isSidebarCollapsed
  );
  const setIsSidebarCollapsed = useStore(
    (state: { setIsSidebarCollapsed: (collapsed: boolean) => void }) =>
      state.setIsSidebarCollapsed
  );
  // Collapsing to an icon-only rail only makes sense for the persistent desktop
  // drawer — the mobile drawer is a temporary overlay and always shows full content.
  const collapsed = isDesktop && isSidebarCollapsed;
  const drawerWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  // The page content's reserved margin (globals.css .ynet-app-shell) reads this
  // CSS variable directly, rather than a React prop/state flowing down from
  // _app.tsx — that would update the app-root component while this component's
  // ssr:false/Suspense boundary is still hydrating, which makes React abort
  // hydration. useLayoutEffect (not useEffect) avoids a one-frame flash of the
  // old margin when toggling collapsed/expanded.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-margin',
      `${drawerWidth + 1}px`
    );
  }, [drawerWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTenantName = localStorage.getItem('tenantName');
      const storedTenantType = localStorage.getItem('tenantType');
      if(storedTenantType) {
        setTenantType(storedTenantType);
      }
      // Always set tenantName to one of the tenant types
      if (storedTenantName === TENANT_DATA.YOUTHNET) {
        setTenantName(TENANT_DATA.YOUTHNET);
      } else if (storedTenantName === TENANT_DATA.PRAGYANPATH) {
        setTenantName(TENANT_DATA.PRAGYANPATH);
      }
      else if (storedTenantName === TENANT_DATA.SUMMER_CAMP) {
        setTenantName(TENANT_DATA.SUMMER_CAMP);
      }
      else {
        // Default to empty for all other cases
        setTenantName('');
      }
    }
  }, []);

  useEffect(() => setIsOpen(open), [open]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedList = localStorage.getItem('academicYearList');
      try {
        const parsedList = storedList ? JSON.parse(storedList) : [];
        setAcademicYearList(parsedList);

        const modifiedList = parsedList?.map(
          (item: { isActive: any; session: any }) => {
            if (item.isActive) {
              return {
                ...item,
                session: (
                  <>
                    {item.session} &nbsp;
                    <span
                      style={{
                        color: 'green',
                        fontWeight: '500',
                        fontSize: '12px',
                      }}
                    >
                      ({t('COMMON.ACTIVE')})
                    </span>
                  </>
                ),
              };
            }
            return item;
          }
        );
        setModifiedAcademicYearList(modifiedList);
        const selectedAcademicYearId = localStorage.getItem('academicYearId');
        setSelectedSessionId(selectedAcademicYearId ?? '');
        // Backfill `session` for users who logged in before it was stored.
        if (!localStorage.getItem('session') && selectedAcademicYearId) {
          const selectedYear = parsedList?.find(
            (item: { id: string }) => item.id === selectedAcademicYearId
          );
          if (selectedYear?.session) {
            localStorage.setItem('session', selectedYear.session);
          }
        }
      } catch (error) {
        console.error('Error parsing stored academic year list:', error);
        setAcademicYearList([]);
        setSelectedSessionId('');
      }
    }
  }, [t]);

  const handleChange = (event: SelectChangeEvent) => {
    const newLocale = event.target.value;
    setLanguage(newLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('preferredLanguage', newLocale);
      localStorage.setItem('lang', newLocale);
      router.replace(router.pathname, router.asPath, { locale: newLocale });
    }
  };

  const handleSelectChange = (event: SelectChangeEvent) => {
    setSelectedSessionId(event.target.value);
    localStorage.setItem('academicYearId', event.target.value);

    // Check if the selected academic year is active
    const selectedYear = academicYearList?.find(
      (year) => year.id === event.target.value
    );
    localStorage.setItem('session', selectedYear?.session ?? '');
    const isActive = selectedYear ? selectedYear.isActive : false;
    // localStorage.setItem('isActiveYearSelected', JSON.stringify(isActive));
    setIsActiveYearSelected(isActive);
    queryClient.clear();

    if (isActive) {
      window.location.reload();
    } else {
      router.push('/centers').then(() => {
        window.location.reload();
      });
    }
  };

  const closeDrawer = () => {
    if (toggleDrawer) {
      toggleDrawer(false)();
    } else if (handleToggleDrawer) {
      handleToggleDrawer(false)();
    }
  };

  const handleCopyRegistrationLink = async () => {
    try {
      // Get the registration link from environment variable or construct it
 const registrationBase: string =
        (process.env.NEXT_PUBLIC_LEARNER_SBPLAYER
          ? process.env.NEXT_PUBLIC_LEARNER_SBPLAYER.replace("/sbplayer", "")
          : '') || '';
      if (registrationBase) {
        const enroll = localStorage.getItem('tenantName') || '';

        // Construct the proper registration link
        // Format: https://domain/Second-Chance-Program
        const baseUrl = registrationBase.replace(/\/$/, '');
        const programSlug = enroll.trim().replace(/\s+/g, '-');
        const registrationLink = `${baseUrl}/${encodeURIComponent(programSlug)}`;

        // Copy to clipboard
        await navigator.clipboard.writeText(registrationLink);

        // Show success toast message
        showToastMessage(
          'Registration link copied!\nShare this link with learners for program registration.',
          'success'
        );
      } else {
        showToastMessage('Registration link not configured', 'error');
      }
    } catch (error) {
      console.error('Failed to copy registration link:', error);
      showToastMessage('Failed to copy registration link', 'error');
    }
  };

  const navigateToYouthBoard = () => {
    closeDrawer();
    router.push('/');
  };

  const navigateToDashboard = () => {
    closeDrawer();
    router.push('/dashboard');
  };

  const navigateToObservation = () => {
    closeDrawer();
    router.push('/observation');
  };

  const navigateToManualAssessments = () => {
    closeDrawer();
    router.push('/manual-assessments');
  };

  const withBasePath = (path: string) => `${router.basePath}${path}`;

  const isDashboard = [
    '/dashboard',
    '/',
    '/attendance-history',
    '/attendance-overview',
  ].includes(router.pathname);
  const isTeacherCenter = router.pathname.includes('/centers');
  const isCoursePlanner = [
    '/curriculum-planner',
    '/topic-detail-view',
    '/curriculum-planner/center/[cohortId]',
    '/play/content/[identifier]',
  ].includes(router.pathname);
  const isObservation = router.pathname.includes('/observation');

  const isAssessments = router.pathname.includes('/assessments');
  const isBoard = router.pathname.includes('/board-enrollment');
  const isSupportRequest = router.pathname.includes('/support-request');
  const isVillagesAndYouths = router.pathname.includes('/villages');
  const isSurveys = router.pathname.includes('/surveys');
  const isManualAssessments = router.pathname.includes('/manual-assessments');
  const isManagerDashboard = router.pathname === '/manager-dashboard';
  const isIndividualVolunteerDashboard = router.pathname === '/individual-volunteer';
  const isOrganisationDashboard = router.pathname === '/organisation';
  const isOrganisationVolunteerDashboard = router.pathname === '/organisation-volunteer';

  const isTrainer =
    typeof window !== 'undefined' && window.localStorage.getItem('role') === Role.TEACHER;
  const isPlacementRetentionCoordinator =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('role') === Role.PLACEMENT_RETENTION_COORDINATOR;
  const isL2InterestedQueue = router.pathname.includes('/l2-interested-queue');
  const isMyTeachingCenter = router.pathname.includes('/my-teaching-center');
  const isPlacements = router.pathname.includes('/placements');

  return (
    <Drawer
      open={isDesktop || isOpen}
      onClose={closeDrawer}
      transitionDuration={{ enter: 500, exit: 500 }}
      anchor={isRTL ? 'right' : 'left'}
      className="backgroundFaded"
      variant={isDesktop ? 'persistent' : 'temporary'}
      sx={{
        '& .MuiPaper-root': {
          borderRight: `1px solid ${theme.palette.warning['A100']}`,
          zIndex: '998 !important',
          left: isRTL ? '0px !important' : '0px !important',

          width: isRTL
            ? `${drawerWidth}px !important`
            : isDesktop
            ? `${drawerWidth}px !important`
            : 'unset !important',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          padding: collapsed ? '16px 8px 12px 8px' : '16px 16px 12px 16px',
          width: `${drawerWidth}px`,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.3s ease, padding 0.3s ease',
        }}
        role="presentation"
      >
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'space-between',
              alignItems: 'center',
            }}
          >
          {!collapsed && (
            <Box
              className="fs-14 fw-500"
              sx={{ color: theme.palette.warning['A200'] }}
            >
              {t('DASHBOARD.MENU')}
            </Box>
          )}
          {isDesktop && (
            <Tooltip
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              placement="right"
            >
              <IconButton
                aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                size="small"
              >
                {collapsed !== isRTL ? (
                  <ChevronRightIcon
                    sx={{ color: theme.palette.warning['300'] }}
                  />
                ) : (
                  <ChevronLeftIcon
                    sx={{ color: theme.palette.warning['300'] }}
                  />
                )}
              </IconButton>
            </Tooltip>
          )}
          {!isDesktop && (
            <Box>
              <IconButton onClick={closeDrawer}>
                <ClearIcon sx={{ color: theme.palette.warning['300'] }} />
              </IconButton>
            </Box>
          )}
        </Box>

        {!collapsed && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '22px 0 15px 0',
            gap: '30px',
          }}
        >
          <Box sx={{ flexBasis: '30%' }} className="joyride-step-5">
            <FormControl className="drawer-select" sx={{ width: '100%' }}>
              <Select
                value={i18n.language} // Directly use the language from i18n
                onChange={handleChange}
                displayEmpty
                sx={{
                  borderRadius: '0.5rem',
                  color: theme.palette.warning['200'],
                  width: '100%',
                  '& .MuiSelect-icon': {
                    right: isRTL ? 'unset' : '7px',
                    left: isRTL ? '7px' : 'unset',
                  },
                  '& .MuiSelect-select': {
                    paddingRight: isRTL ? '10px' : '32px',
                    paddingLeft: isRTL ? '32px' : '12px',
                  },
                }}
              >
                {config?.languages.map((lang) => (
                  <MenuItem value={lang.code} key={lang.code}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {!tenantName && (
            <Box sx={{ flexBasis: '70%' }} className="joyride-step-6">
              <FormControl className="drawer-select" sx={{ width: '100%' }}>
                <Select
                  onChange={handleSelectChange}
                  value={selectedSessionId}
                  className="select-languages"
                  displayEmpty
                  sx={{
                    borderRadius: '0.5rem',
                    color: theme.palette.warning['200'],
                    width: '100%',
                    marginBottom: '0rem',
                    '& .MuiSelect-icon': {
                      right: isRTL ? 'unset' : '7px',
                      left: isRTL ? '7px' : 'unset',
                    },
                    '& .MuiSelect-select': {
                      paddingRight: isRTL
                        ? '10px !important'
                        : '32px !important',
                      paddingLeft: isRTL ? '32px' : '12px',
                    },
                  }}
                >
                  {modifiedAcademicYearList?.map(({ id, session }:any) => (
                    <MenuItem key={id} value={id}>
                      {session}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          {/* {tenantName && (
            <Box>
              <Typography sx={{ fontSize: '12px' }}>
                (Development in progress)
              </Typography>
            </Box>
          )} */}
        </Box>
        )}

        {isActiveYear && !tenantName && (
          <Box>
            <NavItem
              collapsed={collapsed}
              isActive={isDashboard}
              icon={<DashboardOutlinedIcon sx={{ fontSize: '24px !important' }} />}
              onClick={navigateToDashboard}
              label={t('DASHBOARD.DASHBOARD')}
              sx={{ marginTop: '25px' }}
            />
          </Box>
        )}

        {tenantName === TENANT_DATA.YOUTHNET && !isTrainer && !isPlacementRetentionCoordinator && (
          <Box>
            <NavItem
              collapsed={collapsed}
              isActive={isDashboard}
              icon={<DashboardOutlinedIcon sx={{ fontSize: '24px !important' }} />}
              onClick={navigateToYouthBoard}
              label={t('DASHBOARD.DASHBOARD')}
              sx={{ marginTop: '25px' }}
            />

            {/* villages and youth */}
            <NavItem
              collapsed={collapsed}
              isActive={isVillagesAndYouths}
              icon={<GroupsIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                router.push(`/villages`);
              }}
              label={
                typeof window !== 'undefined' && window.localStorage.getItem('role') === Role.LEAD
                  ? t('DASHBOARD.USERS_&_VILLAGES')
                  : t('DASHBOARD.VILLAGES_AND_YOUTH')
              }
              sx={{ marginTop: '25px' }}
            />

            <NavItem
              collapsed={collapsed}
              isActive={isSurveys}
              icon={
                <Image
                  src={surveyForm}
                  alt="SurveyForm-Icon"
                  width={24}
                  height={24}
                />
              }
              onClick={() => {
                router.push(`/surveys`);
              }}
              label={t('SURVEYS.SURVEYS')}
              sx={{ marginTop: '25px' }}
            />

            <NavItem
              collapsed={collapsed}
              isActive={isManualAssessments}
              icon={<EditNoteIcon sx={{ fontSize: '24px !important' }} />}
              onClick={navigateToManualAssessments}
              label={t('ASSESSMENTS.MANUAL_ASSESSMENT')}
              sx={{ marginTop: '25px' }}
            />

            <Box sx={{ marginTop: '18px' }} className="joyride-step-12">
              <NavItem
                collapsed={collapsed}
                isActive={isSupportRequest}
                icon={
                  <Image
                    src={support}
                    alt="support-icon"
                    width={24}
                    height={24}
                  />
                }
                onClick={() => {
                  router.push(`/support-request`);
                }}
                label={t('COMMON.SUPPORT_REQUEST')}
                sx={{ marginTop: '15px' }}
              />
            </Box>
          </Box>
        )}

        {tenantName === TENANT_DATA.YOUTHNET && isTrainer && (
          <Box>
            <NavItem
              collapsed={collapsed}
              isActive={isL2InterestedQueue}
              icon={<AssignmentIndOutlinedIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                closeDrawer();
                router.push('/l2-interested-queue');
              }}
              label={t('DASHBOARD.L2_INTERESTED_QUEUE')}
              sx={{ marginTop: '25px' }}
            />

            <NavItem
              collapsed={collapsed}
              isActive={isMyTeachingCenter}
              icon={<LocalLibraryOutlinedIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                closeDrawer();
                router.push('/my-teaching-center');
              }}
              label={t('DASHBOARD.MY_TEACHING_CENTERS')}
              sx={{ marginTop: '25px' }}
            />
          </Box>
        )}

        {tenantName === TENANT_DATA.YOUTHNET && isPlacementRetentionCoordinator && (
          <Box>
            <NavItem
              collapsed={collapsed}
              isActive={isPlacements}
              icon={<WorkOutlineIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                closeDrawer();
                router.push('/placements');
              }}
              label={t('DASHBOARD.PLACEMENTS')}
              sx={{ marginTop: '25px' }}
            />
          </Box>
        )}

        {/* PRAGYANPATH - Manager Dashboard navigation (kept in sync with the header tabs) */}
        {tenantName === TENANT_DATA.PRAGYANPATH && (
          <Box>
            {MANAGER_DASHBOARD_NAV_ITEMS.map((item) => {
              const activeTab =
                (router.query.tab as string) || DEFAULT_MANAGER_DASHBOARD_TAB;
              const isActive = isManagerDashboard && activeTab === item.key;
              const NavIcon =
                item.key === 'team'
                  ? GroupsOutlinedIcon
                  : item.key === 'courses'
                  ? MenuBookOutlinedIcon
                  : DashboardOutlinedIcon;
              return (
                <NavItem
                  key={item.key}
                  collapsed={collapsed}
                  isActive={isActive}
                  icon={<NavIcon sx={{ fontSize: '24px !important' }} />}
                  onClick={() => {
                    closeDrawer();
                    router.push({
                      pathname: '/manager-dashboard',
                      query: item.key === DEFAULT_MANAGER_DASHBOARD_TAB ? {} : { tab: item.key },
                    });
                  }}
                  label={t(item.menuLabelKey)}
                  sx={{ marginTop: '25px' }}
                />
              );
            })}
          </Box>
        )}
        {(tenantName === TENANT_DATA.SUMMER_CAMP || tenantType === TENANT_TYPE.VOLUNTEER_ONBOARDING) && (
          <Box>
            <NavItem
              collapsed={collapsed}
              isActive={isIndividualVolunteerDashboard}
              icon={<PersonOutlineIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                router.push('/individual-volunteer');
              }}
              label="Individual Volunteer"
              sx={{ marginTop: '25px' }}
            />

            <NavItem
              collapsed={collapsed}
              isActive={isOrganisationDashboard}
              icon={<BusinessIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                router.push('/organisation');
              }}
              label="Organisation"
              sx={{ marginTop: '25px' }}
            />

            <NavItem
              collapsed={collapsed}
              isActive={isOrganisationVolunteerDashboard}
              icon={<PersonAddIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                router.push('/organisation-volunteer');
              }}
              label="Via Organisation"
              sx={{ marginTop: '25px' }}
            />
          </Box>
        )}
        {!tenantName && (
          <Box sx={{ marginTop: '18px' }}>
            <NavItem
              collapsed={collapsed}
              isActive={isTeacherCenter}
              icon={<LocalLibraryOutlinedIcon sx={{ fontSize: '24px !important' }} />}
              onClick={() => {
                router.push(`/centers`); // Check route
              }}
              label={
                accessGranted('showTeachingCenter', accessControl, userRole)
                  ? t('DASHBOARD.TEACHING_CENTERS')
                  : t('DASHBOARD.MY_TEACHING_CENTERS')
              }
              className="fs-14 joyride-step-7"
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}

        {!tenantName && (
          <Box sx={{ marginTop: '18px' }} className="joyride-step-8">
            <NavItem
              collapsed={collapsed}
              isActive={isObservation}
              icon={
                <Image
                  src={surveyForm}
                  alt="SurveyForm-Icon"
                  width={24}
                  height={24}
                />
              }
              onClick={navigateToObservation}
              label={t('OBSERVATION.SURVEY_FORMS')}
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}
        {isActiveYear && !tenantName && (
          <Box sx={{ marginTop: '18px' }}>
            <NavItem
              collapsed={collapsed}
              isActive={isCoursePlanner}
              icon={
                <Image
                  src={checkBook}
                  alt="CheckBook Icon"
                  width={24}
                  height={24}
                />
              }
              onClick={() => {
                router.push(`/curriculum-planner`);
              }}
              label={t('COURSE_PLANNER.COURSE_PLANNER')}
              className="fs-14 joyride-step-9"
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}
        {!isEliminatedFromBuild('Assessments', 'feature') &&
          isActiveYear &&
          !tenantName && (
            <Box sx={{ marginTop: '18px' }}>
              <NavItem
                collapsed={collapsed}
                isActive={isAssessments}
                icon={
                  <Image
                    src={assessment}
                    alt="Assessment Icon"
                    width={24}
                    height={24}
                  />
                }
                onClick={() => {
                  router.push(`/assessments`);
                }}
                label={t('ASSESSMENTS.ASSESSMENTS')}
                className="fs-14 joyride-step-10"
                sx={{ marginTop: '15px' }}
              />
            </Box>
          )}

        {isActiveYear && !tenantName && (
          <Box sx={{ marginTop: '18px' }} className="joyride-step-11">
            <NavItem
              collapsed={collapsed}
              isActive={isBoard}
              icon={<Image src={board} alt="badge Icon" width={24} height={24} />}
              onClick={() => {
                router.push(`/board-enrollment`);
              }}
              label={t('BOARD_ENROLMENT.BOARD_ENROLLMENT')}
              className="fs-14 joyride-step-8"
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}
        {isActiveYear && !tenantName && (
          <Box sx={{ marginTop: '18px' }}>
            <NavItem
              collapsed={collapsed}
              isActive={isSupportRequest}
              icon={
                <Image
                  src={support}
                  alt="support-icon"
                  width={24}
                  height={24}
                />
              }
              onClick={() => {
                router.push(`/support-request`);
              }}
              label={t('COMMON.SUPPORT_REQUEST')}
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}
        {isActiveYear && !tenantName && (
          <Box sx={{ marginTop: '18px' }}>
            <NavItem
              collapsed={collapsed}
              icon={<ErrorOutlineIcon sx={{ fontSize: '18px !important' }} />}
              endIcon
              color={theme.palette.secondary.main}
              onClick={() => {
                localStorage.removeItem('hasSeenTutorial');
                setTimeout(() => {
                  closeDrawer();
                  router.push(`/`);
                }, 0);
              }}
              label={t('GUIDE_TOUR.LEARN_HOW_TO_USE')}
              sx={{ marginTop: '15px' }}
            />
          </Box>
        )}
        </Box>

        {/* Bottom Section - Fixed at bottom */}
        <Box sx={{ paddingBottom: '10px', borderTop: `1px solid ${theme.palette.warning['A100']}`, paddingTop: '10px' }}>
          {process.env.NEXT_PUBLIC_LEARNER_SBPLAYER && typeof window !== 'undefined' && localStorage.getItem('tenantName') !== TENANT_DATA.PRAGYANPATH && (
            <NavItem
              collapsed={collapsed}
              icon={<LinkIcon sx={{ fontSize: '18px !important', color: '#FDBE16' }} />}
              color="black"
              onClick={handleCopyRegistrationLink}
              label={t('COMMON.COPY_REGISTRATION_LINK')}
              sx={{ marginTop: '8px' }}
            />
          )}
          {isActiveYear && !tenantName && (
            <NavItem
              collapsed={collapsed}
              icon={<ErrorOutlineIcon sx={{ fontSize: '18px !important', color: '#FDBE16' }} />}
              color="#FDBE16"
              onClick={() => {
                localStorage.removeItem('hasSeenTutorial');
                setTimeout(() => {
                  closeDrawer();
                  router.push(`/`);
                }, 0);
              }}
              label={t('GUIDE_TOUR.LEARN_HOW_TO_USE')}
              sx={{ marginTop: '8px' }}
            />
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default MenuDrawer;
