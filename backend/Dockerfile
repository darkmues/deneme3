FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/

# Non-root user for security
RUN addgroup -g 1001 -S hayat && \
    adduser -S hayat -u 1001 -G hayat
USER hayat

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
