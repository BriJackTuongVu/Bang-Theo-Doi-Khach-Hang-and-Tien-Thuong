#!/bin/bash
set -e

echo "=== BUILD SCRIPT FOR NODE.JS APPLICATION ==="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Clean install dependencies
echo "=== Installing dependencies ==="
npm ci

# Build the application
echo "=== Building application ==="
npm run build

echo "=== Build completed successfully! ==="