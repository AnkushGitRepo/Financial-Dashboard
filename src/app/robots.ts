import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://marketmitra-v2.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /dashboard is behind auth in hosted mode and not meant to be
      // crawled; /api is a data/agent surface, not page content.
      disallow: ['/dashboard', '/api'],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
