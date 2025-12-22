# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS base
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
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY package.json package-lock.json ./
EXPOSE 3000
CMD ["npm", "run", "start"]
