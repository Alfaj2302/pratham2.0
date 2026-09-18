import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import manageUserStore from '../store/manageUserStore';
import { UpdateDeviceNotification } from '../services/NotificationService';
import useStore from '../store/store';
import { TENANT_DATA } from '../utils/app.config';
import { getUserDetails } from '../services/ProfileService';
import { AcademicYear } from '../utils/Interfaces';
import { getAcademicYear } from '../services/AcademicYearService';
import router from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { RoleNames } from '../utils/app.constant';
import { useTranslation } from 'next-i18next';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';

import SwitchAccountDialog from '@shared-lib-v2/SwitchAccount/SwitchAccount';

const Login = dynamic(() => import('@login'), {
  ssr: false,
});

const LoginComponent = () => {
  const { t } = useTranslation();
  const setUserId = manageUserStore((state) => state.setUserId);
  const setUserRole = useStore(
    (state: { setUserRole: any }) => state.setUserRole
  );

  const setAccessToken = useStore(
    (state: { setAccessToken: any }) => state.setAccessToken
  );

  const setIsActiveYearSelected = useStore(
    (state: { setIsActiveYearSelected: any }) => state.setIsActiveYearSelected
  );

  const setDistrictCode = manageUserStore(
    (state: { setDistrictCode: any }) => state.setDistrictCode
  );
  const setDistrictId = manageUserStore(
    (state: { setDistrictId: any }) => state.setDistrictId
  );

  const setDistrictName = manageUserStore(
    (state: { setDistrictName: any }) => state.setDistrictName
  );

  const setStateCode = manageUserStore(
    (state: { setStateCode: any }) => state.setStateCode
  );
  const setStateId = manageUserStore(
    (state: { setStateId: any }) => state.setStateId
  );

  const setStateName = manageUserStore(
    (state: { setStateName: any }) => state.setStateName
  );

  const setBlockCode = manageUserStore(
    (state: { setBlockCode: any }) => state.setBlockCode
  );
  const setBlockId = manageUserStore(
    (state: { setBlockId: any }) => state.setBlockId
  );
  const setBlockName = manageUserStore(
    (state: { setBlockName: any }) => state.setBlockName
  );

  const getAcademicYearList = async () => {
    const academicYearList: AcademicYear[] = await getAcademicYear();
    if (academicYearList) {
      localStorage.setItem(
        'academicYearList',
        JSON.stringify(academicYearList)
      );
      const extractedAcademicYears = academicYearList?.map(
        ({ id, session, isActive }) => ({ id, session, isActive })
      );
      const activeSession = extractedAcademicYears?.find(
        (item) => item.isActive
      );
      const activeSessionId = activeSession ? activeSession.id : '';
      localStorage.setItem('academicYearId', activeSessionId);
      setIsActiveYearSelected(true);

      return activeSessionId;
    }
  };

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [receivedToken, setReceivedToken] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleLoginSuccess = async (receivedToken: any) => {
    const userId = receivedToken?.userId;
    const token = localStorage.getItem('token');
    console.log(receivedToken, token);

    setReceivedToken(receivedToken);

    // Store tenantData for later use (e.g., in Header for switch account)
    if (receivedToken?.tenantData) {
      localStorage.setItem('tenantData', JSON.stringify(receivedToken.tenantData));
    }

    setSwitchDialogOpen(true);
  };

  const callBackSwitchDialog = async (
    tenantId: string,
    tenantName: string,
    tenantType: string,
    roleId: string,
    roleName: string
  ) => {
    setSwitchDialogOpen(false);
    setLoading(true);

    // Set the state values
    setTenantId(tenantId);
    setTenantName(tenantName);
    setRoleId(roleId);
    setRoleName(roleName);

    const token =
      typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('token')
        : '';
    const userId = receivedToken?.userId;

    // Find the tenant data for the selected tenant
    const tenantData = receivedToken?.tenantData?.find(
      (tenant: any) => tenant.tenantId === tenantId
    );

    if (receivedToken.tenantData && receivedToken.tenantData.length > 0) {
      localStorage.setItem('tenantName', tenantName);
      localStorage.setItem('tenantId', tenantId);
      
      // Set templateId from tenant data
      localStorage.setItem('templtateId', tenantData?.templateId || '');
      
      // Set channelId
      if (tenantData?.channelId) {
        localStorage.setItem('channelId', tenantData.channelId);
      }
      
      // Set collectionFramework
      if (tenantData?.collectionFramework) {
        localStorage.setItem('collectionFramework', tenantData.collectionFramework);
      }
      
      // Set uiConfig
      const uiConfig = tenantData?.params?.uiConfig;
      localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));
      
      // Set userProgram
      localStorage.setItem('userProgram', tenantName);
    } else {
      console.error('Tenant data not found in user response.');
    }
    localStorage.setItem('userId', userId);
    setUserId(userId);

    if (token && userId) {
      // Set token cookie
      document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
      document.cookie = `authToken=${token}; path=/; secure; SameSite=Strict`;
      document.cookie = `userId=${userId}; path=/; secure; SameSite=Strict`;

      // Retrieve deviceID from local storage
      const deviceID = localStorage.getItem('deviceID');

      if (deviceID) {
        try {
          // Update device notification
          const headers = {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          };

          const updateResponse = await UpdateDeviceNotification(
            { deviceId: deviceID, action: 'add' },
            userId,
            headers
          );

          console.log(
            'Device notification updated successfully:',
            updateResponse
          );
        } catch (updateError) {
          console.error('Error updating device notification:', updateError);
        }
      }

      localStorage.setItem('role', roleName);
      localStorage.setItem('roleName', roleName);
      localStorage.setItem('roleId', roleId || '');
      localStorage.setItem('userEmail', receivedToken?.email);
      localStorage.setItem('userName', receivedToken?.firstName);
      localStorage.setItem('firstName', receivedToken?.firstName || '');
      localStorage.setItem('lastName', receivedToken?.lastName || '');
      localStorage.setItem('userIdName', receivedToken?.username);
      localStorage.setItem(
        'temporaryPassword',
        receivedToken?.temporaryPassword ?? 'false'
      );
      localStorage.setItem('userData', JSON.stringify(receivedToken));
      setUserRole(roleName);
      setAccessToken(token);

      const tenant = localStorage.getItem('tenantName');
      if (
        tenant?.toLocaleLowerCase() ===
          TENANT_DATA?.SECOND_CHANCE_PROGRAM?.toLowerCase() ||
        tenant?.toLocaleLowerCase() === TENANT_DATA?.PRATHAM_SCP?.toLowerCase() ||
        tenant?.toLocaleLowerCase() === TENANT_DATA?.YOUTHNET?.toLowerCase() ||
        tenant?.toLocaleLowerCase() === TENANT_DATA?.PRAGYANPATH?.toLowerCase()
      ) {
        const userDetails = await getUserDetails(userId, true);
        console.log(userDetails);

        if (userDetails?.result?.userData) {
          const activeSessionId = await getAcademicYearList();
          const customFields = userDetails?.result?.userData?.customFields;
          if (customFields?.length) {
            // set customFields in userData
            const userDataString = localStorage.getItem('userData');
            const userData: any = userDataString
              ? JSON.parse(userDataString)
              : null;
            if (userData) {
              userData.customFields = customFields;
              localStorage.setItem('userData', JSON.stringify(userData));
            }
            const state = customFields.find(
              (field: any) => field?.label === 'STATE'
            );
            const district = customFields.find(
              (field: any) => field?.label === 'DISTRICT'
            );
            const block = customFields.find(
              (field: any) => field?.label === 'BLOCK'
            );

            if (state) {
              localStorage.setItem(
                'stateName',
                state?.selectedValues?.[0]?.value
              );
              setStateName(state?.selectedValues?.[0]?.value);
              setStateCode(state?.selectedValues?.[0]?.id);
              setStateId(state?.fieldId);
            }

            if (district) {
              setDistrictName(district?.selectedValues?.[0]?.value);
              setDistrictCode(district?.selectedValues?.[0]?.id);
              setDistrictId(district?.fieldId);
            }

            if (block) {
              setBlockName(block?.selectedValues?.[0]?.value);
              setBlockCode(block?.selectedValues?.[0]?.id);
              setBlockId(block?.fieldId);
            }
          }

          // Check for temporary password first
          
          if (activeSessionId && tenant?.toLocaleLowerCase() === TENANT_DATA?.SECOND_CHANCE_PROGRAM?.toLowerCase()) {
           {
              router.push('/teacher');
            }
          } else if (tenant?.toLocaleLowerCase() === TENANT_DATA?.YOUTHNET?.toLowerCase()) {
            if (localStorage.getItem('role') === RoleNames.TEACHER) {
              // Trainer (Instructor): go straight to the L2 Interested Queue,
              // skipping the /youth -> bare /youthnet hop every other
              // Youthnet role takes.
              router.push('/youthnet/l2-interested-queue');
            } else if (localStorage.getItem('role') === RoleNames.PLACEMENT_RETENTION_COORDINATOR) {
              // Placement Retention Coordinator: go straight to the
              // Placements page, same shortcut as the Trainer role above.
              router.push('/youthnet/placements');
            } else {
              router.push('/youth');
            }
          } else if (tenant?.toLocaleLowerCase() === TENANT_DATA?.PRAGYANPATH?.toLowerCase()) {
            
            if (activeSessionId) {
              localStorage.setItem('academicYearId', activeSessionId);
            }
            
            // Check if user has Lead role for PRAGYANPATH
            const hasLead = receivedToken?.tenantData?.some((tenant: any) => 
              tenant.roles.some((role: any) => role.roleName.toLowerCase().includes("lead"))
            );
            
            if (hasLead && roleName.toLowerCase().includes('lead')) {
              // For Lead role, set managrUserId for manager dashboard
              localStorage.setItem('managrUserId', userId);
              
              // Redirect to manager dashboard in youthNet MFE
                {
                router.push('/youthnet/manager-dashboard');
              }
            } else {
              // For other roles, redirect to youthNet MFE
              router.push('/youthnet');
            }
          }
          console.log('userDetails', userDetails);
        }
      } else if (
        token &&
        tenant?.toLowerCase() === TENANT_DATA.YOUTHNET?.toLowerCase()
      ) {
        if (localStorage.getItem('role') === RoleNames.TEACHER) {
          router.push('/youthnet/l2-interested-queue');
        } else if (localStorage.getItem('role') === RoleNames.PLACEMENT_RETENTION_COORDINATOR) {
          router.push('/youthnet/placements');
        } else if (localStorage.getItem('role') === RoleNames.TEAM_LEADER) {
          router.push('/youthnet');
        } else router.push('/unauthorized');
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Login onLoginSuccess={handleLoginSuccess} />
      <SwitchAccountDialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={receivedToken?.tenantData}
      />
      {loading && (
        <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
      )}
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default LoginComponent;
