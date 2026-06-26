const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const sharedRoot = path.resolve(__dirname, '..', 'shared');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sharedRoot],
  resolver: {
    // Allow Metro to resolve the shared package from the monorepo root
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '..', 'node_modules'),
    ],
    extraNodeModules: {
      shared: path.resolve(sharedRoot, 'dist'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
