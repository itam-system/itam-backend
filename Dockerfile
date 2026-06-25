# Stage 1: Build dependency installation and NestJS compilation
FROM node:20-alpine AS builder

# Install build dependencies required by Prisma engine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Copy package files and prisma config for dependency caching
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client (crucial for both build and runtime)
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Production Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /usr/src/app
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

# Install only production dependencies and generate prisma client
RUN npm ci --omit=dev && npx prisma generate

# Stage 3: Runtime container copy, non-root user setup, and container run command
FROM node:20-alpine AS runner

# Create app directory
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Install runtime dependencies for Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy built application and generated client/dependencies from previous stages
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/prisma ./prisma

# Use a non-root user for security
USER node

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/src/main.js"]
