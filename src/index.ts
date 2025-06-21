export { generateSitemap, generateSitemapEntries } from './sitemap-generator';
export type {
  SitemapOptions,
  RouteInfo,
  SitemapEntry,
  TanStackRoute,
  RouterTree,
  AnyRoute,
  ManualSitemapEntry,
} from './types';
export { TanStackRouterSitemapGenerator } from './generator';
export { sitemapPlugin, createSitemapPlugin } from './plugin';
export type { SitemapPluginOptions } from './plugin';
