# Stage 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_ANTHROPIC_API_KEY
ARG VITE_POCKETBASE_URL
RUN npm run build

# Stage 2: PocketBase with built app as static files
FROM ghcr.io/muchobien/pocketbase:latest
COPY --from=builder /app/dist /pb/pb_public
COPY pb_migrations /pb/pb_migrations
