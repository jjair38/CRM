import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import Script from 'next/script';

export const viewport: Viewport = {
  themeColor: '#d4af37',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'FinanceBot CRM',
  description: 'Um CRM inteligente para gestão de contas a pagar e receber com assistente IA.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinanceBot',
  },
  icons: {
    apple: '/assets/images/pwa_icon_base_1788575029872.jpg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'FinanceBot CRM',
    description: 'Um CRM inteligente para gestão de contas a pagar e receber com assistente IA.',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
          <OfflineIndicator />
          <Script id="register-sw" strategy="afterInteractive">
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `}
          </Script>
        </AuthProvider>
      </body>
    </html>
  );
}
