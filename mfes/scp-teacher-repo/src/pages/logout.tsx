import { useEffect } from 'react';
import { getSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';
import { useRouter } from 'next/router';
import { logout } from '../services/LoginService';
import { telemetryFactory } from '@/utils/telemetry';
import ReactGA from 'react-ga4';
import { Telemetry } from '@/utils/app.constant';
import { useQueryClient } from '@tanstack/react-query';
import useStore from '@/store/store';
import { preserveLocalStorage } from '@/utils/helper';
const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL;

function Logout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setCohorts = useStore((state) => state.setCohorts);

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Specify the keys you want to keep
      preserveLocalStorage();
    }
  };

  useEffect(() => {
    const userLogout = async () => {
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

      try {
        // Read before the synchronous storage clear below; the ciphertext is captured synchronously.
        const refreshToken = await getSecureRefreshToken();
        const userId = localStorage.getItem('userId');
        if (refreshToken) {
          await logout(refreshToken);
          ReactGA.event('logout-success', {
            userId: userId,
          });
        }
      } catch (error) {
        console.log(error);
        ReactGA.event('logout-fail', {
          error: error,
        });
      }
    };
    userLogout();
    clearLocalStorage();
    //@ts-ignore
    window.parent.location.href = loginUrl;
  }, []);

  return '';
}

export default Logout;
