import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'CRM Financeiro',
  description: 'Sistema de gestão de contas a pagar e receber.',
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
