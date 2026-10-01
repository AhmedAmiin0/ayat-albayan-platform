# API image (docs/09-deployment.md). Build context = repo root:
#   docker build -f apps/api/Dockerfile -t ayat-api .
# Installs only the api workspace and its workspace deps (@ab/shared, @ab/db, @ab/config).
FROM node:24.15.0-slim AS build
ENV CI=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "api..." \
 && pnpm --filter @ab/shared build \
 && pnpm --filter api build

FROM node:24.15.0-slim
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
