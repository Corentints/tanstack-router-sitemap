import {
  SitemapOptions,
  SitemapEntry,
  RouteInfo,
  TanStackRoute,
  ManualSitemapEntry,
} from './types';

export class TanStackRouterSitemapGenerator {
  private options: Required<Omit<SitemapOptions, 'manualRoutes'>> &
    Pick<SitemapOptions, 'manualRoutes'>;

  constructor(options: SitemapOptions) {
    if (!options || !options.baseUrl || options.baseUrl.trim() === '') {
      throw new Error('baseUrl is required and cannot be empty');
    }

    this.options = {
      defaultChangefreq: 'weekly',
      defaultPriority: 0.5,
      excludeRoutes: [],
      routeOptions: {},
      trailingSlash: false,
      lastmod: new Date().toISOString(),
      prettyPrint: true,
      ...options,
    };
  }

  /**
   * Extract routes from TanStack Router route tree
   */
  private extractRoutesFromTree(
    route: TanStackRoute,
    parentPath = ''
  ): RouteInfo[] {
    const routes: RouteInfo[] = [];

    if (!route) return routes;

    // Build the full path
    const routePath = route.path || '';
    const fullPath = this.buildFullPath(parentPath, routePath);

    // Only include routes that have a meaningful path and aren't dynamic
    if (
      fullPath &&
      !this.isDynamicRoute(routePath) &&
      !this.isExcludedRoute(fullPath)
    ) {
      routes.push({
        path: fullPath,
        includedInSitemap: true,
        sitemapOptions: this.options.routeOptions[fullPath] || {},
      });
    }

    // Process children recursively
    if (route.children && Array.isArray(route.children)) {
      for (const childRoute of route.children) {
        routes.push(...this.extractRoutesFromTree(childRoute, fullPath));
      }
    }

    return routes;
  }

  private isDynamicRoute(routePath: string): boolean {
    // Check if route contains dynamic parameters like $param or [param]
    return (
      routePath.includes('$') ||
      routePath.includes('[') ||
      routePath.includes(']')
    );
  }

  private buildFullPath(parentPath: string, routePath: string): string {
    // Handle special TanStack Router path patterns
    if (routePath.startsWith('/')) {
      return routePath;
    }

    // Skip dynamic routes entirely - they shouldn't be in sitemaps
    if (this.isDynamicRoute(routePath)) {
      return '';
    }

    // Handle root and index routes
    if (!routePath || routePath === 'index') {
      return parentPath || '/';
    }

    // Skip __root__ routes as they typically don't represent actual paths
    if (routePath === '__root__') {
      return '';
    }

    const fullPath =
      parentPath === '/' ? `/${routePath}` : `${parentPath}/${routePath}`;

    return fullPath.replace(/\/+/g, '/'); // Clean up multiple slashes
  }

  private isExcludedRoute(path: string): boolean {
    return this.options.excludeRoutes.some((excludePath) => {
      // Support glob patterns
      if (excludePath.includes('*')) {
        // Handle patterns like '/admin/*' to match '/admin' and '/admin/...'
        const pattern = excludePath
          .replace(/\*+/g, '.*') // Replace * with .*
          .replace(/\?/g, '.'); // Replace ? with .

        // If pattern ends with /*, it should match the parent path too
        if (excludePath.endsWith('/*')) {
          const basePath = excludePath.slice(0, -2); // Remove /*
          if (path === basePath || path.startsWith(basePath + '/')) {
            return true;
          }
        }

        const regex = new RegExp(`^${pattern}$`);
        return regex.test(path);
      }
      return path === excludePath;
    });
  }

  /**
   * Generate sitemap entries from route tree
   */
  async generateSitemapEntries(
    routeTree: TanStackRoute
  ): Promise<SitemapEntry[]> {
    const routes = this.extractRoutesFromTree(routeTree);

    // Remove duplicates by path
    const uniqueRoutes = routes.filter(
      (route, index, self) =>
        route.includedInSitemap &&
        self.findIndex((r) => r.path === route.path) === index
    );

    const staticEntries = uniqueRoutes.map((route) =>
      this.createSitemapEntry(route)
    );

    // Add manual routes if they exist
    const manualEntries = await this.generateManualRoutes();

    return [...staticEntries, ...manualEntries];
  }

  /**
   * Generate manual/dynamic routes
   */
  private async generateManualRoutes(): Promise<SitemapEntry[]> {
    if (!this.options.manualRoutes) {
      return [];
    }

    try {
      const manualRoutes = await this.options.manualRoutes();
      return manualRoutes
        .filter((route) => !this.isExcludedRoute(route.location))
        .map((route) => this.createManualSitemapEntry(route));
    } catch (error) {
      console.warn('Warning: Failed to generate manual routes:', error);
      return [];
    }
  }

  /**
   * Create a sitemap entry from a manual route
   */
  private createManualSitemapEntry(route: ManualSitemapEntry): SitemapEntry {
    const url = this.buildFullUrl(route.location);

    // Handle lastMod conversion
    let lastmod: string | undefined;
    if (route.lastMod) {
      if (route.lastMod instanceof Date) {
        lastmod = route.lastMod.toISOString();
      } else {
        lastmod = route.lastMod;
      }
    }

    return {
      url,
      lastmod: lastmod || this.options.lastmod,
      changefreq: route.changeFrequency || this.options.defaultChangefreq,
      priority:
        route.priority !== undefined
          ? route.priority
          : this.options.defaultPriority,
    };
  }

  private createSitemapEntry(route: RouteInfo): SitemapEntry {
    const url = this.buildFullUrl(route.path);

    return {
      url,
      lastmod: route.sitemapOptions?.lastmod || this.options.lastmod,
      changefreq:
        route.sitemapOptions?.changefreq || this.options.defaultChangefreq,
      priority: route.sitemapOptions?.priority || this.options.defaultPriority,
    };
  }

  private buildFullUrl(path: string): string {
    const baseUrl = this.options.baseUrl.replace(/\/$/, '');
    let fullPath = path;

    // Add trailing slash if configured
    if (
      this.options.trailingSlash &&
      !fullPath.endsWith('/') &&
      fullPath !== '/'
    ) {
      fullPath += '/';
    }

    return `${baseUrl}${fullPath}`;
  }

  /**
   * Generate XML sitemap from route tree
   */
  async generateXmlSitemap(routeTree: TanStackRoute): Promise<string> {
    const entries = await this.generateSitemapEntries(routeTree);
    return this.entriesToXml(entries);
  }

  /**
   * Generate XML sitemap from sitemap entries
   */
  entriesToXml(entries: SitemapEntry[]): string {
    const indent = this.options.prettyPrint ? '  ' : '';
    const newline = this.options.prettyPrint ? '\n' : '';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>' + newline;
    xml +=
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + newline;

    for (const entry of entries) {
      xml += `${indent}<url>${newline}`;
      xml += `${indent}${indent}<loc>${this.escapeXml(entry.url)}</loc>${newline}`;

      if (entry.lastmod) {
        xml += `${indent}${indent}<lastmod>${entry.lastmod}</lastmod>${newline}`;
      }

      if (entry.changefreq) {
        xml += `${indent}${indent}<changefreq>${entry.changefreq}</changefreq>${newline}`;
      }

      if (entry.priority !== undefined) {
        xml += `${indent}${indent}<priority>${entry.priority.toFixed(1)}</priority>${newline}`;
      }

      xml += `${indent}</url>${newline}`;
    }

    xml += '</urlset>';
    return xml;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
