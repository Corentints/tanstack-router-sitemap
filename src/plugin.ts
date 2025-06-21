import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { TanStackRouterSitemapGenerator } from './generator';
import { SitemapOptions } from './types';

export interface SitemapPluginOptions extends SitemapOptions {
  /** Output path for the sitemap.xml file (relative to project root) */
  outputPath?: string;
  /** Whether to log sitemap generation info */
  verbose?: boolean;
  /** Path to routeTree.gen.ts file (auto-detected if not provided) */
  routeTreePath?: string;
  /** Only generate sitemap on build (default: false) */
  onBuildOnly?: boolean;
}

/**
 * TanStack Router plugin for automatic sitemap generation
 * Use this in your app.config.ts file
 */
/**
 * Auto-detect the routeTree.gen.ts/js file location
 */
function findRouteTreeFile(customPath?: string): string | null {
  const possibleBasePaths = [
    customPath?.replace(/\.(ts|js)$/, ''),
    'src/routeTree.gen',
    'app/routeTree.gen',
    'routeTree.gen',
    './src/routeTree.gen',
    './app/routeTree.gen',
    './routeTree.gen',
  ].filter(Boolean);

  // Try both .js and .ts extensions, prioritizing .js for runtime imports
  const extensions = ['.js', '.ts'];

  for (const basePath of possibleBasePaths) {
    for (const ext of extensions) {
      const fullPath = resolve(process.cwd(), basePath! + ext);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

/**
 * Import route tree from the generated file
 */
async function importRouteTree(filePath: string): Promise<any> {
  const errors: string[] = [];

  // If it's a TypeScript file, try to find the compiled JavaScript version first
  if (filePath.endsWith('.ts')) {
    const jsPath = filePath.replace(/\.ts$/, '.js');
    if (existsSync(jsPath)) {
      try {
        const fileUrl = `file://${jsPath}`;
        const cacheBuster = Date.now();
        const module = await import(`${fileUrl}?v=${cacheBuster}`);
        return (
          module.routeTree ||
          module.default?.routeTree ||
          module.default ||
          module
        );
      } catch (error) {
        errors.push(`JS version failed: ${error}`);
      }
    }

    // If JS version doesn't exist or failed, try to read and parse the TS file
    try {
      const content = readFileSync(filePath, 'utf8');

      // Look for the ROUTE_MANIFEST section first
      const manifestMatch = content.match(
        /\/\*\s*ROUTE_MANIFEST_START\s*([\s\S]*?)\s*ROUTE_MANIFEST_END\s*\*\//
      );
      if (manifestMatch) {
        const manifestJson = JSON.parse(manifestMatch[1]);

        // Convert the manifest to a route tree structure
        function createRouteFromManifest(routeId: string, manifest: any): any {
          const routeInfo = manifest.routes[routeId];
          if (!routeInfo) return null;

          const route = {
            id: routeId,
            path: routeId === '__root__' ? '/' : routeId,
            filePath: routeInfo.filePath,
            children: [],
          };

          // Add children recursively
          if (routeInfo.children) {
            route.children = routeInfo.children
              .map((childId: string) =>
                createRouteFromManifest(childId, manifest)
              )
              .filter(Boolean);
          }

          return route;
        }

        const routeTree = createRouteFromManifest('__root__', manifestJson);
        if (routeTree) {
          return routeTree;
        }
      }

      // If no ROUTE_MANIFEST, try to parse the TypeScript file structure
      // Find FileRoutesByFullPath interface to extract paths
      const fullPathMatch = content.match(
        /interface FileRoutesByFullPath\s*\{([^}]+)\}/
      );
      if (fullPathMatch) {
        const pathsContent = fullPathMatch[1];
        const pathMatches = pathsContent.match(/'([^']+)':/g);
        if (pathMatches) {
          const paths = pathMatches.map((match) =>
            match.replace(/[':]| /g, '')
          );

          // Create a simple route tree structure from the paths
          const routeTree = {
            id: '__root__',
            path: '/',
            children: paths.map((path) => ({
              id: path,
              path: path,
              children: [],
            })),
          };

          return routeTree;
        }
      }

      throw new Error('Could not parse TypeScript route tree file');
    } catch (error) {
      errors.push(`TS parsing failed: ${error}`);
    }
  }

  // Try to import the original file (for JS files)
  try {
    const fileUrl = `file://${filePath}`;
    const cacheBuster = Date.now();
    const module = await import(`${fileUrl}?v=${cacheBuster}`);

    return (
      module.routeTree || module.default?.routeTree || module.default || module
    );
  } catch (error) {
    errors.push(`Import failed: ${error}`);
    throw new Error(
      `Failed to import route tree from ${filePath}: ${errors.join(', ')}`
    );
  }
}

export function sitemapPlugin(options: SitemapPluginOptions) {
  const {
    outputPath = 'public/sitemap.xml',
    verbose = false,
    routeTreePath,
    onBuildOnly = false,
    ...sitemapOptions
  } = options;

  return {
    name: '@corentints/tanstack-router-sitemap',
    apply: 'build' as const,
    enforce: 'post' as const,

    /**
     * Hook into TanStack Router's build process
     */
    buildEnd: async (providedRouteTree?: any) => {
      try {
        if (onBuildOnly && process.env.NODE_ENV !== 'production') {
          if (verbose) {
            console.log(
              '🗺️  Skipping sitemap generation (development mode, onBuildOnly: true)'
            );
          }
          return;
        }

        // Note: Multiple generation prevention handled by Vite's plugin system

        if (verbose) {
          console.log('🗺️  Generating sitemap...');
        }

        // Get route tree - either provided or auto-imported
        let routeTree = providedRouteTree;

        if (!routeTree) {
          if (verbose) {
            console.log('🔍 Auto-detecting routeTree.gen.ts...');
          }

          const routeTreeFilePath = findRouteTreeFile(routeTreePath);

          if (!routeTreeFilePath) {
            throw new Error(
              'Could not find routeTree.gen.ts file. Please ensure TanStack Router has generated the route tree, or provide a custom routeTreePath option.'
            );
          }

          if (verbose) {
            console.log(`📁 Found route tree at: ${routeTreeFilePath}`);
          }

          routeTree = await importRouteTree(routeTreeFilePath);
        }

        if (!routeTree) {
          throw new Error('Route tree is empty or could not be loaded');
        }

        // Generate the sitemap
        const generator = new TanStackRouterSitemapGenerator(sitemapOptions);
        const sitemap = await generator.generateXmlSitemap(routeTree);

        // Ensure output directory exists
        const outputDir = join(
          process.cwd(),
          outputPath.split('/').slice(0, -1).join('/')
        );
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        // Write sitemap to file
        const fullOutputPath = join(process.cwd(), outputPath);
        writeFileSync(fullOutputPath, sitemap, 'utf8');

        if (verbose) {
          const entries = await generator.generateSitemapEntries(routeTree);
          console.log(
            `✅ Sitemap generated with ${entries.length} URLs at ${outputPath}`
          );

          if (verbose && entries.length > 0) {
            console.log('📍 Generated URLs:');
            entries.slice(0, 5).forEach((entry, index) => {
              console.log(`   ${index + 1}. ${entry.url}`);
            });
            if (entries.length > 5) {
              console.log(`   ... and ${entries.length - 5} more URLs`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error generating sitemap:', error);
        throw error;
      }
    },
  };
}

/**
 * Convenience function for common sitemap plugin configurations
 */
export const createSitemapPlugin = (
  baseUrl: string,
  options: Partial<SitemapPluginOptions> = {}
) => {
  return sitemapPlugin({
    baseUrl,
    ...options,
  });
};
