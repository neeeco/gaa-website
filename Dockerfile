FROM node:18-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# First install Playwright and browser as root
COPY package*.json ./
RUN npm ci && \
    npx playwright install chromium && \
    npx playwright install-deps

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Set ownership of the app directory
RUN chown -R node:node /app \
    && chmod -R 755 /app \
    && mkdir -p /home/node/.cache \
    && chown -R node:node /home/node

# Switch to non-root user
USER node

# Copy source code with correct ownership
COPY --chown=node:node . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the server
CMD ["npm", "start"] 