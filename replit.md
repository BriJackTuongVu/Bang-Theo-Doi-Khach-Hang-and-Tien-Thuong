# Customer Tracking & Bonus System

## Overview

This is a Vietnamese customer tracking and bonus calculation application built with React, Express.js, and PostgreSQL. The application allows users to track daily customer appointments and reports, automatically calculating bonuses based on performance tiers. It's designed for Vietnamese-speaking users in a customer service environment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom component library (shadcn/ui)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with structured error handling
- **Middleware**: Request logging and JSON parsing
- **Development**: TSX for TypeScript execution in development

### Data Storage Solutions
- **Database**: PostgreSQL 16 (configured via Replit modules)
- **ORM**: Drizzle ORM for type-safe database operations
- **Driver**: Neon Database serverless driver for PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage class for development/testing

## Key Components

### Database Schema
- **tracking_records** table with fields:
  - `id`: Serial primary key
  - `date`: Date field for tracking daily records
  - `scheduled_customers`: Integer count of scheduled appointments
  - `reported_customers`: Integer count of completed reports
- **Bonus Calculation Logic**: Three-tier system (30%, 50%, 70% thresholds) with corresponding bonus rates

### API Endpoints
- `GET /api/tracking-records` - Fetch all tracking records
- `GET /api/tracking-records/:id` - Fetch single record by ID
- `POST /api/tracking-records` - Create new tracking record
- Input validation using Zod schemas

### UI Components
- **TrackingTable**: Main data entry and display interface
- **BonusTierIndicator**: Visual representation of bonus tiers
- **SummaryStats**: Aggregate statistics display
- Complete shadcn/ui component library for consistent styling

## Data Flow

1. **User Input**: Users enter daily customer data through the tracking table
2. **Client Validation**: Zod schemas validate data on both client and server
3. **API Communication**: TanStack Query manages API calls and caching
4. **Server Processing**: Express routes handle CRUD operations
5. **Database Storage**: Drizzle ORM manages PostgreSQL interactions
6. **Real-time Updates**: Query invalidation ensures UI stays synchronized
7. **Bonus Calculation**: Automatic calculation based on predefined tiers

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing library
- **zod**: Schema validation library

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwind-css**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Frontend build tool and dev server

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20, Web, and PostgreSQL 16 modules
- **Dev Server**: Vite dev server with HMR on port 5000
- **Database**: PostgreSQL instance managed by Replit
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Replit autoscale deployment target
- **Port Configuration**: External port 80 mapped to internal port 5000

### Build Commands
- `npm run dev`: Development server with file watching
- `npm run build`: Production build for both frontend and backend
- `npm run start`: Production server startup
- `npm run db:push`: Database schema deployment

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
- June 25, 2025. Attempted Google Calendar API integration but faced OAuth verification requirements
- June 25, 2025. Implemented alternative Google Calendar import via manual copy-paste workflow
- June 25, 2025. Attempted OCR image processing but faced OpenAI API quota limits
- June 25, 2025. Created manual image-to-text workflow as alternative solution
- June 25, 2025. Successfully implemented Calendly API integration with token management
- June 25, 2025. Simplified interface by removing import/upload buttons and adding table deletion feature
- June 25, 2025. Added automatic data synchronization from customer reports to main tracking table
- June 25, 2025. Enhanced auto-sync to update closed customers when reportReceivedDate is set
- June 25, 2025. Migrated from MemStorage to DatabaseStorage for persistent data storage
- June 25, 2025. Implemented working auto-sync: when report received date is entered, REPORT column updates automatically
- June 25, 2025. Removed "HÀNH ĐỘNG" (delete) column from tracking table per user request
- June 25, 2025. Added auto-creation of tracking records when new customer tables are created
- June 25, 2025. Implemented strict relationship: tracking records only exist when corresponding customer detail tables exist
- June 25, 2025. Added automatic synchronization: tracking records auto-sync with customer tables without manual intervention
- June 26, 2025. Successfully implemented Calendly API integration with full event import functionality
- June 26, 2025. Added database setting to prevent automatic deletion of old data per user request
- June 26, 2025. Implemented bidirectional sync: deleting customer table also deletes corresponding tracking record
- June 26, 2025. Fixed customer ordering issue: customers now maintain original positions when report dates are updated
- June 26, 2025. Resolved table deletion bug: can now delete the last remaining customer table
- June 26, 2025. Completed sequential numbering removal: eliminated all remaining numbers from interface including table titles
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Development approach: Must ask user permission before creating new solutions or features. Only implement after user approval.
Image processing: User requested OCR functionality to extract customer names from uploaded images.
Interface simplification: User requested removal of import and upload buttons, addition of table deletion functionality.
Auto-sync preference: User wants automatic synchronization between customer detail tables and main tracking table without manual buttons.
Data retention: User requested to preserve old data in database - no automatic deletion of memory/historical records.
```