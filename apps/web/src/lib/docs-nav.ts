export type DocsLink = { href: string; label: string };
export type DocsGroup = { title: string; items: DocsLink[] };

export const DOCS_NAV: DocsGroup[] = [
  {
    title: 'Start',
    items: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/install', label: 'Install' },
      { href: '/docs/quickstart', label: 'Quickstart' }
    ]
  },
  {
    title: 'Integrate',
    items: [
      { href: '/docs/vanilla', label: 'Vanilla JS' },
      { href: '/docs/react', label: 'React' },
      { href: '/docs/vue', label: 'Vue' },
      { href: '/docs/cdn', label: 'CDN / UMD' },
      { href: '/docs/typescript', label: 'TypeScript' }
    ]
  },
  {
    title: 'Reference',
    items: [
      { href: '/docs/api', label: 'API' },
      { href: '/docs/data', label: 'Document JSON' },
      { href: '/playground', label: 'Playground' }
    ]
  }
];
