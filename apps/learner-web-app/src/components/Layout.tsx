'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutProps,
  Layout,
  useTranslation,
  DrawerItemProp,
} from '@shared-lib';
import {
  AccountCircleOutlined,
  Home,
  AssignmentOutlined,
  AssignmentTurnedInOutlined,
  FactCheckOutlined,
  Logout,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import ProfileMenu from './ProfileMenu/ProfileMenu';
import ConfirmationModal from './ConfirmationModal/ConfirmationModal';
import ProgramSwitchModal from './ProgramSwitchModal/ProgramSwitchModal';
import { checkAuth } from '@shared-lib-v2/utils/AuthService';
import MuiThemeProvider from '@learner/assets/theme/MuiThemeProvider';
import { TenantName } from '../utils/app.constant';
import { useVtAssessmentEligibility } from '@learner/utils/hooks/useVtAssessmentEligibility';
import { useUserProgram } from '@learner/utils/hooks/useUserProgram';
import {
  consumeFirstBatchCheck,
  hasL2TabBeenShown,
  markL2TabShown,
} from '@learner/utils/helpers/vtBatchHelper';

// Vocational Training only. The L2 Courses entry is injected here in code rather
// than driven by the tenant's uiConfig.navbarItems, because it must also depend on
// the learner having an active batch — something tenant config cannot express.
// The page itself holds the Courses and Assessment tabs.
const VT_ASSESSMENT_ROUTE = '/l2-courses';

// L2 Courses stays highlighted on its own sub-pages (an assessment category,
// question set detail, answersheet) and on content opened from its Courses
// tab, which lands on /content-details/... with returnUrl=/l2-courses.
const isVtAssessmentPage = (currentPage: string) => {
  const isL2Route = (path: string) =>
    path === VT_ASSESSMENT_ROUTE ||
    path.startsWith(`${VT_ASSESSMENT_ROUTE}/`) ||
    path.startsWith(`${VT_ASSESSMENT_ROUTE}?`);
  if (isL2Route(currentPage)) return true;
  if (typeof window === 'undefined') return false;
  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
  return !!returnUrl && isL2Route(returnUrl);
};

// Custom DrawerItem interface
interface NewDrawerItemProp extends DrawerItemProp {
  variant?: 'contained' | 'text';
  isActive?: boolean;
  customStyle?: React.CSSProperties;
}

// Dynamic navigation configuration based on uiConfig
const getDynamicNavConfig = ({
  router,
  t,
  handleNavClick,
  getLinkStyle,
  currentPage,
  setAnchorEl,
  isMobile,
  handleLogoutModal,
  handleProfileClick,
  showVtAssessment,
}: {
  router: any;
  t: any;
  handleNavClick: (cb: () => void) => void;
  getLinkStyle: (active: boolean) => React.CSSProperties;
  currentPage: string;
  setAnchorEl: (el: boolean) => void;
  isMobile: boolean;
  handleLogoutModal: () => void;
  handleProfileClick: () => void;
  showVtAssessment: boolean;
}): NewDrawerItemProp[] => {
  const storedConfig =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('uiConfig') || '{}')
      : {};

  console.log('storedConfig:', storedConfig);
  const navbarItems = storedConfig?.navbarItems || [];
  console.log('navbarItems:', navbarItems);
  const navLinks: NewDrawerItemProp[] = [];

  const buildVtAssessmentLink = (): NewDrawerItemProp => ({
    title: t('LEARNER_APP.VT_ASSESSMENT.L2_COURSES'),
    icon: <FactCheckOutlined sx={{ width: 28, height: 28 }} />,
    to: () => handleNavClick(() => router.push(VT_ASSESSMENT_ROUTE)),
    isActive: isVtAssessmentPage(currentPage),
    customStyle: getLinkStyle(isVtAssessmentPage(currentPage)),
  });

  // Check if navbarItems exists and has entries
  if (!Array.isArray(navbarItems) || navbarItems.length === 0) {
    if (showVtAssessment) {
      navLinks.push(buildVtAssessmentLink());
    }
    return navLinks;
  }

  // Sort navigation items by order and generate navigation items
  const sortedNavItems = [...navbarItems].sort((a, b) => (a.order || 0) - (b.order || 0));

  let profileLinkIndex = -1;
  let lastCourseLinkIndex = -1;

  sortedNavItems.forEach((item) => {
    const { key, route, order } = item;
    
    // Skip if key or route is missing
    if (!key || !route) {
      console.warn('Skipping navbar item with missing key or route:', { key, route, order });
      return;
    }
    
    // The Assessment entry is injected below. Drop a tenant-config `assessment`
    // item only when we are the ones injecting it, so a non-VT tenant that
    // configures its own Assessment nav item keeps rendering it.
    if (showVtAssessment && key.toLowerCase() === 'assessment') {
      return;
    }

    // Skip Survey item if isVolunteer is not true in localStorage
    if (key.toLowerCase() === 'survey') {
      const isVolunteer = typeof window !== 'undefined'
        ? localStorage.getItem('isVolunteer') === 'true'
        : false;
      if (!isVolunteer) {
        console.log('Skipping Survey navbar item: isVolunteer is not true');
        return;
      }
    }

    // Get appropriate icon based on key
    const getIcon = () => {
      const keyLower = key.toLowerCase();
      console.log('keyLower:', keyLower);
      if (keyLower === 'knowledge_bank') {
        return <img src="/images/book_5.svg" alt="Knowledge Bank" style={{ width: 28, height: 28 }} />;
      } else if (keyLower === 'home') {
        return <Home sx={{ width: 28, height: 28 }} />;
      } else if (keyLower === 'plp_surveys') {
        return <AssignmentTurnedInOutlined sx={{ width: 28, height: 28 }} />;
      } else if (keyLower.includes('course')) {
        return <AssignmentOutlined sx={{ width: 28, height: 28 }} />;
      } else if (keyLower === 'profile') {
        return <AccountCircleOutlined sx={{ width: 28, height: 28 }} />;
      } else {
        return <Home sx={{ width: 28, height: 28 }} />;
      }
    };

    // Get appropriate click handler
    const getClickHandler = () => {
      if (key.toLowerCase() === 'profile') {
        return isMobile
          ? () => handleNavClick(handleProfileClick)
          : () => setAnchorEl(true);
      } else {
        return () => handleNavClick(() => router.push(route));
      }
    };

    const keyLower = key.toLowerCase();
    if (keyLower === 'profile') {
      profileLinkIndex = navLinks.length;
    }
    // L2 Courses sits directly after the L1 Courses entry, so the two course
    // menus read as a pair. Tracks the last matching item in case a tenant
    // configures more than one course entry.
    if (keyLower.includes('course')) {
      lastCourseLinkIndex = navLinks.length;
    }

    // Add navigation item maintaining exact sequence by order
    navLinks.push({
      title: t(`LEARNER_APP.COMMON.${key}`),
      icon: getIcon(),
      to: getClickHandler(),
      isActive: currentPage === route || (key.toLowerCase().includes('course') && currentPage === '/in-progress'),
      customStyle: getLinkStyle(currentPage === route),
    });
  });

  if (showVtAssessment) {
    // Preferred slot is immediately after L1 Courses. Falls back to just before
    // Profile, then to the end, for tenants with no course entry in their navbar.
    let insertAt = navLinks.length;
    if (lastCourseLinkIndex !== -1) {
      insertAt = lastCourseLinkIndex + 1;
    } else if (profileLinkIndex !== -1) {
      insertAt = profileLinkIndex;
    }
    navLinks.splice(insertAt, 0, buildVtAssessmentLink());
  }

  // Add logout for mobile
  if (isMobile) {
    navLinks.push({
      title: t('COMMON.LOGOUT'),
      icon: <Logout sx={{ width: 28, height: 28 }} />,
      to: () => handleNavClick(handleLogoutModal),
      isActive: false,
      customStyle: {},
    });
  }

  return navLinks;
};


const App: React.FC<LayoutProps> = ({ children, ...props }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, setLanguage } = useTranslation();

  const [defaultNavLinks, setDefaultNavLinks] = useState<NewDrawerItemProp[]>(
    []
  );
  const [anchorEl, setAnchorEl] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [programSwitchAnchorEl, setProgramSwitchAnchorEl] = useState<HTMLElement | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Resolved once per page load; inert for every non-VT program.
  const {
    loading: vtEligibilityLoading,
    eligible: showVtAssessment,
    batch: vtBatch,
  } = useVtAssessmentEligibility();
  const userProgram = useUserProgram();

  // When the L2 Courses tab turns on for a batch for the first time, the
  // learner is sent to it only if that happens on the first check after a page
  // load (a refresh). If it turns on during in-app navigation it is just
  // enabled. Either way the tab is recorded as shown, so a later refresh never
  // redirects for a tab that was already enabled.
  useEffect(() => {
    // userProgram is read in this render (not from localStorage) so `loading`
    // belongs to the same program; on the hydration render it is still null.
    if (userProgram !== TenantName.YOUTHNET || vtEligibilityLoading) return;
    const isFirstCheck = consumeFirstBatchCheck();
    if (!showVtAssessment || !vtBatch) return;
    const userId = localStorage.getItem('userId');
    if (!userId || hasL2TabBeenShown(userId, vtBatch)) return;
    markL2TabShown(userId, vtBatch);
    // Already on L2 Courses (or content opened from it): no need to move.
    if (isFirstCheck && !isVtAssessmentPage(pathname)) {
      router.replace(VT_ASSESSMENT_ROUTE);
    }
  }, [userProgram, vtEligibilityLoading, showVtAssessment, vtBatch, pathname, router]);

  const handleClose = () => setAnchorEl(null);
  const handleProfileClick = () => {
    if (pathname !== '/profile') {
      router.push('/profile');
    }
    handleClose();
  };
  const handleLogoutClick = () => router.push('/logout');
  const handleLogoutModal = () => setModalOpen(true);
  const handleCloseModel = () => setModalOpen(false);
  const handleNavClick = (callback: () => void) => {
    callback();
  };

  const getLinkStyle = (isActive: boolean): React.CSSProperties => ({
    backgroundColor: isActive ? '#e0f7fa' : 'transparent',
    borderRadius: 8,
  });

  const getMessage = () => (modalOpen ? t('COMMON.SURE_LOGOUT') : '');
  
  useEffect(() => {
  let currentPage = '';
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const activeLink = searchParams.get('activeLink');
    currentPage = activeLink || window.location.pathname || '';
  }

  const program = localStorage.getItem('userProgram') || '';

  const disallowedPathsMap: Record<string, string[]> = {
    [TenantName.YOUTHNET]: ['/courses-contents'],
    [TenantName.CAMP_TO_CLUB]: ['/content', '/observations', '/skill-center'],
    [TenantName.PRAGYANPATH]: ['/content', '/observations', '/skill-center'],
  };

  const disallowedPaths = disallowedPathsMap[program] || [];

  if (disallowedPaths.includes(currentPage)) {
    // Redirect to a safe/default page
    const fallbackPath = program === TenantName.CAMP_TO_CLUB ? '/courses-contents' : '/content';
    router.push('/unauthorized');
    return;
  }

  const navLinks = getDynamicNavConfig({
    router,
    t,
    handleNavClick,
    getLinkStyle,
    currentPage,
    setAnchorEl,
    isMobile,
    handleLogoutModal,
    handleProfileClick,
    showVtAssessment,
  });

  setDefaultNavLinks(navLinks);
}, [t, router, isMobile, showVtAssessment, pathname]);

  useEffect(() => {
    let currentPage = '';
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const activeLink = searchParams.get('activeLink');
      currentPage = activeLink || window.location.pathname || '';
    }

    const program = localStorage.getItem('userProgram') || '';
    const navLinks = getDynamicNavConfig({
      router,
      t,
      handleNavClick,
      getLinkStyle,
      currentPage,
      setAnchorEl,
      isMobile,
      handleLogoutModal,
      handleProfileClick,
      showVtAssessment,
    });

    setDefaultNavLinks(navLinks);
  }, [t, router, isMobile, showVtAssessment, pathname]);

  const onLanguageChange = (val: string) => setLanguage(val);

  return (
    <Layout
      onlyHideElements={['footer']}
      {...props}
      _topAppBar={{
        _brand: {
          name:
            typeof window !== 'undefined'
              ? localStorage.getItem('userProgram') ?? ''
              : '',
          _box: {
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              // Open program switch dropdown instead of navigating
              setProgramSwitchAnchorEl(event.currentTarget);
            },

            sx: {
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
            _text: {
              fontWeight: 400,
              fontSize: '22px',
              lineHeight: '28px',
              textAlign: 'center',
            },
            children: (
              <KeyboardArrowDown
                sx={{
                  fontSize: '20px',
                  color: '#000',
                  ml: 0.5,
                }}
              />
            ),
          },
        },
        navLinks: defaultNavLinks,
        _navLinkBox: { gap: 5 },
        onLanguageChange,
        ...props?._topAppBar,
      }}
    >
      <Box>
        {children}
        {!isMobile && (
          <Box sx={{ marginTop: '20px' }}>
            <ProfileMenu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              onProfileClick={handleProfileClick}
              onLogout={handleLogoutModal}
            />
          </Box>
        )}
      </Box>
      <ConfirmationModal
        message={getMessage()}
        handleAction={handleLogoutClick}
        buttonNames={{
          primary: t('COMMON.LOGOUT'),
          secondary: t('COMMON.CANCEL'),
        }}
        handleCloseModal={handleCloseModel}
        modalOpen={modalOpen}
      />
      <ProgramSwitchModal
        open={Boolean(programSwitchAnchorEl)}
        anchorEl={programSwitchAnchorEl}
        onClose={() => setProgramSwitchAnchorEl(null)}
        onSignOut={handleLogoutModal}
      />
    </Layout>
  );
};

export default function AppWrapper(props: Readonly<LayoutProps>) {
  return (
    <MuiThemeProvider>
      <App {...props} />
    </MuiThemeProvider>
  );
}
