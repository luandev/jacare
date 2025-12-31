# Multi-stage build for Jacare server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/web ./apps/web
COPY tsconfig.base.json ./

# Build only the workspaces needed for the server (shared, server, web)
# Desktop is not needed for the Docker server image
RUN npm run build -w @crocdesk/shared && \
    npm run build -w @crocdesk/server && \
    npm run build -w @crocdesk/web

# Production stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S jacare && \
    adduser -u 1001 -S jacare -G jacare

WORKDIR /app

# Copy package files for workspace resolution
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Copy package.json files for runtime (needed for workspace resolution)
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/


# Copy entrypoint script
COPY apps/server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data and downloads directories and set ownership
RUN mkdir -p /data /downloads && \
    chown -R jacare:jacare /app /data /downloads

# Expose port
EXPOSE 3333

# Set environment variables
ENV NODE_ENV=production
ENV CROCDESK_PORT=3333
ENV CROCDESK_DATA_DIR=/data
ENV CROCDESK_USE_ABSOLUTE_PATHS=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3333/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER jacare

# Start server
WORKDIR /app/apps/server
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]

