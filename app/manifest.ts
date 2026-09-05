import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CRM Financeiro',
    short_name: 'CRM Fin',
    description: 'Sistema de gestão de contas a pagar e receber.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#080809',
    theme_color: '#080809',
    icons: [
      {
        src: '/pwa-icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/pwa-icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
