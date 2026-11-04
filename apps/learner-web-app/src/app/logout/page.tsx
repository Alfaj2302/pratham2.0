'use client';
import { useEffect } from 'react';
import { logout } from '@learner/utils/API/LoginService';
import { useRouter } from 'next/navigation';
import { preserveLocalStorage } from '@learner/utils/helper';
import { Loader, useTranslation } from '@shared-lib';
import { Telemetry } from '@shared-lib-v2/DynamicForm/utils/app.constant';
import { telemetryFactory } from '@shared-lib-v2/DynamicForm/utils/telemetry';
import { getSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';

function Logout() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const userLogout = async () => {
      try {
        // Read before the synchronous storage clear below; the ciphertext is captured synchronously.
        const refreshToken = await getSecureRefreshToken();
        if (refreshToken) {
          await logout(refreshToken);
        }
        const telemetryInteract = {
          context: {
            env: 'sign-out',
            cdata: [],
          },
          edata: {
            id: 'logout-success',
            type: Telemetry.CLICK,
            subtype: '',
            pageid: 'sign-out',
          },
        };
        telemetryFactory.interact(telemetryInteract);
      } catch (error) {
        console.log(error);
      }
    };
    userLogout();
    if (typeof window !== 'undefined' && window.localStorage) {
      // Specify the keys you want to keep
      preserveLocalStorage();
    }

    // NavaPatham learners belong back on their own landing page, not the
    // generic one. isForNavaPatham survives preserveLocalStorage().
    const isForNavaPatham =
      typeof window !== 'undefined' &&
      localStorage.getItem('isForNavaPatham') === 'true';

    router.replace(isForNavaPatham ? '/navapatham' : '/');
  }, []);

  return <Loader isLoading={true} />;
}

export default Logout;
