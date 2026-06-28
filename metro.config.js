const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the import is for 'zustand' or any of its subpaths (like 'zustand/middleware')
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
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
