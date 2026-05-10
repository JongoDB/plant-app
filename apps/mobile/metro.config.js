// Metro config tuned for the pnpm monorepo layout.
// Watches the workspace root so changes in @plant-app/shared hot-reload, and
// teaches the resolver to look in both project- and workspace-level
// node_modules.
//
// Also rewrites NodeNext-style `.js` imports (used by @plant-app/shared
// for ESM compliance) to their `.ts` source when bundling — Metro
// otherwise refuses to find the file.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Bundle .tflite models as assets so we can require() them.
config.resolver.assetExts = [...new Set([...(config.resolver.assetExts ?? []), 'tflite'])];

// Exclude root-level paths Metro shouldn't crawl. Anchor patterns to the
// workspace root so we don't accidentally block legitimate node_modules
// directories that happen to contain `dist/` (e.g. react-native-web).
const escaped = workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  new RegExp(`^${escaped}/data/`),
  new RegExp(`^${escaped}/apps/[^/]+/data/`),
  new RegExp(`^${escaped}/apps/[^/]+/drizzle/`),
  new RegExp(`^${escaped}/apps/[^/]+/dist/`),
  new RegExp(`^${escaped}/packages/[^/]+/dist/`),
];

// NodeNext .js -> .ts/.tsx rewrite for relative imports inside shared.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const stripped = moduleName.slice(0, -3);
    for (const ext of ['ts', 'tsx']) {
      try {
        return context.resolveRequest(context, `${stripped}.${ext}`, platform);
      } catch {
        // try next extension
      }
    }
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
