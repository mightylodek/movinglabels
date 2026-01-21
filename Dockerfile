FROM node:20-alpine

# Install necessary dependencies for Playwright and better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for Playwright postinstall)
RUN npm install

# Copy application files
COPY . .

# Create data directory and subdirectories
RUN mkdir -p /app/data/images /app/data/backups

# Set proper permissions
RUN chmod -R 755 /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/config', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
