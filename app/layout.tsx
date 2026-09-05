import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export const viewport: Viewport = {
  themeColor: '#080809',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'CRM Financeiro',
  description: 'Sistema de gestão de contas a pagar e receber.',
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
    description: 'Sistema de gestão de contas a pagar e receber.',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="py-8 border-t border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600">
                Desenvolvido por <span className="text-gold/50">Jair</span> — 2026
              </p>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
