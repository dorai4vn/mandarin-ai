import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app config (iOS-first, Android-ready). Only PUBLIC values may come from EXPO_PUBLIC_*;
 * provider secrets live in apps/api only.
 *
 * IOS_BUNDLE_IDENTIFIER / EAS_PROJECT_ID are set by the owner (see docs/SETUP.md).
 */
const IOS_DEPLOYMENT_TARGET = '16.4'; // floor of expo-modules-core 58 / expo-sqlite 58 (D-014)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mandarin AI',
  slug: 'mandarin-ai',
  scheme: 'mandarinai',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER ?? 'com.example.mandarinai.dev',
    supportsTablet: true,
    deploymentTarget: IOS_DEPLOYMENT_TARGET,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: 'vi',
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? 'com.example.mandarinai.dev',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    // SQLCipher for the encrypted local store (D-011).
    ['expo-sqlite', { useSQLCipher: true }],
    [
      'expo-audio',
      {
        microphonePermission:
          'Mandarin AI cần micro để ghi âm khi bạn luyện phát âm tiếng Trung. Bản ghi chỉ được gửi đi khi bạn bấm chấm điểm.',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787',
  },
});
