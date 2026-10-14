import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Data For Dummies',
  slug: 'datafordummies',
  scheme: 'datafordummies',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#f8fafc',
  ios: {
    bundleIdentifier: 'in.datafordummies.app',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'in.datafordummies.app',
    versionCode: 1,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#4f46e5',
    },
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    'expo-image',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
