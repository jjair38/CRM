import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'CRM Finanças',
  description: 'Um CRM inteligente para gestão de contas a pagar e receber com assistente IA.',
  openGraph: {
    title: 'CRM Finanças',
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
        </AuthProvider>
      </body>
    </html>
  );
}
