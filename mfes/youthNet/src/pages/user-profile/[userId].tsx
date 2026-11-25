'use-client';

import withRole from '../../components/withRole';
import React, { useEffect, useState } from 'react';
import { TENANT_DATA } from '../../utils/app.config';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import Header from '../../components/Header';
import BackHeader from '../../components/youthNet/BackHeader';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticPaths } from 'next';
import { VILLAGE_DATA, YOUTHNET_USER_ROLE } from '../../components/youthNet/tempConfigs';
import VillageDetailCard from '../../components/youthNet/VillageDetailCard';
import Frame2 from '../../assets/images/SurveyFrame2.png';
import Profile from '../../components/youthNet/Profile';
import { filterSchema, getAge, toPascalCase } from '../../utils/helper';
import { useRouter } from 'next/router';
import {
  getUserDetails,
  updateUser,
} from '../../services/youthNet/Dashboard/UserServices';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import { FormContext } from '@shared-lib-v2/DynamicForm/components/DynamicFormConstant';
import {
  fetchForm,
  splitUserData,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import SimpleModal from '../../components/SimpleModal';
import { showToastMessage } from '../../components/Toastify';
import EditIcon from '@mui/icons-material/Edit';
import EditSearchUser from '@shared-lib-v2/MapUser/EditSearchUser';

const UserId = () => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const router = useRouter();
  const { userId } = router.query;
  const [schema, setSchema] = useState(null);
  const [editModal, setEditModal] = useState<boolean>(false);
  const [updatedUser, setUpdatedUser] = useState<boolean>(false);
  const { tab, blockId, villageId } = router.query;

  const [uiSchema, setUiSchema] = useState(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProgram, setUserProgram] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>('');
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
    workingVillages?: string | null;
    enrollmentId?: string | null;
    domain?: string | null;
    skills?: string | null;
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
    workingVillages: null,
    enrollmentId: null,
    domain: null,
    skills: null,
  });

  // Get current user ID and userProgram from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      setCurrentUserId(localStorage.getItem('userId'));
      setUserProgram(localStorage.getItem('userProgram'));
      setTenantId(localStorage.getItem('tenantId') || '');
    }
  }, []);
  const handleOpenEditModal = () => {
    setEditModal(true);
  };
  function formatDate(dob: string): string | null {
    if (!dob) return null;

    const parsedDate = new Date(dob);

    if (isNaN(parsedDate.getTime())) {
      const parts = dob.split(' ');
      if (parts.length === 3) {
        const formatted = parts.reverse().join('-');
        const retryDate = new Date(formatted);
        if (!isNaN(retryDate.getTime()))
          return retryDate.toISOString().split('T')[0];
      }
      return null;
    }

    return parsedDate.toISOString().split('T')[0];
  }
  const fetchData = async () => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const tenantId = localStorage.getItem('tenantId');
      const responseForm: any = await fetchForm([
        {
          fetchUrl: `${
            process.env.NEXT_PUBLIC_MIDDLEWARE_URL
          }/form/read?context=${
            FormContext.mentor.context
          }&contextType=${user?.userRole?.toUpperCase()}`,
          header: {},
        },
        {
          fetchUrl: `${
            process.env.NEXT_PUBLIC_MIDDLEWARE_URL
          }/form/read?context=${
            FormContext.mentor.context
          }&contextType=${user?.userRole?.toUpperCase()}`,
          header: { tenantid: tenantId },
        },
      ]);
      console.log('responseForm', responseForm);
      const { newSchema, extractedFields } = filterSchema(responseForm);
      console.log(newSchema?.schema);
      console.log(newSchema?.uiSchema);

      const extractUserInfo = (({
        firstName,
        lastName,
        middleName,
        gender,
        phone: mobile,
        dob,
        email,
      }: any) => ({
        firstName,
        lastName,
        middleName,
        gender,
        mobile,
        dob,
        email,
      }))(user);
      extractUserInfo.dob = formatDate(extractUserInfo?.dob);
      extractUserInfo.mobile = extractUserInfo?.mobile?.toString();

      console.log(extractUserInfo);
      const keysToRemove = ['working_village', 'working_location'];

      const alterSchema: any = newSchema?.schema
        ? JSON.parse(JSON.stringify(newSchema.schema))
        : null;
      let alterUiSchema: any = newSchema?.uiSchema
        ? JSON.parse(JSON.stringify(newSchema.uiSchema))
        : null;

      if (alterSchema?.properties && alterUiSchema) {
        // Keep editable fields aligned with admin-app user-mobilizer edit flow:
        // Disable identity fields + contact fields.
        const fieldsToDisable = ['firstName', 'lastName', 'dob', 'email', 'mobile', 'phone'];
        fieldsToDisable.forEach((fieldKey) => {
          if (alterUiSchema?.[fieldKey]) {
            alterUiSchema[fieldKey]['ui:disabled'] = true;
          }
        });

        keysToRemove.forEach((key) => {
          delete alterSchema.properties[key];
          delete alterUiSchema[key];
        });
        alterSchema.required =
          alterSchema.required?.filter((key: string) => !keysToRemove.includes(key)) ||
          [];
      }

      setSchema(alterSchema);
      const updatedUiSchema = {
        ...alterUiSchema,
        'ui:submitButtonOptions': {
          norender: true,
        },
      };

      setUiSchema(updatedUiSchema);
    } catch (e) {
      console.log(e);
    }
    // setSdbvFieldData(extractedFields);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUserId = localStorage.getItem('userId');
      if (userId === storedUserId && user?.userRole) {
        fetchData();
      }
    }
  }, [user, userId]);

  useEffect(() => {
    if (!editModal) return;
    const canRenderEditContent = Boolean(schema && uiSchema && userId);
  }, [editModal, schema, uiSchema, userId]);

  useEffect(() => {
    if (!editModal) return;
    if (schema && uiSchema) return;
    if (!userId || !user?.userRole) return;
    fetchData().catch(() => {});
  }, [editModal, schema, uiSchema, userId, user?.userRole]);
  const onClose = () => {
    setEditModal(false);
  };
  const handleProfileUpdate = async (payload: any) => {
    try {
      if (userId) {
        const { userData, customFields } =
          payload && typeof payload === 'object' && 'userData' in payload
            ? payload
            : splitUserData(payload);

        if (user?.email && userData?.email && user?.email === userData?.email) {
          delete userData.email;
        }

        const updateUserResponse = await updateUser(userId.toString(), {
          userData,
          customFields,
        });
        if (typeof window !== 'undefined' && window.localStorage) {
          const userlocalData = localStorage.getItem('userData');
          const existingUserData = userlocalData ? JSON.parse(userlocalData) : {};

          const updatedUserData = {
            ...existingUserData,
            ...(userData || {}),
            ...(customFields ? { customFields } : {}),
          };

          localStorage.setItem('userData', JSON.stringify(updatedUserData));
        }

        showToastMessage(t('PROFILE.PROFILE_UPDATE_SUCCESSFULLY'), 'success');
        setEditModal(false);
        setUpdatedUser(!updatedUser);
      }
    } catch (e) {
      showToastMessage(t('PROFILE.UNABLE_TO_PROFILE_UPDATE_'), 'error');
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const storedUserId = localStorage.getItem('userId');
      const role = localStorage.getItem('role') || '';
      let userData: any = {};

      if (userId === storedUserId) {
        userData = JSON.parse(localStorage.getItem('userData') || '{}');
        console.log('userData====>', userData);
      } else if (userId) {
        const data = await getUserDetails(userId, true);
        console.log('data>>>>', data);
        userData = data?.userData || {};
      }

      if (userData) {
        const getFieldValue = (label: string) => {
          const field = userData?.customFields?.find(
            (item: any) => item.label === label
          );
          const selectedValues = field?.selectedValues;

          if (!selectedValues || selectedValues.length === 0) {
            return '';
          }

          if (selectedValues.length === 1) {
            return toPascalCase(selectedValues[0]?.value || '');
          }

          // If multiple values, return all values as array or concatenated string
          return selectedValues
            .map((item: any) => toPascalCase(item?.value || ''))
            .join(', ');
        };

        // Function to extract working village names
        const getWorkingVillages = () => {
          const workingVillageField = userData?.customFields?.find(
            (item: any) => item.label === 'WORKING_VILLAGE'
          );
          const workingLocationField = userData?.customFields?.find(
            (item: any) => item.label === 'WORKING_LOCATION'
          );

          if (!workingVillageField || !workingLocationField) {
            return '';
          }

          // Get village IDs from WORKING_VILLAGE field
          const villageIdsData = workingVillageField?.selectedValues;
          if (!villageIdsData || villageIdsData.length === 0) {
            return '';
          }

          // Handle different formats: object with id/value, array of objects, or comma-separated string
          console.log('villageIdsData', villageIdsData);
          let villageIds: string[] = [];
          
          // Process all selectedValues
          villageIdsData.forEach((item: any) => {
            if (typeof item === 'string') {
              // If it's a string, split by comma and add all IDs
              const ids = item.split(',').map((id: string) => id.trim());
              villageIds.push(...ids);
            } else if (item && typeof item === 'object') {
              // If it's an object with id property
              if (item.id !== undefined) {
                villageIds.push(String(item.id));
              } else if (typeof item.value === 'string') {
                // If value is a comma-separated string
                const ids = item.value.split(',').map((id: string) => id.trim());
                villageIds.push(...ids);
              } else if (Array.isArray(item.value)) {
                // If value is an array
                item.value.forEach((val: any) => {
                  if (val?.id !== undefined) {
                    villageIds.push(String(val.id));
                  } else if (typeof val === 'string') {
                    villageIds.push(val.trim());
                  }
                });
              }
            }
          });
          
          // Remove duplicates and filter out empty values
          villageIds = [...new Set(villageIds.filter(Boolean))];

          // Get working location data - handle both single object and array
          const workingLocationDataArray =
            workingLocationField?.selectedValues || [];
          if (workingLocationDataArray.length === 0) {
            return '';
          }

          // Extract all village names from the nested structure
          const villageNames: string[] = [];

          // Iterate through all state objects in selectedValues
          workingLocationDataArray.forEach((workingLocationData: any) => {
            // The structure has districts directly in each state object
            if (workingLocationData.districts) {
              workingLocationData.districts.forEach((district: any) => {
                if (district.blocks) {
                  district.blocks.forEach((block: any) => {
                    if (block.villages) {
                      block.villages.forEach((village: any) => {
                        if (villageIds?.includes(String(village.id))) {
                          villageNames.push(village.name);
                        }
                      });
                    }
                  });
                }
              });
            }
          });

          return villageNames.map((name) => toPascalCase(name)).join(', ');
        };

        let date;
        let formattedDOBDate;
        if (userData.dob) {
          date = new Date(userData.dob);
          //const joinedDate = new Date(userData.createdAt);

          const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          };
          formattedDOBDate = date.toLocaleDateString('en-GB', options);
        }

        // Function to extract role based on tenant matching
        const getRoleFromTenant = () => {
          const tenantName = localStorage.getItem('tenantName');
          if (!tenantName || !userData?.tenantData) {
            return null;
          }

          // Find the tenant that matches the tenantName from localStorage
          const matchedTenant = userData.tenantData.find(
            (tenant: any) => tenant?.tenantName === tenantName
          );

          if (!matchedTenant || !matchedTenant.roles) {
            return null;
          }

          // Filter roles to only include Mobilizer or Lead
          const allowedRoles = matchedTenant.roles.filter((role: any) => {
            const roleName = role?.roleName?.toLowerCase();
            return roleName === 'mobilizer' || roleName === 'lead';
          });

          if (allowedRoles.length === 0) {
            return null;
          }

          // Prefer Lead over Mobilizer if both exist
          const leadRole = allowedRoles.find(
            (role: any) => role?.roleName?.toLowerCase() === 'lead'
          );
          if (leadRole) {
            return toPascalCase(leadRole.roleName);
          }

          // Otherwise use Mobilizer
          const mobilizerRole = allowedRoles.find(
            (role: any) => role?.roleName?.toLowerCase() === 'mobilizer'
          );
          if (mobilizerRole) {
            return toPascalCase(mobilizerRole.roleName);
          }

          return null;
        };

        // Domain (Trainer + Placement Retention) and Skills (Trainer only).
        // Uses the profile's own role names: the current user's role from
        // localStorage, or every role the viewed user has in this tenant.
        const tenantName = localStorage.getItem('tenantName');
        const profileTenant =
          userData?.tenantData?.find((tenant: any) => tenant?.tenantName === tenantName) ||
          userData?.tenantData?.[0];
        const profileRoles: string[] =
          userId === storedUserId
            ? [role]
            : (profileTenant?.roles || []).map((r: any) => r?.roleName);
        const hasRole = (roleName: string) =>
          profileRoles.some((r) => r?.toLowerCase() === roleName.toLowerCase());
        const isTrainer = hasRole(YOUTHNET_USER_ROLE.INSTRUCTOR);
        const showDomain =
          isTrainer || hasRole(YOUTHNET_USER_ROLE.PLACEMENT_RETENTION_COORDINATOR);

        // DOMAIN/SKILLS selectedValues are plain strings (see
        // TrainerTaxonomyService), not {value} objects like getFieldValue
        // expects. The cached userData of the logged-in user may not carry
        // them, so fall back to a fresh user/read for these roles.
        let taxonomySource = userData;
        const hasTaxonomyField = (node: any) =>
          node?.customFields?.some(
            (item: any) => item.label === 'DOMAIN' || item.label === 'SKILLS'
          );
        if (showDomain && userId === storedUserId && !hasTaxonomyField(userData)) {
          const fresh = await getUserDetails(userId, true);
          taxonomySource = fresh?.userData || userData;
        }
        const getTaxonomyValue = (label: string) => {
          const values =
            taxonomySource?.customFields?.find((item: any) => item.label === label)
              ?.selectedValues || [];
          const names = values
            .map((item: any) => (typeof item === 'string' ? item : item?.label ?? item?.value))
            .filter(Boolean);
          return Array.from(new Set(names)).join(', ');
        };

        setUser({
          firstName: toPascalCase(userData?.firstName) || '',
          lastName: toPascalCase(userData?.lastName) || '',
          middleName: toPascalCase(userData?.middleName) || '',
          userName: userData?.username || '',
          joinedOn: userData?.createdOn || '',
          email: userData?.email || '',
          userID: userData?.userId || '',
          phone: userData?.mobile || '',
          gender: userData?.gender || '',
          userRole:
            userId === localStorage.getItem('userId')
              ? toPascalCase(role)
              : (
                  getRoleFromTenant() ||
                  toPascalCase(userData?.tenantData?.[0]?.roles?.[0]?.roleName) ||
                  toPascalCase(role)
                ),
          dob: formattedDOBDate || '',
          district: getFieldValue('DISTRICT'),
          block: getFieldValue('BLOCK'),
          state: getFieldValue('STATE'),
          village: getFieldValue('VILLAGE'),
          workingVillages: getWorkingVillages(),
          enrollmentId: userData?.enrollmentId || null,
          domain: showDomain ? getTaxonomyValue('DOMAIN') || '-' : null,
          skills: isTrainer ? getTaxonomyValue('SKILLS') || '-' : null,
        });
      }
    };

    fetchData();
  }, [userId, updatedUser]);
  console.log('user====>', user);
  const handleEditPassword = () => {
 //   handleClose4(); // Close the menu first
    router.push('/edit-password'); // Then navigate to the edit password page
  };
  return (
    <>
      <Box minHeight="100vh">
        {' '}
        <Box>
          <Header />
        </Box>
        <Box ml={2}>
          <BackHeader
            headingOne={
              userId === currentUserId
                ? t('YOUTHNET_PROFILE.MY_PROFILE')
                : user.firstName
                ? user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName
                : ''
            }
            showBackButton={
              userId === currentUserId ? false : true
            }
            onBackClick={() => {
              if (tab) {
                router.push({
                  pathname: `/villages`,
                  query: {
                    villageId: villageId,
                    tab: tab,
                    blockId: blockId,
                  },
                });
              } else router.back();
            }}
          />
        </Box>
        {userId?.toString() !== currentUserId &&
          userProgram !== TENANT_DATA.PRAGYANPATH && (
          <Box
            sx={{
              marginLeft: '30%',
            }}
          >
            <Button
              sx={{
                fontSize: '14px',
                lineHeight: '20px',
                minWidth: '40%',
                padding: '10px 24px 10px 16px',
                gap: '8px',
                borderRadius: '100px',
                marginTop: '10px',
                // flex: '1',
                textAlign: 'center',
                color: theme.palette.warning.A200,
                border: `1px solid #4D4639`,
              }}
              onClick={handleOpenEditModal}
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
          </Box>
        )}
        {/* <Box ml={2}>
        {' '}
        <Typography
          sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: theme.palette.info.black,
          }}
        >
          {t('YOUTHNET_PROFILE.ACTIVITIES_CONDUCTED')}
        </Typography>
      </Box> */}
        {/* <Box>
        <VillageDetailCard
          imageSrc={Frame2}
          title={VILLAGE_DATA.THREE}
          subtitle={VILLAGE_DATA.SURVEYS_CONDUCTED}
        />
      </Box> */}
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
            {t('YOUTHNET_PROFILE.PROFILE_DETAILS')}
          </Typography>
          <Profile
            fullName={
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.lastName || ''
            }
            emailId={user.email || '-'}
            designation={user.userRole || '-'}
            mentorId={user.userID || ''}
            phoneNumber={user.phone || '-'}
            gender={toPascalCase(user.gender) || '-'}
            state={user.state || '-'}
            district={user.district || '-'}
            block={user.block || '-'}
            dob={user.dob || '-'}
            age={getAge(user?.dob)}
            village={user.village || null}
            middleName={user.middleName || '-'}
            userName={user.userName || null}
            joinedOn={user.joinedOn || null}
            firstName={user.firstName || ''}
            lastName={user.lastName || ''}
            workingVillages={user.workingVillages || null}
            enrollmentId={user.enrollmentId || null}
            domain={user.domain || null}
            skills={user.skills || null}
          />
        </Box>
        <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={handleEditPassword}
              sx={{
                fontSize: '16px',
                backgroundColor: 'white',
                border: '0.6px solid #1E1B16',
                my: '20px',
                marginLeft: '16px',
                width: '408px',
                '@media (max-width: 434px)': { width: '100%' },
              }}
              endIcon={<EditIcon />}
            >
              {typeof window !== 'undefined' && localStorage.getItem('temporaryPassword') === 'true'
                ? t('LOGIN_PAGE.SET_PASSWORD')
                : t('LOGIN_PAGE.RESET_PASSWORD')}
            </Button>
      </Box>
      <SimpleModal
        open={editModal}
        onClose={onClose}
        showFooter={true}
        modalTitle={t('YOUTHNET_PROFILE.UPDATE_PROFILE')}
        //  handleNext={FormSubmitFunction}
        primaryText={'Submit'}
        id="dynamic-form-id"
        // secondaryText={count === 1 ? 'Save Progress' : ''}
      >
        {editModal && (!schema || !uiSchema) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px',
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2">{t('COMMON.LOADING')}</Typography>
          </Box>
        )}
        {schema && uiSchema && userId && (
          <EditSearchUser
            onUserDetails={handleProfileUpdate}
            schema={schema}
            uiSchema={uiSchema}
            userId={userId.toString()}
            roleId={''}
            tenantId={tenantId}
            type={'mentor'}
            selectedUserRow={updatedUser}
          />
        )}
      </SimpleModal>
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
