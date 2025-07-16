FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port (Railway will set PORT env var, default to 5000)
EXPOSE $PORT
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]