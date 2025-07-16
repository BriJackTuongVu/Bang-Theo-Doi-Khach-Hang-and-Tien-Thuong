#!/bin/bash
# Start script for Phoenix application
set -e

echo "Starting Phoenix application..."

# Run database migrations
mix ecto.migrate

# Start Phoenix server
mix phx.server