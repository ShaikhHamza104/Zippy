# ==============================================================================
# ZIPPY FRONTEND DOCKERFILE (Production Multi-Stage)
# Stage 1: Build React 18 + Vite SPA client
# Stage 2: Hardened Nginx static file & reverse proxy server (non-root 'nginx')
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/

# Install client dependencies
RUN pnpm install --frozen-lockfile --filter @zippy/client...

# Copy client source code and assets
COPY client ./client

# Build optimized production bundle
RUN pnpm --filter @zippy/client build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Install libcap and allow nginx binary to bind to privileged ports (< 1024) as non-root
RUN apk add --no-cache libcap wget \
    && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from builder stage
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy production nginx server configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/templates /etc/nginx/templates

# Configure directory permissions and PID file for non-root execution
RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Run as unprivileged non-root user
USER nginx

# Expose standard web ports
EXPOSE 80 443

# Healthcheck testing frontend index response
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
