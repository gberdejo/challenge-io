# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy shared source code
COPY apps/issuer-api ./apps/issuer-api

# Build the issuer-api application
RUN npm run build issuer-api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist/apps/issuer-api ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
