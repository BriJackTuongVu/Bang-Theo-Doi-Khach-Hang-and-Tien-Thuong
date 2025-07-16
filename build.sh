#!/bin/bash
# Build script for Phoenix application
set -e

echo "Building Phoenix application..."

# Install dependencies
mix deps.get --only prod

# Compile the application
mix compile

# Setup and build assets
mix assets.deploy

# Create release
mix phx.digest

echo "Build completed successfully!"