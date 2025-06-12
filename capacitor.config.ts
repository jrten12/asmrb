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
      appId: "ca-app-pub-3940256099942544~1458002511",
      testingDevices: ["2077ef9a63d2b398840261c8221a0c9b"],
      initializeForTesting: true
    }
  }
};

export default config;
