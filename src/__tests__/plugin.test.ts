import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sitemapPlugin, createSitemapPlugin } from '../plugin';
import type { SitemapPluginOptions } from '../plugin';

// Mock filesystem operations
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn().mockImplementation((...args) => args.join('/')),
  resolve: vi.fn().mockImplementation((...args) => args.join('/')),
}));

describe('sitemapPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('plugin configuration', () => {
    it('should create plugin with default options', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
      };

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
      expect(plugin.apply).toBe('build');
      expect(plugin.enforce).toBe('post');
      expect(typeof plugin.buildEnd).toBe('function');
    });

    it('should accept custom output path', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
        outputPath: 'dist/sitemap.xml',
      };

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should accept verbose option', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
        verbose: true,
      };

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should accept onBuildOnly option', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
        onBuildOnly: true,
      };

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should accept all sitemap options', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
        defaultChangefreq: 'daily',
        defaultPriority: 0.8,
        excludeRoutes: ['/admin'],
        trailingSlash: true,
        lastmod: '2023-01-01T00:00:00.000Z',
        prettyPrint: false,
        manualRoutes: async () => [{ location: '/api/test', priority: 0.9 }],
      };

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });
  });

  describe('createSitemapPlugin', () => {
    it('should create plugin with base URL as first parameter', () => {
      const plugin = createSitemapPlugin('https://example.com');

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
      expect(plugin.apply).toBe('build');
      expect(plugin.enforce).toBe('post');
    });

    it('should merge base URL with additional options', () => {
      const plugin = createSitemapPlugin('https://example.com', {
        outputPath: 'custom/sitemap.xml',
        verbose: true,
        defaultPriority: 0.9,
      });

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should handle empty additional options', () => {
      const plugin = createSitemapPlugin('https://example.com', {});

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should handle no additional options', () => {
      const plugin = createSitemapPlugin('https://example.com');

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
      };

      const plugin = sitemapPlugin(options);

      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('apply');
      expect(plugin).toHaveProperty('enforce');
      expect(plugin).toHaveProperty('buildEnd');

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
      expect(plugin.apply).toBe('build');
      expect(plugin.enforce).toBe('post');
      expect(typeof plugin.buildEnd).toBe('function');
    });

    it('should be compatible with Vite plugin interface', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
      };

      const plugin = sitemapPlugin(options);

      // Basic Vite plugin interface requirements
      expect(typeof plugin.name).toBe('string');
      expect(plugin.name.length).toBeGreaterThan(0);
    });
  });

  describe('options validation', () => {
    it('should handle missing baseUrl in options', () => {
      // The plugin itself doesn't validate - that's done by the generator
      const options = {} as SitemapPluginOptions;

      const plugin = sitemapPlugin(options);

      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });

    it('should preserve all passed options', () => {
      const options: SitemapPluginOptions = {
        baseUrl: 'https://example.com',
        outputPath: 'custom/path/sitemap.xml',
        verbose: true,
        routeTreePath: 'custom/routeTree.gen.ts',
        onBuildOnly: true,
        defaultChangefreq: 'monthly',
        defaultPriority: 0.7,
        excludeRoutes: ['/private/*'],
        routeOptions: {
          '/important': { priority: 1.0 },
        },
        trailingSlash: true,
        lastmod: '2023-12-01T00:00:00.000Z',
        prettyPrint: false,
      };

      const plugin = sitemapPlugin(options);

      // Plugin should be created successfully with all options
      expect(plugin.name).toBe('@corentints/tanstack-router-sitemap');
    });
  });
});

describe('plugin integration', () => {
  it('should export correct plugin functions', () => {
    expect(typeof sitemapPlugin).toBe('function');
    expect(typeof createSitemapPlugin).toBe('function');
  });

  it('should create different plugin instances', () => {
    const plugin1 = sitemapPlugin({ baseUrl: 'https://example1.com' });
    const plugin2 = sitemapPlugin({ baseUrl: 'https://example2.com' });

    expect(plugin1).not.toBe(plugin2);
    expect(plugin1.buildEnd).not.toBe(plugin2.buildEnd);
  });

  it('should handle multiple plugin instances with different configurations', () => {
    const plugin1 = sitemapPlugin({
      baseUrl: 'https://example1.com',
      outputPath: 'public/sitemap1.xml',
      verbose: true,
    });

    const plugin2 = createSitemapPlugin('https://example2.com', {
      outputPath: 'dist/sitemap2.xml',
      verbose: false,
    });

    expect(plugin1.name).toBe(plugin2.name);
    expect(plugin1.apply).toBe(plugin2.apply);
    expect(plugin1.enforce).toBe(plugin2.enforce);
    expect(plugin1.buildEnd).not.toBe(plugin2.buildEnd);
  });
});
