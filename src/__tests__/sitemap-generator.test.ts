import { describe, it, expect } from 'vitest';
import { generateSitemap, generateSitemapEntries } from '../sitemap-generator';
import { SitemapOptions, TanStackRoute } from '../types';

describe('sitemap-generator functions', () => {
  const basicOptions: SitemapOptions = {
    baseUrl: 'https://example.com',
    defaultChangefreq: 'weekly',
    defaultPriority: 0.5,
  };

  const sampleRouteTree: TanStackRoute = {
    id: '__root__',
    path: '/',
    children: [
      { id: 'home', path: 'home' },
      { id: 'about', path: 'about' },
      {
        id: 'blog',
        path: 'blog',
        children: [{ id: 'blog/posts', path: 'posts' }],
      },
    ],
  };

  describe('generateSitemapEntries', () => {
    it('should generate sitemap entries', async () => {
      const entries = await generateSitemapEntries(
        sampleRouteTree,
        basicOptions
      );

      expect(entries).toHaveLength(5);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
        'https://example.com/about',
        'https://example.com/blog',
        'https://example.com/blog/posts',
      ]);
    });

    it('should handle empty route tree', async () => {
      const emptyRouteTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [],
      };

      const entries = await generateSitemapEntries(
        emptyRouteTree,
        basicOptions
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].url).toBe('https://example.com/');
    });

    it('should propagate generator options', async () => {
      const customOptions: SitemapOptions = {
        baseUrl: 'https://test.com',
        defaultPriority: 0.8,
        defaultChangefreq: 'daily',
      };

      const entries = await generateSitemapEntries(
        sampleRouteTree,
        customOptions
      );

      expect(entries[0].url).toContain('https://test.com');
      expect(entries[0].priority).toBe(0.8);
      expect(entries[0].changefreq).toBe('daily');
    });
  });

  describe('generateSitemap', () => {
    it('should generate XML sitemap string', async () => {
      const xml = await generateSitemap(sampleRouteTree, basicOptions);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      );
      expect(xml).toContain('<url>');
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect(xml).toContain('<loc>https://example.com/home</loc>');
      expect(xml).toContain('<loc>https://example.com/about</loc>');
      expect(xml).toContain('<loc>https://example.com/blog</loc>');
      expect(xml).toContain('<loc>https://example.com/blog/posts</loc>');
      expect(xml).toContain('</urlset>');
    });

    it('should generate valid XML structure', async () => {
      const xml = await generateSitemap(sampleRouteTree, basicOptions);

      // Basic XML validation
      expect(xml.startsWith('<?xml')).toBe(true);
      expect(xml.includes('<urlset')).toBe(true);
      expect(xml.endsWith('</urlset>')).toBe(true);

      // Count opening and closing url tags
      const openingTags = (xml.match(/<url>/g) || []).length;
      const closingTags = (xml.match(/<\/url>/g) || []).length;
      expect(openingTags).toBe(closingTags);
      expect(openingTags).toBeGreaterThan(0);
    });

    it('should handle route tree with no valid routes', async () => {
      const dynamicOnlyRouteTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'post.$id', path: 'post/$id' }, // Dynamic route
          { id: 'user.[id]', path: 'user/[id]' }, // Dynamic route
        ],
      };

      const xml = await generateSitemap(dynamicOnlyRouteTree, basicOptions);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      );
      expect(xml).toContain('</urlset>');
      // Should contain one <url> tag for the root route
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect((xml.match(/<url>/g) || []).length).toBe(1);
    });

    it('should handle manual routes', async () => {
      const manualOptions: SitemapOptions = {
        ...basicOptions,
        manualRoutes: async () => [
          { location: '/api/posts/1', priority: 0.9 },
          { location: '/api/posts/2', priority: 0.8 },
        ],
      };

      const xml = await generateSitemap(sampleRouteTree, manualOptions);

      expect(xml).toContain('<loc>https://example.com/api/posts/1</loc>');
      expect(xml).toContain('<loc>https://example.com/api/posts/2</loc>');
    });

    it('should propagate all sitemap options', async () => {
      const customOptions: SitemapOptions = {
        baseUrl: 'https://custom.com',
        defaultChangefreq: 'monthly',
        defaultPriority: 0.9,
        lastmod: '2023-01-01T00:00:00.000Z',
        prettyPrint: true,
        trailingSlash: true,
      };

      const xml = await generateSitemap(sampleRouteTree, customOptions);

      expect(xml).toContain('https://custom.com');
      expect(xml).toContain('<changefreq>monthly</changefreq>');
      expect(xml).toContain('<priority>0.9</priority>');
      expect(xml).toContain('<lastmod>2023-01-01T00:00:00.000Z</lastmod>');
      expect(xml).toContain('/home/'); // trailing slash
    });
  });
});
