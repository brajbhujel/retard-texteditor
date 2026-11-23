import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://retard-texteditor.bishawaraj.com.np';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/playground`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/docs`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/api`, changeFrequency: 'monthly', priority: 0.7 }
  ];
}
