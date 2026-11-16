import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MuiThemeProvider from '../theme/MuiThemeProvider';
import ChunkReloadGuard from '@shared-lib-v2/lib/ChunkReloadGuard/ChunkReloadGuard';
import SecureAuthGuard from '@shared-lib-v2/lib/SecureAuthGuard/SecureAuthGuard';
import './global.css';

export const metadata = {
  title: 'Survey Forms',
  description: 'Survey Forms MFE for facilitators',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body>
        <ChunkReloadGuard />
        <SecureAuthGuard />
        <MuiThemeProvider>{children}</MuiThemeProvider>
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar
          closeButton={false}
          newestOnTop
        />
      </body>
    </html>
  );
}
