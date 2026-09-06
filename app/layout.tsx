import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'CRM Financeiro',
  description: 'Controle financeiro de elite desenvolvido por Jair',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CRM Financeiro',
  },
  icons: {
    apple: '/pwa-icon.jpg',
  },
  openGraph: {
    title: 'CRM Financeiro',
    description: 'Controle financeiro de elite desenvolvido por Jair',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="font-sans antialiased selection:bg-gold/20">
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-dark-bg">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="py-12 border-t border-white/5 text-center bg-dark-bg">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-700">
                Desenvolvido por <span className="text-gold/40">Jair</span> — 2026
              </p>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
