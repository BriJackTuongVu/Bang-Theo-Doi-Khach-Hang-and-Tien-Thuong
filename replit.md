# Customer Tracking & Bonus System

## Overview

This is a Vietnamese customer tracking and bonus calculation application built with React, Express.js, and PostgreSQL. The application allows users to track daily customer appointments and reports, automatically calculate bonuses based on performance tiers, and integrate with external services like Calendly and Stripe for comprehensive business management.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Database**: PostgreSQL with Drizzle ORM
- **ORM**: Drizzle ORM for type-safe database operations
- **Driver**: Neon Database serverless driver for PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage class for development/testing

## Key Components

### Database Schema
- **tracking_records**: Main tracking table with daily customer counts and payment status
- **customer_reports**: Detailed customer information with appointment times and report status
- **stripe_payments**: Payment tracking with first-time payment flags
- **settings**: Application configuration storage

### Bonus Calculation System
- **Three-tier system**: 30%, 50%, 70% thresholds with corresponding bonus rates
- **Automatic calculation**: Based on reported vs scheduled customer ratios
- **Visual indicators**: Color-coded tier display with icons

### External Integrations
- **Calendly API**: Automatic appointment import with OAuth2 authentication
- **Stripe API**: Payment tracking and first-time customer identification
- **Google Calendar**: Optional calendar integration for appointment management

### API Endpoints
- `GET /api/tracking-records` - Fetch all tracking records
- `POST /api/tracking-records` - Create new tracking record
- `GET /api/customer-reports` - Fetch customer reports
- `POST /api/customer-reports` - Create new customer report
- `POST /api/calendly/import` - Import Calendly appointments
- `POST /api/stripe/payments` - Process Stripe payment data

## Data Flow

1. **Daily Record Creation**: Automated scheduler creates tracking records at 6 AM Eastern Time (weekdays only)
2. **Customer Data Entry**: Manual entry or Calendly import populates customer reports
3. **Bonus Calculation**: Real-time calculation based on completion ratios
4. **Payment Tracking**: Stripe integration tracks first-time payments
5. **Statistics Generation**: Aggregated reporting for daily, weekly, monthly, and yearly views

## External Dependencies

- **Calendly API**: For appointment synchronization
- **Stripe API**: For payment processing and tracking
- **Google OAuth2**: For calendar integration
- **Neon Database**: For serverless PostgreSQL hosting

## Deployment Strategy

- **Platform**: Configured for Replit deployment with Railway/Render compatibility
- **Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `CALENDLY_API_TOKEN`: Calendly API authentication
  - `STRIPE_SECRET_KEY`: Stripe backend integration
  - `VITE_STRIPE_PUBLIC_KEY`: Stripe frontend integration
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Health Checks**: `/health` endpoint for deployment monitoring
- **Automated Scheduling**: Node-cron for daily record creation and payment checks

### Security Features
- **PIN Protection**: 1995 PIN system for application access
- **Session Management**: Express session handling
- **Input Validation**: Zod schema validation for all inputs
- **CORS Protection**: Configured for production environment

### Performance Optimizations
- **Query Optimization**: Efficient database queries with proper indexing
- **Caching**: React Query caching for reduced API calls
- **Lazy Loading**: Component-level code splitting
- **Compressed Assets**: Optimized build output