import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acasting Social Publisher',
  description: 'Genera e pubblica annunci di casting sui social media',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
