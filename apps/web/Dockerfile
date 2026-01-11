# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first, then Web
RUN pnpm --filter @minizapier/shared build
RUN pnpm --filter @minizapier/web build

# Copy public and static assets to standalone folder (as per Next.js docs)
RUN cp -r /app/apps/web/public /app/apps/web/.next/standalone/apps/web/public
RUN cp -r /app/apps/web/.next/static /app/apps/web/.next/standalone/apps/web/.next/static

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone folder (contains server.js and minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is in the root of standalone folder for monorepo
CMD ["node", "apps/web/server.js"]
