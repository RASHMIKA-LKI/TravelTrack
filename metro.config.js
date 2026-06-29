const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ─── Module Resolver ─────────────────────────────────────────────────────────
// Firebase JS SDK v9 and Zustand both use ESM which Metro needs help resolving.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix zustand ESM imports
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    let relativePath = moduleName;
    if (moduleName === 'zustand') {
      relativePath = 'index.js';
    } else {
      relativePath = moduleName.replace('zustand/', '') + '.js';
    }
    const resolvedPath = path.resolve(__dirname, 'node_modules/zustand', relativePath);
    return {
      type: 'sourceFile',
      filePath: resolvedPath,
    };
  }

  // Default resolution for everything else (including Firebase)
  return context.resolveRequest(context, moduleName, platform);
};

// Allow Metro to resolve Firebase's ESM exports
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs', // Firebase uses .mjs files for ES modules
];

module.exports = config;

