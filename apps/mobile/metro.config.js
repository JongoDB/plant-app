// Metro config tuned for the pnpm monorepo layout.
// Watches the workspace root so changes in @plant-app/shared hot-reload, and
// teaches the resolver to look in both project- and workspace-level
// node_modules without falling through to a hierarchical lookup.

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
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
