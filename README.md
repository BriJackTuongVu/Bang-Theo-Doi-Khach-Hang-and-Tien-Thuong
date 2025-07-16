# Vietnamese Customer Tracking Application

A Node.js application for tracking customer appointments and calculating bonuses.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js + React
- **Database**: PostgreSQL
- **APIs**: Calendly API, Stripe API
- **Build Tool**: Vite + TypeScript

## Deployment

This application is designed to run on Render.com with Node.js runtime.

### Build Command
```bash
npm ci && npm run build
```

### Start Command
```bash
npm run start
```

### Environment Variables Required
- `NODE_ENV=production`
- `DATABASE_URL`
- `CALENDLY_API_TOKEN`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLIC_KEY`

## Features

- Customer appointment tracking
- Automated Calendly integration
- Stripe payment monitoring
- Bonus calculation system
- Scheduled automation tasks