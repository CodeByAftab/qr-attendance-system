import './globals.css';
import Providers from '@/components/shared/Providers';

export const metadata = {
  title: 'Manikstu Agro — Attendance System',
  description: 'Enterprise Attendance & Workforce Management for Manikstu Agro',
  manifest: '/manifest.json',
  themeColor: '#2E7D32',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MK Attend' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/logo.jpeg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
