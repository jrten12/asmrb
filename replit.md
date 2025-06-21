# Bank Teller 1988 - Replit Guide

## Overview

Bank Teller 1988 is a nostalgic 1980s bank teller simulation game built as a Progressive Web App (PWA) with mobile deployment capabilities. The game features authentic retro computing interactions, customer service mechanics, fraud detection gameplay, and monetization through advertising. Players take on the role of a bank teller in 1988, processing customer transactions while detecting fraudulent activities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom retro green CRT styling
- **Build Tool**: Vite for development and production builds
- **UI Components**: Radix UI component library for accessible components
- **3D Graphics**: React Three Fiber with Three.js for 3D elements
- **State Management**: Zustand for game state and audio management
- **PWA Support**: Service worker and web app manifest for offline functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **API Design**: RESTful API structure (currently minimal, extensible)
- **Development**: Hot module replacement with Vite integration

### Mobile Deployment
- **Capacitor**: Native iOS app wrapper with AdMob integration
- **EAS Build**: Expo Application Services for cloud-based iOS builds
- **Native Features**: Splash screen, AdMob advertising, iOS app store optimization

## Key Components

### Game Engine
- **Customer Generation**: Procedural customer creation with fraud detection mechanics
- **Transaction Processing**: Multiple transaction types (deposits, withdrawals, transfers, wire transfers)
- **Document Validation**: ID verification, signature analysis, bankbook validation
- **Scoring System**: Performance tracking with leaderboards and time management

### Audio System
- **Sound Effects**: Retro typing, cash register, and office sounds
- **Background Music**: Optional atmospheric audio
- **Mobile Optimization**: Web Audio API fallbacks for mobile devices

### Graphics and UI
- **Retro Aesthetic**: Green CRT monitor styling with scanlines and phosphor effects
- **Responsive Design**: Mobile-first approach with touch-optimized controls
- **Document Rendering**: Canvas-based document display system
- **Animation System**: CSS animations for police arrests and game events

### Monetization
- **AdMob Integration**: Interstitial ads every 5 customers served
- **Rewarded Ads**: Optional ads for bonus points
- **App Store Deployment**: iOS App Store revenue potential through EAS Build

## Data Flow

### Game Loop
1. **Customer Generation**: Random customer with transaction requirements and fraud indicators
2. **Document Review**: Player examines ID, bankbook, and transaction slips
3. **Decision Making**: Approve/reject transactions based on fraud detection
4. **Scoring**: Points awarded for correct decisions, penalties for errors
5. **Progression**: Increasing difficulty with more complex fraud patterns

### State Management
- **Game State**: Current phase, customer queue, score, and timing
- **Audio State**: Sound effects, background music, and mute controls
- **Persistent Data**: High scores stored in localStorage
- **Mobile State**: Touch interaction and orientation handling

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Three Fiber
- **UI Framework**: Radix UI components, Tailwind CSS
- **Build Tools**: Vite, TypeScript, ESBuild
- **Database**: Drizzle ORM, Neon Database (PostgreSQL)
- **Mobile**: Capacitor, AdMob plugin

### Development Tools
- **Linting**: TypeScript compiler checks
- **Styling**: PostCSS, Autoprefixer
- **Assets**: GLTF/GLB 3D models, audio files, fonts

### External Services
- **Database**: Configured for PostgreSQL (Neon Database)
- **AdMob**: Google Mobile Ads for iOS monetization
- **EAS Build**: Expo cloud build services for iOS deployment
- **App Store**: iOS App Store distribution

## Deployment Strategy

### Web Deployment
- **Build Process**: Vite builds optimized production bundle to `dist/public`
- **PWA Features**: Service worker, manifest, offline caching
- **Static Hosting**: Compatible with Vercel, Netlify, or similar platforms
- **HTTPS Required**: For PWA features and iOS web app functionality

### iOS App Store Deployment
- **EAS Build**: Cloud-based iOS app compilation without Mac requirement
- **AdMob Setup**: Test ads configured, production IDs need replacement for revenue
- **App Store Assets**: Icons, screenshots, and metadata prepared
- **Revenue Model**: Ad-supported with $1-5 per 1000 views potential

### Development Environment
- **Replit Integration**: Configured for Replit's Node.js environment
- **Hot Reload**: Vite development server with fast refresh
- **Port Configuration**: Runs on port 5000 with external port 80 mapping
- **Database**: Drizzle migrations and PostgreSQL connection ready

## Changelog
- June 21, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.