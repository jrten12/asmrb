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
- June 21, 2025: COMPLETE REBUILD - Recreated correct Bank Teller 1988 fraud detection game from specifications
- June 21, 2025: IMPLEMENTED full terminal command system (LOOKUP, VERIFY, COMPARE SIGNATURE, APPROVE/REJECT)
- June 21, 2025: ADDED 35% fraud rate with document mismatches for manual "Papers Please" style detection
- June 21, 2025: CREATED draggable popup document viewers (350x550px) with bank records comparison
- June 21, 2025: RESTORED customer patience system with visual timer and timeout consequences
- June 21, 2025: IMPLEMENTED fraud termination system (2 fraudulent approvals = game over)
- June 21, 2025: ADDED comprehensive ASMR sound system using Web Audio API
- June 21, 2025: BUILT mobile-friendly interface with command shortcut buttons
- June 19, 2025: ENHANCED popups to 350x550px draggable windows with touch/finger support
- June 19, 2025: ADDED bank computer records display in ALL document popups for easy fraud comparison
- June 19, 2025: REMOVED all CRT effects and scanlines for crisp, readable interface
- June 19, 2025: INCREASED text size and boldness throughout interface for better readability
- June 19, 2025: IMPLEMENTED popup document viewers (320x350px) that appear on right side when documents are clicked
- June 19, 2025: Added comprehensive ASMR sounds for each function (paper shuffle, stamp, cash register, typing, keypad clicks)
- June 19, 2025: Enhanced transaction processing with fraud consequences - approving fraud leads to termination after 2 strikes
- June 19, 2025: Fixed customer document layout spillover with 38vh height and 2-column grid (120px cards)
- June 19, 2025: Implemented working Web Audio API sounds (typing clicks, cash register, error buzz, keypad beeps)
- June 19, 2025: Enhanced VERIFY command with complete bank record comparison (signatures, addresses, DOB, license numbers)
- June 19, 2025: Added real fraud detection - 50% of customers have document mismatches for manual detection
- June 19, 2025: APPROVE/REJECT buttons now process transactions with fraud consequences (termination after 2 fraud approvals)
- June 18, 2025: PERMANENT FIX - Customer documents display locked at 70vh height with 320px document cards, preventing reversion to unusable compact view
- June 18, 2025: Enhanced VERIFY command to show complete bank records (DL number, DOB, address, ID number) for manual fraud detection
- June 18, 2025: Removed all automatic fraud indicators - system never flags fraud, player must spot mismatches manually like "Papers Please"
- June 17, 2025: MAJOR FIX - Expanded customer documents section from 35vh to 60vh for proper document examination (critical for fraud detection gameplay)
- June 17, 2025: Added popup numeric keypad for LOOKUP commands instead of manual typing (mobile-friendly with large touch buttons)
- June 17, 2025: Fixed desktop/mobile version consistency with standardized viewport container (position: fixed, 100vw/100vh)
- June 17, 2025: Compressed UI elements (scorebox, transaction summary) to maximize document viewing space
- June 17, 2025: Enhanced VERIFY command explanation (signature comparison for fraud detection)
- June 17, 2025: Fixed terminal display to fit on mobile screens (50vh height, proper word wrapping, compact output format)
- June 17, 2025: Restored authentic ASMR sound effects using Web Audio API (typing, cash register, error buzz)
- June 17, 2025: Enhanced LOOKUP system to require manual account number entry with database simulation sounds
- June 17, 2025: Added mobile-friendly touch buttons and smart autocomplete for terminal commands (L=lookup, V=verify, A=approve, R=reject)
- June 17, 2025: Enhanced mobile experience with large touch targets (15px padding, 16px font) and color-coded command buttons
- June 17, 2025: CRITICAL FIX - Restored complete Bank Teller 1988 game functionality after preview loading issues
- June 17, 2025: Full manual fraud detection gameplay now working (customer generation, document verification, terminal commands)
- June 17, 2025: Canvas document rendering system operational (ID cards, signatures, bank books, transaction slips)
- June 17, 2025: Production AdMob integration maintained through restoration (ca-app-pub-2744316013184797)
- June 17, 2025: Game ready for iOS App Store deployment with EAS build system
- June 17, 2025: Integrated production AdMob IDs (ca-app-pub-2744316013184797) for live monetization
- June 17, 2025: Added comprehensive error handling for web and native environments
- June 14, 2025: Fixed iOS build dependencies - replaced expo-ads-admob with react-native-google-mobile-ads
- June 14, 2025: Resolved import issues and component file paths for successful compilation
- June 14, 2025: Fixed version synchronization between preview and production web URL
- June 14, 2025: Enhanced iOS-appropriate interface with larger buttons and touch targets
- June 14, 2025: Implemented working bank computer lookup system for document verification
- June 14, 2025: Added manual fraud detection gameplay similar to "Papers Please"
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.