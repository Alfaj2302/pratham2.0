'use-client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import Header from '../../components/Header';
import { useRouter } from 'next/router';
import { getUserDetails } from '../../services/ProfileService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Profile from '@/components/Profile';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticPaths } from 'next';
import { toPascalCase } from '@/utils/helper';
import useStore from '@/store/store';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import FacilitatorManage from '@/shared/FacilitatorManage/FacilitatorManage';

const UserId = () => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const router = useRouter();
  const { userId } = router.query;
  const store = useStore();
  const isActiveYear = store.isActiveYearSelected;

  const [user, setUser] = React.useState<{
    userRole: string | null;
    userID: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    gender: string | null;
    dob?: string | null;
    state?: string | null;
    district?: string | null;
    block?: string | null;
    middleName?: string | null;
    village?: string | null;
    userName?: string | null;
    joinedOn?: string | null;
    subjectsITeach?: any[];
    myMainSubjects?: any[];
  }>({
    userRole: null,
    userID: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    gender: null,
    dob: null,
    state: null,
    district: null,
    block: null,
    village: null,
    middleName: null,
    userName: null,
    joinedOn: null,
    subjectsITeach: [],
    myMainSubjects: [],
  });
  const [openProfileEditModal, setOpenProfileEditModal] = React.useState(false);
  const [userData, setUserData] = useState<any>({});
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  // Password action derived from User Read API `temporaryPassword`.
  // 'loading' -> no button rendered until the API resolves.
  const [passwordAction, setPasswordAction] = useState<
    'loading' | 'set' | 'reset'
  >('loading');

  useEffect(() => {
    const fetchData = async () => {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const storedUserId = localStorage.getItem('userId');
      let userData: any = {};

      if (userId === storedUserId) {
        userData = JSON.parse(localStorage.getItem('userData') || '{}');
        setIsSelfProfile(true);
        fetchPasswordAction(userId);
      } else if (userId) {
        const data = await getUserDetails(userId, true);
        userData = data?.result.userData || {};
        setUserData(userData);
        setIsSelfProfile(false);
      }

      if (userData) {
        const getFieldValue = (label: string) =>
          userData?.customFields?.find((item: any) => item.label === label)
            ?.selectedValues || [];

        setUser({
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          middleName: userData?.middleName || '',
          userName: userData?.username || '',
          joinedOn: userData?.createdOn || '',
          email: userData?.email || '',
          userID: userData?.userId || '',
          phone: userData?.mobile || '',
          gender: userData?.gender || '',
          userRole: userData?.tenantData?.[0]?.roleName || '',
          dob: userData?.dob || '',
          district: getFieldValue('DISTRICT')[0]?.value || '',
          block: getFieldValue('BLOCK')[0]?.value || '',
          state: getFieldValue('STATE')[0]?.value || '',
          village: getFieldValue('VILLAGE')[0]?.value || '',
          subjectsITeach: getFieldValue('SUBJECTS_I_TEACH'),
          myMainSubjects: getFieldValue('MY_MAIN_SUBJECTS'),
        });
      }
    };

    const fetchPasswordAction = async (id: string) => {
      setPasswordAction('loading');
      try {
        const data = await getUserDetails(id, true);
        const readUserData = data?.result?.userData;
        if (!readUserData) {
          // API failed: fall back to the existing Reset Password flow.
          setPasswordAction('reset');
          return;
        }
        const isTemporaryPassword =
          readUserData.temporaryPassword === true ||
          readUserData.temporaryPassword === 'true';
        setPasswordAction(isTemporaryPassword ? 'set' : 'reset');
      } catch (error) {
        console.error('Error fetching temporaryPassword flag', error);
        setPasswordAction('reset');
      }
    };

    fetchData();
  }, [userId]);

  const handleOpenProfileEditModal = () => {
    setOpenProfileEditModal(true);
  };

  const handleCloseProfileEditModal = () => {
    setOpenProfileEditModal(false);
  };

  return (
    <>
      <Box>
        <Box>
          <Header />
        </Box>
        <Box ml={2}>
          <Box
            onClick={() => router.back()}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              my: '25px',
              gap: '5px',
            }}
          >
            <ArrowBackIcon sx={{ fontSize: '25px', color: '#4D4639' }} />
            <Box>
              <Box
                sx={{
                  fontWeight: 400,
                  fontSize: '22px',
                  lineHeight: '28px',
                  letterSpacing: '0px',
                  color: '#4D4639',
                }}
              >
                {toPascalCase(`${user.firstName} ${user.lastName}` || '')}
              </Box>
              {(user.village || user.block || user.district || user.state) && (
                <Box
                  sx={{
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {[user.state, user.district, user.block, user.village]
                    .filter(Boolean)
                    .join(', ')}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            background: theme.palette.info.gradient,
            padding: '24px 16px 24px 16px',
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: theme.palette.info.black,
            }}
          >
            {t('SCP_PROFILE.PROFILE_DETAILS')}
          </Typography>
          {isActiveYear && !isSelfProfile && (
            <Button
              sx={{
                fontSize: '14px',
                lineHeight: '20px',
                minWidth: 'fit-content',
                padding: '10px 24px 10px 16px',
                gap: '8px',
                borderRadius: '100px',
                marginTop: '10px',
                flex: '1',
                textAlign: 'center',
                color: theme.palette.warning.A200,
                border: `1px solid #4D4639`,
              }}
              onClick={handleOpenProfileEditModal}
            >
              <Typography
                variant="h3"
                style={{
                  letterSpacing: '0.1px',
                  textAlign: 'left',
                  marginBottom: '2px',
                }}
                fontSize={'14px'}
                fontWeight={'500'}
                lineHeight={'20px'}
              >
                {t('PROFILE.EDIT_PROFILE')}
              </Typography>
              <Box>
                <CreateOutlinedIcon sx={{ fontSize: '14px' }} />
              </Box>
            </Button>
          )}
          <Profile
            fullName={`${user.firstName} ${user.lastName}` || ''}
            emailId={user.email || '-'}
            designation={user.userRole || '-'}
            mentorId={user.userID || ''}
            phoneNumber={user.phone || '-'}
            gender={toPascalCase(user.gender) || '-'}
            state={user.state || '-'}
            district={user.district || '-'}
            block={user.block || '-'}
            dob={user.dob || '-'}
            village={user.village || null}
            middleName={user.middleName || '-'}
            userName={user.userName || null}
            joinedOn={user.joinedOn || '-'}
            firstName={user.firstName || ''}
            lastName={user.lastName || ''}
            subjectsITeach={user.subjectsITeach}
            myMainSubjects={user.myMainSubjects}
          />
          {openProfileEditModal && (
            <div>
              <FacilitatorManage
                open={openProfileEditModal}
                onClose={handleCloseProfileEditModal}
                isReassign={false}
                isEdit={true}
                reassignuserId={userId}
                selectedUserData={userData}
              />
            </div>
          )}
        </Box>
      </Box>
      {isSelfProfile ? (
        <Box sx={{ px: '16px', my: 2 }}>
          <Box
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              color: theme.palette.warning['300'],
            }}
          >
            {t('LOGIN_PAGE.OTHER_SETTING')}
          </Box>
          <Box sx={{ mt: 2.5 }}>
            {passwordAction !== 'loading' && (
              <Button
                variant="outlined"
                color="primary"
                sx={{
                  '&.Mui-disabled': {
                    backgroundColor: theme?.palette?.primary?.main,
                  },
                  minWidth: '84px',
                  padding: theme.spacing(1),
                  fontWeight: '500',
                  width: '188px',
                  height: '40px',
                  '@media (max-width: 430px)': {
                    width: '100%',
                  },
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  router.push(
                    passwordAction === 'set'
                      ? '/set-password'
                      : '/edit-password'
                  );
                }}
                className="one-line-text"
              >
                {passwordAction === 'set'
                  ? t('LOGIN_PAGE.SET_PASSWORD')
                  : t('LOGIN_PAGE.RESET_PASSWORD')}
              </Button>
            )}
          </Box>
        </Box>
      ) : null}
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      // Will be passed to the page component as props
    },
  };
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: 'blocking', //indicates the type of fallback
  };
};

export default UserId;
