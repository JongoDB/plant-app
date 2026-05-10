# =============================================================================
# apps/api Dockerfile — multi-arch (linux/arm64 + linux/amd64).
#
# Build with:
#   docker buildx build --platform linux/arm64,linux/amd64 -t plant-app-api:dev \
#     -f apps/api/Dockerfile .
#
# This Dockerfile is for the API server (Fastify) only. Native AI workloads
# (whisper.cpp, Piper, MLX) deliberately do NOT run inside Docker on macOS —
# they run as native processes on the host so they can use Metal/CoreML/MLX,
# and the API talks to them via AI_WORKER_URL.
# =============================================================================

FROM --platform=$BUILDPLATFORM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps stage: install workspace deps once
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod=false

# ---- build stage: compile TS
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @plant-app/shared build \
    && pnpm --filter @plant-app/api build

# ---- runtime stage: minimal image with built JS only
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml* ./
COPY --from=build /repo/packages/shared/package.json ./packages/shared/
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/
COPY --from=build /repo/apps/api/dist ./apps/api/dist
RUN pnpm install --frozen-lockfile --prod
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
