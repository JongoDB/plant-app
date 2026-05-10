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
