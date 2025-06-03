# iOS Deployment Checklist - Bank Teller 1988

## EAS Build Setup Complete ✓

Your game is now ready for iOS App Store deployment without requiring a Mac computer.

## Next Steps to Deploy

### 1. Create Required Accounts
- **Expo Account**: Sign up at expo.dev (free)
- **Apple Developer**: $99/year at developer.apple.com
- **Google AdMob**: Free at admob.google.com

### 2. Initialize EAS Project
```bash
npx eas login
npx eas build:configure
```

### 3. Build iOS App
```bash
npx eas build --platform ios --profile production
```
This builds your app in the cloud using Apple's infrastructure.

### 4. Submit to App Store
```bash
npx eas submit --platform ios
```

## AdMob Revenue Setup

### Current Configuration
- Test ad units are configured for development
- Interstitial ads trigger every 5 customers
- Rewarded ads available for bonus points

### For Production Revenue
Replace test IDs in these files with your real AdMob IDs:
- `capacitor.config.ts`
- `app.json` 
- `client/src/App.tsx`

## Revenue Potential
- 1000 ad views = $1-5 revenue
- Monthly payments from Google
- $100 minimum payment threshold

## Files Created
- `capacitor.config.ts` - iOS app configuration
- `eas.json` - Build profiles for cloud builds
- `app.json` - App metadata and AdMob settings
- iOS project in `ios/` directory

The system handles all iOS compilation remotely. No Xcode or Mac hardware required.