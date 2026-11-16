// app/layout.tsx
import './global.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import MuiThemeProvider, {
  MuiThemeProviderWithLanguage,
} from '@learner/assets/theme/MuiThemeProvider';
import ClientLayout from './ClientLayout';
import GoogleAnalyticsTracker from '@learner/components/GoogleAnalyticsTracker/GoogleAnalyticsTracker';
import { FooterWrapper } from '@learner/components/Footer';
import ChunkReloadGuard from '@shared-lib-v2/lib/ChunkReloadGuard/ChunkReloadGuard';
import SecureAuthGuard from '@shared-lib-v2/lib/SecureAuthGuard/SecureAuthGuard';

export const metadata = {
  title: 'Welcome to learner-web-app',
  description:
    'Learner web app is a platform for users to learn and grow by consuming educational content',
  openGraph: {
    title: 'Welcome to learner-web-app',
    description:
      'Learner web app is a platform for users to learn and grow by consuming educational content',
    images: [
      {
        url: `/logo.png`,
        width: 800,
        height: 600,
      },
    ],
    type: 'website',
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedState = localStorage.getItem('isColorInverted');
                  if (savedState !== null) {
                    const isInverted = JSON.parse(savedState);
                    if (isInverted) {
                      document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
                      
                      // Add style for images/videos
                      const style = document.createElement('style');
                      style.id = 'color-inversion-style-initial';
                      style.textContent = \`
                        img, video, iframe, svg, canvas, embed, object {
                          filter: invert(1) hue-rotate(180deg) !important;
                        }
                        [data-no-invert], [data-no-invert] * {
                          filter: invert(1) hue-rotate(180deg) !important;
                        }
                      \`;
                      document.head.appendChild(style);
                    }
                  }
                } catch (e) {
                  // Handle any localStorage errors silently
                }
              })();
            `,
          }}
        />
      </head>
      <body>
          <ChunkReloadGuard />
          <SecureAuthGuard />
          <ClientLayout>

          <MuiThemeProviderWithLanguage>
                    <GoogleAnalyticsTracker />

            <MuiThemeProvider>{children}</MuiThemeProvider>
            <FooterWrapper />
          </MuiThemeProviderWithLanguage>
          <ToastContainer />
        </ClientLayout>
        
      </body>
    </html>
  );
}
