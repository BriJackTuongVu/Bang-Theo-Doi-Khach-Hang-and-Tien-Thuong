#!/bin/bash

# Force Node.js runtime detection
echo "Building Node.js application..."

# Install dependencies
npm ci

# Build the application
npm run build

echo "Build completed successfully"