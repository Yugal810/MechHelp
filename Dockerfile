FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests for dependency caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for both backend and frontend
RUN npm run install:all

# Copy remaining source code
COPY . .

# Build Vite frontend production bundle
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app ./

EXPOSE 8000

CMD ["npm", "start"]
