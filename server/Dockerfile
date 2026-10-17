# ==============================================================================
# ZIPPY BACKEND DOCKERFILE (Production Multi-Stage)
# Stage 1: Build dependencies & generate Prisma Client
# Stage 2: Hardened, minimal production runner running as non-root 'node'
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for cryptographic/imaging libraries
RUN apk add --no-cache libc6-compat python3 make g++ \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

# Copy monorepo workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Install server workspace dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --filter @zippy/server...

# Copy Prisma schema and generate engine binaries
COPY server/prisma ./server/prisma
RUN pnpm --filter @zippy/server prisma:generate

# Copy server application source
COPY server/src ./server/src

# Isolate production build
RUN pnpm --filter @zippy/server --prod deploy /app/deployed-server

# Ensure generated Prisma client is bundled inside deployed package
WORKDIR /app/deployed-server
COPY --from=builder /app/server/prisma ./prisma
RUN npx prisma generate

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Install runtime utilities
RUN apk add --no-cache wget

# Create application directories and configure non-root ownership
RUN mkdir -p /app/uploads \
    && chown -R node:node /app

# Copy deployed application artifacts from builder
COPY --chown=node:node --from=builder /app/deployed-server ./

# Switch to non-root system user 'node'
USER node

# Expose backend REST API port
EXPOSE 5000

# Container healthcheck targeting Express /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start production API server
CMD ["node", "src/server.js"]
