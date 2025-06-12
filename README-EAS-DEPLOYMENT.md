# Bank Teller Game - EAS Build & App Store Deployment

This Expo app is configured for EAS builds and App Store submission with AdMob integration.

## Prerequisites

1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Create Expo account at https://expo.dev
3. Login to EAS:
```bash
eas login
```

## Project Configuration

The app is configured with:
- **Bundle ID**: `com.bankteller.game`
- **App Name**: Bank Teller Game
- **AdMob Test IDs**: Configured in app.json
- **iOS Target**: iOS 13+
- **Orientation**: Portrait only

## AdMob Setup

### Test Ad Unit IDs (Currently Configured)
- **iOS App ID**: `ca-app-pub-3940256099942544~1458002511`
- **Android App ID**: `ca-app-pub-3940256099942544~3347511713`
- **Banner Ad Unit**: `ca-app-pub-3940256099942544/6300978111`

### For Production
1. Create AdMob account at https://admob.google.com
2. Create new app and ad units
3. Replace test IDs in `app.json` with your production IDs
4. Update the `BANNER_AD_UNIT_ID` in `App.tsx`

## EAS Build Commands

### Development Build
```bash
eas build --profile development --platform ios
```

### Production Build (App Store)
```bash
eas build --profile production --platform ios
```

### Submit to App Store
```bash
eas submit --platform ios
```

## Required Assets

Ensure these assets exist in the `assets/` folder:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash.png` (1284x2778 for iPhone 13 Pro Max)
- `favicon.png` (48x48)

## App Store Connect Setup

1. Create app record in App Store Connect
2. Use bundle identifier: `com.bankteller.game`
3. Configure app metadata and screenshots
4. Submit for review after EAS build completes

## Build Profile Configuration

The `eas.json` includes three profiles:
- **development**: For testing with Expo Go
- **preview**: Internal distribution
- **production**: App Store release

## Environment Variables

For production builds, add these secrets in EAS:
```bash
eas secret:create --scope project --name ADMOB_IOS_APP_ID --value "your-ios-app-id"
eas secret:create --scope project --name ADMOB_ANDROID_APP_ID --value "your-android-app-id"
```

## Troubleshooting

### Common Issues
1. **Bundle ID conflicts**: Ensure unique bundle identifier
2. **Certificate issues**: Use `eas credentials` to manage
3. **AdMob not loading**: Verify app IDs in app.json match AdMob console

### Build Logs
Check build status and logs at: https://expo.dev/accounts/[username]/projects/bank-teller-game/builds

## Next Steps After Deployment

1. Test ads with real devices
2. Monitor crash reports in App Store Connect
3. Update AdMob settings for production traffic
4. Configure app analytics and revenue tracking

## Support

- EAS Documentation: https://docs.expo.dev/build/introduction/
- AdMob Integration: https://docs.expo.dev/versions/latest/sdk/admob/
- App Store Guidelines: https://developer.apple.com/app-store/guidelines/