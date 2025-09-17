# OPSIS - Accessible Online Exam Platform

## Overview

OPSIS is an accessibility-first online exam platform specifically designed for blind and low-vision users. The system provides a comprehensive exam taking and authoring experience with built-in text-to-speech, voice input, screen reader compatibility, and WCAG AA compliance. The platform supports role-based access control for students and instructors, with real-time exam monitoring and secure session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui components for accessibility-first design
- **Styling**: Tailwind CSS with CSS custom properties for theming support
- **State Management**: TanStack Query for server state management with React Hook Form for forms
- **Routing**: Wouter for lightweight client-side routing
- **Accessibility Features**: 
  - Built-in text-to-speech with customizable rates and voices
  - Comprehensive voice control system with global navigation commands
  - Advanced voice input for exam taking with natural language processing
  - Screen reader announcements and ARIA support
  - Keyboard navigation throughout the application
  - Multiple theme options including high-contrast mode
  - Voice commands help guide for user reference

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with strict type checking
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with session-based authentication
- **Session Storage**: PostgreSQL-backed session store for secure session management
- **API Design**: RESTful API with comprehensive error handling and request logging

### Data Layer
- **Database Schema**: 
  - Users table with role-based permissions (student, instructor, admin)
  - Exams table with configurable settings and time limits
  - Questions table supporting multiple question types (multiple choice, true/false, short answer, essay)
  - Attempts table for tracking exam sessions and answers
  - Audit log for security and compliance tracking
- **ORM**: Drizzle with schema validation using Zod for runtime type safety
- **Migrations**: Automated database migrations with version control

### Key Features
- **Exam Authoring**: Rich question editor with support for multiple question types
- **Exam Taking**: Timed exam sessions with auto-save functionality and progress tracking
- **Advanced Voice Control**: Comprehensive voice command system with over 40 voice commands for navigation, exam taking, accessibility controls, and status inquiries
- **Accessibility Tools**: Integrated TTS controls, enhanced voice input with natural language processing, and customizable UI themes
- **Real-time Features**: WebSocket support for live exam monitoring and timer synchronization
- **Offline Support**: Progressive Web App capabilities for offline exam taking

### Security & Compliance
- **Authentication**: Session-based auth with secure cookie handling
- **Audit Logging**: Comprehensive activity tracking for exam integrity
- **Input Validation**: Zod schema validation on both client and server
- **CSRF Protection**: Built-in protection against cross-site request forgery

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless database client
- **drizzle-orm**: Type-safe ORM for PostgreSQL database operations
- **@tanstack/react-query**: Server state management and caching
- **express**: Node.js web application framework
- **@radix-ui/***: Accessible UI primitives for form controls and interactive elements

### Authentication & Session Management
- **firebase**: Firebase Authentication with Google OAuth integration
- **firebase-admin**: Firebase Admin SDK for server-side verification
- **connect-pg-simple**: PostgreSQL session store for Express sessions (fallback)
- **openid-client**: OpenID Connect client for authentication flows (legacy/fallback)
- **passport**: Authentication middleware for Node.js (legacy/fallback)

### Accessibility & User Experience
- **@hookform/resolvers**: Form validation resolvers for React Hook Form
- **react-hook-form**: Performant forms library with built-in validation
- **zod**: Schema validation library for runtime type checking
- **class-variance-authority**: Utility for creating variant-based component APIs
- **tailwindcss**: Utility-first CSS framework with design system support

### Development & Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking for JavaScript
- **esbuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution environment for development

## Recent Changes

### Firebase Authentication Migration (Latest Update)
- Successfully migrated from Replit Auth to Firebase Authentication for better scalability
- Implemented Google OAuth for simplified one-click authentication
- Maintained backward compatibility with existing user database schema
- Created user synchronization system between Firebase and local database
- Added proper error handling for domain authorization and authentication failures
- Updated all authentication components to use Firebase SDK
- Enhanced accessibility support throughout the authentication flow

### Enhanced Voice Control System (Latest Update)
- Implemented comprehensive voice command processing with natural language understanding
- Added global navigation commands for hands-free platform navigation
- Enhanced exam-taking voice controls with 25+ specialized commands
- Created voice commands help page with detailed command reference
- Improved voice input component with context-aware command processing
- Added audio feedback and screen reader integration for all voice actions
- Implemented status inquiry commands for exam progress and time remaining

### Browser APIs Integration
- **Web Speech API**: Native browser text-to-speech and speech recognition with enhanced command processing
- **Web Storage API**: Local storage for offline capabilities and user preferences
- **WebSocket API**: Real-time communication for live exam features

## Voice Control System

### Voice Commands Overview
OPSIS features a comprehensive voice control system designed specifically for blind and low-vision users, providing hands-free navigation and interaction throughout the platform.

### Global Voice Commands
- **Navigation**: "go home", "go to exams", "go to results", "settings", "admin", "help"
- **Reading**: "read page", "stop reading"
- **Accessibility**: "increase font", "decrease font", "reset font", "change theme"

### Exam-Specific Voice Commands
- **Navigation**: "next question", "previous question", "go to question [number]", "first question", "last question"
- **Answer Selection**: "option A/B/C/D/E", "answer true/false", "select [option]", "choose [option]"
- **Actions**: "save answer", "submit exam", "flag question", "unflag question", "clear answer"
- **Reading**: "read question", "read options", "stop reading", "repeat"
- **Status**: "time", "progress", "current question", "total questions", "answered questions", "flagged questions"

### Voice Command Features
- **Natural Language Processing**: Understands command variations and natural speech patterns
- **Context-Aware**: Different command sets for different pages (global vs exam-specific)
- **Audio Feedback**: Voice confirmations and screen reader announcements for all actions
- **Error Handling**: Graceful handling of unrecognized commands with helpful suggestions
- **Help System**: Built-in voice command guide accessible via "help" command

### Accessibility Implementation
- **Screen Reader Integration**: Full ARIA support with live region announcements
- **Keyboard Shortcuts**: Platform-appropriate keyboard navigation (Cmd+key on Mac, Ctrl+key on Windows/Linux)
- **Text-to-Speech**: Customizable speech rates, voice selection, and content reading
- **Visual Indicators**: Clear visual feedback for voice input status and command recognition
- **Persistent Preferences**: User accessibility settings saved across sessions