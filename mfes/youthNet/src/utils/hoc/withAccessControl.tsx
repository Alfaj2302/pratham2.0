import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Role } from '../app.constant';
import { accessGranted } from '../helper';

// Page-level role gating for YouthNet.
//
// Deliberately reads `role` and `token` from localStorage rather than from the zustand store, which is
// how the rest of YouthNet checks role (see MenuDrawer.tsx, EntryContent.tsx). The store's `userRole` is
// only populated by Header.tsx on mount, so a page HOC reading it can run first and bounce a legitimate
// user. localStorage is written at SSO login (sso/index.tsx) and so is already present on a fresh load.
//
// Redirect targets use routes that exist in YouthNet: there is no `/unauthorized` page here (unlike
// scp-teacher-repo), so an authenticated user with the wrong role is sent to the dashboard instead.
const withAccessControl =
  (action: string, accessControl: { [key: string]: Role[] }) =>
  (Component: React.ComponentType<any>) => {
    const WrappedComponent = (props: any) => {
      const router = useRouter();
      // null = not yet resolved on the client; avoids flashing the page or redirecting during SSR.
      const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

      useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role') as Role | null;

        if (!token) {
          setIsAllowed(false);
          router.replace('/logout');
          return;
        }

        if (!role || !accessGranted(action, accessControl, role)) {
          setIsAllowed(false);
          router.replace('/');
          return;
        }

        setIsAllowed(true);
      }, [action, router]);

      if (isAllowed !== true) {
        return null;
      }

      return <Component {...props} />;
    };

    // Set the display name for better debugging and developer tools
    WrappedComponent.displayName = `withAccessControl(${
      Component.displayName ?? Component.name ?? 'Component'
    })`;

    return WrappedComponent;
  };

export default withAccessControl;
