# EAS Build Setup for Bank Teller 1988

## Complete iOS Deployment Guide (No Mac Required)

Your Bank Teller 1988 game is now fully configured for cloud-based iOS deployment using EAS Build.

### What's Already Configured

✅ **Capacitor iOS Project**
- Native iOS project generated
- AdMob plugin integrated
- Build configuration optimized

✅ **EAS Build Configuration**
- `eas.json` with production/preview builds
- `app.json` with iOS app settings
- AdMob integration ready

✅ **Test Ad Units Configured**
- App ID: ca-app-pub-3940256099942544~1458002511
- Interstitial: ca-app-pub-3940256099942544/1033173712

### Deployment Steps

1. **Create EAS Account**
   ```bash
   npx eas login
   ```

2. **Initialize Project**
   ```bash
   npx eas build:configure
   ```

3. **Build for iOS**
   ```bash
   npm run build:mobile
   npx cap sync
   npx eas build --platform ios
   ```

4. **Submit to App Store**
   ```bash
   npx eas submit --platform ios
   ```

### Replace Test AdMob IDs

When ready for production:

1. Create Google AdMob account
2. Generate real App ID and Ad Unit IDs
3. Update in:
   - `capacitor.config.ts` (appId)
   - `app.json` (iosAppId)
   - `client/src/App.tsx` (ad unit IDs)

### Revenue Expectations

- Interstitial ads every 5 customers: $1-5 per 1000 views
- Rewarded ads: Higher rates, user-initiated
- Payment threshold: $100 minimum
- Monthly payments from Google

### App Store Requirements

- Apple Developer Account: $99/year
- App Store Connect access
- Privacy policy (required for ads)
- App Store compliance review

The system is production-ready. EAS Build will handle all iOS compilation in the cloud without requiring Mac hardware or Xcode installation.