import type { Metadata } from 'next';
import '@/styles/site.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://retard-texteditor.bishawaraj.com.np'),
  title: {
    default: 'retard. — block editor package',
    template: '%s — retard.'
  },
  description:
    'Notion-like block editor npm package. Install it, mount a holder, get typed JSON back.',
  keywords: ['block editor', 'rich text', 'notion-like', 'npm', 'wysiwyg', 'json editor'],
  authors: [{ name: 'brajbhujel' }],
  openGraph: {
    title: 'retard. — block editor package',
    description: 'Install a Notion-like block editor. Slash menu, drag blocks, JSON out.',
    type: 'website',
    siteName: 'retard-texteditor'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'retard. — block editor package',
    description: 'Install a Notion-like block editor. Slash menu, drag blocks, JSON out.'
  },
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
