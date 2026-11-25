# syntax=docker/dockerfile:1
#
# Bhalojob production images. Built on the server by deploy/aws/setup.sh and
# update.sh through docker-compose.yml (see docs/aws-deploy.md).
#
#   target "runner"   the Next.js standalone server (the default, last stage)
#   target "migrate"  one-shot job: prisma migrate deploy + master data on an empty database
#
# The build needs no database and no secrets.

ARG NODE_VERSION=24

# ---- base: the Node.js image every stage starts from ------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: every dependency (dev ones too: Prisma CLI, TypeScript, Tailwind) -
FROM base AS deps
# Prisma chooses its schema-engine binary (used by `prisma migrate deploy`) by
# the system's OpenSSL, so it has to be there before `npm ci`.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
# The postinstall script runs `prisma generate`, which reads these two files
# and writes the client to src/generated/prisma.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---- builder: next build, which writes .next/standalone ---------------------
FROM deps AS builder
# Build workers. 1 keeps memory low on a 2 GB server; raise it on a bigger machine.
ARG NEXT_BUILD_CPUS=1
# Heap limit for the build only. Node sizes its default from the machine's RAM,
# which is too small on a 2 GB server; with this it can spill into swap instead of failing.
ARG BUILD_HEAP_MB=1536
ENV NEXT_BUILD_CPUS=${NEXT_BUILD_CPUS}
COPY . .
# `prisma generate` again so the client always matches the schema that was just copied.
# `mkdir -p public` because the runner stage copies that folder and the project may not have one.
RUN npx prisma generate \
    && NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP_MB}" npm run build \
    && mkdir -p public

# ---- migrate: database migrations + master data, run once per deploy ---------
# The standalone server has no Prisma CLI and no migration files, so this job
# is cut from the deps stage, which has both the CLI and the `pg` driver.
FROM deps AS migrate
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1
COPY prisma ./prisma
COPY db/seed.sql ./db/seed.sql
COPY deploy/aws/docker/migrate.mjs ./deploy/aws/docker/migrate.mjs
# Prisma remembers a checksum of every migration file it applied. Code that
# came from a Windows PC as an archive can carry CRLF line endings; making them
# LF here keeps the checksums the same whichever way the code reached the server.
RUN find prisma/migrations db -name '*.sql' -exec sed -i 's/\r$//' {} +
CMD ["node", "deploy/aws/docker/migrate.mjs"]

# ---- runner: the app itself --------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_DIR=/data/storage
# The app runs as the image's unprivileged "node" user (uid 1000). It writes to
# two places only: uploads (a volume, see docker-compose.yml) and Next's cache.
# A new named volume mounted on /data/storage copies this folder's owner.
RUN mkdir -p /data/storage /app/.next/cache \
    && chown -R node:node /data /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
VOLUME ["/data/storage"]
CMD ["node", "server.js"]
