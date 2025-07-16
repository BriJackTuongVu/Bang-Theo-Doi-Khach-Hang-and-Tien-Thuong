#!/bin/bash
# Build script for Phoenix application compatible with Render
set -e

echo "Building Phoenix application for Render..."

# Install dependencies first
mix deps.get --only prod

# Compile the application
mix compile

# Setup and build assets
mix assets.setup
mix assets.deploy

# Create release
mix phx.digest

echo "Build completed successfully!"