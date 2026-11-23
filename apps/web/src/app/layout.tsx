import type { Metadata } from 'next';
import { Outfit, Syne } from 'next/font/google';
import '@/styles/site.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap'
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['600', '700', '800'],
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://retard-texteditor.bishawaraj.com.np'),
  title: {
    default: 'retard. — block editor package',
    template: '%s — retard.'
  },
  description: 'Block editor npm package. Install, mount a holder, save structured JSON.',
  keywords: ['block editor', 'rich text', 'npm', 'wysiwyg', 'json editor', 'react editor'],
  authors: [{ name: 'brajbhujel' }],
  openGraph: {
    title: 'retard. — block editor package',
    description: 'Install a block editor. Slash menu, drag blocks, JSON out.',
    type: 'website',
    siteName: 'retard-texteditor'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'retard. — block editor package',
    description: 'Install a block editor. Slash menu, drag blocks, JSON out.'
  },
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
