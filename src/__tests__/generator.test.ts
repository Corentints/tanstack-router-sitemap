import { describe, it, expect, beforeEach } from 'vitest';
import { TanStackRouterSitemapGenerator } from '../generator';
import { SitemapOptions, TanStackRoute, ManualSitemapEntry } from '../types';

describe('TanStackRouterSitemapGenerator', () => {
  let generator: TanStackRouterSitemapGenerator;
  let basicOptions: SitemapOptions;

  beforeEach(() => {
    basicOptions = {
      baseUrl: 'https://example.com',
      defaultChangefreq: 'weekly',
      defaultPriority: 0.5,
    };
    generator = new TanStackRouterSitemapGenerator(basicOptions);
  });

  describe('constructor', () => {
    it('should create generator with valid options', () => {
      expect(generator).toBeInstanceOf(TanStackRouterSitemapGenerator);
    });

    it('should throw error if baseUrl is missing', () => {
      expect(() => {
        new TanStackRouterSitemapGenerator({} as SitemapOptions);
      }).toThrow('baseUrl is required and cannot be empty');
    });

    it('should throw error if baseUrl is empty string', () => {
      expect(() => {
        new TanStackRouterSitemapGenerator({ baseUrl: '' });
      }).toThrow('baseUrl is required and cannot be empty');
    });

    it('should throw error if baseUrl is whitespace', () => {
      expect(() => {
        new TanStackRouterSitemapGenerator({ baseUrl: '   ' });
      }).toThrow('baseUrl is required and cannot be empty');
    });

    it('should set default options correctly', () => {
      const customOptions: SitemapOptions = {
        baseUrl: 'https://example.com',
        defaultChangefreq: 'daily',
        defaultPriority: 0.8,
        excludeRoutes: ['/admin'],
        trailingSlash: true,
        prettyPrint: false,
      };
      const customGenerator = new TanStackRouterSitemapGenerator(customOptions);
      expect(customGenerator).toBeInstanceOf(TanStackRouterSitemapGenerator);
    });
  });

  describe('generateSitemapEntries', () => {
    it('should generate entries for simple route tree', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'home', path: 'home' },
          { id: 'about', path: 'about' },
          { id: 'contact', path: 'contact' },
        ],
      };

      const entries = await generator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
        'https://example.com/about',
        'https://example.com/contact',
      ]);
    });

    it('should handle nested routes', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          {
            id: 'blog',
            path: 'blog',
            children: [
              { id: 'blog/posts', path: 'posts' },
              { id: 'blog/categories', path: 'categories' },
            ],
          },
        ],
      };

      const entries = await generator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/blog',
        'https://example.com/blog/posts',
        'https://example.com/blog/categories',
      ]);
    });

    it('should exclude dynamic routes', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'home', path: 'home' },
          { id: 'post.$id', path: 'post/$id' },
          { id: 'user.[id]', path: 'user/[id]' },
        ],
      };

      const entries = await generator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
      ]);
    });

    it('should exclude specified routes', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        excludeRoutes: ['/admin', '/private/*'],
      };
      const excludeGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'home', path: 'home' },
          { id: 'admin', path: 'admin' },
          {
            id: 'private',
            path: 'private',
            children: [{ id: 'private/secret', path: 'secret' }],
          },
        ],
      };

      const entries = await excludeGenerator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
      ]);
    });

    it('should handle index routes correctly', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'index', path: 'index' },
          { id: 'about', path: 'about' },
        ],
      };

      const entries = await generator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/about',
      ]);
    });

    it('should remove duplicate paths', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'home1', path: 'home' },
          { id: 'home2', path: 'home' }, // Duplicate
          { id: 'about', path: 'about' },
        ],
      };

      const entries = await generator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
        'https://example.com/about',
      ]);
    });

    it('should include manual routes', async () => {
      const manualRoutes = async (): Promise<ManualSitemapEntry[]> => [
        { location: '/dynamic/page-1', priority: 0.9 },
        { location: '/dynamic/page-2', priority: 0.8 },
      ];

      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        manualRoutes,
      };
      const manualGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'home', path: 'home' }],
      };

      const entries = await manualGenerator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.url)).toEqual([
        'https://example.com/',
        'https://example.com/home',
        'https://example.com/dynamic/page-1',
        'https://example.com/dynamic/page-2',
      ]);
      expect(entries[2].priority).toBe(0.9);
      expect(entries[3].priority).toBe(0.8);
    });

    it('should handle manual routes with Date lastMod', async () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      const manualRoutes = async (): Promise<ManualSitemapEntry[]> => [
        { location: '/dynamic/page-1', lastMod: testDate },
      ];

      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        manualRoutes,
      };
      const manualGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [],
      };

      const entries = await manualGenerator.generateSitemapEntries(routeTree);

      expect(entries).toHaveLength(2);
      expect(entries[1].lastmod).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('generateXmlSitemap', () => {
    it('should generate valid XML sitemap', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [
          { id: 'home', path: 'home' },
          { id: 'about', path: 'about' },
        ],
      };

      const xml = await generator.generateXmlSitemap(routeTree);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      );
      expect(xml).toContain('<url>');
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect(xml).toContain('<loc>https://example.com/home</loc>');
      expect(xml).toContain('<loc>https://example.com/about</loc>');
      expect(xml).toContain('</urlset>');
    });

    it('should include sitemap metadata', async () => {
      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'home', path: 'home' }],
      };

      const xml = await generator.generateXmlSitemap(routeTree);

      expect(xml).toContain('<changefreq>weekly</changefreq>');
      expect(xml).toContain('<priority>0.5</priority>');
      expect(xml).toContain('<lastmod>');
    });

    it('should escape XML special characters', async () => {
      const manualRoutes = async (): Promise<ManualSitemapEntry[]> => [
        { location: '/path?query=test&other=value' },
      ];

      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        manualRoutes,
      };
      const escapeGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [],
      };

      const xml = await escapeGenerator.generateXmlSitemap(routeTree);

      expect(xml).toContain('&amp;');
      expect(xml).not.toContain('&other=');
    });

    it('should handle pretty print option', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        prettyPrint: false,
      };
      const compactGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'home', path: 'home' }],
      };

      const xml = await compactGenerator.generateXmlSitemap(routeTree);

      // Should be more compact (fewer newlines/indentation)
      expect(xml.split('\n').length).toBeLessThan(10);
    });
  });

  describe('URL building', () => {
    it('should handle trailing slash option', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        trailingSlash: true,
      };
      const trailingSlashGenerator = new TanStackRouterSitemapGenerator(
        options
      );

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'about', path: 'about' }],
      };

      const entries =
        await trailingSlashGenerator.generateSitemapEntries(routeTree);

      expect(entries[1].url).toBe('https://example.com/about/');
    });

    it('should handle base URL without trailing slash', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com', // No trailing slash
      };
      const noSlashGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'about', path: 'about' }],
      };

      const entries = await noSlashGenerator.generateSitemapEntries(routeTree);

      expect(entries[1].url).toBe('https://example.com/about');
    });

    it('should handle base URL with trailing slash', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com/', // With trailing slash
      };
      const withSlashGenerator = new TanStackRouterSitemapGenerator(options);

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'about', path: 'about' }],
      };

      const entries =
        await withSlashGenerator.generateSitemapEntries(routeTree);

      expect(entries[1].url).toBe('https://example.com/about');
    });
  });

  describe('route options', () => {
    it('should apply custom route options', async () => {
      const options: SitemapOptions = {
        baseUrl: 'https://example.com',
        routeOptions: {
          '/about': {
            priority: 0.9,
            changefreq: 'monthly',
          },
        },
      };
      const customOptionsGenerator = new TanStackRouterSitemapGenerator(
        options
      );

      const routeTree: TanStackRoute = {
        id: '__root__',
        path: '/',
        children: [{ id: 'about', path: 'about' }],
      };

      const entries =
        await customOptionsGenerator.generateSitemapEntries(routeTree);

      expect(entries[1].priority).toBe(0.9);
      expect(entries[1].changefreq).toBe('monthly');
    });
  });
});
