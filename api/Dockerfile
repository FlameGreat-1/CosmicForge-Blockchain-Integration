FROM node:16-alpine

# Install additional dependencies
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY src/ ./src/
COPY .env* ./

# Create necessary directories
RUN mkdir -p wallet
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Set permissions
RUN chmod -R 755 /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "src/app.js"]
