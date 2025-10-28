# Dockerfile for WebSocket Server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only ws and node-fetch needed)
RUN npm install --production

# Copy only the websocket server
COPY websocket-server.js .

# Expose WebSocket port
EXPOSE 8080

# Start the WebSocket server
CMD ["node", "websocket-server.js"]
