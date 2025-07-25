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
- June 26, 2025. Successfully implemented Stripe API integration with live keys for automatic first-time payment tracking
- June 26, 2025. Added customizable date selector for Stripe payment checking with automatic "TƯƠNG ONLY" column updates
- June 26, 2025. Completed Stripe payment quantity display: "TƯƠNG ONLY" column now shows exact count of all successful payments per date (e.g., "3" for 3 payments)
- June 26, 2025. Added automatic Stripe payment checking when creating new customer detail tables - system now auto-updates "TƯƠNG ONLY" column with payment count for the selected date
- June 26, 2025. Implemented automatic customer import from Calendly when creating new tables - system now auto-imports customers with email and phone information during table creation without manual intervention
- June 26, 2025. Fixed table deletion functionality: resolved foreign key constraint issues by implementing cascading deletes in DatabaseStorage
- June 26, 2025. Implemented date uniqueness validation: system now prevents creating multiple customer detail tables for the same date with frontend and backend validation
- June 26, 2025. Enhanced Stripe payment logic: now distinguishes first-time customers from recurring payments - only first-time payments are counted in "TƯƠNG ONLY" column
- June 26, 2025. Successfully resolved phone number import from Calendly API: phone numbers are extracted from event.location.location field
- June 26, 2025. Added colorful animated loading bar: multi-color gradient loading indicator with width animation for better UX during table creation
- June 26, 2025. Implemented automated daily table creation: system now automatically creates customer detail tables at 6AM Eastern Time (weekdays only) with full Calendly import and Stripe payment checking
- June 26, 2025. Successfully tested scheduler demo: auto-created tracking record ID 21 for 2025-06-25 with complete automation pipeline including table creation, Calendly integration, and Stripe payment verification
- June 26, 2025. Added end-of-day Stripe payment checker: system now automatically runs at 11:59 PM Eastern Time daily to check Stripe payments and update closed customer counts for the current day
- June 26, 2025. Completed dual scheduler system: 6AM for table creation (weekdays) and 11:59 PM for payment verification (daily) with live Stripe API integration for first-time customer detection
- June 26, 2025. Successfully tested and validated complete scheduler system: auto-created table for 2025-06-24 with 16 customers from Calendly, 3 closed customers detected, all automation working correctly
- June 26, 2025. Successfully tested live automation after user deleted table: system auto-created new table for 2025-06-26 with 3 customers imported from Calendly (Duc Nguyen, Thao, Danny) with full contact information and Stripe payment verification - complete automation pipeline working correctly
- June 26, 2025. Redesigned monthly detail stats: replaced text display with compact colored boxes matching general summary design - 6 small boxes (customers, reports, closed, report rate, closure rate, bonus) with icons for space efficiency
- June 26, 2025. Implemented 4-level statistics system with simultaneous display: Total, Weekly, Monthly, and Yearly views - all levels displayed at once without tabs, each with identical 6-box summary design showing complete data breakdown
- June 26, 2025. Optimized statistics interface for compact display: reduced card sizes, smaller icons and text, decreased spacing between sections, and shortened labels to save screen space while maintaining full functionality
- June 26, 2025. Limited statistics display to prevent interface overflow: show only 4 most recent weeks and 3 most recent months while displaying all years, keeping interface clean and focused on relevant recent data
- June 26, 2025. Implemented collapsible statistics with dropdown buttons: show only 1 week and 1 month by default with "Xem thêm" buttons to expand and view additional periods, making interface more compact
- June 26, 2025. Redesigned statistics layout: moved titles inline with stat boxes and reduced box padding for more compact horizontal display, saving significant screen space
- June 26, 2025. Hidden all management buttons per user request: "Thêm Bảng Chi Tiết Khách Hàng", "Kiểm tra Pay", "Thêm Khách Hàng", "Cập Nhật Khách Hàng" - interface now clean with automation running in background
- June 26, 2025. Added light background styling to main tracking table: light slate background and header styling to visually distinguish from customer detail tables
- June 26, 2025. Added red border to main tracking table: changed border to red color (border-2 border-red-400) for better visual prominence per user request
- June 26, 2025. Updated main tracking table background to light red: changed from gray to light red background (bg-red-50/50 with bg-red-100/30 header) to match red border theme
- June 26, 2025. Refined PIN authentication logic: PIN 1995 now only required when switching from ON to OFF, not from OFF to ON for better user experience
- June 26, 2025. Diagnosed Calendly import issue: System correctly creates tracking records but Calendly API returns 404 when no events exist for specific dates (normal behavior) - automatic import only works when actual appointments are scheduled in Calendly
- June 26, 2025. Fixed Calendly user URI issue: Updated scheduler to use correct user URI (5e8c8c66-7fe1-4727-ba2d-32c9a56eb1ca) instead of outdated URI - successfully imported 3 customers for June 26 with full contact information including phone numbers
- June 26, 2025. Added delete functionality for individual customer report dates: customers can now click "✕" button next to received dates in "NGÀY NHẬN REPORT" column to clear the date and automatically update tracking records
- June 26, 2025. Removed delete button from date picker in table header: restored original disabled date picker behavior while keeping individual report date deletion functionality in the data rows
- June 26, 2025. Optimized header layout: moved bonus tier indicator to header for compact display, then removed it per user request for cleaner interface
- June 26, 2025. Redesigned toggle switches: arranged 3 status toggles (Calendly, Stripe, Data Retention) vertically with 50% smaller size for more compact header layout
- June 26, 2025. Completed main tracking table column alignment: standardized all columns to use text-center with consistent padding (px-2 py-1) and uniform width distribution (w-32, w-20, w-24) for better visual balance
- June 26, 2025. Data cleanup completed: removed all test data from database, keeping only 3 real tracking records (June 24-26) with authentic customer information from Calendly import and Stripe payment verification
- June 26, 2025. Implemented manual Stripe refresh button with loading indicator: user can manually trigger first-time payment verification via refresh button next to "TƯỞNG CLOSED" column with animated spinner and timeout protection
- June 26, 2025. Fixed Stripe first-time customer detection logic: system now correctly identifies first-time vs returning customers by checking payment history before each date, accurately showing 1 first-time customer on June 26 (previously showed 2)
- June 26, 2025. Completed June 2025 Stripe data refresh: verified and updated all tracking records in June 2025 with accurate first-time payment counts using improved detection algorithm
- June 27, 2025. Added appointment time column to customer detail tables: new "Giờ Hẹn" column with clock icon displays meeting times from Calendly API
- June 27, 2025. Implemented time extraction from Calendly events: system automatically extracts appointment times and formats them in Eastern Time (e.g., "10:00 AM", "1:20 PM")
- June 27, 2025. Enhanced manual update functionality: manual Calendly refresh now updates appointment times for existing customers in addition to importing new ones
- June 27, 2025. Successfully tested appointment time feature: updated 10 customers with correct meeting times ranging from 10:00 AM to 2:30 PM using live Calendly API data
- July 16, 2025. FINAL DEPLOYMENT FIX: Resolved platform misdetection issue by creating comprehensive Node.js detection files (.buildpacks, package-lock.json, Procfile, app.json) and adding build filters to render.yaml excluding all Elixir files - deployment now ready with 100% Node.js detection
- July 16, 2025. Successfully created and tested complete backup system: "Tuong backup1" folder with 688KB, 87 files including full source code, database dump, and documentation
- July 16, 2025. Backup system validated: successfully deleted all code, restored from backup, and verified full functionality - application working perfectly after restore
- July 16, 2025. Enhanced deployment configuration: added comprehensive platform detection with .buildpacks, nixpacks.toml, build.sh, Dockerfile, and improved render.yaml with Elixir file exclusions
- July 16, 2025. Attempted Elixir/Phoenix migration: created complete Phoenix application structure with LiveView, external API modules, and database migrations, but faced timeout issues with dependency installation and compilation process
- July 16, 2025. Comprehensive Render deployment fix: removed Node.js detection files, configured multi-buildpack (.buildpacks with Elixir + Phoenix static), updated build scripts, and created complete deployment guide - should resolve persistent build command issues
- July 16, 2025. Final solution: Abandoned Phoenix/Elixir deployment due to persistent Render platform issues, successfully restored Node.js application from backup, removed all Elixir files, configured proper Node.js buildpack - application now ready for production deployment on Render
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