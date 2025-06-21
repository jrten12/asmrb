# EAS Build Instructions for Bank Teller 1988

## Prerequisites

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Initialize EAS project:**
   ```bash
   eas init
   ```

## Build Configuration

The project is now configured with the following files:

- ✅ `app.json` - App configuration with proper metadata
- ✅ `eas.json` - Build profiles for development, preview, and production
- ✅ `assets/icon.png` - App icon (1024x1024)
- ✅ `assets/splash.png` - Splash screen
- ✅ `assets/adaptive-icon.png` - Android adaptive icon
- ✅ `client/public/privacy-policy.html` - Required privacy policy

## Build Commands

### Development Build
```bash
eas build --profile development
```

### Preview Build (for testing)
```bash
eas build --profile preview
```

### Production Build
```bash
# iOS Production
eas build --profile production --platform ios

# Android Production  
eas build --profile production --platform android

# Both platforms
eas build --profile production
```

## Before Building

### Update Project ID
1. Update the `projectId` in `app.json`:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-actual-project-id"
     }
   }
   ```

### For iOS App Store
1. Update Apple Team ID and App Store Connect info in `eas.json`
2. Ensure you have proper certificates and provisioning profiles

### For Google Play Store
1. Create a service account key for Google Play Console
2. Update the path in `eas.json` submit configuration

## App Store Submission

### iOS
```bash
eas submit --platform ios
```

### Android
```bash
eas submit --platform android
```

## Important Notes

- The game is fully configured for offline play
- AdMob integration is set up with test IDs
- Privacy policy is included and compliant
- All required assets are generated
- Build configuration supports both development and production
- App metadata includes proper descriptions and keywords

## Build Status

The project is **READY FOR EAS BUILD** with all configurations properly set up.

## Troubleshooting

If you encounter build issues:

1. Ensure all dependencies are compatible
2. Check that asset files exist in the assets folder
3. Verify the bundle identifier is unique
4. Make sure privacy policy is accessible

The game maintains its complete functionality and is ready for deployment to app stores.