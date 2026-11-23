# Generic container image for apps/api (works on Railway or any OCI host; D-009).
# Build from the repository root:  docker build -f apps/api/Dockerfile -t mandarin-api .
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@mandarin/api..." \
 && pnpm --filter "@mandarin/api..." build \
 && pnpm --filter @mandarin/adapters fetch:handwriting-data \
 && pnpm --filter @mandarin/api deploy --prod --legacy /out \
 && mkdir -p /out/data && cp packages/adapters/data/mmah.json packages/adapters/data/LICENSE-APL /out/data/

FROM node:22-bookworm-slim
ENV NODE_ENV=production
# Handwriting data (Arphic Public License, see /app/data/LICENSE-APL) — D-029, licence approval pending.
ENV HANDWRITING_DATA_PATH=/app/data/mmah.json
WORKDIR /app
COPY --from=build /out .
USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
