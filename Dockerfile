# syntax=docker/dockerfile:1

# --- Stage 1: build the Vite/React client into client/dist ---
FROM node:20-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: install server production dependencies ---
FROM node:20-bookworm-slim AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# --- Stage 3: runtime ---
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# server.js resolves the client at ../../client/dist relative to server/src,
# so preserve the repo layout: /app/server/src + /app/client/dist.
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=client /app/client/dist ./client/dist

USER node
EXPOSE 3000
CMD ["node", "server/src/server.js"]
