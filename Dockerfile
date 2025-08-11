FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY websocket-server.js ./

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start the server
CMD ["node", "websocket-server.js"]