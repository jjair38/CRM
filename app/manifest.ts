import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CRM Financeiro',
    short_name: 'FinCRM',
    description: 'Gestão patrimonial consolidada e controle financeiro de elite.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#c5a059',
    icons: [
      {
        src: '/pwa-icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/pwa-icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      }
    ],
  };
}
