# Stage 1: Build Frontend (Vite + React)
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server (Node.js 22 LTS with built-in SQLite)
FROM node:22-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# Copy server source code
COPY server/ ./

# Copy built frontend assets from client-builder stage
COPY --from=client-builder /app/client/dist /app/client/dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "index.js"]
