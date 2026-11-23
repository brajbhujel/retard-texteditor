import type { MetadataRoute } from 'next';

const base = 'https://retard-texteditor.bishawaraj.com.np';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '',
    '/docs',
    '/docs/install',
    '/docs/quickstart',
    '/docs/vanilla',
    '/docs/react',
    '/docs/vue',
    '/docs/cdn',
    '/docs/typescript',
    '/docs/api',
    '/docs/data',
    '/playground'
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/playground' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7
  }));
}
