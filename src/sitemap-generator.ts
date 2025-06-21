import { TanStackRouterSitemapGenerator } from './generator';
import { SitemapOptions, TanStackRoute } from './types';

/**
 * Generate XML sitemap from TanStack Router route tree
 * @param routeTree - The TanStack Router route tree
 * @param options - Sitemap generation options
 * @returns XML sitemap string
 */
export async function generateSitemap(
  routeTree: TanStackRoute,
  options: SitemapOptions
): Promise<string> {
  const generator = new TanStackRouterSitemapGenerator(options);
  return await generator.generateXmlSitemap(routeTree);
}

/**
 * Generate sitemap entries array from TanStack Router route tree
 * @param routeTree - The TanStack Router route tree
 * @param options - Sitemap generation options
 * @returns Array of sitemap entries
 */
export async function generateSitemapEntries(
  routeTree: TanStackRoute,
  options: SitemapOptions
) {
  const generator = new TanStackRouterSitemapGenerator(options);
  return await generator.generateSitemapEntries(routeTree);
}
