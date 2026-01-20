# syntax=docker/dockerfile:1.4

FROM node:25-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

# Install poppler-utils for PDF rendering (pdftoppm command)
RUN apk add --no-cache poppler-utils

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration dependencies (tsx requires node_modules)
COPY --from=deps /app/node_modules ./node_modules
COPY scripts ./scripts
COPY package.json ./

# Create directory for exercise image storage (Railway volume mount point)
RUN mkdir -p /data/images

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx scripts/seed-exercises.ts && node server.js"]
