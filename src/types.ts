export interface SitemapOptions {
  /** Base URL for your site (e.g., 'https://example.com') */
  baseUrl: string;
  /** Default changefreq for all routes */
  defaultChangefreq?: SitemapEntry['changefreq'];
  /** Default priority for all routes */
  defaultPriority?: number;
  /** Routes to exclude from sitemap */
  excludeRoutes?: string[];
  /** Custom route configurations */
  routeOptions?: Record<string, Partial<SitemapEntry>>;
  /** Whether to include trailing slashes */
  trailingSlash?: boolean;
  /** Custom lastmod date for all routes */
  lastmod?: string;
  /** Pretty print the XML output */
  prettyPrint?: boolean;
  /** Function to generate manual/dynamic routes */
  manualRoutes?: () => Promise<ManualSitemapEntry[]> | ManualSitemapEntry[];
}

export interface RouteInfo {
  /** The route path pattern */
  path: string;
  /** Whether this route should be included in the sitemap */
  includedInSitemap?: boolean;
  /** Custom sitemap properties for this route */
  sitemapOptions?: Partial<SitemapEntry>;
  /** Child routes */
  children?: RouteInfo[];
}

export interface SitemapEntry {
  /** The URL of the page */
  url: string;
  /** Last modification date in ISO format */
  lastmod?: string;
  /** How frequently the page is likely to change */
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  /** The priority of this URL relative to other URLs on your site (0.0 to 1.0) */
  priority?: number;
}

export interface TanStackRoute {
  path?: string;
  fullPath?: string;
  id?: string;
  children?: TanStackRoute[];
  // Add other TanStack router properties as needed
}

export interface RouterTree {
  routeTree: TanStackRoute;
}

// For compatibility with different TanStack Router structures
export interface AnyRoute {
  path?: string;
  fullPath?: string;
  id?: string;
  children?: AnyRoute[];
  [key: string]: any;
}

export interface ManualSitemapEntry {
  /** The location/path of the manual route (e.g., '/posts/123') */
  location: string;
  /** Priority of this URL relative to other URLs on your site (0.0 to 1.0) */
  priority?: number;
  /** Last modification date in ISO format or Date object */
  lastMod?: string | Date;
  /** How frequently the page is likely to change */
  changeFrequency?: SitemapEntry['changefreq'];
}
