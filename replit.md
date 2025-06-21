# Bank Teller 1988 - Replit Development Guide

## Overview

Bank Teller 1988 is a nostalgic 1980s bank teller simulation game built as a Progressive Web App (PWA) with mobile deployment capabilities. The game features retro terminal aesthetics, fraud detection mechanics, and authentic banking operations simulation. It's designed for both web browsers and mobile app stores with integrated AdMob monetization.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom retro terminal theme
- **UI Components**: Radix UI primitives for accessible components
- **State Management**: Zustand for game state and audio management
- **3D Graphics**: React Three Fiber for enhanced visual effects

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Development**: Hot Module Replacement (HMR) via Vite integration
- **API**: RESTful endpoints with `/api` prefix
- **Storage**: In-memory storage with interface for database integration

### Mobile Architecture
- **Cross-Platform**: Capacitor for iOS and Android deployment
- **PWA Features**: Service worker, manifest, offline functionality
- **Native Integration**: AdMob for monetization, splash screen

## Key Components

### Game Engine
- **Core Logic**: Customer generation, document validation, fraud detection
- **Audio System**: Web Audio API with fallback sound effects
- **Graphics**: Canvas-based rendering with CRT monitor effects
- **Game Loop**: Real-time customer patience and timer management

### Customer System
- **Dynamic Generation**: Randomized customer profiles with authentic 1980s data
- **Document Validation**: ID cards, bank books, transaction slips, signatures
- **Fraud Detection**: Multi-layered suspicious activity detection
- **Patience System**: Time-based customer behavior simulation

### Terminal Interface
- **Retro Aesthetics**: Green phosphor text, scanline effects, CRT glow
- **Interactive Elements**: Clickable buttons, document examination
- **Status Displays**: Score tracking, time management, error monitoring
- **Feedback Systems**: Visual and audio confirmation of actions

### Mobile Features
- **Touch Optimization**: Full gesture support for mobile devices
- **Responsive Design**: Adaptive layouts for all screen sizes
- **PWA Installation**: Add to home screen functionality
- **Offline Mode**: Service worker caching for core functionality

## Data Flow

### Game State Management
1. **Initialization**: Game phase transitions (punch_in → working → game_over)
2. **Customer Flow**: Generation → Document Review → Transaction Processing
3. **Validation Pipeline**: Document analysis → Fraud detection → Decision making
4. **Score Calculation**: Performance metrics, error tracking, time management

### Document Processing
1. **Document Generation**: Create realistic banking documents with potential errors
2. **Signature Analysis**: Compare customer signatures for authenticity
3. **Account Verification**: Validate account numbers and balances
4. **Transaction Validation**: Check amounts, destinations, and limits

### Audio Integration
1. **Sound Loading**: Preload audio files with error handling
2. **Context Management**: Web Audio API initialization
3. **Effect Triggering**: Contextual sound effects for user actions
4. **Volume Control**: Mute/unmute functionality with state persistence

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Query
- **UI Libraries**: Radix UI components, Tailwind CSS
- **Development Tools**: Vite, TypeScript, ESBuild
- **3D Graphics**: Three.js, React Three Fiber, Drei

### Mobile Dependencies
- **Capacitor**: Core, iOS, Android, CLI
- **AdMob Integration**: Google Mobile Ads SDK
- **Splash Screen**: Capacitor splash screen plugin

### Database Integration
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon Database serverless driver
- **Schema**: User management and game statistics

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts Express server with Vite HMR
- **Port Configuration**: Port 5000 for local development
- **Hot Reloading**: Automatic refresh for both client and server changes

### Web Deployment
- **Build Process**: Vite builds optimized static assets
- **Static Hosting**: Compatible with Vercel, Netlify, or similar platforms
- **PWA Features**: Service worker registration, manifest configuration

### Mobile Deployment
- **iOS**: EAS Build for cloud-based compilation without Mac requirement
- **Android**: Capacitor Android builds with Google Play Store deployment
- **Code Signing**: Automated through EAS Build service
- **App Store Assets**: Icons, screenshots, metadata prepared

### Cloud Deployment
- **Platform**: Google Cloud Run for serverless deployment
- **Container**: Docker-based deployment with Node.js runtime
- **Scaling**: Automatic scaling based on demand
- **Database**: PostgreSQL via Neon Database

## Changelog

Changelog:
- June 21, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.