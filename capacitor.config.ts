import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bankteller.app',
  appName: 'Bank Teller 1988',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      showSpinner: false
    },
    AdMob: {
      appId: "ca-app-pub-3940256099942544~1458002511", // Test App ID - replace with your real App ID
      requestTrackingAuthorization: true,
      initializeForTesting: true
    }
  }
};

export default config;
