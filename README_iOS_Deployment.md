# Teller's Window - iOS App Store Deployment Guide

## App Information
- **Name**: Teller's Window - 1980s Bank Simulation
- **Category**: Games > Simulation
- **Age Rating**: 4+ (All Ages)
- **Version**: 1.0.0

## Progressive Web App Features
✅ **PWA Manifest** - Configured for full-screen mobile experience
✅ **Service Worker** - Enables offline functionality
✅ **iOS Icons** - All required icon sizes (180x180, 192x192, 512x512)
✅ **Touch Optimized** - Full touch and gesture support
✅ **Responsive Design** - Optimized for iPhone and iPad
✅ **Apple Meta Tags** - Complete iOS integration

## App Store Requirements Met

### Technical Requirements
- ✅ HTTPS deployment required
- ✅ Responsive design for all iOS devices
- ✅ Touch/gesture navigation
- ✅ Offline functionality via service worker
- ✅ App manifest with proper metadata

### Content Guidelines
- ✅ Family-friendly content (4+ rating)
- ✅ No inappropriate content
- ✅ Educational/simulation game mechanics
- ✅ Clear gameplay objectives

### App Store Assets Needed
1. **App Icon**: 1024x1024 (for App Store listing)
2. **Screenshots**: iPhone and iPad screenshots
3. **App Description**: Compelling store description
4. **Keywords**: Relevant App Store keywords
5. **Privacy Policy**: Required for App Store submission

## Deployment Steps

### 1. Build and Deploy
```bash
npm run build
```
Deploy to a secure HTTPS hosting service (Vercel, Netlify, etc.)

### 2. Test PWA Installation
- Open app in iOS Safari
- Tap "Share" button
- Select "Add to Home Screen"
- Verify full-screen launch

### 3. App Store Connect Setup
- Create app listing in App Store Connect
- Upload required assets (icon, screenshots)
- Add app description and metadata
- Submit for review

## App Store Description Template

**Title**: Teller's Window - Retro Bank Simulation

**Subtitle**: Master 1980s banking with authentic fraud detection

**Description**:
Step into a nostalgic 1980s bank teller simulation where every transaction matters. Experience authentic retro computing with green phosphor displays, dot matrix printer sounds, and manual fraud detection systems.

**Features**:
• Authentic 1980s CRT terminal interface
• Real-time fraud detection challenges
• ASMR-quality banking sounds
• Progressive difficulty system
• Leaderboard competition
• Touch-optimized for mobile

**Keywords**: banking, simulation, retro, 1980s, teller, fraud detection, arcade, vintage

## Privacy Policy Requirements
The app processes:
- Game scores (stored locally)
- Player names for leaderboards (stored locally)
- No personal or financial data collection
- No tracking or analytics

## Final Checklist
- [ ] HTTPS deployment active
- [ ] PWA installation tested on iOS
- [ ] All icons displaying correctly
- [ ] Touch navigation working
- [ ] Sound effects functional
- [ ] Offline mode working
- [ ] App Store assets prepared
- [ ] Privacy policy created

## Support
For deployment assistance or App Store submission questions, ensure all PWA features are working correctly in iOS Safari before submission.