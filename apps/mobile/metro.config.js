// Monorepo-aware Metro config (Expo SDK 58 detects pnpm workspaces automatically).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
