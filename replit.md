# Bank Teller 1988 - 1980s Bank Simulation Game

## Overview

Bank Teller 1988 is a nostalgic simulation game that recreates the experience of working as a bank teller in the 1980s. Players must process customer transactions while detecting fraud and following proper banking procedures in an authentic retro computing environment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom retro theme
- **State Management**: Zustand for game state and audio management
- **Canvas Rendering**: Custom 2D canvas implementation for retro graphics
- **Build Tool**: Vite with custom configuration for GLSL shader support

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Architecture**: Full-stack monorepo structure
- **API**: RESTful endpoints with `/api` prefix
- **Development**: Hot reload with Vite middleware integration

### Mobile Architecture
- **Native Platform**: Capacitor for iOS/Android deployment
- **PWA Support**: Service worker for offline functionality
- **Responsive Design**: Touch-optimized interface with gesture support

## Key Components

### Game Engine
- **Core Logic**: Custom game logic engine (`lib/gameLogic.ts`)
- **Customer Generation**: Procedural customer and document generation system
- **Graphics Rendering**: Retro pixel-art style graphics with CRT effects
- **Audio System**: Web Audio API with Zustand state management

### Customer System
- **Document Validation**: Multi-layered document verification system
- **Fraud Detection**: Signature analysis and suspicious behavior patterns
- **Transaction Types**: Deposits, withdrawals, transfers, wire transfers, money orders

### UI Components
- **Retro Terminal**: Authentic 1980s computer terminal interface
- **Document Viewer**: Interactive document examination system
- **Transaction Console**: Banking operation controls and validation

### Ad Integration
- **AdMob Integration**: Banner and interstitial ads for monetization
- **Test Configuration**: Development-ready with test ad units
- **Cross-Platform**: Works on web, iOS, and Android

## Data Flow

1. **Game Initialization**: Game state initialized with default values
2. **Customer Generation**: Procedural generation of customers with documents
3. **Document Validation**: Multi-step verification process
4. **Transaction Processing**: Banking operations with fraud detection
5. **Score Calculation**: Performance metrics and leaderboard updates
6. **State Persistence**: Local storage for game progress and settings

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **UI Components**: Radix UI primitives with custom styling
- **3D Graphics**: Three.js with React Three Fiber (for advanced effects)
- **Build Tools**: Vite, TypeScript, Tailwind CSS

### Mobile Dependencies
- **Capacitor**: Cross-platform native runtime
- **AdMob**: Google Mobile Ads SDK integration
- **iOS/Android**: Platform-specific native components

### Development Dependencies
- **Database**: Drizzle ORM with PostgreSQL schema (ready for future features)
- **Development**: ESBuild, TSX for server development
- **Linting**: TypeScript strict mode configuration

## Deployment Strategy

### Web Deployment
- **Build Process**: Vite production build with optimization
- **Static Hosting**: Compatible with Vercel, Netlify, or similar platforms
- **PWA Features**: Service worker for offline functionality

### Mobile Deployment
- **EAS Build**: Expo Application Services for cloud-based builds
- **iOS App Store**: Ready for submission with proper configuration
- **Google Play Store**: Android APK generation support

### Revenue Model
- **AdMob Integration**: Banner and interstitial ads
- **Test Environment**: Development-safe with test ad units
- **Production Ready**: Easy configuration swap for live ads

## Changelog
- June 14, 2025: Fixed version synchronization between preview and production web URL
- June 14, 2025: Enhanced iOS-appropriate interface with larger buttons and touch targets
- June 14, 2025: Implemented working bank computer lookup system for document verification
- June 14, 2025: Added manual fraud detection gameplay similar to "Papers Please"
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.