#!/bin/bash
# Start script for Phoenix application compatible with Render
set -e

echo "Starting Phoenix application on Render..."

# Run database migrations
mix ecto.migrate

# Start Phoenix server on port specified by Render
PORT=${PORT:-4000} mix phx.server