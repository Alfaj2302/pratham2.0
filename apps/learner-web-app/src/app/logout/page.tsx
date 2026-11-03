'use client';
import { useEffect } from 'react';
import { logout } from '@learner/utils/API/LoginService';
import { useRouter } from 'next/navigation';
import { preserveLocalStorage } from '@learner/utils/helper';
import { resetFirstBatchCheck } from '@learner/utils/helpers/vtBatchHelper';
import { Loader, useTranslation } from '@shared-lib';
import { Telemetry } from '@shared-lib-v2/DynamicForm/utils/app.constant';
import { telemetryFactory } from '@shared-lib-v2/DynamicForm/utils/telemetry';

function Logout() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const userLogout = async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
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
    // Logging back in without a reload should still get the L2 Courses redirect.
    resetFirstBatchCheck();

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
