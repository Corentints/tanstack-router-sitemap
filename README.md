# @corentints/tanstack-router-sitemap

Generate XML sitemaps automatically from your TanStack Router route definitions. This plugin integrates seamlessly with TanStack Router to create SEO-friendly sitemaps without manual configuration.

## Features

- 🚀 **Automatic sitemap generation** from TanStack Router routes
- 🔧 **Flexible configuration** options for different use cases
- 🎯 **Smart route filtering** - excludes dynamic routes by default
- 📝 **Customizable metadata** per route (priority, changefreq, lastmod)
- 🌐 **SEO optimized** XML output following sitemap.org standards
- ⚡ **Vite plugin support** for seamless integration
- 🔍 **TypeScript support** with full type definitions
- 📋 **Manual route generation** for dynamic content (blog posts, articles, etc.)

## Installation

```bash
npm install @corentints/tanstack-router-sitemap
```

## Quick Start

### 1. As a Vite Plugin (Recommended)

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { sitemapPlugin } from '@corentints/tanstack-router-sitemap';

export default defineConfig({
  plugins: [
    // ... your other plugins
    sitemapPlugin({
      baseUrl: 'https://your-domain.com',
      outputPath: 'public/sitemap.xml',
    }),
  ],
});
```

### 2. Programmatic Usage

```typescript
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateSitemap } from '@corentints/tanstack-router-sitemap';
import { routeTree } from './routeTree.gen'; // Your generated route tree

const sitemap = await generateSitemap(routeTree, {
  baseUrl: 'https://your-domain.com',
  defaultChangefreq: 'weekly',
  defaultPriority: 0.8,
});

// Ensure the public directory exists
const outputPath = 'public/sitemap.xml';
const outputDir = join(process.cwd(), 'public');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Write sitemap to file
writeFileSync(join(process.cwd(), outputPath), sitemap, 'utf8');
console.log(`✅ Sitemap saved to ${outputPath}`);
```

## Configuration Options

### SitemapOptions

| Option              | Type                                                          | Default      | Description                                             |
| ------------------- | ------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `baseUrl`           | `string`                                                      | **Required** | Base URL for your site (e.g., 'https://example.com')    |
| `defaultChangefreq` | `string`                                                      | `'weekly'`   | Default changefreq for all routes                       |
| `defaultPriority`   | `number`                                                      | `0.5`        | Default priority for all routes (0.0 to 1.0)            |
| `excludeRoutes`     | `string[]`                                                    | `[]`         | Routes to exclude from sitemap (supports glob patterns) |
| `routeOptions`      | `Record<string, Partial<SitemapEntry>>`                       | `{}`         | Custom configurations per route                         |
| `trailingSlash`     | `boolean`                                                     | `false`      | Whether to include trailing slashes                     |
| `lastmod`           | `string`                                                      | Current date | Custom lastmod date for all routes                      |
| `prettyPrint`       | `boolean`                                                     | `true`       | Pretty print the XML output                             |
| `manualRoutes`      | `() => Promise<ManualSitemapEntry[]> \| ManualSitemapEntry[]` | `undefined`  | Function to generate manual/dynamic routes              |

### SitemapPluginOptions (extends SitemapOptions)

| Option          | Type      | Default                | Description                            |
| --------------- | --------- | ---------------------- | -------------------------------------- |
| `outputPath`    | `string`  | `'public/sitemap.xml'` | Output path for the sitemap.xml file   |
| `verbose`       | `boolean` | `false`                | Whether to log sitemap generation info |
| `routeTreePath` | `string`  | Auto-detected          | Path to routeTree.gen.ts file          |
| `onBuildOnly`   | `boolean` | `false`                | Only generate sitemap on build         |

## Advanced Usage

### Excluding Routes

```typescript
sitemapPlugin({
  baseUrl: 'https://your-domain.com',
  excludeRoutes: [
    '/admin',          // Exclude specific route
    '/admin/*',        // Exclude all admin routes
    '/api/*',          // Exclude all API routes
    '/private-*',      // Exclude routes starting with 'private-'
  ],
});
```

### Custom Route Configuration

```typescript
sitemapPlugin({
  baseUrl: 'https://your-domain.com',
  routeOptions: {
    '/': {
      priority: 1.0,
      changefreq: 'daily',
    },
    '/blog': {
      priority: 0.8,
      changefreq: 'weekly',
    },
    '/about': {
      priority: 0.6,
      changefreq: 'monthly',
      lastmod: '2024-01-01T00:00:00.000Z',
    },
  },
});
```

## Route Detection

The plugin automatically:

- ✅ **Includes** static routes (e.g., `/about`, `/contact`)
- ❌ **Excludes** dynamic routes (e.g., `/users/$id`, `/posts/[slug]`)
- ❌ **Excludes** routes in your `excludeRoutes` configuration
- ✅ **Processes** nested route structures recursively

## Example Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <lastmod>2024-01-15T12:00:00.000Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://your-domain.com/about</loc>
    <lastmod>2024-01-15T12:00:00.000Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://your-domain.com/blog</loc>
    <lastmod>2024-01-15T12:00:00.000Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Manual Routes for Dynamic Content

For dynamic routes like blog posts, articles, or other database-driven content, you can use the `manualRoutes` option:

```typescript
manualRoutes: async () => {
  const [posts, products, events] = await Promise.all([
    fetchBlogPosts(),
    fetchProducts(),
    fetchEvents()
  ]);

  return [
    ...posts.map(post => ({
      location: `/blog/${post.slug}`,
      priority: 0.8,
      lastMod: post.publishedAt,
      changeFrequency: 'weekly' as const
    })),
    ...products.map(product => ({
      location: `/shop/${product.id}`,
      priority: 0.7,
      changeFrequency: 'monthly' as const
    })),
    ...events.map(event => ({
      location: `/events/${event.id}`,
      priority: 0.9,
      lastMod: event.updatedAt,
      changeFrequency: 'daily' as const
    }))
  ];
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 

---

Built with ❤️ for the TanStack community